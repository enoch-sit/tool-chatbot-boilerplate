from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List, AsyncGenerator
from app.auth.middleware import authenticate_user
from app.services.flowise_service import FlowiseService
from app.services.accounting_service import AccountingService
from app.services.auth_service import AuthService
from app.services.external_auth_service import ExternalAuthService
from app.auth.jwt_handler import JWTHandler
from flowise import Flowise, PredictionData
from app.config import settings
from app.models.chatflow import UserChatflow  # Added UserChatflow import
from app.models.chat_session import ChatSession  # Import the new session model
from app.models.chat_message import ChatMessage
from beanie import Document
import time
import uuid
import hashlib
from datetime import datetime
import json
from json_repair import repair_json

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class FileUpload(BaseModel):
    data: str  # Base64 encoded file or URL
    type: str  # "file" or "url"
    name: str  # Filename
    mime: str  # MIME type like "image/jpeg"


class ChatRequest(BaseModel):
    question: str
    chatflow_id: str
    overrideConfig: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None
    # The client can provide a session ID to maintain conversation context
    sessionId: Optional[str] = None
    uploads: Optional[List[FileUpload]] = None  # New field for uploads


class AuthRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RevokeTokenRequest(BaseModel):
    token_id: Optional[str] = None
    all_tokens: Optional[bool] = False


class MyAssignedChatflowsResponse(BaseModel):
    assigned_chatflow_ids: List[str]
    count: int


class CreateSessionRequest(BaseModel):
    chatflow_id: str
    topic: Optional[str] = None


class SessionResponse(BaseModel):
    session_id: str
    chatflow_id: str
    user_id: str
    topic: Optional[str]
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    history: List[Dict[str, Any]]
    count: int


class SessionSummary(BaseModel):
    session_id: str
    chatflow_id: str
    topic: Optional[str]
    created_at: datetime
    first_message: Optional[str] = None


class SessionListResponse(BaseModel):
    sessions: List[SessionSummary]
    count: int


# Create deterministic but UUID-formatted session ID with timestamp
def create_session_id(user_id, chatflow_id):
    # Create a namespace UUID (version 5)
    namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    # Get current timestamp
    timestamp = int(time.time() * 1000)

    # Combine user_id, chatflow_id, and timestamp
    seed = f"{user_id}:{chatflow_id}:{timestamp}"

    # Generate a UUID based on the namespace and seed
    return str(uuid.uuid5(namespace, seed))


