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
                    user_id, "chat", chatflow_id, cost, False
                )
                raise HTTPException(status_code=503, detail="Chat service unavailable")

            # 7. Log successful transaction
            await accounting_service.log_transaction(
                user_id, "chat", chatflow_id, cost, True
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
                user_id, "chat", chatflow_id, cost, False
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
# {"event":"start","data":"Of"}{"event":"token","data":"Of"}{"event":"token","data":" course! Let me tell you"}{"event":"token","data":" a whimsical"}{"event":"token","data":" tale"}{"event":"token","data":" about"}{"event":"token","data":" a small"}{"event":"token","data":" village"}{"event":"token","data":" named Gli"}{"event":"token","data":"mmerwood"}{"event":"token","data":".\n\n---\n\nIn"}{"event":"token","data":" a lush"}{"event":"token","data":" valley surrounded"}{"event":"token","data":" by towering"}{"event":"token","data":" trees"}{"event":"token","data":" and sparkling"}{"event":"token","data":" streams"}{"event":"token","data":", there"}{"event":"token","data":" lay"}{"event":"token","data":" a quaint"}{"event":"token","data":" village called"}{"event":"token","data":" Glimmerwood. The"}{"event":"token","data":" village was known"}{"event":"token","data":" for its enchanting"}{"event":"token","data":" beauty"}{"event":"token","data":" and the magical"}{"event":"token","data":" glow that emanate"}{"event":"token","data":"d from the fire"}{"event":"token","data":"flies at"}{"event":"token","data":" night,"}{"event":"token","data":" giving it"}{"event":"token","data":" its"}{"event":"token","data":" name.\n\nAt"}{"event":"token","data":" the heart of Gli"}{"event":"token","data":"mmerwood lived"}{"event":"token","data":" a young"}{"event":"token","data":" girl named Elara."}{"event":"token","data":" Elara had"}{"event":"token","data":" a heart"}{"event":"token","data":" full of curiosity and a"}{"event":"token","data":" mind"}{"event":"token","data":" brimming with dreams. She loved"}{"event":"token","data":" exploring"}{"event":"token","data":" the forest"}{"event":"token","data":", discovering"}{"event":"token","data":" hidden nook"}{"event":"token","data":"s, and listening"}{"event":"token","data":" to the whispers"}{"event":"token","data":" of the wind"}{"event":"token","data":".\n\nOne day, while"}{"event":"token","data":" wandering through the woods"}{"event":"token","data":", Elara stumbled upon an"}{"event":"token","data":" ancient, g"}{"event":"token","data":"narled tree with"}{"event":"token","data":" a hollow"}{"event":"token","data":" trunk"}{"event":"token","data":". Peer"}{"event":"token","data":"ing inside"}{"event":"token","data":", she saw"}{"event":"token","data":" a faint"}{"event":"token","data":","}{"event":"token","data":" shimmering"}{"event":"token","data":" light."}{"event":"token","data":" Intrigue"}{"event":"token","data":"d, she crawled"}{"event":"token","data":" in"}{"event":"token","data":", and found"}{"event":"token","data":" herself in a secret"}{"event":"token","data":" chamber"}{"event":"token","data":" filled"}{"event":"token","data":" with glowing"}{"event":"token","data":" crystals and mystical"}{"event":"token","data":" artifacts.\n\nIn"}{"event":"token","data":" the center of the chamber"}{"event":"token","data":" stood a small"}{"event":"token","data":", ornate"}{"event":"token","data":" chest"}{"event":"token","data":". El"}{"event":"token","data":"ara approached"}{"event":"token","data":" it"}{"event":"token","data":", and"}{"event":"token","data":","}{"event":"token","data":" with a trembling"}{"event":"token","data":" hand, opened the lid"}{"event":"token","data":". Inside"}{"event":"token","data":", she"}{"event":"token","data":" found a beautiful"}{"event":"token","data":", intricately designed"}{"event":"token","data":" pendant"}{"event":"token","data":"."}{"event":"token","data":" As"}{"event":"token","data":" she touched"}{"event":"token","data":" it, a"}{"event":"token","data":" warm,"}{"event":"token","data":" comforting"}{"event":"token","data":" light enveloped her,"}{"event":"token","data":" and she"}{"event":"token","data":" heard"}{"event":"token","data":" a soft"}{"event":"token","data":" voice in"}{"event":"token","data":" her mind"}{"event":"token","data":".\n\n\"You"}{"event":"token","data":" have found"}{"event":"token","data":" the Heart"}{"event":"token","data":" of Gli"}{"event":"token","data":"mmerwood,\" the"}{"event":"token","data":" voice said."}{"event":"token","data":" \"This"}{"event":"token","data":" pendant holds"}{"event":"token","data":" the magic"}{"event":"token","data":" of the forest and"}{"event":"token","data":" the wisdom"}{"event":"token","data":" of the ancient"}{"event":"token","data":"s"}{"event":"token","data":". Use"}{"event":"token","data":" it wisely"}{"event":"token","data":".\"\n\n"}{"event":"token","data":"El"}{"event":"token","data":"ara,"}{"event":"token","data":" now the"}{"event":"token","data":" guardian of the Heart"}{"event":"token","data":" of Glimmerwood, felt"}{"event":"token","data":" a surge"}{"event":"token","data":" of responsibility and"}{"event":"token","data":" excitement. She returned"}{"event":"token","data":" to"}{"event":"token","data":" the village, pendant"}{"event":"token","data":" in"}{"event":"token","data":" hand, and shared"}{"event":"token","data":" her discovery"}{"event":"token","data":" with the"}{"event":"token","data":" elders"}{"event":"token","data":". They"}{"event":"token","data":" were overjoyed"}{"event":"token","data":" and"}{"event":"token","data":" explained"}{"event":"token","data":" that the Heart"}{"event":"token","data":" of Glimmerwood had been"}{"event":"token","data":" lost for generations"}{"event":"token","data":".\n\nWith"}{"event":"token","data":" the pendant'"}{"event":"token","data":"s power, El"}{"event":"token","data":"ara began to help"}{"event":"token","data":" the villagers"}{"event":"token","data":" in"}{"event":"token","data":" extraordinary"}{"event":"token","data":" ways. She"}{"event":"token","data":" healed"}{"event":"token","data":" the sick"}{"event":"token","data":", brought"}{"event":"token","data":" rain"}{"event":"token","data":" during"}{"event":"token","data":" drought"}{"event":"token","data":"s, and even communicated"}{"event":"token","data":" with the animals"}{"event":"token","data":" of"}{"event":"token","data":" the forest to"}{"event":"token","data":" ensure harmony"}{"event":"token","data":". The village"}{"event":"token","data":" thrived"}{"event":"token","data":" like"}{"event":"token","data":" never before,"}{"event":"token","data":" and the"}{"event":"token","data":" magic"}{"event":"token","data":" of Glimmerwood grew"}{"event":"token","data":" stronger"}{"event":"token","data":".\n\nHowever"}{"event":"token","data":", not"}{"event":"token","data":" all was"}{"event":"token","data":" well."}{"event":"token","data":" A"}{"event":"token","data":" dark shadow"}{"event":"token","data":" loomed"}{"event":"token","data":" on"}{"event":"token","data":" the horizon"}{"event":"token","data":". A"}{"event":"token","data":" neighboring"}{"event":"token","data":" village"}{"event":"token","data":", envious"}{"event":"token","data":" of Gli"}{"event":"token","data":"mmerwood's prosperity"}{"event":"token","data":", sought to claim"}{"event":"token","data":" the Heart"}{"event":"token","data":" for"}{"event":"token","data":" themselves"}{"event":"token","data":". They"}{"event":"token","data":" sent a group"}{"event":"token","data":" of thieves"}{"event":"token","data":" to steal the pendant"}{"event":"token","data":".\n\nOne"}{"event":"token","data":" moon"}{"event":"token","data":"less night, the thieves"}{"event":"token","data":" crept"}{"event":"token","data":" into Gli"}{"event":"token","data":"mmerwood,"}{"event":"token","data":" but"}{"event":"token","data":" Elara, guided"}{"event":"token","data":" by the pendant'"}{"event":"token","data":'s light'}{"event":"token","data":", confronted"}{"event":"token","data":" them. She"}{"event":"token","data":" stood tall, the"}{"event":"token","data":" Heart"}{"event":"token","data":" of Gli"}{"event":"token","data":"mmerwood glowing brightly"}{"event":"token","data":" in her hand"}{"event":"token","data":". The thieves"}{"event":"token","data":", blinded"}{"event":"token","data":" by the radiant"}{"event":"token","data":" light, fled"}{"event":"token","data":" in"}{"event":"token","data":" fear.\n\n"}{"event":"token","data":"Elara realized"}{"event":"token","data":" that the true"}{"event":"token","data":" power of the Heart"}{"event":"token","data":" lay"}{"event":"token","data":" not just in"}{"event":"token","data":" its magic,"}{"event":"token","data":" but in the unity"}{"event":"token","data":" and courage of"}{"event":"token","data":" the villagers"}{"event":"token","data":". She"}{"event":"token","data":" rallied the"}{"event":"token","data":" people of"}{"event":"token","data":" Glimmerwood, and"}{"event":"token","data":" together, they fortified"}{"event":"token","data":" their village"}{"event":"token","data":" and stood"}{"event":"token","data":" ready"}{"event":"token","data":" to"}{"event":"token","data":" defend their home"}{"event":"token","data":".\n\nIn"}{"event":"token","data":" the end, the neighboring"}{"event":"token","data":" village,"}{"event":"token","data":" witnessing"}{"event":"token","data":" the strength"}{"event":"token","data":" and harmony"}{"event":"token","data":" of Glimmerwood, withdrew"}{"event":"token","data":" their hostile"}{"event":"token","data":" intentions. They"}{"event":"token","data":" sought"}{"event":"token","data":" peace instead"}{"event":"token","data":", and the"}{"event":"token","data":" two villages"}{"event":"token","data":" formed"}{"event":"token","data":" a lasting"}{"event":"token","data":" alliance.\n\n"}{"event":"token","data":"El"}{"event":"token","data":"ara continued to be"}{"event":"token","data":" the guardian of the"}{"event":"token","data":" Heart of Glimmerwood,"}{"event":"token","data":" using"}{"event":"token","data":" its"}{"event":"token","data":" power"}{"event":"token","data":" to protect and"}{"event":"token","data":" nurture her village"}{"event":"token","data":". The"}{"event":"token","data":" legend"}{"event":"token","data":" of"}{"event":"token","data":" the"}{"event":"token","data":" Heart"}{"event":"token","data":" spread"}{"event":"token","data":" far"}{"event":"token","data":" and wide, and"}{"event":"token","data":" Gli"}{"event":"token","data":"mmerwood became a beacon of"}{"event":"token","data":" hope and magic"}{"event":"token","data":" in the land"}{"event":"token","data":".\n\nAnd so, the"}{"event":"token","data":" village"}{"event":"token","data":" of Glimmerwood thrived,"}{"event":"token","data":" its"}{"event":"token","data":" people"}{"event":"token","data":" living"}{"event":"token","data":" in"}{"event":"token","data":" harmony with"}{"event":"token","data":" nature, guided"}{"event":"token","data":" by the light"}{"event":"token","data":" of the Heart and"}{"event":"token","data":" the bravery"}{"event":"token","data":" of a"}{"event":"token","data":" young girl who"}{"event":"token","data":" believed"}{"event":"token","data":" in the magic"}{"event":"token","data":" within"}{"event":"token","data":".\n\n"}{"event":"token","data":"---\n\nI"}{"event":"token","data":" hope you enjoyed"}{"event":"token","data":" the"}{"event":"token","data":" story of"}{"event":"token","data":" Glimmerwood!"}{"event":"metadata","data":{"chatId":"d254941e-1eef-594c-9c4e-b35b57654b13","chatMessageId":"385f38d4-81f4-445d-85b1-dcb7c982ffc5","question":"Tell me a story.","sessionId":"d254941e-1eef-594c-9c4e-b35b57654b13","memoryType":"Buffer Memory"}}{"event":"end","data":"[DONE]"}
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
        session_id = chat_request.sessionId or create_session_id(user_id, chatflow_id)
        user_message = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=chat_request.question,
        )
        # await user_message.insert() # This is deferred until the stream is successful

        async def stream_generator() -> AsyncGenerator[str, None]:
            full_assistant_response = ""
            buffer = ""
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

                response_streamed = False
                for chunk in completion:
                    print(chunk)
                    print("--")
                    chunk_str = ""
                    if isinstance(chunk, bytes):
                        chunk_str = chunk.decode("utf-8", errors="ignore")
                    else:
                        chunk_str = str(chunk)

                    buffer += chunk_str

                    decoder = json.JSONDecoder()
                    pos = 0
                    while pos < len(buffer):
                        # Skip whitespace
                        if buffer[pos].isspace():
                            pos += 1
                            continue
                        try:
                            obj, end_pos = decoder.raw_decode(buffer[pos:])

                            # Process object
                            if obj.get("event") == "token":
                                full_assistant_response += obj.get("data", "")

                            pos += end_pos
                        except json.JSONDecodeError:
                            # Incomplete JSON object in buffer, wait for next chunk
                            break

                    # Keep the unparsed part of the buffer
                    buffer = buffer[pos:]

                    yield chunk_str
                    response_streamed = True

                if response_streamed and full_assistant_response.strip():
                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, True
                    )
                    # Save user message first, then assistant message
                    await user_message.insert()
                    assistant_message = ChatMessage(
                        session_id=session_id,
                        user_id=user_id,
                        role="assistant",
                        content=full_assistant_response,
                    )
                    await assistant_message.insert()
                else:
                    # If no data was streamed or the response is empty, log as a failed transaction
                    await accounting_service.log_transaction(
                        user_token, user_id, "chat", chatflow_id, cost, False
                    )

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


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_chat_session(
    session_request: CreateSessionRequest,
    current_user: Dict = Depends(authenticate_user),
):
    """
    Creates a new chat session for a user with a specific chatflow.
    This endpoint validates user permissions before creating the session.
    """
    try:
        auth_service = AuthService()
        user_id = current_user.get("user_id")
        chatflow_id = session_request.chatflow_id

        # 1. Validate user has access to the chatflow before creating a session
        if not await auth_service.validate_user_permissions(user_id, chatflow_id):
            raise HTTPException(
                status_code=403, detail="Access denied to this chatflow"
            )

        # 2. Create and store the new session
        new_session = ChatSession(
            user_id=user_id, chatflow_id=chatflow_id, topic=session_request.topic
        )
        await new_session.insert()

        return SessionResponse(
            session_id=new_session.session_id,
            chatflow_id=new_session.chatflow_id,
            user_id=new_session.user_id,
            topic=new_session.topic,
            created_at=new_session.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create session: {str(e)}"
        )


