#!/usr/bin/env python3
"""
Chatflow Sync Testing Script
This script tests admin functionality for syncing chatflows from Flowise endpoint
and managing them in the database. Contains valid credentials for testing.

PREREQUISITE: Ensure the Flowise-Proxy service (localhost:8000) is running
and accessible. For sync tests to be meaningful, the configured Flowise
instance should also be running and contain chatflows.
"""

import json
import requests
import subprocess
import time
import sys
import os
import datetime # Ensure datetime is imported
import pymongo # For direct DB check

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
            print(f"   - Total fetched from source: {data.get('total_fetched', 0)}")
            print(f"   - Created in DB: {data.get('created', 0)}")
            print(f"   - Updated in DB: {data.get('updated', 0)}")
            print(f"   - Deleted in DB (marked inactive): {data.get('deleted', 0)}")
            print(f"   - Errors during sync: {data.get('errors', 0)}")
            
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
            
            return True # Indicate success
        else:
            print(f"❌ Chatflow sync failed: {response.status_code}")
            print(f"Response: {response.text}")
            # Log failure
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Chatflow sync failed: {response.status_code} - {response.text}\n"
                )
            return False # Indicate failure
            
    except requests.RequestException as e:
        print(f"❌ Request error during chatflow sync: {e}")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"[{timestamp}] Chatflow sync request error: {e}\n")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during chatflow sync: {e}")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"[{timestamp}] Chatflow sync unexpected error: {e}\n")
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
    """Test getting a specific chatflow by Flowise ID.
    Returns a tuple: (bool_success, flowise_id_or_None)
    """
    print("\n--- Testing Get Specific Chatflow ---")
    
    if not flowise_id:
        print("Attempting to find an available chatflow ID...")
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
                    # Try to find a chatflow with a flowise_id that is not None or empty
                    for cf in chatflows:
                        cf_id = cf.get('flowise_id')
                        if cf_id:
                            flowise_id = cf_id
                            print(f"Using first available chatflow ID: {flowise_id}")
                            break
                    if not flowise_id:
                        print("❌ No chatflows with a valid 'flowise_id' found in the list.")
                        return False, None
                else:
                    print("❌ No chatflows available from list to select for testing.")
                    return False, None
            else:
                print(f"❌ Could not retrieve chatflows list to find an ID: {response.status_code} - {response.text}")
                return False, None
        except requests.RequestException as e:
            print(f"❌ Request error getting chatflow list: {e}")
            return False, None
        except Exception as e:
            print(f"❌ Unexpected error getting chatflow list: {e}")
            return False, None
    
    if not flowise_id: # Should be caught above, but as a safeguard
        print("❌ No valid Flowise ID available to get specific chatflow.")
        return False, None
    
    print(f"Attempting to get details for chatflow ID: {flowise_id}")
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
            
            return True, flowise_id
        elif response.status_code == 404:
            print(f"❌ Chatflow not found with ID: {flowise_id}")
            return False, None
        else:
            print(f"❌ Failed to get specific chatflow {flowise_id}: {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
            
    except requests.RequestException as e:
        print(f"❌ Request error getting specific chatflow {flowise_id}: {e}")
        return False, None
    except Exception as e:
        print(f"❌ Unexpected error getting specific chatflow {flowise_id}: {e}")
        return False, None


def test_add_user_to_chatflow(token, flowise_id, username):
    """Test adding a user to a chatflow"""
    print(f"\n--- Testing Add User '{username}' to Chatflow ---")
    try:
        # First, get user_id by username
        headers = {"Authorization": f"Bearer {token}"}
        
        # Find user by email/username (assuming username matches email pattern)
        user_email = f"{username}@example.com" if "@" not in username else username
        
        # Use the correct endpoint format for adding user by email
        response = requests.post(
            f"{API_BASE_URL}/api/admin/chatflows/{flowise_id}/users/email/{user_email}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ User '{username}' successfully added to chatflow {flowise_id}")
            print(f"📝 Response: {data.get('message', 'Success')}")
            
            # Log the assignment
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] User '{username}' added to chatflow {flowise_id}\n"
                )
            
            return True
        elif response.status_code == 409:
            print(f"⚠️  User '{username}' already assigned to chatflow {flowise_id}")
            return True  # Consider this a success since the desired state is achieved
        elif response.status_code == 404:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            detail = error_data.get('detail', '')
            if 'user' in detail.lower():
                print(f"❌ User '{username}' not found")
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


