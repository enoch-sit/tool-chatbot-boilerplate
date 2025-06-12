from fastapi import APIRouter, HTTPException, Depends, Security, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field
from app.auth.middleware import authenticate_user, require_role, get_current_admin_user
from app.models.user import User
from app.models.chatflow import UserChatflow, Chatflow, ChatflowSyncResult
from app.services.external_auth_service import ExternalAuthService
from app.services.chatflow_service import ChatflowService
from app.services.flowise_service import FlowiseService
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from app.core.logging import logger
import traceback # Added for format_exc

"""
JWT token design
'sub' = '68142f163a381f81ef90342d'
'username' = 'user'
'email' = 'user@example.com'
'type' ='access'
'role' ='user'
'iat' = 1749452103
'exp' = 1749453003
'user_id' = '68142f163a381fe1e190342d'
"""

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
security = HTTPBearer()

class AddUsersToChatflowRequest(BaseModel):
    user_ids: List[str]
    chatflow_id: str

class AddUsersToChatlowByEmailRequest(BaseModel):
    emails: List[str]
    chatflow_id: str

class UserChatflowResponse(BaseModel):
    user_id: str
    username: str
    status: str
    message: str

class UserCleanupRequest(BaseModel):
    """Request model for user cleanup operations."""
    action: Literal["delete_invalid", "reassign_by_email", "deactivate_invalid"] = "deactivate_invalid"
    chatflow_ids: Optional[List[str]] = Field(None, description="Limit cleanup to specific chatflows")
    dry_run: bool = Field(False, description="Perform validation only without making changes")
    force: bool = Field(False, description="Force cleanup even if external auth lookup fails")

class InvalidUserAssignment(BaseModel):
    """Details of an invalid user assignment."""
    user_chatflow_id: str
    user_id: str
    chatflow_id: str
    chatflow_name: Optional[str]
    issue_type: Literal["user_not_found", "id_mismatch", "external_auth_error"]
    details: str
    suggested_action: str

class UserCleanupResult(BaseModel):
    """Response model for user cleanup operations."""
    total_records_processed: int
    invalid_user_ids_found: int
    records_deleted: int
    records_deactivated: int
    records_reassigned: int
    errors: int
    error_details: List[str]
    dry_run: bool
    cleanup_timestamp: datetime
    invalid_assignments: List[InvalidUserAssignment]

class UserAuditResult(BaseModel):
    """Response model for user assignment audit."""
    total_assignments: int
    valid_assignments: int
    invalid_assignments: int
    assignments_by_issue_type: Dict[str, int]
    chatflows_affected: int
    invalid_user_details: List[InvalidUserAssignment]
    audit_timestamp: datetime
    recommendations: List[str]

ADMIN_ROLE = 'admin'
USER_ROLE = 'user'

# Chatflow Service dependency
async def get_chatflow_service() -> ChatflowService:
    from app.database import database, connect_to_mongo
    from app.services.flowise_service import FlowiseService
    
    # If database is not connected, try to connect
    if database.database is None:
        logger.warning("Database not connected in admin endpoint, attempting to connect...")
        try:
            await connect_to_mongo()
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise HTTPException(status_code=500, detail="Failed to connect to database")
    
    if database.database is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    flowise_service = FlowiseService()
    return ChatflowService(database.database, flowise_service)


