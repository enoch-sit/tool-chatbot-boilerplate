import httpx
from typing import Dict, Optional
from app.config import settings
from app.auth.jwt_handler import JWTHandler

class AuthService:
    def __init__(self):
        self.external_auth_url = settings.EXTERNAL_AUTH_URL
        self.jwt_handler = JWTHandler()

    async def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user against external auth service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.external_auth_url}/authenticate",
                    json={"username": username, "password": password},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    return user_data
                else:
                    return None
                    
        except httpx.RequestError as e:
            print(f"Auth service error: {e}")
            return None
        except Exception as e:
            print(f"Unexpected auth error: {e}")
            return None

    async def validate_user_permissions(self, user_id: int, chatflow_id: str) -> bool:
        """Validate if user has access to specific chatflow"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.external_auth_url}/users/{user_id}/permissions",
                    params={"chatflow_id": chatflow_id},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    permissions = response.json()
                    return permissions.get("has_access", False)
                else:
                    return False
                    
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
