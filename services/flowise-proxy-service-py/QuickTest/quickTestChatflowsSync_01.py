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
            f"{API_BASE_URL}/api/v1/chat/authenticate",
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


def test_sync_users_by_email(token, emails):
    """Test syncing users by email from external auth to local DB"""
    print("\n--- Testing User Sync by Email ---")
    if not emails:
        print("No emails provided for user sync.")
        return False

    headers = {"Authorization": f"Bearer {token}"}
    all_successful = True
    successful_syncs = 0
    failed_syncs = 0

    for email in emails:
        print(f"Attempting to sync user: {email}")
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/admin/users/sync-by-email",
                headers=headers,
                json={"email": email}
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ User sync successful for {email}: {data.get('status')}")
                # Log successful sync
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User sync successful for {email}: {data.get('status')}\n"
                    )
                successful_syncs += 1
            elif response.status_code == 201: # Created
                data = response.json()
                print(f"✅ User created and synced for {email}: {data.get('status')}")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User created and synced for {email}: {data.get('status')}\n"
                    )
                successful_syncs += 1
            else:
                print(f"❌ User sync failed for {email}: {response.status_code} - {response.text}")
                # Log failed sync
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User sync failed for {email}: {response.status_code} - {response.text}\n"
                    )
                all_successful = False
                failed_syncs +=1
        except requests.RequestException as e:
            print(f"❌ Request error during user sync for {email}: {e}")
            all_successful = False
            failed_syncs += 1
        except Exception as e:
            print(f"❌ Unexpected error during user sync for {email}: {e}")
            all_successful = False
            failed_syncs += 1
    
    print(f"📊 User Sync Summary: {successful_syncs} successful, {failed_syncs} failed.")
    return all_successful


