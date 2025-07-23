"""
Main Chat Router - Consolidated chat API endpoints
This file imports and includes all chat-related sub-routers
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional, AsyncGenerator

# Import sub-routers
from .chat_auth import router as auth_router
from .chat_sessions import router as sessions_router
from .chat_files import router as files_router

# Import shared dependencies and services
from app.auth.middleware import authenticate_user
from app.services.flowise_service import FlowiseService
from app.services.accounting_service import AccountingService
from app.services.auth_service import AuthService
from app.models.chatflow import UserChatflow
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage

# Import schemas and utilities
from .chat_schemas import ChatRequest, MyAssignedChatflowsResponse
from .chat_utils import create_session_id, parse_sse_chunk

# Import Flowise SDK
from flowise import Flowise, PredictionData
try:
    from flowise import Upload
    print("✅ Flowise SDK with Upload class imported successfully")
    USE_UPLOAD_CLASS = True
except ImportError:
    try:
        from flowise import FileUpload as Upload
        print("✅ Flowise SDK with FileUpload class imported successfully")
        USE_UPLOAD_CLASS = True
    except ImportError:
        print("⚠️ Upload class not found, will use dictionary fallback for file uploads")
        USE_UPLOAD_CLASS = False

from app.config import settings
from datetime import datetime
from json_repair import repair_json
import uuid
import time
import json
import requests
import traceback
import io

# Main router with prefix
router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# Include sub-routers
router.include_router(auth_router)
router.include_router(sessions_router)
router.include_router(files_router)


@router.post("/predict")
async def chat_predict(
    chat_request: ChatRequest, current_user: Dict = Depends(authenticate_user)
):
    """
    Process chat prediction request with authentication and credit management
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

        # 2. Initialize Flowise client directly
        flowise_client = Flowise(settings.FLOWISE_API_URL, settings.FLOWISE_API_KEY)

        # 3. Get chatflow cost
        cost = await accounting_service.get_chatflow_cost(chatflow_id)

        # 4. Check user credits
        user_credits = await accounting_service.check_user_credits(user_id, user_token)
        if user_credits is None or user_credits < cost:
            raise HTTPException(status_code=402, detail="Insufficient credits")

        # 5. Deduct credits before processing
        if not await accounting_service.deduct_credits(user_id, cost, user_token):
            raise HTTPException(status_code=402, detail="Failed to deduct credits")
            
        # 6. Process chat request using Flowise library with streaming
        try:
            # Create prediction using Flowise library with streaming enabled
            completion = flowise_client.create_prediction(
                PredictionData(
                    chatflowId=chatflow_id,
                    question=chat_request.question,
                    streaming=True,
                    overrideConfig=(
                        chat_request.overrideConfig
                        if chat_request.overrideConfig
                        else None
                    ),
                )
            )

            # Collect all streaming chunks into a complete response
            full_response = ""
            response_received = False

            for chunk in completion:
                if chunk:
                    full_response += chunk
                    response_received = True

            if not response_received or not full_response:
                await accounting_service.log_transaction(
                    user_token, user_id, "chat", chatflow_id, cost, False
                )
                raise HTTPException(status_code=500, detail="No response received from Flowise")

            # 7. Log successful transaction
            await accounting_service.log_transaction(
                user_token, user_id, "chat", chatflow_id, cost, True
            )

            # 8. Return consolidated response
            return {"response": full_response}

        except Exception as processing_error:
            await accounting_service.log_transaction(
                user_token, user_id, "chat", chatflow_id, cost, False
            )
            raise HTTPException(
                status_code=500, detail=f"Prediction failed: {str(processing_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


@router.post("/predict/stream")
async def chat_predict_stream(
    chat_request: ChatRequest, current_user: Dict = Depends(authenticate_user)
):
    """
    (Modified to stream raw data)
    This endpoint streams raw, unparsed data directly from Flowise.
    It includes authentication and credit deduction but forwards the stream without parsing
    or message persistence within this service.
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

        # 2. Initialize Flowise client directly
        flowise_client = Flowise(settings.FLOWISE_API_URL, settings.FLOWISE_API_KEY)

        # 3. Get chatflow cost
        cost = await accounting_service.get_chatflow_cost(chatflow_id)

        # 4. Check user credits
        user_credits = await accounting_service.check_user_credits(user_id, user_token)
        if user_credits is None or user_credits < cost:
            raise HTTPException(status_code=402, detail="Insufficient credits")

        # 5. Deduct credits before processing
        if not await accounting_service.deduct_credits(user_id, cost, user_token):
            raise HTTPException(status_code=402, detail="Failed to deduct credits")

        async def stream_generator() -> AsyncGenerator[str, None]:
            try:
                completion = flowise_client.create_prediction(
                    PredictionData(
                        chatflowId=chatflow_id,
                        question=chat_request.question,
                        streaming=True,
                        overrideConfig=(
                            chat_request.overrideConfig
                            if chat_request.overrideConfig
                            else None
                        ),
                    )
                )

                response_received = False
                for chunk in completion:
                    if chunk:
                        response_received = True
                        yield chunk

                # Log transaction based on whether we received any response
                await accounting_service.log_transaction(
                    user_token, user_id, "chat", chatflow_id, cost, response_received
                )

            except Exception as e:
                await accounting_service.log_transaction(
                    user_token, user_id, "chat", chatflow_id, cost, False
                )
                yield f"STREAM_ERROR: {str(e)}"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


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

        if chat_request.sessionId is not None and chat_request.sessionId != "":
            # If sessionId is provided, validate its format and use it
            try:
                uuid.UUID(chat_request.sessionId)
                session_id = chat_request.sessionId
                new_session_id = False
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid sessionId format. Must be a valid UUID.",
                )
        else:
            session_id = create_session_id(user_id, chatflow_id)
            new_session_id = True


        user_message = ChatMessage(
            chatflow_id=chatflow_id,
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=chat_request.question,
            has_files=bool(chat_request.uploads),
        )

        async def stream_generator() -> AsyncGenerator[str, None]:
            """Generator to stream responses from Flowise and store messages."""
            # List to collect full assistant response chunks
            full_assistant_response_ls = []
            try:
                # Initialize Flowise client
                flowise_client = Flowise(
                    settings.FLOWISE_API_URL, settings.FLOWISE_API_KEY
                )
                from app.services.file_storage_service import FileStorageService
                file_storage_service = FileStorageService()

                override_config = chat_request.overrideConfig or {}
                override_config["sessionId"] = session_id

                # ✅ BEST PRACTICE: Process and store files BEFORE streaming
                stored_files = []
                if chat_request.uploads:
                    try:
                        # DEBUG: Check types of uploads
                        for i, upload in enumerate(chat_request.uploads):
                            if hasattr(upload, 'model_dump'):
                                print(f"DEBUG: Upload {i} model_dump result: {upload.model_dump()}")
                            else:
                                print(f"DEBUG: Upload {i} as dict: {upload}")
                        
                        # Store files first - this ensures we have file IDs before streaming
                        uploads_data = []
                        for upload in chat_request.uploads:
                            if hasattr(upload, 'model_dump'):
                                uploads_data.append(upload.model_dump())
                            else:
                                uploads_data.append(upload)
                        
                        stored_files = await file_storage_service.process_upload_list(
                            uploads=uploads_data,
                            user_id=user_id,
                            session_id=session_id,
                            chatflow_id=chatflow_id,
                            message_id="temp_user_message"  # Will be updated later
                        )
                        
                        print(f"Successfully stored {len(stored_files)} files")
                        
                        # ✅ BEST PRACTICE: Yield file upload confirmation as first event
                        if stored_files:
                            file_upload_event = json.dumps({
                                "event": "files_uploaded",
                                "data": {
                                    "file_count": len(stored_files),
                                    "files": [
                                        {
                                            "file_id": file.file_id,
                                            "name": file.original_name,
                                            "size": file.file_size,
                                            "type": file.mime_type
                                        }
                                        for file in stored_files
                                    ]
                                },
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            yield file_upload_event
                        
                    except Exception as e:
                        print(f"Error storing files: {e}")
                        # ✅ BEST PRACTICE: Yield error event for file upload failures
                        error_event = json.dumps({
                            "event": "file_upload_error",
                            "data": {"error": str(e)},
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        yield error_event
                        # Continue processing even if file storage fails

                # 🔥 STREAM SESSION_ID AS FIRST CHUNK
                session_chunk_first = json.dumps(
                    {
                        "event": "session_id",
                        "data": session_id,
                        "chatflow_id": chatflow_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "status": "streaming_started",
                    }
                )
                yield session_chunk_first

                # ✅ BEST PRACTICE: Prepare uploads for Flowise API
                uploads = None
                if chat_request.uploads:
                    uploads = []
                    for upload in chat_request.uploads:
                        upload_dict = upload.model_dump() if hasattr(upload, 'model_dump') else upload
                        
                        if USE_UPLOAD_CLASS:
                            # Use Upload class if available
                            try:
                                if upload_dict["type"] == "file":
                                    # Prefix base64 data for Flowise compatibility
                                    upload_obj = Upload(
                                        data=f"data:{upload_dict['mime']};base64,{upload_dict['data']}",
                                        type="file",
                                        name=upload_dict["name"],
                                        mime=upload_dict["mime"]
                                    )
                                else:
                                    # For "url", keep as-is
                                    upload_obj = Upload(
                                        data=upload_dict["data"],
                                        type="url",
                                        name=upload_dict["name"],
                                        mime=upload_dict["mime"]
                                    )
                                uploads.append(upload_obj)
                            except Exception as e:
                                print(f"Failed to create Upload object: {e}, falling back to dictionary")
                                # Fall back to dictionary approach
                                if upload_dict["type"] == "file":
                                    upload_dict["data"] = f"data:{upload_dict['mime']};base64,{upload_dict['data']}"
                                uploads.append(upload_dict)
                        else:
                            # Fallback to dictionary approach
                            if upload_dict["type"] == "file":
                                # Prefix base64 data for Flowise compatibility
                                upload_dict["data"] = f"data:{upload_dict['mime']};base64,{upload_dict['data']}"
                            # For "url", keep as-is (type="url", data=URL)
                            uploads.append(upload_dict)

                # Try to create prediction with SDK, fallback to requests if there are issues
                # 🔍 PERFORMANCE NOTE: SDK is ~20-30% faster than direct HTTP due to:
                # - Connection pooling and reuse
                # - Native object serialization (no SSE parsing overhead)
                # - Optimized streaming without intermediate string processing
                # - Lower memory footprint for large responses
                # 
                # However, SDK can fail with dict serialization errors when Upload objects
                # don't have proper __dict__ attributes, making fallback necessary for reliability
                try:
                    print("🔄 Attempting SDK approach (faster, optimized)")
                    prediction_data = PredictionData(
                        chatflowId=chatflow_id,
                        question=chat_request.question,
                        streaming=True,
                        history=chat_request.history,
                        overrideConfig=override_config,
                        uploads=uploads,
                    )

                    completion = flowise_client.create_prediction(prediction_data)
                    
                    # Test if we can iterate (this is where the dict error usually occurs)
                    first_chunk = next(completion, None)
                    if first_chunk is not None:
                        print("✅ SDK approach working, using optimized streaming")
                        # SDK is working, yield the first chunk and continue
                        chunk_str = ""
                        if isinstance(first_chunk, bytes):
                            chunk_str = first_chunk.decode("utf-8", errors="ignore")
                        else:
                            chunk_str = str(first_chunk)
                        good_json_string = repair_json(chunk_str)
                        
                        full_assistant_response_ls.append(good_json_string)
                        yield good_json_string
                        
                        # Continue with remaining chunks
                        response_streamed = True
                        for chunk in completion:
                            chunk_str = ""
                            if isinstance(chunk, bytes):
                                chunk_str = chunk.decode("utf-8", errors="ignore")
                            else:
                                chunk_str = str(chunk)
                            good_json_string = repair_json(chunk_str)
                            full_assistant_response_ls.append(good_json_string)
                            yield good_json_string
                            response_streamed = True
                    else:
                        raise Exception("No chunks received from SDK")
                        
                except Exception as e:
                    print(f"SDK failed with error: {e}, falling back to requests")
                    # Fallback to direct requests approach
                    import requests
                    
                    # Prepare payload for direct API call
                    payload = {
                        "question": chat_request.question,
                        "overrideConfig": override_config,
                        "streaming": True,
                        "history": chat_request.history
                    }
                    
                    # Add uploads if available
                    if chat_request.uploads:
                        payload["uploads"] = []
                        for upload in chat_request.uploads:
                            upload_dict = upload.model_dump() if hasattr(upload, 'model_dump') else upload
                            if upload_dict["type"] == "file":
                                upload_dict["data"] = f"data:{upload_dict['mime']};base64,{upload_dict['data']}"
                            payload["uploads"].append(upload_dict)
                    
                    headers = {
                        "Authorization": f"Bearer {settings.FLOWISE_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    
                    # Make direct API call
                    response = requests.post(
                        f"{settings.FLOWISE_API_URL}/api/v1/prediction/{chatflow_id}",
                        json=payload,
                        headers=headers,
                        stream=True,
                        timeout=120
                    )
                    
                    if response.status_code == 200:
                        response_streamed = False
                        for chunk in response.iter_content(chunk_size=None):
                            if chunk:
                                chunk_str = chunk.decode("utf-8", errors="ignore")
                                
                                # Parse SSE format: extract JSON from "data:" lines
                                # 🔍 PERFORMANCE: This adds ~5-10ms per chunk for SSE parsing
                                sse_events = parse_sse_chunk(chunk_str)
                                
                                for event_json in sse_events:
                                    if event_json.strip():  # Skip empty events
                                        good_json_string = repair_json(event_json)
                                        full_assistant_response_ls.append(good_json_string)
                                        yield good_json_string
                                        response_streamed = True
                    else:
                        raise Exception(f"Direct API call failed: {response.status_code} - {response.text}")

                if response_streamed:
                    
                    def process_json(full_assistant_response_ls):
                        """
                        Process a list of JSON strings, combine consecutive token events, and return both token data and metadata.

                        Args:
                            full_assistant_response_ls (list): List of JSON strings representing events.
                        Returns:
                            tuple: (token_data_json_string, non_token_events_list)
                        """
                        result = []  # List to store the final sequence of event objects
                        non_Token_event_result = []
                        token_data = ""  # String to accumulate data from "token" events

                        for good_json_string in full_assistant_response_ls:
                            try:
                                obj = json.loads(
                                    good_json_string
                                )  # Parse JSON string to dictionary
                                
                                # Handle both dictionary and list cases
                                if isinstance(obj, dict):
                                    if obj.get("event") == "token":
                                        token_data += obj.get("data", "")  # Accumulate token data
                                    else:
                                        # If we have accumulated token data, add it as a single event
                                        if token_data:
                                            result.append(
                                                {"event": "token", "data": token_data}
                                            )
                                            token_data = ""  # Reset token data
                                        # Save the non-token event for metadata storage
                                        non_Token_event_result.append(obj)
                                elif isinstance(obj, list):
                                    # Handle case where JSON is a list of events
                                    print(f"🔍 DEBUG: Processing list of {len(obj)} events")
                                    for event in obj:
                                        if isinstance(event, dict):
                                            if event.get("event") == "token":
                                                token_data += event.get("data", "")
                                            else:
                                                # If we have accumulated token data, add it as a single event
                                                if token_data:
                                                    result.append(
                                                        {"event": "token", "data": token_data}
                                                    )
                                                    token_data = ""  # Reset token data
                                                # Save the non-token event for metadata storage
                                                non_Token_event_result.append(event)
                                        else:
                                            print(f"🔍 DEBUG: Skipping non-dict event in list: {event}")
                                else:
                                    print(f"🔍 DEBUG: Skipping non-dict/non-list object: {obj}")
                                    
                            except json.JSONDecodeError as e:
                                print(f"🔍 DEBUG: JSON decode error: {e}")
                                continue  # Skip invalid JSON strings

                        # If there are any remaining tokens (e.g., at the end of the list), add them
                        if token_data:
                            result.append({"event": "token", "data": token_data})

                        # Return both token data and metadata
                        return json.dumps(result), non_Token_event_result

                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, True
                    )
                    
                    # ✅ BEST PRACTICE: Save user message first, then update with file references
                    await user_message.insert()
                    
                    # Update file records with actual message ID and link to user message
                    if stored_files:
                        try:
                            # Update all stored files with the actual message ID
                            for i, file in enumerate(stored_files):
                                
                                file.message_id = str(user_message.id)
                                await file.save()
                            
                            # Update user message with file references
                            user_message.file_ids = [file.file_id for file in stored_files]
                            user_message.has_files = True
                            await user_message.save()
                            
                            
                        except Exception as e:
                            import traceback
                            traceback.print_exc()
                            # Continue processing even if file linking fails
                    
                    # Get both token data and metadata from the response
                    try:
                        token_content, metadata_events = process_json(full_assistant_response_ls)
                    except Exception as process_error:
                        import traceback
                        traceback.print_exc()
                        # Set fallback values to continue execution
                        token_content = "[]"
                        metadata_events = []
                    
                    assistant_message = ChatMessage(
                        chatflow_id=chatflow_id,
                        session_id=session_id,
                        user_id=user_id,
                        role="assistant",
                        content=token_content,
                        metadata=metadata_events,  # Save non-token events here
                        has_files=False,  # Assistant messages don't have files (for now)
                    )
                    await assistant_message.insert()
                    
                    if new_session_id:
                        topic = (
                            chat_request.question[:50] + "..."
                            if len(chat_request.question) > 50
                            else chat_request.question
                        )
                        new_chat_session = ChatSession(
                            session_id=session_id,
                            user_id=user_id,
                            chatflow_id=chatflow_id,
                            topic=topic,  # or auto-generated
                        )
                        try:
                            await new_chat_session.insert()
                        except Exception as session_insert_error:
                            import traceback
                            traceback.print_exc()
                    else:
                        # Verify the existing session exists
                        existing_session = await ChatSession.find_one(
                            ChatSession.session_id == session_id,
                            ChatSession.user_id == user_id
                        )
                        if existing_session:
                            print(f"🔍 DEBUG: Existing session found: {existing_session}")
                        else:
                            print(f"🔍 DEBUG: WARNING: Existing session not found for session_id: {session_id}")

                else:
                    # If no data was streamed or the response is empty, log as a failed transaction
                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, False
                    )
                    print("🔍 DEBUG: No response streamed, logging as failed transaction")

            except Exception as e:
                print(f"🔍 DEBUG: Error during stream processing and storing: {e}")
                print(f"🔍 DEBUG: Error type: {type(e)}")
                import traceback
                traceback.print_exc()
                await accounting_service.log_transaction(
                    user_token, user_id, "chat", chatflow_id, cost, False
                )
                yield f"STREAM_ERROR: {str(e)}"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


@router.get("/credits")
async def get_user_credits(
    request: Request, current_user: Dict = Depends(authenticate_user)
):
    """Get current user's credit balance"""
    try:
        accounting_service = AccountingService()
        user_id = current_user.get("user_id")

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        user_token = auth_header.split(" ")[1]

        credits = await accounting_service.check_user_credits(user_id, user_token)

        if credits is None:
            raise HTTPException(
                status_code=500, detail="Could not retrieve credit balance"
            )

        return {"totalCredits": credits}

    except HTTPException as e:
        # Re-raise HTTP exceptions to let FastAPI handle them
        raise e
    except Exception as e:
        print(f"Error getting user credits: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")


@router.get("/my-assigned-chatflows", response_model=MyAssignedChatflowsResponse)
async def get_my_assigned_chatflows(current_user: Dict = Depends(authenticate_user)):
    """Get a list of chatflow IDs the current authenticated user is actively assigned to."""
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            # This should ideally not happen if authenticate_user works correctly
            raise HTTPException(status_code=400, detail="User ID not found in token")

        active_assignments = await UserChatflow.find(
            UserChatflow.user_id == user_id, UserChatflow.is_active == True
        ).to_list()

        assigned_chatflow_ids = [
            assignment.chatflow_id for assignment in active_assignments
        ]

        return {
            "assigned_chatflow_ids": assigned_chatflow_ids,
            "count": len(assigned_chatflow_ids),
        }

    except Exception as e:
        # Consider more specific error logging if needed
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve assigned chatflows: {str(e)}"
        )
