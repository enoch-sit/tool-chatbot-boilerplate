from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from app.auth.middleware import authenticate_user
from app.services.flowise_service import FlowiseService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/chatflows", tags=["chatflows"])

@router.get("/", response_model=List[Dict])
async def list_chatflows(
    current_user: Dict = Depends(authenticate_user)
):
    """
    Get list of chatflows available to the current user.
    This endpoint filters chatflows based on user permissions.
    """
    try:
        flowise_service = FlowiseService()
        auth_service = AuthService()
        
        # Get all chatflows from Flowise
        all_chatflows = await flowise_service.list_chatflows()
        
        if all_chatflows is None:
            raise HTTPException(
                status_code=503,
                detail="Flowise service unavailable"
            )
        
        # Filter chatflows based on user permissions
        user_id = current_user.get("user_id")
        accessible_chatflows = []
        
        for chatflow in all_chatflows:
            chatflow_id = chatflow.get("id")
            if await auth_service.validate_user_permissions(user_id, chatflow_id):
                accessible_chatflows.append(chatflow)
        
        return accessible_chatflows
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chatflows: {str(e)}"
        )

@router.get("/{chatflow_id}")
async def get_chatflow(
    chatflow_id: str,
    current_user: Dict = Depends(authenticate_user)
):
    """Get specific chatflow details if user has access"""
    try:
        flowise_service = FlowiseService()
        auth_service = AuthService()
        user_id = current_user.get("user_id")
        
        # Check user permissions
        if not await auth_service.validate_user_permissions(user_id, chatflow_id):
            raise HTTPException(
                status_code=403,
                detail="Access denied to this chatflow"
            )
        
        # Get chatflow details
        chatflow = await flowise_service.get_chatflow(chatflow_id)
        
        if chatflow is None:
            raise HTTPException(
                status_code=404,
                detail="Chatflow not found"
            )
        
        return chatflow
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chatflow: {str(e)}"
        )

@router.get("/{chatflow_id}/config")
async def get_chatflow_config(
    chatflow_id: str,
    current_user: Dict = Depends(authenticate_user)
):
    """Get chatflow configuration if user has access"""
    try:
        flowise_service = FlowiseService()
        auth_service = AuthService()
        user_id = current_user.get("user_id")
        
        # Check user permissions
        if not await auth_service.validate_user_permissions(user_id, chatflow_id):
            raise HTTPException(
                status_code=403,
                detail="Access denied to this chatflow"
            )
        
        # Get chatflow config
        config = await flowise_service.get_chatflow_config(chatflow_id)
        
        if config is None:
            raise HTTPException(
                status_code=404,
                detail="Chatflow configuration not found"
            )
        
        return config
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chatflow config: {str(e)}"
        )
