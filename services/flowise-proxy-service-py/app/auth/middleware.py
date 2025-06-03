from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict
from app.auth.jwt_handler import JWTHandler

security = HTTPBearer()

async def authenticate_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """Middleware to authenticate users based on JWT token"""
    try:
        token = credentials.credentials
        payload = JWTHandler.verify_token(token)
        
        if payload is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
        
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
