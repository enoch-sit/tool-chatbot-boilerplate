#!/usr/bin/env python3
"""
Chatflow Sync Testing Script
This script tests admin functionality for syncing chatflows from Flowise endpoint
and managing them in the database. Contains valid credentials for testing.
"""

import json
import requests
import subprocess
import time
import sys
import os
import datetime

LOG_FILE = "chatflow_sync_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration
AUTH_URL = "http://localhost:3000"
API_BASE_URL = "http://localhost:8000"
ACCOUNT_BASE_URL = "http://localhost:3001"

MONGODB_CONTAINER = "auth-mongodb"
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

# Test users for role verification
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


# Chatflow Management Functions
def get_admin_token():
    """Log in as admin and get the access token"""
    print("\n--- Getting admin access token ---")
    try:
        response = requests.post(
            f"{API_BASE_URL}/chat/authenticate",
            json={
                "username": ADMIN_USER["username"],
                "password": ADMIN_USER["password"],
            },
        )

        if response.status_code == 200:
            data = response.json()
            # Try both access patterns to handle different API response formats
            token = data.get("accessToken")
            if not token:
                # Try nested format
                token = data.get("token", {}).get("accessToken")

            # If still no token, check for other formats based on API response
            if not token and isinstance(data, dict):
                # Print response structure for debugging
                print(f"Response structure: {json.dumps(data, indent=2)}")

                # Try to find any key that might contain the token
                for key, value in data.items():
                    if isinstance(value, str) and len(value) > 40:  # Likely a JWT token
                        token = value
                        print(f"Found potential token in field: {key}")
                        break

            if token:
                print("✅ Admin access token obtained")
                # Log successful login
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] Admin '{ADMIN_USER['username']}' logged in successfully\n"
                    )
                return token
            else:
                print("❌ Access token not found in response")
                print(f"Response data: {data}")
        else:
            print(f"❌ Failed to log in as admin: {response.text}")
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

    return None


