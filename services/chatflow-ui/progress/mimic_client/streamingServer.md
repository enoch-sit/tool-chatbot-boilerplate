# Streaming Server code

```py

@router.post("/predict/stream/store")
async def chat_predict_stream_store(
    chat_request: ChatRequest, current_user: Dict = Depends(authenticate_user)
):
    """
    Streams chat predictions from Flowise while simultaneously storing the user's question
    and the full assistant response as ChatMessage documents.
    """
    try:
        # Initialize services
        accounting_service = AccountingService()
        auth_service = AuthService()

        user_token = current_user.get("access_token")
        user_id = current_user.get("user_id")
        chatflow_id = chat_request.chatflow_id

        # 1. Validate user has access to chatflow
        if not await auth_service.validate_user_permissions(user_id, chatflow_id):
            raise HTTPException(
                status_code=403, detail="Access denied to this chatflow"
            )

        # 2. Get chatflow cost
        cost = await accounting_service.get_chatflow_cost(chatflow_id)

        # 3. Check user credits
        user_credits = await accounting_service.check_user_credits(user_id, user_token)
        if user_credits is None or user_credits < cost:
            raise HTTPException(status_code=402, detail="Insufficient credits")

        # 4. Deduct credits before processing
        if not await accounting_service.deduct_credits(user_id, cost, user_token):
            raise HTTPException(status_code=402, detail="Failed to deduct credits")

        # 5. Create session_id and prepare user message, but do not save it yet.
        # This prevents orphaned user messages if the stream fails.
        
        new_session_id = False
        if "sessionId" in chat_request:
            session_id = chat_request.sessionId 
        else: 
            session_id = create_session_id(user_id, chatflow_id)
            new_session_id = True

        user_message = ChatMessage(
            chatflow_id=chatflow_id,
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=chat_request.question,
        )
        # await user_message.insert() # This is deferred until the stream is successful

        async def stream_generator() -> AsyncGenerator[str, None]:
            """Generator to stream responses from Flowise and store messages."""
            # List to collect full assistant response chunks
            full_assistant_response_ls = []
            try:
                # Initialize Flowise client
                flowise_client = Flowise(
                    settings.FLOWISE_API_URL, settings.FLOWISE_API_KEY
                )

                override_config = chat_request.overrideConfig or {}
                override_config["sessionId"] = session_id

                

                uploads = None
                if chat_request.uploads:
                    uploads = [upload.model_dump() for upload in chat_request.uploads]

                prediction_data = PredictionData(
                    chatflowId=chatflow_id,
                    question=chat_request.question,
                    streaming=True,
                    history=chat_request.history,
                    overrideConfig=override_config,
                    uploads=uploads,
                )

                completion = flowise_client.create_prediction(prediction_data)

                # 🔥 STREAM SESSION_ID AS FIRST CHUNK
                session_chunk_first = json.dumps({
                    "event": "session_id",
                    "data": session_id,
                    "chatflow_id": chatflow_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": "streaming_started"
                })
                yield session_chunk_first

                response_streamed = False
                for chunk in completion:

                    chunk_str = ""
                    if isinstance(chunk, bytes):
                        chunk_str = chunk.decode("utf-8", errors="ignore")
                    else:
                        chunk_str = str(chunk)
                    good_json_string = repair_json(chunk_str)
                    full_assistant_response_ls.append(good_json_string)
                    print(good_json_string)
                    print("--")
                    yield good_json_string
                    response_streamed = True

                

                if response_streamed:

                    def process_json(full_assistant_response_ls):
                        """
                        Process a list of JSON strings, combine consecutive token events, and return as a JSON array string.

                        Args:
                            full_assistant_response_ls (list): List of JSON strings representing events.
                        Returns:
                            str: A single JSON array string with events in the correct order.
                        """
                        result = []  # List to store the final sequence of event objects
                        token_data = ""  # String to accumulate data from "token" events

                        for good_json_string in full_assistant_response_ls:
                            try:
                                obj = json.loads(
                                    good_json_string
                                )  # Parse JSON string to dictionary
                                if obj["event"] == "token":
                                    token_data += obj["data"]  # Accumulate token data
                                else:
                                    # If we have accumulated token data, add it as a single event
                                    if token_data:
                                        result.append(
                                            {"event": "token", "data": token_data}
                                        )
                                        token_data = ""  # Reset token data
                                    result.append(obj)  # Add the non-token event
                            except json.JSONDecodeError:
                                continue  # Skip invalid JSON strings

                        # If there are any remaining tokens (e.g., at the end of the list), add them
                        if token_data:
                            result.append({"event": "token", "data": token_data})

                        # Convert the list of objects to a JSON array string
                        
                        return json.dumps(result)

                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, True
                    )
                    # Save user message first, then assistant message
                    await user_message.insert()
                    assistant_message = ChatMessage(
                        chatflow_id=chatflow_id,
                        session_id=session_id,
                        user_id=user_id,
                        role="assistant",
                        content=process_json(full_assistant_response_ls),
                    )
                    await assistant_message.insert()
                    print(f"Storing assistant message: {assistant_message}")
                    if(new_session_id):
                        topic = chat_request.question[:50] + "..." if len(chat_request.question) > 50 else chat_request.question
                        new_chat_session = ChatSession(
                            session_id=session_id,
                            user_id=user_id,
                            chatflow_id=chatflow_id,
                            topic=topic  #or auto-generated
                        )
                        await new_chat_session.insert()
                    
                else:
                    # If no data was streamed or the response is empty, log as a failed transaction
                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, False
                    )
                    print("No response streamed, logging as failed transaction")

            except Exception as e:
                print(f"Error during stream processing and storing: {e}")
                await accounting_service.log_transaction(
                    user_token, user_id, "chat", chatflow_id, cost, False
                )
                yield f"STREAM_ERROR: {str(e)}"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
```