# NOT TESTED: This function uses user_ids instead of emails. Testing script only tests email-based functions.
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
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        # logger.warning(f"DEBUG: Access denied - user {current_user.get('username')} has role {user_role}")
        # logger.warning(f"DEBUG: User details - ID: {current_user.get('user_id')}, sub: {current_user.get('sub')}")
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
        )
    
    results = []
    
    # Process each user_id
    for user_id in request.user_ids:
        logger.info(f"DEBUG: Processing user_id: {user_id}")
        try:
            # DEBUG: Database query details
            logger.debug(f"DEBUG: Querying database for user_id: {user_id}")
            
            # Validate user exists
            user = await User.get(user_id)
            
            logger.debug(f"DEBUG: User query result - Found: {user is not None}")
            
            if not user:
                logger.warning(f"DEBUG: User {user_id} not found in database")
                results.append(UserChatflowResponse(
                    user_id=user_id,
                    username="Unknown",
                    status="error",
                    message="User not found"
                ))
                continue
            
            logger.info(f"DEBUG: User {user_id} found - username: {user.username}, email: {user.email}, active: {user.is_active}")
            
            # DEBUG: Check existing access
            logger.debug(f"DEBUG: Checking existing access for user {user_id}, chatflow {request.chatflow_id}")
            
            # Check if user already has access to this chatflow
            existing_access = await UserChatflow.find_one(
                UserChatflow.user_id == user_id,
                UserChatflow.chatflow_id == request.chatflow_id
            )
            
            logger.debug(f"DEBUG: Existing access query result: {existing_access}")
            logger.debug(f"🎯 Created UserChatflow record:")
            logger.debug(f"  user_id: '{user_id}' (type: {type(user_id)}, len: {len(user_id)})")
            if existing_access:
                logger.info(f"DEBUG: Existing access found for user {user_id} - is_active: {existing_access.is_active}, created: {existing_access.assigned_at}")
                if existing_access.is_active:
                    results.append(UserChatflowResponse(
                        user_id=user_id,
                        username=user.username,
                        status="skipped",
                        message="User already has active access to this chatflow"
                    ))
                else:                    # Reactivate existing inactive access
                    logger.debug(f"DEBUG: Reactivating access for user {user_id}")
                    existing_access.is_active = True
                    await existing_access.save()
                    logger.info(f"DEBUG: Successfully reactivated access for user {user_id}")
                    results.append(UserChatflowResponse(
                        user_id=user_id,
                        username=user.username,
                        status="reactivated",
                        message="Existing access reactivated"
                    ))
            else:
                logger.info(f"DEBUG: No existing access found - creating new access for user {user_id} to chatflow {request.chatflow_id}")
                
                # Create new user-chatflow relationship
                logger.debug(f"DEBUG: Creating UserChatflow object for user {user_id}")
                user_chatflow = UserChatflow(
                    user_id=user_id,
                    chatflow_id=request.chatflow_id,
                    is_active=True
                )
                
                logger.debug(f"DEBUG: Inserting UserChatflow into database")
                await user_chatflow.insert()
                logger.info(f"DEBUG: Successfully created new access for user {user_id}")
                # ADD THIS LOGGING:
                logger.debug(f"🎯 Created UserChatflow record:")
                logger.debug(f"  user_id: '{user_id}' (type: {type(user_id)}, len: {len(user_id)})")
                
                
                results.append(UserChatflowResponse(
                    user_id=user_id,
                    username=user.username,
                    status="success",
                    message="Access granted successfully"
                ))
                
                logger.info(f"Admin {current_user.get('username')} granted chatflow {request.chatflow_id} access to user {user.username}")
        
        except Exception as e:
            logger.error(f"DEBUG: Exception processing user {user_id}")
            logger.error(f"DEBUG: Exception type: {type(e).__name__}")
            logger.error(f"DEBUG: Exception message: {str(e)}")
            logger.error(f"DEBUG: Exception context - chatflow_id: {request.chatflow_id}")
            
            # Include stack trace for development debugging
            # import traceback
            logger.debug(f"DEBUG: Stack trace: {traceback.format_exc()}")
            
            logger.error(f"Error adding user {user_id} to chatflow {request.chatflow_id}: {e}")
            results.append(UserChatflowResponse(
                user_id=user_id,
                username="Unknown",
                status="error",
                message=f"Internal error: {str(e)}"
            ))
    
    logger.info(f"Admin {current_user.get('username')} processed {len(request.user_ids)} users for chatflow {request.chatflow_id}")
    return results

# NOT TESTED: This function uses user_id parameter. Testing script only tests email-based endpoints.
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
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        # logger.warning(f"DEBUG: Access denied - user {current_user.get('username')} has role {user_role}")
        # logger.warning(f"DEBUG: User details - ID: {current_user.get('user_id')}, sub: {current_user.get('sub')}")
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
            # ADD THIS LOGGING:
            logger.debug(f"🎯 Created UserChatflow record:")
            logger.debug(f"  user_id: '{user_id}' (type: {type(user_id)}, len: {len(user_id)})")
            logger.debug(f"  chatflow_id: '{chatflow_id}' (type: {type(chatflow_id)})")

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

