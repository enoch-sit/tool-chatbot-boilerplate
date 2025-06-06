import httpx
import logging
from typing import Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class ExternalAuthService:
    def __init__(self):
        self.auth_url = settings.EXTERNAL_AUTH_URL.rstrip('/')
        self.timeout = 10
    
    async def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """
        Authenticate user via external auth service
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            Dict containing token and user info, or None if authentication fails
        """
        try:
            auth_payload = {
                "username": username,
                "password": password
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.auth_url}/api/auth/login",
                    json=auth_payload,
                    headers=headers,
                    timeout=self.timeout
                )
                print("response.status_code")
                print(response.status_code)
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "access_token": data.get("accessToken"),
                        "refresh_token": data.get("refreshToken"),
                        "token_type": "bearer",
                        "user": data.get("user", {}),
                        "message": data.get("message", "Login successful")
                    }
                    # {
                    #   "message": "Login successful",
                    #   "accessToken": "string",
                    #   "refreshToken": "string",
                    #   "user": {
                    #     "id": "string",
                    #     "username": "string",
                    #     "email": "string",
                    #     "isVerified": boolean,
                    #     "role": "string"
                    #   }
                    # }
                elif response.status_code == 401:
                    logger.warning(f"Authentication failed for {username}: Invalid credentials")
                    return None
                else:
                    logger.error(f"Auth service returned {response.status_code}: {response.text}")
                    return None
                    
        except httpx.ConnectError:
            logger.error(f"Cannot connect to auth service at {self.auth_url}")
            return None
        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to auth service")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {e}")
            return None
    
    async def refresh_token(self, refresh_token: str) -> Optional[Dict]:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: The refresh token
            
        Returns:
            Dict containing new tokens, or None if refresh fails
        """
        try:
            refresh_payload = {
                "refreshToken": refresh_token
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.auth_url}/api/auth/refresh",
                    json=refresh_payload,
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "access_token": data.get("accessToken"),
                        "refresh_token": data.get("refreshToken"),
                        "token_type": "bearer"
                    }
                else:
                    logger.error(f"Token refresh failed: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return None
    
    async def get_all_users(self, access_token: str) -> Optional[Dict]:
        """
        Fetch all users from external auth service
        
        Args:
            access_token: Admin access token for authentication
            
        Returns:
            Dict containing users list, or None if request fails
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.auth_url}/api/admin/users",
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data
                elif response.status_code == 401:
                    logger.warning("Unauthorized access to external auth service")
                    return None
                elif response.status_code == 403:
                    logger.warning("Forbidden: Admin access required")
                    return None
                else:
                    logger.error(f"External auth service returned {response.status_code}: {response.text}")
                    return None
                    
        except httpx.ConnectError:
            logger.error(f"Cannot connect to auth service at {self.auth_url}")
            return None
        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to auth service")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching users: {e}")
            return None