def test_sync_chatflows(token):
    """Test syncing chatflows from Flowise endpoint to database"""
    print("\n--- Testing Chatflow Sync ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{API_BASE_URL}/api/admin/chatflows/sync",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chatflow sync successful")
            print(f"📊 Sync Results:")
            print(f"   - Total fetched: {data.get('total_fetched', 0)}")
            print(f"   - Created: {data.get('created', 0)}")
            print(f"   - Updated: {data.get('updated', 0)}")
            print(f"   - Deleted: {data.get('deleted', 0)}")
            print(f"   - Errors: {data.get('errors', 0)}")
            
            if data.get('error_details'):
                print(f"   - Error details: {data['error_details']}")
            
            # Log sync results
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Chatflow sync completed: "
                    f"fetched={data.get('total_fetched', 0)}, "
                    f"created={data.get('created', 0)}, "
                    f"updated={data.get('updated', 0)}, "
                    f"deleted={data.get('deleted', 0)}, "
                    f"errors={data.get('errors', 0)}\n"
                )
            
            return True
        else:
            print(f"❌ Chatflow sync failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_list_chatflows(token):
    """Test listing all chatflows from database"""
    print("\n--- Testing List Chatflows ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test without deleted chatflows
        response = requests.get(
            f"{API_BASE_URL}/api/admin/chatflows",
            headers=headers
        )
        
        if response.status_code == 200:
            chatflows = response.json()
            print(f"✅ Retrieved {len(chatflows)} active chatflows")
            
            # Display first few chatflows for verification
            for i, chatflow in enumerate(chatflows[:3]):
                print(f"   Chatflow {i+1}:")
                print(f"     - ID: {chatflow.get('flowise_id', 'N/A')}")
                print(f"     - Name: {chatflow.get('name', 'N/A')}")
                print(f"     - Deployed: {chatflow.get('deployed', 'N/A')}")
                print(f"     - Public: {chatflow.get('is_public', 'N/A')}")
                print(f"     - Sync Status: {chatflow.get('sync_status', 'N/A')}")
            
            if len(chatflows) > 3:
                print(f"   ... and {len(chatflows) - 3} more chatflows")
            
            # Test with deleted chatflows
            response_with_deleted = requests.get(
                f"{API_BASE_URL}/api/admin/chatflows?include_deleted=true",
                headers=headers
            )
            
            if response_with_deleted.status_code == 200:
                all_chatflows = response_with_deleted.json()
                deleted_count = len(all_chatflows) - len(chatflows)
                print(f"✅ Found {deleted_count} deleted chatflows (total: {len(all_chatflows)})")
            
            return True
        else:
            print(f"❌ Failed to list chatflows: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_chatflow_stats(token):
    """Test getting chatflow statistics"""
    print("\n--- Testing Chatflow Statistics ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/admin/chatflows/stats",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()
            print("✅ Chatflow statistics retrieved")
            print(f"📈 Statistics:")
            print(f"   - Total chatflows: {stats.get('total', 0)}")
            print(f"   - Active: {stats.get('active', 0)}")
            print(f"   - Deleted: {stats.get('deleted', 0)}")
            print(f"   - Errors: {stats.get('error', 0)}")
            print(f"   - Last sync: {stats.get('last_sync', 'Never')}")
            
            return True
        else:
            print(f"❌ Failed to get chatflow stats: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_get_specific_chatflow(token, flowise_id=None):
    """Test getting a specific chatflow by Flowise ID"""
    print("\n--- Testing Get Specific Chatflow ---")
    
    if not flowise_id:
        # First get list of chatflows to find a valid ID
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(
                f"{API_BASE_URL}/api/admin/chatflows",
                headers=headers
            )
            
            if response.status_code == 200:
                chatflows = response.json()
                if chatflows:
                    flowise_id = chatflows[0].get('flowise_id')
                    print(f"Using first available chatflow ID: {flowise_id}")
                else:
                    print("❌ No chatflows available for testing")
                    return False
            else:
                print("❌ Could not retrieve chatflows for testing")
                return False
        except Exception as e:
            print(f"❌ Error getting chatflow list: {e}")
            return False
    
    if not flowise_id:
        print("❌ No valid Flowise ID available")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/admin/chatflows/{flowise_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            chatflow = response.json()
            print(f"✅ Retrieved chatflow details for ID: {flowise_id}")
            print(f"📝 Chatflow Details:")
            print(f"   - Name: {chatflow.get('name', 'N/A')}")
            print(f"   - Description: {chatflow.get('description', 'N/A')}")
            print(f"   - Deployed: {chatflow.get('deployed', 'N/A')}")
            print(f"   - Category: {chatflow.get('category', 'N/A')}")
            print(f"   - Type: {chatflow.get('type', 'N/A')}")
            print(f"   - Created: {chatflow.get('created_date', 'N/A')}")
            print(f"   - Updated: {chatflow.get('updated_date', 'N/A')}")
            print(f"   - Synced: {chatflow.get('synced_at', 'N/A')}")
            
            return True
        elif response.status_code == 404:
            print(f"❌ Chatflow not found: {flowise_id}")
            return False
        else:
            print(f"❌ Failed to get chatflow: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def get_user_id_by_email(token, email):
    """Get user ID by email"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/admin/users",
            headers=headers
        )
        
        if response.status_code == 200:
            users = response.json()
            for user in users:
                if user.get('email') == email:
                    return user.get('id')
            print(f"❌ User with email '{email}' not found")
            return None
        else:
            print(f"❌ Failed to get users: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting user ID for {email}: {e}")
        return None


def test_add_user_to_chatflow(token, flowise_id, email):
    """Test adding a user to a chatflow"""
    print(f"\n--- Testing Add User '{email}' to Chatflow ---")
    
    # First get the user ID by email
    user_id = get_user_id_by_email(token, email)
    if not user_id:
        print(f"❌ Cannot find user ID for email '{email}'")
        return False
    
    print(f"📝 Found user ID: {user_id} for email: {email}")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(
            f"{API_BASE_URL}/api/admin/chatflows/{flowise_id}/users/{user_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ User '{email}' successfully added to chatflow {flowise_id}")
            print(f"📝 Response: {data.get('message', 'Success')}")
            
            # Log the assignment
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] User '{email}' added to chatflow {flowise_id}\n"
                )
            
            return True
        elif response.status_code == 409:
            print(f"⚠️  User '{email}' already assigned to chatflow {flowise_id}")
            return True  # Consider this a success since the desired state is achieved
        elif response.status_code == 404:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            if 'user' in error_data.get('error', '').lower():
                print(f"❌ User '{email}' not found")
            else:
                print(f"❌ Chatflow {flowise_id} not found")
            return False
        else:
            print(f"❌ Failed to add user to chatflow: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_list_chatflow_users(token, flowise_id):
    """Test listing users assigned to a chatflow"""
    print(f"\n--- Testing List Users for Chatflow {flowise_id} ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/admin/chatflows/{flowise_id}/users",
            headers=headers
        )
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Retrieved {len(users)} users assigned to chatflow {flowise_id}")
            
            if users:
                print("👥 Assigned Users:")
                for i, user in enumerate(users):
                    print(f"   User {i+1}:")
                    print(f"     - Username: {user.get('username', 'N/A')}")
                    print(f"     - Email: {user.get('email', 'N/A')}")
                    print(f"     - Role: {user.get('role', 'N/A')}")
                    print(f"     - Assigned: {user.get('assigned_at', 'N/A')}")
            else:
                print("📝 No users currently assigned to this chatflow")
            
            return True
        elif response.status_code == 404:
            print(f"❌ Chatflow {flowise_id} not found")
            return False
        else:
            print(f"❌ Failed to list chatflow users: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_remove_user_from_chatflow(token, flowise_id, email):
    """Test removing a user from a chatflow"""
    print(f"\n--- Testing Remove User '{email}' from Chatflow ---")
    
    # First get the user ID by email
    user_id = get_user_id_by_email(token, email)
    if not user_id:
        print(f"❌ Cannot find user ID for email '{email}'")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(
            f"{API_BASE_URL}/api/admin/chatflows/{flowise_id}/users/{user_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ User '{email}' successfully removed from chatflow {flowise_id}")
            print(f"📝 Response: {data.get('message', 'Success')}")
            
            # Log the removal
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] User '{email}' removed from chatflow {flowise_id}\n"
                )
            
            return True
        elif response.status_code == 404:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            if 'user' in error_data.get('error', '').lower():
                print(f"❌ User '{email}' not found or not assigned to this chatflow")
            else:
                print(f"❌ Chatflow {flowise_id} not found")
            return False
        else:
            print(f"❌ Failed to remove user from chatflow: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_bulk_add_users_to_chatflow(token, flowise_id, emails):
    """Test adding multiple users to a chatflow"""
    print(f"\n--- Testing Bulk Add Users to Chatflow {flowise_id} ---")
    
    # Get user IDs for all emails
    user_ids = []
    for email in emails:
        user_id = get_user_id_by_email(token, email)
        if user_id:
            user_ids.append(user_id)
        else:
            print(f"⚠️  Skipping user '{email}' - ID not found")
    
    if not user_ids:
        print("❌ No valid user IDs found for bulk assignment")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "user_ids": user_ids,
            "chatflow_id": flowise_id
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/admin/chatflows/add-users",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bulk user assignment completed")
            print(f"📊 Results:")
            
            success_count = sum(1 for result in data if result.get('status') == 'success')
            skipped_count = sum(1 for result in data if result.get('status') == 'skipped')
            error_count = sum(1 for result in data if result.get('status') == 'error')
            
            print(f"   - Successfully added: {success_count}")
            print(f"   - Already assigned: {skipped_count}")
            print(f"   - Failed: {error_count}")
            
            for result in data:
                if result.get('status') == 'error':
                    print(f"   - Error for {result.get('username', 'unknown')}: {result.get('message')}")
            
            # Log bulk assignment
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Bulk assignment to chatflow {flowise_id}: "
                    f"success={success_count}, "
                    f"skipped={skipped_count}, "
                    f"failed={error_count}\n"
                )
            
            return True
        elif response.status_code == 404:
            print(f"❌ Chatflow {flowise_id} not found")
            return False
        else:
            print(f"❌ Failed bulk user assignment: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def run_comprehensive_chatflow_tests():
    """Run all chatflow sync tests"""
    print("=" * 60)
    print("🚀 CHATFLOW SYNC COMPREHENSIVE TEST")
    print("=" * 60)
    
    # Initialize log file
    with open(LOG_PATH, "w") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(f"[{timestamp}] Starting chatflow sync tests\n")
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Cannot proceed without admin token")
        return False
    
    # Track test results
    test_results = {
        "sync_chatflows": False,
        "list_chatflows": False,
        "chatflow_stats": False,
        "get_specific_chatflow": False,
        
    }
    
    # Run tests
    test_results["sync_chatflows"] = test_sync_chatflows(admin_token)
    test_results["list_chatflows"] = test_list_chatflows(admin_token)
    test_results["chatflow_stats"] = test_chatflow_stats(admin_token)
    test_results["get_specific_chatflow"] = test_get_specific_chatflow(admin_token)
    
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall Result: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! Chatflow sync functionality is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
    
    # Log final results
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(
            f"[{timestamp}] Test completed: {passed_tests}/{total_tests} passed\n"
        )
    
    return passed_tests == total_tests


def run_comprehensive_user_chatflow_tests():
    """Run all user-to-chatflow assignment tests"""
    print("=" * 60)
    print("🚀 USER-TO-CHATFLOW ASSIGNMENT TEST")
    print("=" * 60)
    
    # Initialize log file
    with open(LOG_PATH, "w") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(f"[{timestamp}] Starting user-to-chatflow assignment tests\n")
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Cannot proceed without admin token")
        return False
    
    # First sync chatflows to ensure we have data
    print("\n🔄 Syncing chatflows first...")
    sync_result = test_sync_chatflows(admin_token)
    if not sync_result:
        print("⚠️  Chatflow sync failed, but continuing with existing data...")
    
    # Get a chatflow to test with
    chatflow_result, test_chatflow_id = test_get_specific_chatflow(admin_token)
    if not chatflow_result or not test_chatflow_id:
        print("❌ Cannot proceed without a valid chatflow")
        return False
    
    # Track test results
    test_results = {
        "sync_chatflows": sync_result,
        "get_chatflow": chatflow_result,
        "list_initial_users": False,
        "add_user1": False,
        "add_user2": False,
        "add_supervisor": False,
        "list_users_after_add": False,
        "bulk_add_users": False,
        "list_users_after_bulk": False,
        "remove_user": False,
        "list_users_after_remove": False,
    }
    
    # Test user management
    test_results["list_initial_users"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    
    # Add individual users using email instead of username
    test_results["add_user1"] = test_add_user_to_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[0]["email"])
    test_results["add_user2"] = test_add_user_to_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[1]["email"])
    test_results["add_supervisor"] = test_add_user_to_chatflow(admin_token, test_chatflow_id, SUPERVISOR_USERS[0]["email"])
    
    test_results["list_users_after_add"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    
    # Test bulk assignment using emails
    bulk_emails = [user["email"] for user in SUPERVISOR_USERS[1:]]  # Add remaining supervisors
    if bulk_emails:
        test_results["bulk_add_users"] = test_bulk_add_users_to_chatflow(admin_token, test_chatflow_id, bulk_emails)
        test_results["list_users_after_bulk"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    else:
        test_results["bulk_add_users"] = True  # Skip if no users to bulk add
        test_results["list_users_after_bulk"] = True
    
    # Test user removal using email
    test_results["remove_user"] = test_remove_user_from_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[0]["email"])
    test_results["list_users_after_remove"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall Result: {passed_tests}/{total_tests} tests passed")
    print(f"Test Chatflow ID: {test_chatflow_id}")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! User-to-chatflow assignment functionality is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
    
    # Log final results
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(
            f"[{timestamp}] User-to-chatflow tests completed: {passed_tests}/{total_tests} passed\n"
        )
    
    return passed_tests == total_tests


if __name__ == "__main__":
    print("Chatflow Sync Test Script")
    print("Testing admin functionality for syncing chatflows from Flowise endpoint")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Log file: {LOG_PATH}")
    
    # Run comprehensive tests
    success = run_comprehensive_chatflow_tests()
    
    if success:
        print(f"\n✅ All tests completed successfully!")
        sys.exit(0)
    else:
        print(f"\n❌ Some tests failed. Check the log file: {LOG_PATH}")
        sys.exit(1)

    # Uncomment the following lines to run user-to-chatflow assignment tests
    """
    print("User-to-Chatflow Assignment Test Script")
    print("Testing admin functionality for managing user access to chatflows")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Log file: {LOG_PATH}")
    
    # Run comprehensive tests
    success = run_comprehensive_user_chatflow_tests()
    
    if success:
        print(f"\n✅ All tests completed successfully!")
        sys.exit(0)
    else:
        print(f"\n❌ Some tests failed. Check the log file: {LOG_PATH}")
        sys.exit(1)
    """