def test_remove_user_from_chatflow(token, flowise_id, username):
    """Test removing a user from a chatflow"""
    print(f"\n--- Testing Remove User '{username}' from Chatflow ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Find user by email/username (assuming username matches email pattern)
        user_email = f"{username}@example.com" if "@" not in username else username
        
        # Use the correct endpoint format for removing user by email
        response = requests.delete(
            f"{API_BASE_URL}/api/admin/chatflows/{flowise_id}/users/email/{user_email}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ User '{username}' successfully removed from chatflow {flowise_id}")
            print(f"📝 Response: {data.get('message', 'Success')}")
            
            # Log the removal
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] User '{username}' removed from chatflow {flowise_id}\\n"
                )
            
            return True
        elif response.status_code == 409: # MODIFIED BLOCK FOR 409 HANDLING
            try:
                error_data = response.json()
                detail = error_data.get('detail', '').lower()
                if 'already inactive' in detail or 'not assigned' in detail or 'user does not have access' in detail:
                    print(f"⚠️  User '{username}' access already inactive or not assigned to chatflow {flowise_id} (409). Considered success for removal/cleanup.")
                    # Log this specific 409 case
                    with open(LOG_PATH, "a") as log_file:
                        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        log_file.write(
                            f"[{timestamp}] User '{username}' on chatflow {flowise_id}: access already inactive or not assigned (409 treated as success for cleanup).\\n"
                        )
                    return True # Treat as success for cleanup purposes
                else:
                    # Other 409 errors are still failures
                    print(f"❌ Failed to remove user '{username}' from chatflow {flowise_id} (409 - unexpected detail): {response.status_code} - {response.text}")
                    return False
            except ValueError: # If response is not JSON
                print(f"❌ Failed to remove user '{username}' from chatflow {flowise_id} (409 - non-JSON response): {response.text}")
                return False
        elif response.status_code == 404:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            detail = error_data.get('detail', '')
            if 'user' in detail.lower():
                print(f"❌ User '{username}' not found or not assigned to this chatflow")
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


