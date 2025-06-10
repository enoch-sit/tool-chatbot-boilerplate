#!/usr/bin/env python3
"""
Simple test for admin endpoints
"""
import requests
import json

def test_admin_endpoint():
    base_url = "http://localhost:8000"
      # First, authenticate to get admin token
    auth_data = {
        "username": "admin",
        "password": "admin@admin"
    }
    
    try:
        print("🔐 Authenticating as admin...")
        auth_response = requests.post(
            f"{base_url}/chat/authenticate",
            json=auth_data,
            timeout=10
        )
        
        if auth_response.status_code != 200:
            print(f"❌ Authentication failed: {auth_response.status_code}")
            print(f"Response: {auth_response.text}")
            return False
            
        auth_result = auth_response.json()
        token = auth_result.get("access_token")
        
        if not token:
            print("❌ No access token received")
            return False
            
        print("✅ Authentication successful")
        
        # Test admin chatflows endpoint
        headers = {"Authorization": f"Bearer {token}"}
        
        print("📋 Testing admin chatflows list endpoint...")
        chatflows_response = requests.get(
            f"{base_url}/api/admin/chatflows",
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {chatflows_response.status_code}")
        if chatflows_response.status_code == 200:
            chatflows = chatflows_response.json()
            print(f"✅ Successfully retrieved {len(chatflows)} chatflows")
            return True
        else:
            print(f"❌ Error: {chatflows_response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_admin_endpoint()