@router.get("/sessions", response_model=SessionListResponse)
async def get_all_user_sessions(current_user: Dict = Depends(authenticate_user)):
    """
    Retrieves a summary of all chat sessions for the current user,
    including the first message of each conversation.
    """
    user_id = current_user.get("user_id")

    # This aggregation pipeline fetches sessions and joins them with the first user message.
    pipeline = [
        {"$match": {"user_id": user_id}},  # Filter sessions for the current user
        {"$sort": {"created_at": -1}},  # Show the most recent sessions first
        {
            "$lookup": {
                "from": "chat_messages",
                "let": {"session_id": "$session_id"},
                "pipeline": [
                    {
                        # This $match stage filters documents within the chat_messages collection.
                        "$match": {
                            # $expr allows us to use aggregation expressions for more complex comparisons.
                            "$expr": {
                                # $and ensures all conditions are met.
                                "$and": [
                                    # Condition 1: The message's session_id must match the session_id
                                    # from the outer ChatSession document (referenced by $$session_id).
                                    {"$eq": ["$session_id", "$$session_id"]},
                                    # Condition 2: We only want messages where the role is 'user'.
                                    {"$eq": ["$role", "user"]},
                                ]
                            }
                        }
                    },
                    {"$sort": {"created_at": 1}},  # Find the earliest message
                    {"$limit": 1},  # Get only the first one
                ],
                "as": "first_message_doc",
            }
        },
        {
            # Deconstruct the array, keeping sessions even if they have no messages
            "$unwind": {
                "path": "$first_message_doc",
                "preserveNullAndEmptyArrays": True,
            }
        },
        {
            # Shape the final output
            "$project": {
                "session_id": 1,
                "chatflow_id": 1,
                "topic": 1,
                "created_at": 1,
                "first_message": "$first_message_doc.content",
            }
        },
    ]

    session_summaries = await ChatSession.aggregate(pipeline).to_list()

    return {"sessions": session_summaries, "count": len(session_summaries)}


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
