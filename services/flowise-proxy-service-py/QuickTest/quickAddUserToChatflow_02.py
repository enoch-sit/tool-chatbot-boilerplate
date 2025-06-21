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
import datetime  # Ensure datetime is imported
import pymongo  # For direct DB check
import random  # Added for random selection

LOG_FILE = "chatflow_sync_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration
API_BASE_URL = "http://localhost:8000"

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
    print("\\\\n--- Testing User Sync by Email ---")
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
                json={"email": email},
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ User sync successful for {email}: {data.get('status')}")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User sync successful for {email}: {data.get('status')}\\\\n"
                    )
                successful_syncs += 1
            elif response.status_code == 201:  # Created
                data = response.json()
                print(f"✅ User created and synced for {email}: {data.get('status')}")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User created and synced for {email}: {data.get('status')}\\\\n"
                    )
                successful_syncs += 1
            else:
                print(
                    f"❌ User sync failed for {email}: {response.status_code} - {response.text}"
                )
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User sync failed for {email}: {response.status_code} - {response.text}\\\\n"
                    )
                all_successful = False
                failed_syncs += 1
        except requests.RequestException as e:
            print(f"❌ Request error during user sync for {email}: {e}")
            all_successful = False
            failed_syncs += 1
        except Exception as e:
            print(f"❌ Unexpected error during user sync for {email}: {e}")
            all_successful = False
            failed_syncs += 1

    print(
        f"📊 User Sync Summary: {successful_syncs} successful, {failed_syncs} failed."
    )
    return all_successful


