#!/usr/bin/env python3
"""
Test script for user cleanup endpoints
"""

import requests
import json
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

def authenticate(username: str, password: str) -> str:
    """Authenticate and return access token"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/chat/authenticate",
            json={"username": username, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["access_token"]
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_audit_users(token: str) -> Dict[str, Any]:
    """Test the audit users endpoint"""
    print("\n🔍 Testing audit users endpoint...")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows/audit-users",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Audit completed successfully")
            print(f"📊 Total assignments: {data.get('total_assignments', 0)}")
            print(f"✅ Valid assignments: {data.get('valid_assignments', 0)}")
            print(f"❌ Invalid assignments: {data.get('invalid_assignments', 0)}")
            print(f"🏢 Chatflows affected: {data.get('chatflows_affected', 0)}")
            
            if data.get('recommendations'):
                print("💡 Recommendations:")
                for rec in data['recommendations']:
                    print(f"   - {rec}")
            
            return data
        else:
            print(f"❌ Audit failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Audit error: {e}")
        return None

def test_cleanup_users_dry_run(token: str) -> Dict[str, Any]:
    """Test the cleanup users endpoint with dry run"""
    print("\n🧹 Testing cleanup users endpoint (dry run)...")
    
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        cleanup_request = {
            "action": "deactivate_invalid",
            "dry_run": True,
            "force": False
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/cleanup-users",
            headers=headers,
            json=cleanup_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dry run cleanup completed successfully")
            print(f"📊 Total records processed: {data.get('total_records_processed', 0)}")
            print(f"❌ Invalid user IDs found: {data.get('invalid_user_ids_found', 0)}")
            print(f"🗑️ Records that would be deleted: {data.get('records_deleted', 0)}")
            print(f"⏸️ Records that would be deactivated: {data.get('records_deactivated', 0)}")
            print(f"🔄 Records that would be reassigned: {data.get('records_reassigned', 0)}")
            print(f"⚠️ Errors: {data.get('errors', 0)}")
            
            if data.get('error_details'):
                print("❌ Error details:")
                for error in data['error_details']:
                    print(f"   - {error}")
            
            return data
        else:
            print(f"❌ Cleanup failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Cleanup error: {e}")
        return None

def main():
    """Main test function"""
    print("🧪 Testing User Cleanup Endpoints")
    print("=" * 50)
    
    # Authenticate
    print("🔐 Authenticating...")
    token = authenticate(ADMIN_USERNAME, ADMIN_PASSWORD)
    if not token:
        print("❌ Failed to authenticate. Cannot proceed with tests.")
        return
    
    print("✅ Authentication successful")
    
    # Test audit endpoint
    audit_result = test_audit_users(token)
    
    # Test cleanup endpoint (dry run)
    cleanup_result = test_cleanup_users_dry_run(token)
    
    print("\n📋 Summary:")
    print("=" * 50)
    if audit_result:
        print("✅ Audit endpoint: Working")
    else:
        print("❌ Audit endpoint: Failed")
    
    if cleanup_result:
        print("✅ Cleanup endpoint: Working")
    else:
        print("❌ Cleanup endpoint: Failed")
    
    print("\n🎉 Test completed!")

if __name__ == "__main__":
    main()
