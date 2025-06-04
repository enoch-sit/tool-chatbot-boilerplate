import bcrypt
from typing import Dict, Optional
from app.config import settings
from app.auth.jwt_handler import JWTHandler
from app.models.user import User
from app.models.chatflow import UserChatflow

class AuthService:
    def __init__(self):
        self.jwt_handler = JWTHandler()

    async def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user against MongoDB database"""
        try:
            # Find user by username
            user = await User.find_one(User.username == username)
            if not user:
                return None
            
            # Check if user is active
            if not user.is_active:
                return None
            
            # Verify password (assuming passwords are hashed with bcrypt)
            if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                return None
            
            # Return user data
            return {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "credits": user.credits
            }
                    
        except Exception as e:
            print(f"Auth service error: {e}")
            return None

    async def validate_user_permissions(self, user_id: str, chatflow_id: str) -> bool:
        """Validate if user has access to specific chatflow using MongoDB"""
        try:
            # Find user first
            user = await User.get(user_id)
            if not user:
                return False
            
            # Admin users have access to all chatflows
            if user.role == "Admin":
                return True
            
            # Check if user has specific access to this chatflow
            user_chatflow = await UserChatflow.find_one(
                UserChatflow.user_id == user_id,
                UserChatflow.chatflow_id == chatflow_id,
                UserChatflow.is_active == True
            )
            
            return user_chatflow is not None
                    
        except Exception as e:
            print(f"Permission validation error: {e}")
            return False

    def create_access_token(self, user_data: Dict) -> str:
        """Create JWT access token for authenticated user"""
        payload = {
            "user_id": user_data.get("id"),
            "username": user_data.get("username"),
            "role": user_data.get("role", "User"),
            "email": user_data.get("email")
        }
        return self.jwt_handler.create_token(payload)