# TESTED: This function is updated and not yet tested by test_add_user_to_chatflow()
@router.post("/chatflows/{chatflow_id}/users/email/{email}")
async def add_user_to_chatflow_by_email(
    chatflow_id: str,
    email: str,
    current_user: Dict = Depends(authenticate_user)
):
    # ... existing role verification ...
    
    try:
        # 🔧 FIX: Lookup user from external auth API instead of local database
        external_auth_service = ExternalAuthService()
        
        # Get admin token from current_user (now available!)
        admin_token = current_user.get('access_token')
        # Get user details from external auth system
        external_user = await external_auth_service.get_user_by_email(email,admin_token)
        
        if not external_user:
            raise HTTPException(
                status_code=404, 
                detail=f"User with email '{email}' not found in authentication system"
            )
        
        # 🔍 DEBUG: Log external user details
        logger.info(f"🔍 Found user in external auth system:")
        logger.info(f"  user_id: '{external_user.get('user_id')}' (len: {len(external_user.get('user_id', ''))})")
        logger.info(f"  username: '{external_user.get('username')}'")
        logger.info(f"  email: '{external_user.get('email')}'")
        
        # Use the external auth user_id for permission assignment
        external_user_id = external_user.get('user_id')
        
        # 🔍 DEBUG: Log what we're about to assign
        logger.info(f"🔍 About to assign (using external auth user_id):")
        logger.info(f"  user_id: '{external_user_id}'")
        logger.info(f"  chatflow_id: '{chatflow_id}'")
        
        # Create UserChatflow record using external auth user_id
        existing_access = await UserChatflow.find_one(
            UserChatflow.user_id == external_user_id,
            UserChatflow.chatflow_id == chatflow_id
        )
        
        if existing_access and existing_access.is_active:
            return {
                "user_id": external_user_id,
                "username": external_user.get('username'),
                "chatflow_id": chatflow_id,
                "status": "already_exists",
                "message": "User already has active access to this chatflow"
            }
        
        if existing_access and not existing_access.is_active:
            # Reactivate existing access
            existing_access.is_active = True
            await existing_access.save()
            message = "Existing access reactivated"
        else:
            # Create new access
            user_chatflow = UserChatflow(
                user_id=external_user_id,  # Use external auth user_id
                chatflow_id=chatflow_id,
                is_active=True
            )
            await user_chatflow.insert()
            message = "Access granted successfully"
        
        logger.info(f"Admin {current_user.get('username')} granted chatflow {chatflow_id} access to user {external_user.get('username')}")
        
        return {
            "user_id": external_user_id,
            "username": external_user.get('username'),
            "chatflow_id": chatflow_id,
            "status": "success",
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding user with email {email} to chatflow {chatflow_id}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    

# NOT TESTED: This function uses user_id parameter. Testing script only tests email-based removal.
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
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        # logger.warning(f"DEBUG: Access denied - user {current_user.get('username')} has role {user_role}")
        # logger.warning(f"DEBUG: User details - ID: {current_user.get('user_id')}, sub: {current_user.get('sub')}")
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
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

# TESTED: This function is tested by test_remove_user_from_chatflow()
@router.delete("/chatflows/{chatflow_id}/users/email/{email}")
async def remove_user_from_chatflow_by_email(
    chatflow_id: str,
    email: str,
    current_user: Dict = Depends(authenticate_user)
):
    """
    Remove a user from a chatflow by email (Admin only)
    
    Args:
        chatflow_id: The chatflow ID to revoke access from
        email: The user email to revoke access from
        current_user: Current authenticated user (must be Admin)
    """
    # Verify admin role
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to manage users in chatflows"
        )
    
    try:
        # Find user by email
        user = await User.find_one(User.email == email)
        if not user:
            raise HTTPException(status_code=404, detail=f"User with email '{email}' not found")
        
        # Use the existing remove user endpoint with the found user ID
        return await remove_user_from_chatflow(chatflow_id, str(user.id), current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing user with email {email} from chatflow {chatflow_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# TESTED: This function is tested by test_bulk_add_users_to_chatflow() 
@router.post("/chatflows/add-users-by-email", response_model=List[UserChatflowResponse])
async def add_users_to_chatflow_by_email(
    request: AddUsersToChatlowByEmailRequest, # request.chatflow_id is a flowise_id
    current_user: Dict = Depends(authenticate_user),
    chatflow_service: ChatflowService = Depends(get_chatflow_service) # Added ChatflowService dependency
):
    """
    Add multiple users to a chatflow by email (Admin only).
    If a user does not exist, they will be created.
    
    Args:
        request: Contains list of emails and chatflow_id
        current_user: Current authenticated user (must be Admin)
    
    Returns:
        List of results for each user operation
    """
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
        )
    
    try:
        # Validate that the chatflow (identified by request.chatflow_id, which is a flowise_id) exists
        target_flowise_id = request.chatflow_id
        # chatflow_document = await Chatflow.find_one(Chatflow.flowise_id == target_flowise_id)
        chatflow_document = await chatflow_service.get_chatflow_by_flowise_id(target_flowise_id)

        if not chatflow_document:
            logger.warning(f"add_users_to_chatflow_by_email: Chatflow with Flowise ID '{target_flowise_id}' not found. Aborting add for all users in request.")
            error_results = []
            for email_in_request in request.emails:
                user_for_error_msg = await User.find_one(User.email == email_in_request)
                username_for_error = user_for_error_msg.username if user_for_error_msg else email_in_request.split('@')[0]
                error_results.append(UserChatflowResponse(
                    user_id="N/A", 
                    username=username_for_error,
                    status="error",
                    message=f"Chatflow '{target_flowise_id}' not found"
                ))
            return error_results if error_results else []

        user_ids = []
        # email_to_id_map = {} # Not currently used to modify response
        
        for email in request.emails:
            user = await User.find_one(User.email == email)
            if not user:
                logger.info(f"User with email '{email}' not found during bulk assignment. Creating new user.")
                username = email.split('@')[0]

                temp_username = username
                counter = 1
                while await User.find_one(User.username == temp_username):
                    temp_username = f"{username}_{counter}"
                    counter += 1
                username = temp_username
                
                new_user = User(
                    username=username,
                    email=email,
                    password_hash="", 
                    role=USER_ROLE,
                    is_active=True
                )
                await new_user.insert()
                logger.info(f"New user '{username}' ({email}) created with ID {new_user.id} during bulk assignment.")
                user = new_user
            
            user_id = str(user.id)
            user_ids.append(user_id)
            # email_to_id_map[user_id] = email # Not used currently
        
        if not user_ids:
            return [] 
        
        user_ids_request = AddUsersToChatflowRequest(
            user_ids=user_ids,
            chatflow_id=request.chatflow_id # This is the validated flowise_id
        )
        
        results = await add_users_to_chatflow(user_ids_request, current_user)
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk add users by email for chatflow {request.chatflow_id if request else 'unknown'}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Chatflow Management Endpoints

# TESTED: This function is tested by test_sync_chatflows()
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

# TESTED: This function is tested by test_list_chatflows()
@router.get("/chatflows", response_model=List[Chatflow])
async def list_all_chatflows(
    include_deleted: bool = False,
    chatflow_service: ChatflowService = Depends(get_chatflow_service),
    current_user: Dict = Depends(authenticate_user)
):
    """
    List all chatflows stored in the database.
    """
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        # logger.warning(f"DEBUG: Access denied - user {current_user.get('username')} has role {user_role}")
        # logger.warning(f"DEBUG: User details - ID: {current_user.get('user_id')}, sub: {current_user.get('sub')}")
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
        )
    try:
        chatflows = await chatflow_service.list_chatflows(include_deleted=include_deleted)
        return chatflows
    except Exception as e:
        logger.error(f"Failed to list chatflows: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list chatflows: {str(e)}"
        )

