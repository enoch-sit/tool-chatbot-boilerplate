from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict
from pydantic import BaseModel
from app.auth.middleware import authenticate_user
from app.models.user import User
from app.models.chatflow import UserChatflow, Chatflow, ChatflowSyncResult
from app.services.external_auth_service import ExternalAuthService
from app.services.chatflow_service import ChatflowService
from app.services.flowise_service import FlowiseService
from app.database import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from app.core.logging import logger

router = APIRouter(prefix="/api/admin", tags=["admin"])
security = HTTPBearer()

class AddUsersToChatflowRequest(BaseModel):
    user_ids: List[str]
    chatflow_id: str

class UserChatflowResponse(BaseModel):
    user_id: str
    username: str
    status: str
    message: str

@router.post("/chatflows/add-users", response_model=List[UserChatflowResponse])
async def add_users_to_chatflow(
    request: AddUsersToChatflowRequest,
    current_user: Dict = Depends(authenticate_user)
):
    """
    Add multiple users to a chatflow (Admin only)
    
    Args:
        request: Contains list of user_ids and chatflow_id
        current_user: Current authenticated user (must be Admin)
    
    Returns:
        List of results for each user operation
    """
    # Verify admin role
    if current_user.get("role") != "Admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
        )
    
    results = []
    
    # Process each user_id
    for user_id in request.user_ids:
        try:
            # Validate user exists
            user = await User.get(user_id)
            if not user:
                results.append(UserChatflowResponse(
                    user_id=user_id,
                    username="Unknown",
                    status="error",
                    message="User not found"
                ))
                continue
            
            # Check if user already has access to this chatflow
            existing_access = await UserChatflow.find_one(
                UserChatflow.user_id == user_id,
                UserChatflow.chatflow_id == request.chatflow_id
            )
            
            if existing_access:
                if existing_access.is_active:
                    results.append(UserChatflowResponse(
                        user_id=user_id,
                        username=user.username,
                        status="skipped",
                        message="User already has active access to this chatflow"
                    ))
                else:
                    # Reactivate existing inactive access
                    existing_access.is_active = True
                    await existing_access.save()
                    results.append(UserChatflowResponse(
                        user_id=user_id,
                        username=user.username,
                        status="reactivated",
                        message="Existing access reactivated"
                    ))
            else:
                # Create new user-chatflow relationship
                user_chatflow = UserChatflow(
                    user_id=user_id,
                    chatflow_id=request.chatflow_id,
                    is_active=True
                )
                await user_chatflow.insert()
                
                results.append(UserChatflowResponse(
                    user_id=user_id,
                    username=user.username,
                    status="success",
                    message="Access granted successfully"
                ))
                
                logger.info(f"Admin {current_user.get('username')} granted chatflow {request.chatflow_id} access to user {user.username}")
        
        except Exception as e:
            logger.error(f"Error adding user {user_id} to chatflow {request.chatflow_id}: {e}")
            results.append(UserChatflowResponse(
                user_id=user_id,
                username="Unknown",
                status="error",
                message=f"Internal error: {str(e)}"
            ))
    
    logger.info(f"Admin {current_user.get('username')} processed {len(request.user_ids)} users for chatflow {request.chatflow_id}")
    return results

