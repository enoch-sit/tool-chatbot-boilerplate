import httpx
import logging
from typing import Dict, Optional
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# External authentication service configuration
EXTERNAL_AUTH_URL = "http://localhost:3000"
SECONDARY_AUTH_URL = "http://localhost:8000"
AUTH_TIMEOUT = 10000  # seconds

# Test user credentials
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
    "role": "Admin"
}

SUPERVISOR_USERS = [
    {
        "username": "supervisor1",
        "email": "supervisor1@example.com",
        "password": "Supervisor1@",
        "role": "supervisor",
    },
    {
        "username": "supervisor2",
        "email": "supervisor2@example.com",
        "password": "Supervisor2@",
        "role": "supervisor",
    },
]

REGULAR_USERS = [
    {
        "username": "user1",
        "email": "user1@example.com",
        "password": "User1@123",
        "role": "enduser",
    },
    {
        "username": "user2",
        "email": "user2@example.com",
        "password": "User2@123",
        "role": "enduser",
    },
]
def get_jwt_token_secondary(username: str, password: str) -> Optional[Dict]:
        """Get JWT token from the secondary authentication endpoint"""
        try:
            auth_payload = {
                "username": username,
                "password": password
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            response = requests.get(
                f"{SECONDARY_AUTH_URL}/health"
            )
            print(response)
            response = requests.post(
                f"{SECONDARY_AUTH_URL}/chat/authenticate",
                json=auth_payload,
                headers=headers,
                timeout=AUTH_TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "access_token": data["access_token"],
                    "refresh_token": data["refresh_token"],
                    "token_type": data["token_type"],
                    "user": data["user"],
                    "message": data["message"]
                }
            else:
                logger.error(f"Secondary auth service returned {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error with secondary auth service: {e}")
            return None

def get_jwt_token(username: str, password: str) -> Optional[Dict]:
    """
    Get JWT token from localhost:3000/api/auth/login
    
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
        
        response = requests.post(
            f"{EXTERNAL_AUTH_URL}/api/auth/login",
            json=auth_payload,
            headers=headers,
            timeout=AUTH_TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "access_token": data["accessToken"],
                "refresh_token": data["refreshToken"],
                "token_type": "bearer",
                "user": data["user"],
                "message": data["message"]
            }
        elif response.status_code == 401:
            logger.warning(f"Authentication failed for {username}: Invalid credentials")
            return None
        else:
            logger.error(f"Auth service returned {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to auth service at {EXTERNAL_AUTH_URL}")
        return None
    except requests.exceptions.Timeout:
        logger.error(f"Timeout connecting to auth service")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {e}")
        return None

def get_admin_token() -> Optional[str]:
    """Get admin JWT token"""
    token_info = get_jwt_token(ADMIN_USER["username"], ADMIN_USER["password"])
    return token_info["access_token"] if token_info else None

def get_supervisor_token(index: int = 0) -> Optional[str]:
    """Get supervisor JWT token"""
    if index >= len(SUPERVISOR_USERS):
        return None
    supervisor = SUPERVISOR_USERS[index]
    token_info = get_jwt_token(supervisor["username"], supervisor["password"])
    return token_info["access_token"] if token_info else None

def get_regular_user_token(index: int = 0) -> Optional[str]:
    """Get regular user JWT token"""
    if index >= len(REGULAR_USERS):
        return None
    user = REGULAR_USERS[index]
    token_info = get_jwt_token(user["username"], user["password"])
    return token_info["access_token"] if token_info else None

if __name__ == "__main__":
    valid_admin_jwt = get_admin_token()
    print(valid_admin_jwt)
    valid_admin_jwt = get_supervisor_token()
    print(valid_admin_jwt)
    valid_admin_jwt = get_regular_user_token()
    print(valid_admin_jwt)
    # Test the secondary endpoint (localhost:8000)
    print("\nTesting authentication with localhost:8000:")
    
    # Define secondary authentication service URL
    
    
    
    
    # Test with admin credentials on secondary endpoint
    secondary_admin_jwt = get_jwt_token_secondary(ADMIN_USER["username"], ADMIN_USER["password"])
    print(secondary_admin_jwt)