@router.post("/authenticate")
async def authenticate(auth_request: AuthRequest, request: Request):
    """
    Authenticate user via external auth service and return JWT tokens
    """
    try:
        external_auth_service = ExternalAuthService()

        # Authenticate user via external service
        auth_result = await external_auth_service.authenticate_user(
            auth_request.username, auth_request.password
        )

        if auth_result is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "access_token": auth_result["access_token"],
            "refresh_token": auth_result["refresh_token"],
            "token_type": auth_result["token_type"],
            "user": auth_result["user"],
            "message": auth_result["message"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.post("/refresh")
async def refresh_token(refresh_request: RefreshRequest, request: Request):
    """
    Refresh access token using external auth service - NO MIDDLEWARE DEPENDENCY
    This endpoint does not use authenticate_user middleware to avoid circular dependency.
    """
    try:
        external_auth_service = ExternalAuthService()

        # Refresh tokens via external auth service (no middleware)
        refresh_result = await external_auth_service.refresh_token(
            refresh_request.refresh_token
        )

        if refresh_result is None:
            raise HTTPException(
                status_code=401, detail="Invalid or expired refresh token"
            )

        return {
            "access_token": refresh_result["access_token"],
            "refresh_token": refresh_result["refresh_token"],
            "token_type": refresh_result["token_type"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


@router.post("/revoke")
async def revoke_tokens(
    request: Request,
    current_user: Dict = Depends(authenticate_user),
    revoke_request: Optional[RevokeTokenRequest] = None,
):
    """
    Revoke refresh tokens (specific token or all user tokens)
    """
    try:
        auth_service = AuthService()
        user_id = current_user.get("user_id")

        # Get authorization header to extract current token for token_id
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        current_token = auth_header.split(" ")[1]
        # Decode current token to get token_id
        # from app.auth.jwt_handler import JWTHandler
        payload = JWTHandler.verify_access_token(current_token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")

        current_token_id = JWTHandler.extract_token_id(payload)

        # Determine revocation scope
        revoke_all = False
        specific_token_id = None

        if revoke_request:
            revoke_all = revoke_request.all_tokens or False
            specific_token_id = revoke_request.token_id

        revoked_count = 0

        if revoke_all:
            # Revoke all user tokens
            success = await auth_service.revoke_all_user_tokens(user_id)
            if success:
                # Count revoked tokens (import RefreshToken if needed)
                from app.models.refresh_token import RefreshToken

                revoked_count = await RefreshToken.find(
                    RefreshToken.user_id == user_id, RefreshToken.is_revoked == True
                ).count()
                return {
                    "message": "All tokens revoked successfully",
                    "revoked_tokens": revoked_count,
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to revoke tokens")

        elif specific_token_id:
            # Revoke specific token
            success = await auth_service.revoke_refresh_token(specific_token_id)
            if success:
                return {"message": "Token revoked successfully", "revoked_tokens": 1}
            else:
                raise HTTPException(
                    status_code=404, detail="Token not found or already revoked"
                )

        else:
            # Revoke current token (default behavior)
            success = await auth_service.revoke_refresh_token(current_token_id)
            if success:
                return {"message": "Token revoked successfully", "revoked_tokens": 1}
            else:
                raise HTTPException(
                    status_code=404, detail="Token not found or already revoked"
                )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Token revocation failed: {str(e)}"
        )


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
                    streaming=True,  # Enable streaming for proxy behavior
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
                    full_response += str(chunk)
                    response_received = True

            if not response_received or not full_response:
                # Log failed transaction but don't refund credits automatically
                await accounting_service.log_transaction(
                    user_token, user_id, "chat", chatflow_id, cost, False
                )
                raise HTTPException(status_code=503, detail="Chat service unavailable")

            # 7. Log successful transaction
            await accounting_service.log_transaction(
                user_token, user_id, "chat", chatflow_id, cost, True
            )

            # 8. Return consolidated response
            return {
                "response": full_response,
                "metadata": {
                    "chatflow_id": chatflow_id,
                    "cost": cost,
                    "remaining_credits": user_credits - cost,
                    "user": current_user.get("username"),
                    "streaming": True,
                },
            }

        except Exception as processing_error:
            # Log failed processing
            await accounting_service.log_transaction(
                user_token, user_id, "chat", chatflow_id, cost, False
            )
            raise HTTPException(
                status_code=500,
                detail=f"Chat processing failed: {str(processing_error)}",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


# --- Testing chat predict STREAM for user: user2 on chatflow ---
# ✅ Stream started successfully for user2. Chunks:
# --- End of Stream ---
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
                session_id = chat_request.sessionId or create_session_id(
                    user_id, chatflow_id
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

                # Directly yield the raw chunks from Flowise as they come.
                # We are not parsing or saving the stream here.
                # We will log a single successful transaction.
                response_streamed = False
                for chunk in completion:
                    if isinstance(chunk, bytes):
                        yield chunk.decode("utf-8", errors="ignore")
                    else:
                        yield str(chunk)
                    response_streamed = True

                # Log transaction after the stream is finished
                if response_streamed:
                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, True
                    )
                else:
                    # If no data was streamed, log as a failed transaction
                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, False
                    )

            except Exception as e:
                # Log the error for debugging
                print(f"Error during raw stream processing: {e}")
                await accounting_service.log_transaction(
                    user_token, user_id, "chat", chatflow_id, cost, False
                )
                # Yield a final error message in the stream if something goes wrong.
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

# Create session_id should be done when users post their first message
# @router.post("/sessions", response_model=SessionResponse, status_code=201)
# async def create_chat_session(
#     session_request: CreateSessionRequest,
#     current_user: Dict = Depends(authenticate_user),
# ):
#     """
#     Creates a new chat session for a user with a specific chatflow.
#     This endpoint validates user permissions before creating the session.
#     """
#     try:
#         auth_service = AuthService()
#         user_id = current_user.get("user_id")
#         chatflow_id = session_request.chatflow_id

#         # 1. Validate user has access to the chatflow before creating a session
#         if not await auth_service.validate_user_permissions(user_id, chatflow_id):
#             raise HTTPException(
#                 status_code=403, detail="Access denied to this chatflow"
#             )

#         # 2. Create and store the new session
#         new_session = ChatSession(
#             user_id=user_id, chatflow_id=chatflow_id, topic=session_request.topic
#         )
#         await new_session.insert()

#         return SessionResponse(
#             session_id=new_session.session_id,
#             chatflow_id=new_session.chatflow_id,
#             user_id=new_session.user_id,
#             topic=new_session.topic,
#             created_at=new_session.created_at,
#         )

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Failed to create session: {str(e)}"
#         )

# for indivduals to get their own history
@router.get("/sessions/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str, current_user: Dict = Depends(authenticate_user)
):
    user_id = current_user.get("user_id")

    # 1. Verify the session exists and belongs to the user
    session = await ChatSession.find_one(
        ChatSession.session_id == session_id, ChatSession.user_id == user_id
    )
    if not session:
        raise HTTPException(
            status_code=404, detail="Chat session not found or access denied"
        )

    # 2. Fetch message history for the session
    messages = (
        await ChatMessage.find(ChatMessage.session_id == session_id)
        .sort(ChatMessage.created_at)
        .to_list()
    )

    # 3. Format the response
    history_list = [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at,
        }
        for msg in messages
    ]

    return {"history": history_list, "count": len(history_list)}


@router.get("/sessions", response_model=SessionListResponse)
async def get_all_user_sessions(current_user: Dict = Depends(authenticate_user)):
    """
    Retrieves a summary of all chat sessions for the current user,
    """
    user_id = current_user.get("user_id")

    # Find all sessions for the current user, sorted by creation date.
    sessions = await ChatSession.find(ChatSession.user_id == user_id).sort(-ChatSession.created_at).to_list()

    # The response model `SessionListResponse` expects a list of `SessionSummary` objects.
    # We need to map the fields from the `ChatSession` documents to `SessionSummary` objects.
    session_summaries = [
        SessionSummary(
            session_id=session.session_id,
            chatflow_id=session.chatflow_id,
            topic=session.topic,
            created_at=session.created_at,
            first_message=None  # Explicitly set to None as it's no longer fetched
        )
        for session in sessions
    ]

    return {"sessions": session_summaries, "count": len(session_summaries)}