# TESTED: This function is tested by test_chatflow_stats()
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

# TESTED: This function is tested by test_get_specific_chatflow()
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

# NOT TESTED: This function is not tested in the testing script
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

# TESTED: This function is tested by test_list_chatflow_users()
@router.get("/chatflows/{flowise_id}/users", response_model=List[Dict])
async def list_chatflow_users(
    flowise_id: str,
    current_user: Dict = Depends(authenticate_user),
    chatflow_service: ChatflowService = Depends(get_chatflow_service) # Added ChatflowService dependency
):
    """
    List all users assigned to a specific chatflow (Admin only)
    
    Args:
        flowise_id: The Flowise ID of the chatflow
        current_user: Current authenticated user (must be Admin)
        chatflow_service: Service for chatflow operations
    
    Returns:
        List of users assigned to the chatflow
    """
    logger.info(f"list_chatflow_users: Received request for flowise_id: '{flowise_id}'") # DEBUG log
    # Verify admin role
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to view chatflow users"
        )
    
    try:
        # Verify the chatflow exists by its flowise_id using ChatflowService.
        logger.debug(f"list_chatflow_users: Attempting to find Chatflow with flowise_id: '{flowise_id}' using chatflow_service") # DEBUG log
        # chatflow_exists = await Chatflow.find_one(Chatflow.flowise_id == flowise_id) # Old direct Beanie call
        chatflow_exists = await chatflow_service.get_chatflow_by_flowise_id(flowise_id) # New call via service
        logger.debug(f"list_chatflow_users: Result of chatflow_service.get_chatflow_by_flowise_id for flowise_id '{flowise_id}': {'Found' if chatflow_exists else 'Not Found'}") # DEBUG log
        
        if not chatflow_exists:
            logger.warning(f"list_chatflow_users: Chatflow with Flowise ID {flowise_id} not found when checking existence via service.")
            raise HTTPException(status_code=404, detail=f"Chatflow with Flowise ID {flowise_id} not found")

        # Find all active UserChatflow entries for this chatflow's flowise_id
        user_chatflow_links = await UserChatflow.find(
            UserChatflow.chatflow_id == flowise_id, # Query by flowise_id
            UserChatflow.is_active == True
        ).to_list()

        if not user_chatflow_links:
            logger.info(f"list_chatflow_users: No active user links found for chatflow {flowise_id}.")
            return [] 

        user_details_list = []
        for link in user_chatflow_links:
            user = await User.get(link.user_id) 
            if user:
                user_details_list.append({
                    "user_id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "assigned_at": link.assigned_at.isoformat() if link.assigned_at else None, # Corrected: created_at -> assigned_at
                    "is_active_in_chatflow": link.is_active 
                })
            else:
                logger.warning(f"User with ID {link.user_id} referenced in UserChatflow for chatflow {flowise_id} but not found in Users collection.")
        
        logger.info(f"list_chatflow_users: Returning {len(user_details_list)} users for chatflow {flowise_id}.")
        return user_details_list
        
    except HTTPException:
        raise 
    except Exception as e:
        logger.error(f"Error listing users for chatflow {flowise_id}: {e}") 
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# NOT TESTED: This function uses user_ids instead of emails. Testing script doesn't test this endpoint.
@router.post("/chatflows/{flowise_id}/users/bulk", response_model=List[UserChatflowResponse])
async def bulk_add_users_to_chatflow(
    flowise_id: str,
    request: AddUsersToChatflowRequest,
    current_user: Dict = Depends(authenticate_user),
    chatflow_service: ChatflowService = Depends(get_chatflow_service) # Added ChatflowService dependency
):
    """
    Add multiple users to a chatflow using bulk operation (Admin only)
    
    Args:
        flowise_id: The Flowise ID of the chatflow
        request: Contains list of user_ids
        current_user: Current authenticated user (must be Admin)
        chatflow_service: Service for chatflow operations
    
    Returns:
        List of results for each user operation
    """
    # Verify admin role
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
        )
    
    # Verify chatflow exists
    # chatflow = await Chatflow.find_one(Chatflow.flowise_id == flowise_id) # Old direct Beanie call
    chatflow = await chatflow_service.get_chatflow_by_flowise_id(flowise_id) # New call via service
    if not chatflow:
        logger.warning(f"bulk_add_users_to_chatflow: Chatflow with Flowise ID {flowise_id} not found via service.")
        raise HTTPException(status_code=404, detail="Chatflow not found")
    
    request.chatflow_id = flowise_id # This should be okay as flowise_id is the identifier used by UserChatflow.chatflow_id
    return await add_users_to_chatflow(request, current_user)

