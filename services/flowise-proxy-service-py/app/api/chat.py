from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.auth.middleware import authenticate_user
from app.services.flowise_service import FlowiseService
from app.services.accounting_service import AccountingService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    chatflow_id: str
    question: str
    overrideConfig: Dict[str, Any] = {}

class AuthRequest(BaseModel):
    username: str
    password: str

@router.post("/authenticate")
async def authenticate(auth_request: AuthRequest):
    """
    Authenticate user and return JWT token
    """
    try:
        auth_service = AuthService()
        
        # Authenticate against external service
        user_data = await auth_service.authenticate_user(
            auth_request.username, 
            auth_request.password
        )
        
        if user_data is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials"
            )
        
        # Create JWT token
        token = auth_service.create_access_token(user_data)
        
        return {
            "access_token": token, 
            "token_type": "bearer",
            "user": {
                "username": user_data.get("username"),
                "role": user_data.get("role"),
                "email": user_data.get("email")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
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
        flowise_service = FlowiseService()
        accounting_service = AccountingService()
        auth_service = AuthService()
        
        user_id = current_user.get("user_id")
        chatflow_id = chat_request.chatflow_id
        
        # 1. Validate user has access to chatflow
        if not await auth_service.validate_user_permissions(user_id, chatflow_id):
            raise HTTPException(
                status_code=403,
                detail="Access denied to this chatflow"
            )
        
        # 2. Check if chatflow exists
        if not await flowise_service.validate_chatflow_exists(chatflow_id):
            raise HTTPException(
                status_code=404,
                detail="Chatflow not found"
            )
        
        # 3. Get chatflow cost
        cost = await accounting_service.get_chatflow_cost(chatflow_id)
        
        # 4. Check user credits
        user_credits = await accounting_service.check_user_credits(user_id)
        if user_credits is None or user_credits < cost:
            raise HTTPException(
                status_code=402,
                detail="Insufficient credits"
            )
        
        # 5. Deduct credits before processing
        if not await accounting_service.deduct_credits(user_id, cost, f"Chat request to {chatflow_id}"):
            raise HTTPException(
                status_code=402,
                detail="Failed to deduct credits"
            )
        
        # 6. Process chat request
        try:
            result = await flowise_service.predict(
                chatflow_id,
                chat_request.question,
                chat_request.overrideConfig
            )
            
            if result is None:
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
                "response": result,
                "metadata": {
                    "chatflow_id": chatflow_id,
                    "cost": cost,
                    "remaining_credits": user_credits - cost,
                    "user": current_user.get("username")
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
