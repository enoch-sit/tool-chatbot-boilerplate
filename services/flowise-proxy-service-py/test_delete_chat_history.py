#!/usr/bin/env python3
"""
Test script for the delete chat history endpoint
"""

import requests
import json
import sys
import os

# Configuration
API_BASE_URL = "http://localhost:8000"
EXTERNAL_AUTH_URL = "http://localhost:3000"

# Test user credentials
TEST_USER = {
    "username": "user1",
    "email": "user1@example.com", 
    "password": "User1@123"
}

def authenticate_user(username: str, password: str) -> str:
    """Authenticate user and return JWT token"""
    print(f"🔐 Authenticating user: {username}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/chat/authenticate",
            json={"username": username, "password": password},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print(f"✅ Authentication successful")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def get_user_sessions(token: str) -> dict:
    """Get current user sessions before deletion"""
    print("📋 Getting current user sessions...")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/v1/chat/sessions",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data.get('count', 0)} sessions")
            return data
        else:
            print(f"❌ Failed to get sessions: {response.status_code} - {response.text}")
            return {"sessions": [], "count": 0}
            
    except Exception as e:
        print(f"❌ Error getting sessions: {e}")
        return {"sessions": [], "count": 0}

def delete_chat_history(token: str) -> dict:
    """Test the delete chat history endpoint"""
    print("🗑️  Testing delete chat history endpoint...")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(
            f"{API_BASE_URL}/api/v1/chat/history",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Delete successful!")
            print(f"   Sessions deleted: {data.get('sessions_deleted', 0)}")
            print(f"   Messages deleted: {data.get('messages_deleted', 0)}")
            print(f"   User ID: {data.get('user_id', 'unknown')}")
            return data
        else:
            print(f"❌ Delete failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Delete error: {e}")
        return None

def verify_deletion(token: str) -> bool:
    """Verify that chat history was actually deleted"""
    print("🔍 Verifying deletion...")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/v1/chat/sessions",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            remaining_sessions = data.get('count', 0)
            print(f"📊 Remaining sessions: {remaining_sessions}")
            
            if remaining_sessions == 0:
                print("✅ Verification successful - all sessions deleted")
                return True
            else:
                print("⚠️  Warning - some sessions still remain")
                return False
        else:
            print(f"❌ Verification failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Testing Delete Chat History Endpoint")
    print("=" * 50)
    
    # Step 1: Authenticate
    token = authenticate_user(TEST_USER["username"], TEST_USER["password"])
    if not token:
        print("❌ Test failed: Could not authenticate")
        sys.exit(1)
    
    # Step 2: Check current sessions
    sessions_before = get_user_sessions(token)
    
    # Step 3: Delete chat history
    delete_result = delete_chat_history(token)
    if not delete_result:
        print("❌ Test failed: Could not delete chat history")
        sys.exit(1)
    
    # Step 4: Verify deletion
    verification_success = verify_deletion(token)
    
    # Results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Initial sessions: {sessions_before.get('count', 0)}")
    print(f"Sessions deleted: {delete_result.get('sessions_deleted', 0)}")
    print(f"Messages deleted: {delete_result.get('messages_deleted', 0)}")
    print(f"Verification passed: {verification_success}")
    
    if verification_success:
        print("✅ All tests passed!")
        return True
    else:
        print("❌ Some tests failed!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