def test_sync_chatflows(token):
    """Test syncing chatflows from Flowise endpoint to database"""
    print("\n--- Testing Chatflow Sync ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/sync",
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
            f"{API_BASE_URL}/api/v1/admin/chatflows",
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
                f"{API_BASE_URL}/api/v1/admin/chatflows?include_deleted=true",
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
            f"{API_BASE_URL}/api/v1/admin/chatflows/stats",
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
    """Test getting a specific chatflow by Flowise ID.
    Returns a tuple (success, flowise_id).
    """
    print("\n--- Testing Get Specific Chatflow ---")
    
    if not flowise_id:
        # First get list of chatflows to find a valid ID
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(
                f"{API_BASE_URL}/api/v1/admin/chatflows",
                headers=headers
            )
            
            if response.status_code == 200:
                chatflows = response.json()
                if chatflows:
                    flowise_id = chatflows[0].get('flowise_id')
                    print(f"ℹ️ No flowise_id provided, picked one from list: {flowise_id}")
                else:
                    print("❌ No chatflows found to select one for testing.")
                    return False, None
            else:
                print("❌ Could not retrieve chatflows for testing")
                return False, None
        except Exception as e:
            print(f"❌ Error getting chatflow list: {e}")
            return False, None
    
    if not flowise_id:
        print("❌ No valid Flowise ID available")
        return False, None
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}",
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
            
            return True, flowise_id
        elif response.status_code == 404:
            print(f"❌ Chatflow not found: {flowise_id}")
            return False, None
        else:
            print(f"❌ Failed to get chatflow: {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
            
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return False, None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, None


def test_add_user_to_chatflow_by_email(token, flowise_id, email):
    """Test adding a user to a chatflow by email"""
    print(f"\n--- Testing Add User '{email}' to Chatflow ---")
    
    if not email:
        print("❌ Email is required to add a user.")
        return False

    try:
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"email": email}
        
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users",
            headers=headers,
            json=payload
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
            if 'user' in error_data.get('detail', '').lower():
                print(f"❌ User with email '{email}' not found in local DB. Please sync first.")
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
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users",
            headers=headers
        )
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Retrieved {len(users)} users assigned to chatflow {flowise_id}")
            
            if users:
                print("👥 Assigned Users:")
                for i, user in enumerate(users):
                    print(f"   - User {i+1}:")
                    print(f"     - Email: {user.get('email', 'N/A')}")
                    print(f"     - Username: {user.get('username', 'N/A')}")
                    print(f"     - External ID: {user.get('external_user_id', 'N/A')}")
                    print(f"     - Assigned At: {user.get('assigned_at', 'N/A')}")
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
    """Test removing a user from a chatflow by email"""
    print(f"\n--- Testing Remove User '{email}' from Chatflow ---")
    
    if not email:
        print("❌ Email is required to remove a user.")
        return False

    try:
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"email": email}
        
        response = requests.delete(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users",
            headers=headers,
            params=payload
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
            if 'user' in error_data.get('detail', '').lower():
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
    """Test adding multiple users to a chatflow by email"""
    print(f"\n--- Testing Bulk Add Users to Chatflow {flowise_id} ---")
    
    if not emails:
        print("ℹ️ No emails provided for bulk assignment.")
        return True

    try:
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"emails": emails}
        
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users/bulk-add",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bulk user assignment completed")
            print(f"📊 Results:")
            
            success_count = data.get('successful_assignments', 0)
            failed_count = len(data.get('failed_assignments', []))
            
            print(f"   - Successfully added: {success_count}")
            print(f"   - Failed: {failed_count}")
            
            if data.get('failed_assignments'):
                print("   - Failed emails:")
                for failed in data['failed_assignments']:
                    print(f"     - {failed.get('email')}: {failed.get('reason')}")
            
            # Log bulk assignment
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Bulk assignment to chatflow {flowise_id}: "
                    f"success={success_count}, "
                    f"failed={failed_count}\n"
                )
            
            return failed_count == 0
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
        log_file.write(f"[{timestamp}] Starting comprehensive chatflow tests\n")
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Critical: Could not obtain admin token. Aborting tests.")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"[{timestamp}] Critical: Could not obtain admin token. Aborting tests.\n")
        return

    # Emails for user sync
    user_emails_to_sync = [user["email"] for user in SUPERVISOR_USERS] + [user["email"] for user in REGULAR_USERS]
    
    # Test 0: Sync users by email
    print("\n🔄 Test 0: Syncing Users by Email...")
    user_sync_successful = test_sync_users_by_email(admin_token, user_emails_to_sync)
    if user_sync_successful:
        print("✅ User sync process completed successfully.")
    else:
        print("⚠️ User sync process completed with some failures.")
    
    # Test 1: Sync chatflows
    print("\n🔄 Test 1: Syncing Chatflows...")
    chatflow_sync_successful = test_sync_chatflows(admin_token)
    if chatflow_sync_successful:
        print("✅ Chatflow sync process completed successfully.")
    else:
        print("⚠️ Chatflow sync process completed with some failures.")
    
    # Test 2: List chatflows
    print("\n🔄 Test 2: Listing Chatflows...")
    list_chatflows_successful = test_list_chatflows(admin_token)
    if list_chatflows_successful:
        print("✅ Chatflows listed successfully.")
    else:
        print("⚠️ Failed to list chatflows.")
    
    # Test 3: Get chatflow stats
    print("\n🔄 Test 3: Getting Chatflow Stats...")
    chatflow_stats_successful = test_chatflow_stats(admin_token)
    if chatflow_stats_successful:
        print("✅ Chatflow stats retrieved successfully.")
    else:
        print("⚠️ Failed to get chatflow stats.")
    
    # Test 4: Get specific chatflow
    print("\n🔄 Test 4: Getting Specific Chatflow...")
    specific_chatflow_successful, _ = test_get_specific_chatflow(admin_token)
    if specific_chatflow_successful:
        print("✅ Specific chatflow retrieved successfully.")
    else:
        print("⚠️ Failed to get specific chatflow.")
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    total_tests = 5
    passed_tests = sum([
        user_sync_successful,
        chatflow_sync_successful,
        list_chatflows_successful,
        chatflow_stats_successful,
        specific_chatflow_successful
    ])
    
    test_results = {
        "User Sync": user_sync_successful,
        "Chatflow Sync": chatflow_sync_successful,
        "List Chatflows": list_chatflows_successful,
        "Chatflow Stats": chatflow_stats_successful,
        "Get Specific Chatflow": specific_chatflow_successful
    }
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall Result: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests >= total_tests:
        print("🎉 ALL CHATFLOW SYNC TESTS PASSED!")
    else:
        print("⚠️  Some chatflow sync tests failed. Please check the implementation.")
    
    # Log final results
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(
            f"[{timestamp}] Comprehensive chatflow tests completed: {passed_tests}/{total_tests} passed\n"
        )
    
    return passed_tests == total_tests


def run_comprehensive_user_chatflow_tests():
    """Run all user-to-chatflow assignment tests"""
    print("=" * 60)
    print("🚀 USER-TO-CHATFLOW ASSIGNMENT TEST")
    print("=" * 60)
    
    # Initialize log file
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(f"\n[{timestamp}] Starting user-to-chatflow assignment tests\n")
    
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
    
    # Add individual users using email
    test_results["add_user1"] = test_add_user_to_chatflow_by_email(admin_token, test_chatflow_id, REGULAR_USERS[0]["email"])
    test_results["add_user2"] = test_add_user_to_chatflow_by_email(admin_token, test_chatflow_id, REGULAR_USERS[1]["email"])
    test_results["add_supervisor"] = test_add_user_to_chatflow_by_email(admin_token, test_chatflow_id, SUPERVISOR_USERS[0]["email"])
    
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
    print("📊 ASSIGNMENT TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results.values() if result)
    
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
    run_comprehensive_chatflow_tests()
    run_comprehensive_user_chatflow_tests()

