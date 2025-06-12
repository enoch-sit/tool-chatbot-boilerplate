from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from app.auth.middleware import authenticate_user
from app.services.flowise_service import FlowiseService
from app.services.auth_service import AuthService
from app.models.chatflow import UserChatflow, Chatflow
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/chatflows", tags=["chatflows"])

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

@router.get("/my-chatflows", response_model=List[Dict])
async def get_my_chatflows(
    current_user: Dict = Depends(authenticate_user)
):
    """
    Get list of chatflows accessible to the current user.
    This endpoint returns chatflows from the local database that the user has access to.
    """
    try:
        user_id = current_user.get('user_id')
        
        # Get user's active chatflow access records
        user_chatflows = await UserChatflow.find(
            UserChatflow.user_id == user_id,
            UserChatflow.is_active == True
        ).to_list()
        
        if not user_chatflows:
            logger.info(f"No active chatflows found for user {user_id}")
            return []
        
        # Extract chatflow IDs (these are flowise_ids stored in chatflow_id field)
        chatflow_ids = [uc.chatflow_id for uc in user_chatflows]
        
        # Get chatflow details from local database
        chatflows = await Chatflow.find(
            Chatflow.flowise_id.in_(chatflow_ids),
            Chatflow.sync_status != "deleted",  # Exclude deleted chatflows
            Chatflow.deployed == True  # Only show deployed chatflows to users
        ).to_list()
        
        # Create response with user-friendly information
        result = []
        for chatflow in chatflows:
            # Find corresponding access record for additional info
            access_record = next(
                (uc for uc in user_chatflows if uc.chatflow_id == chatflow.flowise_id), 
                None
            )
            
            chatflow_dict = {
                "id": chatflow.flowise_id,
                "name": chatflow.name,
                "description": chatflow.description,
                "category": chatflow.category,
                "type": chatflow.type,
                "deployed": chatflow.deployed,
                "assigned_at": access_record.assigned_at.isoformat() if access_record and access_record.assigned_at else None
            }
            result.append(chatflow_dict)
        
        logger.info(f"Returning {len(result)} accessible chatflows for user {user_id}")
        return result
        
    except Exception as e:
        logger.error(f"Error getting chatflows for user {current_user.get('username', 'unknown')}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error while retrieving your chatflows"
        )