@router.post("/chatflows/{flowise_id}/users/email/bulk", response_model=List[UserChatflowResponse])
async def bulk_add_users_to_chatflow_by_email(
    flowise_id: str,
    request: AddUsersToChatlowByEmailRequest,
    current_user: Dict = Depends(authenticate_user),
    chatflow_service: ChatflowService = Depends(get_chatflow_service) # Added ChatflowService dependency
):
    """
    Add multiple users to a chatflow by email using bulk operation (Admin only)
    
    Args:
        flowise_id: The Flowise ID of the chatflow
        request: Contains list of emails
        current_user: Current authenticated user (must be Admin)
        chatflow_service: Service for chatflow operations
    
    Returns:
        List of results for each user operation
    """
    # Verify admin role
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        raise HTTPException(
            status_code=403, 
            detail="Admin access required to assign users to chatflows"
        )
    
    # Verify chatflow exists
    chatflow = await chatflow_service.get_chatflow_by_flowise_id(flowise_id) # New call via service
    if not chatflow:
        logger.warning(f"bulk_add_users_to_chatflow_by_email: Chatflow with Flowise ID {flowise_id} not found via service.")
        raise HTTPException(status_code=404, detail="Chatflow not found")
    
    request.chatflow_id = flowise_id # This should be okay as flowise_id is the identifier used by UserChatflow.chatflow_id
    return await add_users_to_chatflow_by_email(request, current_user)