def test_bulk_add_users_to_chatflow(token, flowise_id, usernames):
    """Test adding multiple users to a chatflow"""
    print(f"\\n--- Testing Bulk Add Users to Chatflow {flowise_id} ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        emails = [f"{username}@example.com" if "@" not in username else username for username in usernames]
        
        payload = {
            "emails": emails,
            "chatflow_id": flowise_id 
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/admin/chatflows/add-users-by-email",
            json=payload,
            headers=headers
        )

        if response.status_code == 200:
            results = response.json()
            print(f"✅ Bulk add users request processed for chatflow {flowise_id}. Response count: {len(results)}")
            all_reported_success = True
            if not results and emails: # If we sent emails but got no results, it's an issue.
                print(f"⚠️  Bulk add response was empty but emails were provided: {', '.join(emails)}. This indicates a potential issue.")
                all_reported_success = False
            elif not results and not emails: # No emails sent, empty response is fine.
                 print("✅ Bulk add response was empty as no emails were provided.")
                 all_reported_success = True

            for result_item in results: # Renamed to avoid conflict with outer 'result' variable if any
                status = result_item.get('status')
                message = result_item.get('message')
                user_identifier = result_item.get('username', result_item.get('user_id', 'Unknown User'))
                print(f"   - User: {user_identifier}, Status: {status}, Message: {message}")
                if status != 'success' and status != 'reactivated':
                    all_reported_success = False
            
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(f"[{timestamp}] Bulk add for chatflow {flowise_id} (users: {', '.join(emails)}) API call status {response.status_code}. All individual results successful: {all_reported_success}\\n")
            
            return all_reported_success
        elif response.status_code == 404:
            error_detail = "Unknown error"
            try:
                error_detail = response.json().get("detail", response.text)
            except ValueError:
                error_detail = response.text
            print(f"❌ Bulk add users failed: Chatflow {flowise_id} or a resource not found (404). Detail: {error_detail}")
            return False
        else:
            error_detail = "Unknown error"
            try:
                error_detail = response.json().get("detail", response.text)
            except ValueError:
                error_detail = response.text
            print(f"❌ Bulk add users failed with status code: {response.status_code}. Detail: {error_detail}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Request error during bulk add for chatflow {flowise_id}: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during bulk add for chatflow {flowise_id}: {e}")
        return False


def run_comprehensive_user_chatflow_tests():
    """Run all user-to-chatflow assignment tests"""
    print("=" * 60)
    print("🚀 USER-TO-CHATFLOW ASSIGNMENT TEST")
    print("=" * 60)
    
    # Initialize log file
    with open(LOG_PATH, "w") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(f"[{timestamp}] Starting user-to-chatflow assignment tests\\n")
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ CRITICAL: Cannot proceed without admin token. Aborting tests.")
        with open(LOG_PATH, "a") as log_file:
            log_file.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] CRITICAL: Failed to get admin token.\\n") # Ensure newline
        return False # Abort if no token
    
    # First sync chatflows to ensure we have data
    print("\\n🔄 Syncing chatflows first...")
    sync_successful = test_sync_chatflows(admin_token) # Returns True or False
    
    if sync_successful:
        print("✅ Chatflow sync reported success or completed.")
    else:
        print("⚠️  Chatflow sync failed or reported errors. User assignment tests might be affected or use stale data.")
        # Decide if to proceed or not. Current logic proceeds.

    # --- Direct Database Check ---
    print("\\n--- Direct Database Check after Sync ---")
    MONGODB_URL_TEST = "mongodb://testuser:testpass@localhost:27020/flowise_proxy_test"
    DB_NAME_TEST = "flowise_proxy_test"
    TARGET_FLOWISE_ID = "99427295-8b85-4b90-85aa-a32294af6ae0" # The ID we are interested in

    try:
        client = pymongo.MongoClient(MONGODB_URL_TEST, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME_TEST]
        chatflows_collection = db["chatflows"]
        
        # Check if the client connected successfully
        client.admin.command('ping') 
        print(f"Successfully connected to MongoDB: {MONGODB_URL_TEST}")

        db_chatflow = chatflows_collection.find_one({"flowise_id": TARGET_FLOWISE_ID})
        if db_chatflow:
            print(f"✅ Direct DB Check: Found chatflow with flowise_id '{TARGET_FLOWISE_ID}':")
            print(f"   Name: {db_chatflow.get('name')}")
            print(f"   ID in DB: {db_chatflow.get('_id')}")
            print(f"   Synced At: {db_chatflow.get('synced_at')}")
        else:
            print(f"❌ Direct DB Check: Chatflow with flowise_id '{TARGET_FLOWWISE_ID}' NOT FOUND in the database.")
        client.close()
    except pymongo.errors.ServerSelectionTimeoutError as err:
        print(f"❌ Direct DB Check: Could not connect to MongoDB at {MONGODB_URL_TEST}. Error: {err}")
    except Exception as e:
        print(f"❌ Direct DB Check: An error occurred: {e}")

    # --- Add Delay ---
    delay_seconds = 0.5
    print(f"\\n--- Adding a delay of {delay_seconds} seconds ---")
    time.sleep(delay_seconds)
    
    # Get a chatflow to test with
    # test_get_specific_chatflow now returns (bool_success, flowise_id_or_None)
    # For this specific debug, let's try to use the TARGET_FLOWISE_ID if the general get fails or gets a different one.
    get_chatflow_successful, obtained_test_chatflow_id = test_get_specific_chatflow(admin_token, flowise_id=TARGET_FLOWISE_ID) 
    
    test_chatflow_id = None
    if get_chatflow_successful and obtained_test_chatflow_id == TARGET_FLOWISE_ID:
        test_chatflow_id = obtained_test_chatflow_id
        print(f"✅ Successfully fetched the target chatflow for tests: {test_chatflow_id}")
    elif get_chatflow_successful and obtained_test_chatflow_id:
        print(f"⚠️  Successfully fetched a chatflow ({obtained_test_chatflow_id}), but it's not the primary target ID ({TARGET_FLOWISE_ID}). Will use this for subsequent tests if it's the only one available.")
        test_chatflow_id = obtained_test_chatflow_id # Fallback to what was found
        # Optionally, you could force the test to use TARGET_FLOWISE_ID if that's critical
        # test_chatflow_id = TARGET_FLOWISE_ID 
        # print(f"Forcing use of TARGET_FLOWISE_ID: {TARGET_FLOWISE_ID} for further tests despite get_specific_chatflow result.")
    else: # Not successful or no ID returned
        print(f"❌ CRITICAL: Failed to get specific chatflow for ID '{TARGET_FLOWISE_ID}'. Will attempt to find another.")
        # Try to get any chatflow if the target one failed
        get_chatflow_successful, test_chatflow_id = test_get_specific_chatflow(admin_token)
        if not get_chatflow_successful or not test_chatflow_id:
            print("❌ CRITICAL: Cannot obtain ANY valid chatflow ID for testing. Aborting user assignment tests.")
            with open(LOG_PATH, "a") as log_file:
                log_file.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] CRITICAL: Failed to get any chatflow ID for testing.\\n")
            return False
 
    
    print(f"✅ Proceeding with tests using Chatflow ID: {test_chatflow_id}")
    
    # Track test results
    test_results = {
        "sync_chatflows": sync_successful, # Use the boolean result
        "get_chatflow": get_chatflow_successful, # Use the boolean result
        "list_initial_users": False,
        "remove_user1_before_add": False # New test step
    }
    
    
    # Attempt to remove users first to ensure a clean slate for add tests
    print("\\n--- Pre-emptive Removal of Test Users ---")
    test_results["remove_user1_before_add"] = test_remove_user_from_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[0]["username"])
    

    # Test user management
    test_results["list_initial_users"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    
    # Add individual users
    test_results["add_user1"] = test_add_user_to_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[0]["username"])
    test_results["add_user2"] = test_add_user_to_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[1]["username"])
    test_results["add_supervisor"] = test_add_user_to_chatflow(admin_token, test_chatflow_id, SUPERVISOR_USERS[0]["username"])
    
    test_results["list_users_after_add"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    # Test bulk assignment
    # Remove user before bulk access
    test_remove_user_from_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[0]["username"])
    test_remove_user_from_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[1]["username"])
    bulk_usernames = [user["email"] for user in REGULAR_USERS[1:]]  # Add remaining supervisors
    if bulk_usernames:
        test_results["bulk_add_users"] = test_bulk_add_users_to_chatflow(admin_token, test_chatflow_id, bulk_usernames)
        test_results["list_users_after_bulk"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    else:
        test_results["bulk_add_users"] = True  # Skip if no users to bulk add
        test_results["list_users_after_bulk"] = True
    
    # Test user removal
    test_results["remove_user"] = test_remove_user_from_chatflow(admin_token, test_chatflow_id, REGULAR_USERS[0]["username"])
    test_results["list_users_after_remove"] = test_list_chatflow_users(admin_token, test_chatflow_id)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(test_results)
    #passed_tests = sum(test_results.values())
    passed_tests = sum(1 for result in test_results.values() if result is True)

    
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