def test_sync_chatflows(token):
    """Test syncing chatflows from Flowise endpoint to database"""
    print("\n--- Testing Chatflow Sync ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/sync", headers=headers
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

            if data.get("error_details"):
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

            return True  # Indicate success
        else:
            print(f"❌ Chatflow sync failed: {response.status_code}")
            print(f"Response: {response.text}")
            # Log failure
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Chatflow sync failed: {response.status_code} - {response.text}\n"
                )
            return False  # Indicate failure

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
            f"{API_BASE_URL}/api/v1/admin/chatflows", headers=headers
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
                headers=headers,
            )

            if response_with_deleted.status_code == 200:
                all_chatflows = response_with_deleted.json()
                deleted_count = len(all_chatflows) - len(chatflows)
                print(
                    f"✅ Found {deleted_count} deleted chatflows (total: {len(all_chatflows)})"
                )

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
            f"{API_BASE_URL}/api/v1/admin/chatflows/stats", headers=headers
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
                f"{API_BASE_URL}/api/v1/admin/chatflows", headers=headers
            )

            if response.status_code == 200:
                chatflows = response.json()
                if chatflows:
                    # Try to find a chatflow with a flowise_id that is not None or empty
                    for cf in chatflows:
                        cf_id = cf.get("flowise_id")
                        if cf_id:
                            flowise_id = cf_id
                            print(f"Using first available chatflow ID: {flowise_id}")
                            break
                    if not flowise_id:
                        print(
                            "❌ No chatflows with a valid 'flowise_id' found in the list."
                        )
                        return False, None
                else:
                    print("❌ No chatflows available from list to select for testing.")
                    return False, None
            else:
                print(
                    f"❌ Could not retrieve chatflows list to find an ID: {response.status_code} - {response.text}"
                )
                return False, None
        except requests.RequestException as e:
            print(f"❌ Request error getting chatflow list: {e}")
            return False, None
        except Exception as e:
            print(f"❌ Unexpected error getting chatflow list: {e}")
            return False, None

    if not flowise_id:  # Should be caught above, but as a safeguard
        print("❌ No valid Flowise ID available to get specific chatflow.")
        return False, None

    print(f"Attempting to get details for chatflow ID: {flowise_id}")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}", headers=headers
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
            print(
                f"❌ Failed to get specific chatflow {flowise_id}: {response.status_code}"
            )
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
        headers = {"Authorization": f"Bearer {token}"}
        user_email = f"{username}@example.com" if "@" not in username else username
        # Use the correct endpoint and JSON body as per admin.py
        payload = {"email": user_email}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users",
            headers=headers,
            json=payload,
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ User '{username}' successfully added to chatflow {flowise_id}")
            print(f"📝 Response: {data.get('message', 'Success')}")
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
            error_data = (
                response.json()
                if response.headers.get("content-type") == "application/json"
                else {}
            )
            detail = error_data.get("detail", "")
            if "user" in detail.lower():
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
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users", headers=headers
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
        user_email = f"{username}@example.com" if "@" not in username else username
        response = requests.delete(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users",
            headers=headers,
            params={"email": user_email},
        )
        if response.status_code == 200:
            data = response.json()
            print(
                f"✅ User '{username}' successfully removed from chatflow {flowise_id}"
            )
            print(f"📝 Response: {data.get('message', 'Success')}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] User '{username}' removed from chatflow {flowise_id}\n"
                )
            return True
        elif response.status_code == 409:
            try:
                error_data = response.json()
                detail = error_data.get("detail", "").lower()
                if (
                    "already inactive" in detail
                    or "not assigned" in detail
                    or "user does not have access" in detail
                ):
                    print(
                        f"⚠️  User '{username}' access already inactive or not assigned to chatflow {flowise_id} (409). Considered success for removal/cleanup."
                    )
                    with open(LOG_PATH, "a") as log_file:
                        timestamp = datetime.datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )
                        log_file.write(
                            f"[{timestamp}] User '{username}' on chatflow {flowise_id}: access already inactive or not assigned (409 treated as success for cleanup).\n"
                        )
                    return True
                else:
                    print(
                        f"❌ Failed to remove user '{username}' from chatflow {flowise_id} (409 - unexpected detail): {response.status_code} - {response.text}"
                    )
                    return False
            except ValueError:
                print(
                    f"❌ Failed to remove user '{username}' from chatflow {flowise_id} (409 - non-JSON response): {response.text}"
                )
                return False
        elif response.status_code == 404:
            error_data = (
                response.json()
                if response.headers.get("content-type") == "application/json"
                else {}
            )
            detail = error_data.get("detail", "")
            if "user" in detail.lower():
                print(
                    f"⚠️  User '{username}' not found or not assigned to this chatflow (404). Treated as success for idempotency."
                )
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User '{username}' not found or not assigned to chatflow {flowise_id} (404 treated as success for idempotency).\n"
                    )
                return True
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
    print(f"\n--- Testing Bulk Add Users to Chatflow {flowise_id} ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        emails = [
            f"{username}@example.com" if "@" not in username else username
            for username in usernames
        ]
        payload = {"emails": emails}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{flowise_id}/users/bulk-add",
            json=payload,
            headers=headers,
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bulk user assignment completed")
            print(f"📊 Results:")
            success_count = len(data.get("successful_assignments", []))
            failed_count = len(data.get("failed_assignments", []))
            print(f"   - Successfully added: {success_count}")
            print(f"   - Failed: {failed_count}")
            if data.get("failed_assignments"):
                print("   - Failed emails:")
                for failed in data["failed_assignments"]:
                    print(f"     - {failed.get('email')}: {failed.get('message')}")
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
            log_file.write(
                f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] CRITICAL: Failed to get admin token.\\n"
            )  # Ensure newline
        return False  # Abort if no token

    # First sync chatflows to ensure we have data
    print("\\n🔄 Syncing chatflows first...")
    sync_successful = test_sync_chatflows(admin_token)  # Returns True or False

    if sync_successful:
        print("✅ Chatflow sync reported success or completed.")
    else:
        print(
            "⚠️  Chatflow sync failed or reported errors. User assignment tests might be affected or use stale data."
        )
        # Decide if to proceed or not. Current logic proceeds.

    # --- Attempt to Dynamically Select Target Flowise ID (Optional) ---
    print("\\n--- Attempting to Dynamically Select Target Flowise ID ---")
    dynamic_target_flowise_id = None
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows",
            headers=headers,
            params={"include_deleted": "false"},  # Typically we want active chatflows
        )
        if response.status_code == 200:
            all_chatflows = response.json()
            # Filter for chatflows that have a non-empty flowise_id
            eligible_chatflows = [cf for cf in all_chatflows if cf.get("flowise_id")]
            if eligible_chatflows:
                selected_chatflow = random.choice(eligible_chatflows)
                dynamic_target_flowise_id = selected_chatflow.get("flowise_id")
                print(
                    f"✅ Dynamically selected a potential TARGET_FLOWISE_ID: {dynamic_target_flowise_id}"
                )
            else:
                print(
                    "⚠️ No eligible chatflows found for dynamic selection. Will attempt to get any chatflow."
                )
        else:
            print(
                f"❌ Failed to fetch chatflows for dynamic selection: {response.status_code} - {response.text}. Will attempt to get any chatflow."
            )
    except requests.RequestException as e:
        print(
            f"❌ Request error while fetching chatflows for dynamic selection: {e}. Will attempt to get any chatflow."
        )
    except Exception as e:
        print(
            f"❌ Unexpected error while fetching chatflows for dynamic selection: {e}. Will attempt to get any chatflow."
        )

    # --- Get a specific chatflow (either the dynamically selected one or any available one) ---
    # test_get_specific_chatflow will try to find one if dynamic_target_flowise_id is None
    print(
        f"\\n--- Getting Chatflow Details (Target: {dynamic_target_flowise_id if dynamic_target_flowise_id else 'Any Available'}) ---"
    )
    get_chatflow_successful, test_chatflow_id = test_get_specific_chatflow(
        admin_token, dynamic_target_flowise_id
    )

    if not get_chatflow_successful or not test_chatflow_id:
        print(
            "❌ CRITICAL: Cannot obtain a valid chatflow ID for testing. Aborting user assignment tests."
        )
        with open(LOG_PATH, "a") as log_file:
            log_file.write(
                f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] CRITICAL: Failed to get any chatflow ID for testing.\\n"
            )
        return False

    print(f"✅ Proceeding with tests using Chatflow ID: {test_chatflow_id}")

    # Track test results
    test_results = {
        "sync_chatflows": sync_successful,  # Use the boolean result
        "get_chatflow": get_chatflow_successful,  # Use the boolean result
        "list_initial_users": False,
        "remove_user1_before_add": False,  # New test step
    }

    # Attempt to remove users first to ensure a clean slate for add tests
    print("\\n--- Pre-emptive Removal of Test Users ---")
    test_results["remove_user1_before_add"] = test_remove_user_from_chatflow(
        admin_token, test_chatflow_id, REGULAR_USERS[0]["username"]
    )

    # Test user management
    test_results["list_initial_users"] = test_list_chatflow_users(
        admin_token, test_chatflow_id
    )

    # Add individual users
    test_results["add_user1"] = test_add_user_to_chatflow(
        admin_token, test_chatflow_id, REGULAR_USERS[0]["username"]
    )
    test_results["add_user2"] = test_add_user_to_chatflow(
        admin_token, test_chatflow_id, REGULAR_USERS[1]["username"]
    )
    test_results["add_supervisor"] = test_add_user_to_chatflow(
        admin_token, test_chatflow_id, SUPERVISOR_USERS[0]["username"]
    )

    test_results["list_users_after_add"] = test_list_chatflow_users(
        admin_token, test_chatflow_id
    )
    # Test bulk assignment
    # Remove user before bulk access
    test_remove_user_from_chatflow(
        admin_token, test_chatflow_id, REGULAR_USERS[0]["username"]
    )
    test_remove_user_from_chatflow(
        admin_token, test_chatflow_id, REGULAR_USERS[1]["username"]
    )
    bulk_usernames = [
        user["email"] for user in REGULAR_USERS[1:]
    ]  # Add remaining supervisors
    if bulk_usernames:
        test_results["bulk_add_users"] = test_bulk_add_users_to_chatflow(
            admin_token, test_chatflow_id, bulk_usernames
        )
        test_results["list_users_after_bulk"] = test_list_chatflow_users(
            admin_token, test_chatflow_id
        )
    else:
        test_results["bulk_add_users"] = True  # Skip if no users to bulk add
        test_results["list_users_after_bulk"] = True

    # Test user removal
    test_results["remove_user"] = test_remove_user_from_chatflow(
        admin_token, test_chatflow_id, REGULAR_USERS[0]["username"]
    )
    test_results["list_users_after_remove"] = test_list_chatflow_users(
        admin_token, test_chatflow_id
    )
    # Print summary for basic user assignment tests
    print("\\n" + "=" * 60)
    print("📊 USER ASSIGNMENT TEST SUMMARY")
    print("=" * 60)

    total_tests = len(test_results)
    # passed_tests = sum(test_results.values())
    passed_tests = sum(1 for result in test_results.values() if result is True)

    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")

    print(f"\\nUser Assignment Tests Result: {passed_tests}/{total_tests} tests passed")
    print(f"Test Chatflow ID: {test_chatflow_id}")

    overall_passed = passed_tests == total_tests  # Simplified overall_passed

    if overall_passed:  # Simplified condition
        print("🎉 All user assignment tests passed!")
    else:
        print("⚠️ Some user assignment tests failed.")

    # Removed call to run_user_cleanup_tests and related summary logic

    # Print final summary for this script
    print("\\n" + "=" * 60)
    print("🎯 USER ASSIGNMENT TEST SUITE FINAL SUMMARY")  # Changed title
    print("=" * 60)
    print(f"User Assignment Tests: {passed_tests}/{total_tests} passed")
    # Removed cleanup/audit test reporting lines
    print(
        f"Overall Result for User Assignments: {'✅ ALL ASSIGNMENT TESTS PASSED' if overall_passed else '❌ SOME ASSIGNMENT TESTS FAILED'}"
    )

    if overall_passed:
        print(
            "🎉 ALL USER ASSIGNMENT TESTS PASSED! User-to-chatflow assignment functionality is working correctly."
        )
    else:
        print("⚠️ Some user assignment tests failed. Please check the implementation.")

    # Log final results for this script
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(
            f"[{timestamp}] User Assignment tests completed: Assignment({passed_tests}/{total_tests}), "
            # f"Cleanup({'PASS' if cleanup_tests_passed else 'FAIL'}), " # Removed
            f"Overall Assignment Result({'PASS' if overall_passed else 'FAIL'})\\n"
        )

    return overall_passed


