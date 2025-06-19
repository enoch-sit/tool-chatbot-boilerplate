from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional, List # Added List
from app.auth.middleware import authenticate_user
from app.services.flowise_service import FlowiseService
from app.services.accounting_service import AccountingService
from app.services.auth_service import AuthService
from app.services.external_auth_service import ExternalAuthService
from app.auth.jwt_handler import JWTHandler
from flowise import Flowise, PredictionData
from app.config import settings
from app.models.chatflow import UserChatflow # Added UserChatflow import

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

class ChatRequest(BaseModel):
    chatflow_id: str
    question: str
    overrideConfig: Dict[str, Any] = {}

class AuthRequest(BaseModel):
    username: str
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RevokeTokenRequest(BaseModel):
    token_id: Optional[str] = None  # Specific token to revoke
    all_tokens: Optional[bool] = False  # If True, revoke all user tokens

class MyAssignedChatflowsResponse(BaseModel):
    assigned_chatflow_ids: List[str]
    count: int

@router.post("/authenticate")
async def authenticate(auth_request: AuthRequest, request: Request):
    """
    Authenticate user via external auth service and return JWT tokens
    """
    try:
        external_auth_service = ExternalAuthService()
        
        # Authenticate user via external service
        auth_result = await external_auth_service.authenticate_user(
            auth_request.username, 
            auth_request.password
        )
        
        if auth_result is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials"
            )
        
        return {
            "access_token": auth_result["access_token"],
            "refresh_token": auth_result["refresh_token"], 
            "token_type": auth_result["token_type"],
            "user": auth_result["user"],
            "message": auth_result["message"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token(refresh_request: RefreshTokenRequest, request: Request):
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
                status_code=401,
                detail="Invalid or expired refresh token"
            )
        
        return {
            "access_token": refresh_result["access_token"],
            "refresh_token": refresh_result["refresh_token"], 
            "token_type": refresh_result["token_type"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.post("/revoke")
async def revoke_tokens(
    request: Request,
    current_user: Dict = Depends(authenticate_user),
    revoke_request: Optional[RevokeTokenRequest] = None
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
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_revoked == True
                ).count()
                return {
                    "message": "All tokens revoked successfully",
                    "revoked_tokens": revoked_count
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to revoke tokens")
        
        elif specific_token_id:
            # Revoke specific token
            success = await auth_service.revoke_refresh_token(specific_token_id)
            if success:
                return {
                    "message": "Token revoked successfully",
                    "revoked_tokens": 1
                }
            else:
                raise HTTPException(status_code=404, detail="Token not found or already revoked")
        
        else:
            # Revoke current token (default behavior)
            success = await auth_service.revoke_refresh_token(current_token_id)
            if success:
                return {
                    "message": "Token revoked successfully", 
                    "revoked_tokens": 1
                }
            else:
                raise HTTPException(status_code=404, detail="Token not found or already revoked")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token revocation failed: {str(e)}"
        )

@router.post("/predict")
async def chat_predict(
    chat_request: ChatRequest,
    current_user: Dict = Depends(authenticate_user)
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
                status_code=403,
                detail="Access denied to this chatflow"
            )
        
        # 2. Initialize Flowise client directly
        flowise_client = Flowise(settings.FLOWISE_API_URL, settings.FLOWISE_API_KEY)
        
        # 3. Get chatflow cost
        cost = await accounting_service.get_chatflow_cost(chatflow_id)
        
        # 4. Check user credits
        user_credits = await accounting_service.check_user_credits(user_id, user_token)
        if user_credits is None or user_credits < cost:
            raise HTTPException(
                status_code=402,
                detail="Insufficient credits"
            )
        
        # 5. Deduct credits before processing
        if not await accounting_service.deduct_credits(user_id, cost, user_token, f"Chat request to {chatflow_id}"):
            raise HTTPException(
                status_code=402,
                detail="Failed to deduct credits"
            )
          # 6. Process chat request using Flowise library with streaming
        try:
            # Create prediction using Flowise library with streaming enabled
            completion = flowise_client.create_prediction(
                PredictionData(
                    chatflowId=chatflow_id,
                    question=chat_request.question,
                    streaming=True,  # Enable streaming for proxy behavior
                    overrideConfig=chat_request.overrideConfig if chat_request.overrideConfig else None
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
                await accounting_service.log_transaction(user_id, chatflow_id, cost, False)
                raise HTTPException(
                    status_code=503,
                    detail="Chat service unavailable"
                )
            
            # 7. Log successful transaction
            await accounting_service.log_transaction(user_id, chatflow_id, cost, True)
            
            # 8. Return consolidated response
            return {
                "response": full_response,
                "metadata": {
                    "chatflow_id": chatflow_id,
                    "cost": cost,
                    "remaining_credits": user_credits - cost,
                    "user": current_user.get("username"),
                    "streaming": True
                }
            }
            
        except Exception as processing_error:
            # Log failed processing
            await accounting_service.log_transaction(user_id, chatflow_id, cost, False)
            raise HTTPException(
                status_code=500,
                detail=f"Chat processing failed: {str(processing_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Request failed: {str(e)}"
        )

@router.get("/credits")
async def get_user_credits(
    current_user: Dict = Depends(authenticate_user)
):
    """Get current user's credit balance"""
    try:
        accounting_service = AccountingService()
        user_id = current_user.get("user_id")
        
        credits = await accounting_service.check_user_credits(user_id)
        
        if credits is None:
            raise HTTPException(
                status_code=503,
                detail="Accounting service unavailable"
            )
        
        return {
            "user_id": user_id,
            "username": current_user.get("username"),
            "credits": credits
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve credits: {str(e)}"
        )

@router.get("/my-assigned-chatflows", response_model=MyAssignedChatflowsResponse)
async def get_my_assigned_chatflows(
    current_user: Dict = Depends(authenticate_user)
):
    """Get a list of chatflow IDs the current authenticated user is actively assigned to."""
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            # This should ideally not happen if authenticate_user works correctly
            raise HTTPException(status_code=400, detail="User ID not found in token")

        active_assignments = await UserChatflow.find(
            UserChatflow.user_id == user_id,
            UserChatflow.is_active == True
        ).to_list()

        assigned_chatflow_ids = [assignment.chatflow_id for assignment in active_assignments]
        
        return {
            "assigned_chatflow_ids": assigned_chatflow_ids,
            "count": len(assigned_chatflow_ids)
        }

    except Exception as e:
        # Consider more specific error logging if needed
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve assigned chatflows: {str(e)}"
        )
