from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict
from app.auth.jwt_handler import JWTHandler
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

security = HTTPBearer()

ADMIN_ROLE = 'admin'
USER_ROLE = 'user'
#   ADMIN_ROLE = 'admin',        // Highest privilege level - full system access
#   SUPERVISOR_ROLE = 'supervisor', // Mid-level privilege - user management
#   ENDUSER_ROLE = 'enduser',    // Base level access - standard user operations
#   USER_ROLE = 'user' // Base level access - standard user operations

async def authenticate_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """Middleware to authenticate users based on JWT token"""
    
    try:
        token = credentials.credentials
        payload = JWTHandler.verify_access_token(token)
        # After decoding the JWT
        logger.debug(f"🔍 JWT token contents:")
        logger.debug(f"  user_id: '{payload.get('user_id')}' (type: {type(payload.get('user_id'))}, len: {len(str(payload.get('user_id')))})")
        logger.debug(f"  sub: '{payload.get('sub')}' (type: {type(payload.get('sub'))}, len: {len(str(payload.get('sub')))})")
        
        if payload is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Handle both old and new payload formats for backward compatibility
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload - missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Normalize payload format
        normalized_payload = payload.copy()
        normalized_payload["user_id"] = user_id  # Ensure user_id is available for existing code
        normalized_payload["access_token"] = token  # 🔧 ADD THIS: Store raw token for admin operations
        
        return normalized_payload
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def require_role(required_role: str):
    """Decorator factory to require specific roles"""
    def role_checker(current_user: Dict = Depends(authenticate_user)) -> Dict:
        user_role = current_user.get("role", "")
        if user_role != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    return role_checker

async def get_current_admin_user(
    current_user: Dict = Depends(authenticate_user)
) -> Dict:
    """
    Dependency to get current user and verify admin role.
    
    Returns:
        Dict: Current user with admin privileges
        
    Raises:
        HTTPException: If user is not admin
    """
    user_role = current_user.get('role')
    if user_role != ADMIN_ROLE:
        raise HTTPException(
            status_code=403, 
            detail="Admin access required for this operation"
        )
    return current_user