# User Cleanup and Audit Functions - REMOVED FROM HERE


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 USER-TO-CHATFLOW ASSIGNMENT TEST SUITE 🚀")
    print("=" * 60)

    # Initialize log file
    with open(LOG_PATH, "w") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(f"[{timestamp}] Starting user-to-chatflow assignment tests\\\\n")

    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Critical: Could not obtain admin token. Aborting tests.")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(
                f"[{timestamp}] Critical: Could not obtain admin token. Aborting tests.\\\\n"
            )
        sys.exit(1)  # Exit if no token

    # Emails for user sync
    user_emails_to_sync = [user["email"] for user in SUPERVISOR_USERS] + [
        user["email"] for user in REGULAR_USERS
    ]

    # Sync users by email first
    print("\\\\n🔄 Syncing Users by Email...")
    user_sync_successful = test_sync_users_by_email(admin_token, user_emails_to_sync)
    if user_sync_successful:
        print("✅ User sync process completed successfully.")
    else:
        print("⚠️ User sync process completed with some failures.")

    # Then sync chatflows
    print("\\\\n🔄 Syncing chatflows...")
    sync_successful = test_sync_chatflows(admin_token)  # Returns True or False
    if not sync_successful:
        print(
            "❌ Critical: Chatflow sync failed. Some tests might not be meaningful. Continuing..."
        )
        # Decide if you want to abort or continue if chatflow sync fails
        # For now, we'll log and continue

    # Proceed with the rest of the tests
    run_comprehensive_user_chatflow_tests()

    print("\\\\n" + "=" * 60)
    print("✨ User-to-Chatflow Assignment Test Suite Finished ✨")
    print("=" * 60)