@router.post("/chatflows/{chatflow_id}/users/{user_id}")
async def add_single_user_to_chatflow(
    chatflow_id: str,
    user_id: str,
    current_user: Dict = Depends(authenticate_user)
):
    """
    Add a single user to a chatflow (Admin only)
    
    Args:
        chatflow_id: The chatflow ID to grant access to
        user_id: The user ID to grant access to
        current_user: Current authenticated user (must be Admin)
    """
    # Verify admin role
    if current_user.get("role") != "Admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
        )
    
    try:
        # Validate user exists
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user already has access
        existing_access = await UserChatflow.find_one(
            UserChatflow.user_id == user_id,
            UserChatflow.chatflow_id == chatflow_id
        )
        
        if existing_access and existing_access.is_active:
            raise HTTPException(
                status_code=409, 
                detail="User already has active access to this chatflow"
            )
        
        if existing_access and not existing_access.is_active:
            # Reactivate existing access
            existing_access.is_active = True
            await existing_access.save()
            message = "Existing access reactivated"
        else:
            # Create new access
            user_chatflow = UserChatflow(
                user_id=user_id,
                chatflow_id=chatflow_id,
                is_active=True
            )
            await user_chatflow.insert()
            message = "Access granted successfully"
        
        logger.info(f"Admin {current_user.get('username')} granted chatflow {chatflow_id} access to user {user.username}")
        
        return {
            "user_id": user_id,
            "username": user.username,
            "chatflow_id": chatflow_id,
            "status": "success",
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding user {user_id} to chatflow {chatflow_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/chatflows/{chatflow_id}/users/{user_id}")
async def remove_user_from_chatflow(
    chatflow_id: str,
    user_id: str,
    current_user: Dict = Depends(authenticate_user)
):
    """
    Remove a user from a chatflow (Admin only)
    
    Args:
        chatflow_id: The chatflow ID to revoke access from
        user_id: The user ID to revoke access from
        current_user: Current authenticated user (must be Admin)
    """
    # Verify admin role
    if current_user.get("role") != "Admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to manage user chatflow access"
        )
    
    try:
        # Find the user-chatflow relationship
        user_chatflow = await UserChatflow.find_one(
            UserChatflow.user_id == user_id,
            UserChatflow.chatflow_id == chatflow_id
        )
        
        if not user_chatflow:
            raise HTTPException(
                status_code=404, 
                detail="User does not have access to this chatflow"
            )
        
        if not user_chatflow.is_active:
            raise HTTPException(
                status_code=409, 
                detail="User access is already inactive"
            )
        
        # Deactivate access instead of deleting for audit purposes
        user_chatflow.is_active = False
        await user_chatflow.save()
        
        # Get username for logging
        user = await User.get(user_id)
        username = user.username if user else "Unknown"
        
        logger.info(f"Admin {current_user.get('username')} revoked chatflow {chatflow_id} access from user {username}")
        
        return {
            "user_id": user_id,
            "username": username,
            "chatflow_id": chatflow_id,
            "status": "success",
            "message": "Access revoked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing user {user_id} from chatflow {chatflow_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/users", response_model=List[Dict])
async def list_all_users(
    current_user: Dict = Depends(authenticate_user)
):
    """
    List all users (Admin only)
    
    Args:
        current_user: Current authenticated user (must be Admin)
    
    Returns:
        List of all users with basic information
    """
    # Verify admin role
    if current_user.get("role") != "Admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to list all users"
        )
    
    try:
        users = await User.find_all().to_list()
        
        # Return user information without sensitive data
        user_list = []
        for user in users:
            user_list.append({
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "credits": user.credits,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            })
        
        logger.info(f"Admin {current_user.get('username')} listed all users ({len(user_list)} total)")
        return user_list
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/users/{user_id}/chatflows", response_model=List[Dict])
async def list_user_chatflows(
    user_id: str,
    current_user: Dict = Depends(authenticate_user)
):
    """
    List all chatflows accessible to a specific user (Admin only)
    
    Args:
        user_id: The user ID to check chatflow access for
        current_user: Current authenticated user (must be Admin)
    
    Returns:
        List of chatflows the user has access to
    """
    # Verify admin role
    if current_user.get("role") != "Admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to view user chatflow access"
        )
    
    try:
        # Validate user exists
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all active chatflow access for the user
        user_chatflows = await UserChatflow.find(
            UserChatflow.user_id == user_id,
            UserChatflow.is_active == True
        ).to_list()
        
        chatflow_list = []
        for uc in user_chatflows:
            chatflow_list.append({
                "chatflow_id": uc.chatflow_id,
                "is_active": uc.is_active,
                "created_at": uc.created_at.isoformat() if uc.created_at else None
            })
        
        logger.info(f"Admin {current_user.get('username')} listed chatflows for user {user.username} ({len(chatflow_list)} total)")
        
        return {
            "user_id": user_id,
            "username": user.username,
            "chatflows": chatflow_list,
            "total_count": len(chatflow_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing chatflows for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/users/sync", response_model=Dict)
async def sync_users_with_external_auth(
    credentials: HTTPAuthorizationCredentials = Security(security),
    current_user: Dict = Depends(authenticate_user)
):
    """
    Sync users with external auth service (admin only)
    
    This endpoint fetches all users from the external auth service and synchronizes
    them with the local database. It will:
    - Create new users that exist in external auth but not locally
    - Update existing users with current information from external auth
    - Mark users as inactive if they no longer exist in external auth
    
    Args:
        credentials: JWT token credentials from Authorization header
        current_user: Current authenticated user (must be admin)
    
    Returns:
        Dict containing sync statistics and results
    """
    # Verify admin role
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to sync users"
        )
    
    try:
        # Initialize external auth service
        external_auth_service = ExternalAuthService()
        
        # Get the raw JWT token from credentials
        admin_token = credentials.credentials
        
        # Fetch users from external auth service
        external_users_response = await external_auth_service.get_all_users(admin_token)
        
        if not external_users_response:
            raise HTTPException(
                status_code=502,
                detail="Failed to fetch users from external auth service"
            )
        
        external_users = external_users_response.get("users", [])
        
        # Get all existing local users
        local_users = await User.find_all().to_list()
        local_users_dict = {user.email: user for user in local_users}
        
        # Track sync statistics
        stats = {
            "total_external_users": len(external_users),
            "total_local_users": len(local_users),
            "created_users": 0,
            "updated_users": 0,
            "deactivated_users": 0,
            "errors": []
        }
        
        # Process external users
        external_emails = set()
        
        for ext_user in external_users:
            try:
                email = ext_user.get("email")
                username = ext_user.get("username")
                role = ext_user.get("role", "User")
                is_verified = ext_user.get("isVerified", False)
                
                if not email or not username:
                    stats["errors"].append(f"Invalid user data: missing email or username")
                    continue
                
                external_emails.add(email)
                
                if email in local_users_dict:
                    # Update existing user
                    local_user = local_users_dict[email]
                    updated = False
                    
                    if local_user.username != username:
                        local_user.username = username
                        updated = True
                    
                    if local_user.role != role:
                        local_user.role = role
                        updated = True
                    
                    if not local_user.is_active:
                        local_user.is_active = True
                        updated = True
                    
                    if updated:
                        local_user.updated_at = datetime.utcnow()
                        await local_user.save()
                        stats["updated_users"] += 1
                        logger.info(f"Updated user: {username} ({email})")
                
                else:
                    # Create new user
                    new_user = User(
                        username=username,
                        email=email,
                        password_hash="",  # External auth handles passwords
                        role=role,
                        is_active=True,
                        credits=100,  # Default credits for new users
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    await new_user.insert()
                    stats["created_users"] += 1
                    logger.info(f"Created new user: {username} ({email})")
            
            except Exception as e:
                stats["errors"].append(f"Error processing user {ext_user.get('email', 'unknown')}: {str(e)}")
                logger.error(f"Error processing external user: {e}")
        
        # Deactivate local users that no longer exist in external auth
        for email, local_user in local_users_dict.items():
            if email not in external_emails and local_user.is_active:
                local_user.is_active = False
                local_user.updated_at = datetime.utcnow()
                await local_user.save()
                stats["deactivated_users"] += 1
                logger.info(f"Deactivated user: {local_user.username} ({email})")
        
        # Log sync completion
        logger.info(f"Admin {current_user.get('username')} completed user sync: "
                   f"Created: {stats['created_users']}, "
                   f"Updated: {stats['updated_users']}, "
                   f"Deactivated: {stats['deactivated_users']}")
        
        return {
            "status": "success",
            "message": "User synchronization completed successfully",
            "timestamp": datetime.utcnow().isoformat(),
            "statistics": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during user synchronization: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Chatflow Service dependency
async def get_chatflow_service(
    db = Depends(get_database),
    flowise_service: FlowiseService = Depends(lambda: FlowiseService())
) -> ChatflowService:
    return ChatflowService(db, flowise_service)

# Chatflow Management Endpoints

@router.post("/chatflows/sync", response_model=ChatflowSyncResult)
async def sync_chatflows_from_flowise(
    chatflow_service: ChatflowService = Depends(get_chatflow_service),
    current_user: Dict = Depends(authenticate_user)
):
    """
    Synchronize chatflows from Flowise API to local database.
    This will fetch all chatflows from Flowise and update the local database.
    """
    logger.info(f"Admin {current_user['email']} initiated chatflow sync")
    
    try:
        result = await chatflow_service.sync_chatflows_from_flowise()
        
        logger.info(
            f"Chatflow sync completed: {result.created} created, "
            f"{result.updated} updated, {result.deleted} deleted, "
            f"{result.errors} errors"
        )
        
        return result
    except Exception as e:
        logger.error(f"Chatflow sync failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync chatflows: {str(e)}"
        )

@router.get("/chatflows", response_model=List[Chatflow])
async def list_all_chatflows(
    include_deleted: bool = False,
    chatflow_service: ChatflowService = Depends(get_chatflow_service),
    current_user: Dict = Depends(authenticate_user)
):
    """
    List all chatflows stored in the database.
    """
    try:
        chatflows = await chatflow_service.list_chatflows(include_deleted=include_deleted)
        return chatflows
    except Exception as e:
        logger.error(f"Failed to list chatflows: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list chatflows: {str(e)}"
        )

@router.get("/chatflows/stats")
async def get_chatflow_stats(
    chatflow_service: ChatflowService = Depends(get_chatflow_service),
    current_user: Dict = Depends(authenticate_user)
):
    """
    Get chatflow statistics including sync status.
    """
    try:
        stats = await chatflow_service.get_chatflow_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get chatflow stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get chatflow stats: {str(e)}"
        )

@router.get("/chatflows/{flowise_id}", response_model=Chatflow)
async def get_chatflow_by_id(
    flowise_id: str,
    chatflow_service: ChatflowService = Depends(get_chatflow_service),
    current_user: Dict = Depends(authenticate_user)
):
    """
    Get a specific chatflow by its Flowise ID.
    """
    try:
        chatflow = await chatflow_service.get_chatflow_by_flowise_id(flowise_id)
        if not chatflow:
            raise HTTPException(
                status_code=404,
                detail=f"Chatflow with ID {flowise_id} not found"
            )
        return chatflow
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chatflow {flowise_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get chatflow: {str(e)}"
        )

@router.delete("/chatflows/{flowise_id}")
async def force_delete_chatflow(
    flowise_id: str,
    chatflow_service: ChatflowService = Depends(get_chatflow_service),
    current_user: Dict = Depends(authenticate_user)
):
    """
    Force delete a chatflow from the local database.
    This does not delete the chatflow from Flowise.
    """
    try:
        result = await chatflow_service.collection.delete_one({"flowise_id": flowise_id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Chatflow with ID {flowise_id} not found"
            )
        
        logger.info(f"Admin {current_user['email']} deleted chatflow {flowise_id}")
        return {"message": f"Chatflow {flowise_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete chatflow {flowise_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete chatflow: {str(e)}"
        )
