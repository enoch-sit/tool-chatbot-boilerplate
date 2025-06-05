import logging
from typing import Dict, Optional
import requests
import time

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

def refresh_jwt_token_secondary(refresh_token: str) -> Optional[Dict]:
    """Refresh JWT token using the secondary authentication endpoint"""
    try:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        payload = {
            "refresh_token": refresh_token
        }
        
        response = requests.post(
            f"{SECONDARY_AUTH_URL}/chat/refresh",
            json=payload,
            headers=headers,
            timeout=AUTH_TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info("Token refresh successful")
#             access_token
# refresh_token
# token_type
# user
# message
            return {
                "access_token": data["access_token"],
                "refresh_token": data["refresh_token"],
                "token_type": data["token_type"]
            }
        else:
            logger.error(f"Token refresh failed with {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        return None

def revoke_jwt_token_secondary(access_token: str, revoke_all: bool = False) -> bool:
    """Revoke JWT token using the secondary authentication endpoint"""
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        
        payload = {}
        if revoke_all:
            payload["all_tokens"] = True
        
        response = requests.post(
            f"{SECONDARY_AUTH_URL}/chat/revoke",
            json=payload if payload else None,
            headers=headers,
            timeout=AUTH_TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Token revocation successful: {data}")
            return True
        else:
            logger.error(f"Token revocation failed with {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error revoking token: {e}")
        return False

def test_token_with_endpoint(access_token: str, endpoint: str = "/chatflows/") -> bool:
    """Test if token works with a protected endpoint"""
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        
        response = requests.get(
            f"{SECONDARY_AUTH_URL}{endpoint}",
            headers=headers,
            timeout=AUTH_TIMEOUT
        )
        
        if response.status_code == 200:
            logger.info(f"Token validation successful for {endpoint}")
            return True
        else:
            logger.warning(f"Token validation failed for {endpoint}: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Error testing token: {e}")
        return False

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
        
        # Check health first
        response = requests.get(f"{SECONDARY_AUTH_URL}/health")
        logger.info(f"Health check: {response.status_code}")
        
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

def test_complete_token_flow():
    """Test the complete token flow: authenticate -> use token -> refresh -> use refreshed token -> revoke"""
    print("="*60)
    print("COMPLETE TOKEN FLOW TEST")
    print("="*60)
    
    # Step 1: Authenticate and get initial tokens
    print("\n1. Authenticating with admin credentials...")
    token_data = get_jwt_token_secondary(ADMIN_USER["username"], ADMIN_USER["password"])
    
    if not token_data:
        print("❌ Authentication failed!")
        return False
    
    print("✅ Authentication successful!")
    print(f"   Access Token: {token_data['access_token'][:50]}...")
    print(f"   Refresh Token: {token_data['refresh_token'][:50]}...")
    print(f"   User: {token_data['user']['username']} ({token_data['user']['role']})")
    
    # Step 2: Test initial token with protected endpoint
    print("\n2. Testing initial access token...")
    if test_token_with_endpoint(token_data["access_token"]):
        print("✅ Initial token works!")
    else:
        print("❌ Initial token failed!")
        return False
    
    # Step 3: Wait a moment and refresh the token
    print("\n3. Refreshing tokens...")
    time.sleep(1)  # Brief pause
    
    refreshed_data = refresh_jwt_token_secondary(token_data["refresh_token"])
    
    if not refreshed_data:
        print("❌ Token refresh failed!")
        return False
    
    print("✅ Token refresh successful!")
    print(f"   New Access Token: {refreshed_data['access_token'][:50]}...")
    print(f"   New Refresh Token: {refreshed_data['refresh_token'][:50]}...")
    
    # Step 4: Test refreshed token
    print("\n4. Testing refreshed access token...")
    if test_token_with_endpoint(refreshed_data["access_token"]):
        print("✅ Refreshed token works!")
    else:
        print("❌ Refreshed token failed!")
        return False
    
    # Step 5: Test old token (should still work until explicitly revoked)
    print("\n5. Testing old access token...")
    if test_token_with_endpoint(token_data["access_token"]):
        print("✅ Old token still works (as expected)")
    else:
        print("⚠️  Old token no longer works")
    
    # Step 6: Revoke current token
    # print("\n6. Revoking current token...")
    # if revoke_jwt_token_secondary(refreshed_data["access_token"]):
    #     print("✅ Token revocation successful!")
    # else:
    #     print("❌ Token revocation failed!")
    #     return False
    
    # Step 7: Test revoked token (should fail)
    # print("\n7. Testing revoked token...")
    # if not test_token_with_endpoint(refreshed_data["access_token"]):
    #     print("✅ Revoked token correctly rejected!")
    # else:
    #     print("❌ Revoked token still works (unexpected)!")
    #     return False
    
    # print("\n" + "="*60)
    # print("✅ COMPLETE TOKEN FLOW TEST PASSED!")
    # print("="*60)
    # return True

if __name__ == "__main__":
    # Original tests
    print("Testing regular user token from external service...")
    valid_user_jwt = get_regular_user_token()
    print(f"External service token: {valid_user_jwt}")
    
    print("\nTesting authentication with localhost:8000:")
    secondary_admin_jwt = get_jwt_token_secondary(ADMIN_USER["username"], ADMIN_USER["password"])
    print(f"Secondary service token: {secondary_admin_jwt}")
    
    # New comprehensive token flow test
    print("\n" + "="*60)
    test_complete_token_flow()
    
    # Additional refresh token tests
    print("\n" + "="*60)
    print("ADDITIONAL REFRESH TOKEN TESTS")
    print("="*60)
    
    # Test with different user types
    for i, user_type in enumerate(["admin", "supervisor", "regular"]):
        print(f"\nTesting refresh flow for {user_type} user...")
        
        if user_type == "admin":
            user_data = ADMIN_USER
            token_data = get_jwt_token_secondary(user_data["username"], user_data["password"])
        elif user_type == "supervisor":
            user_data = SUPERVISOR_USERS[0]
            token_data = get_jwt_token_secondary(user_data["username"], user_data["password"])
        else:
            user_data = REGULAR_USERS[0]
            token_data = get_jwt_token_secondary(user_data["username"], user_data["password"])
        
        if token_data:
            print(f"✅ {user_type.capitalize()} authentication successful")
            
            # Test refresh
            refreshed = refresh_jwt_token_secondary(token_data["refresh_token"])
            if refreshed:
                print(f"✅ {user_type.capitalize()} token refresh successful")
            else:
                print(f"❌ {user_type.capitalize()} token refresh failed")
        else:
            print(f"❌ {user_type.capitalize()} authentication failed")