# User Cleanup and Audit Endpoints

@router.get("/chatflows/audit-users", response_model=UserAuditResult)
async def audit_user_chatflow_assignments(
    include_valid: bool = Query(False, description="Include valid user assignments in the audit"),
    chatflow_id: Optional[str] = Query(None, description="Limit audit to specific chatflow"),
    current_user: Dict = Depends(get_current_admin_user),
    chatflow_service: ChatflowService = Depends(get_chatflow_service)
):
    """
    Audit UserChatflow records to identify mismatches with external auth system.
    
    This endpoint provides a read-only analysis of user assignment data quality
    without making any changes to the database.
    
    **Authentication**: Admin role required.
    """
    try:
        external_auth_service = ExternalAuthService()
        admin_token = current_user.get('access_token')
        
        # Query UserChatflow records
        query_filter = {}
        if chatflow_id:
            query_filter["chatflow_id"] = chatflow_id
            
        user_chatflow_links = await UserChatflow.find(query_filter).to_list()
        
        total_assignments = len(user_chatflow_links)
        invalid_assignments = []
        valid_count = 0
        invalid_count = 0
        assignments_by_issue_type = {}
        chatflows_affected = set()
        
        for link in user_chatflow_links:
            try:
                # Try to validate user exists in external auth
                external_user = await external_auth_service.get_user_by_id(link.user_id, admin_token)
                if external_user:
                    valid_count += 1
                    if include_valid:
                        chatflow = await chatflow_service.get_chatflow_by_flowise_id(link.chatflow_id)
                        invalid_assignments.append(InvalidUserAssignment(
                            user_chatflow_id=str(link.id),
                            user_id=link.user_id,
                            chatflow_id=link.chatflow_id,
                            chatflow_name=chatflow.name if chatflow else None,
                            issue_type="user_not_found",
                            details="User is valid",
                            suggested_action="no_action_needed"
                        ))
                else:
                    invalid_count += 1
                    chatflows_affected.add(link.chatflow_id)
                    issue_type = "user_not_found"
                    assignments_by_issue_type[issue_type] = assignments_by_issue_type.get(issue_type, 0) + 1
                    
                    chatflow = await chatflow_service.get_chatflow_by_flowise_id(link.chatflow_id)
                    invalid_assignments.append(InvalidUserAssignment(
                        user_chatflow_id=str(link.id),
                        user_id=link.user_id,
                        chatflow_id=link.chatflow_id,
                        chatflow_name=chatflow.name if chatflow else None,
                        issue_type=issue_type,
                        details="User ID not found in external auth system",
                        suggested_action="delete_or_reassign"
                    ))
                    
            except Exception as e:
                invalid_count += 1
                chatflows_affected.add(link.chatflow_id)
                issue_type = "external_auth_error"
                assignments_by_issue_type[issue_type] = assignments_by_issue_type.get(issue_type, 0) + 1
                
                chatflow = await chatflow_service.get_chatflow_by_flowise_id(link.chatflow_id)
                invalid_assignments.append(InvalidUserAssignment(
                    user_chatflow_id=str(link.id),
                    user_id=link.user_id,
                    chatflow_id=link.chatflow_id,
                    chatflow_name=chatflow.name if chatflow else None,
                    issue_type=issue_type,
                    details=f"External auth lookup failed: {str(e)}",
                    suggested_action="manual_review_required"
                ))
        
        recommendations = []
        if invalid_count > 0:
            recommendations.append(f"Found {invalid_count} invalid user assignments")
            if len(chatflows_affected) > 0:
                recommendations.append(f"{len(chatflows_affected)} chatflows have invalid user assignments")
            recommendations.append("Consider running cleanup with 'deactivate_invalid' action for safer cleanup")
        
        return UserAuditResult(
            total_assignments=total_assignments,
            valid_assignments=valid_count,
            invalid_assignments=invalid_count,
            assignments_by_issue_type=assignments_by_issue_type,
            chatflows_affected=len(chatflows_affected),
            invalid_user_details=invalid_assignments if not include_valid else [a for a in invalid_assignments if a.issue_type != "user_not_found"],
            audit_timestamp=datetime.now(),
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Error during user audit: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

@router.post("/chatflows/cleanup-users", response_model=UserCleanupResult)
async def cleanup_user_chatflow_assignments(
    cleanup_request: UserCleanupRequest,
    current_user: Dict = Depends(get_current_admin_user),
    chatflow_service: ChatflowService = Depends(get_chatflow_service)
):
    """
    Clean up legacy UserChatflow records with invalid or mismatched user IDs.
    
    This endpoint helps resolve issues from the migration to external auth integration
    by identifying and handling UserChatflow records that don't match external auth user IDs.
    
    **Authentication**: Admin role required.
    **Important**: This operation can modify or remove UserChatflow records permanently.
    """
    try:
        external_auth_service = ExternalAuthService()
        admin_token = current_user.get('access_token')
        
        # Query UserChatflow records
        query_filter = {}
        if cleanup_request.chatflow_ids:
            query_filter["chatflow_id"] = {"$in": cleanup_request.chatflow_ids}
            
        user_chatflow_links = await UserChatflow.find(query_filter).to_list()
        
        total_records_processed = len(user_chatflow_links)
        invalid_user_ids_found = 0
        records_deleted = 0
        records_deactivated = 0
        records_reassigned = 0
        errors = 0
        error_details = []
        invalid_assignments = []
        
        for link in user_chatflow_links:
            try:
                # Check if user exists in external auth
                external_user = await external_auth_service.get_user_by_id(link.user_id, admin_token)
                
                if not external_user:
                    invalid_user_ids_found += 1
                    chatflow = await chatflow_service.get_chatflow_by_flowise_id(link.chatflow_id)
                    
                    invalid_assignment = InvalidUserAssignment(
                        user_chatflow_id=str(link.id),
                        user_id=link.user_id,
                        chatflow_id=link.chatflow_id,
                        chatflow_name=chatflow.name if chatflow else None,
                        issue_type="user_not_found",
                        details="User ID not found in external auth system",
                        suggested_action=cleanup_request.action
                    )
                    invalid_assignments.append(invalid_assignment)
                    
                    # Perform cleanup action
                    if not cleanup_request.dry_run:
                        if cleanup_request.action == "delete_invalid":
                            await link.delete()
                            records_deleted += 1
                        elif cleanup_request.action == "deactivate_invalid":
                            link.is_active = False
                            await link.save()
                            records_deactivated += 1
                        elif cleanup_request.action == "reassign_by_email":
                            # Try to find user by looking up local user record
                            local_user = await User.get(link.user_id)
                            if local_user and local_user.email:
                                try:
                                    external_user_by_email = await external_auth_service.get_user_by_email(local_user.email, admin_token)
                                    if external_user_by_email:
                                        link.user_id = external_user_by_email.get('user_id')
                                        await link.save()
                                        records_reassigned += 1
                                    else:
                                        link.is_active = False
                                        await link.save()
                                        records_deactivated += 1
                                except Exception as reassign_error:
                                    error_details.append(f"Reassignment failed for {link.user_id}: {str(reassign_error)}")
                                    errors += 1
                            else:
                                link.is_active = False
                                await link.save()
                                records_deactivated += 1
                                
            except Exception as e:
                errors += 1
                error_details.append(f"Error processing UserChatflow {link.id}: {str(e)}")
                if not cleanup_request.force:
                    continue
        
        logger.info(f"Admin {current_user.get('username')} completed user cleanup: "
                   f"{records_deleted} deleted, {records_deactivated} deactivated, {records_reassigned} reassigned")
        
        return UserCleanupResult(
            total_records_processed=total_records_processed,
            invalid_user_ids_found=invalid_user_ids_found,
            records_deleted=records_deleted,
            records_deactivated=records_deactivated,
            records_reassigned=records_reassigned,
            errors=errors,
            error_details=error_details,
            dry_run=cleanup_request.dry_run,
            cleanup_timestamp=datetime.now(),
            invalid_assignments=invalid_assignments
        )
        
    except Exception as e:
        logger.error(f"Error during user cleanup: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")