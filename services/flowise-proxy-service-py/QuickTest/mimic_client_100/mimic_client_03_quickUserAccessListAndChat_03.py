import json
import requests
import subprocess
import time
import sys
import os
import datetime  # Ensure datetime is imported
import pymongo  # For direct DB check

LOG_FILE = "chatflow_sync_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration
API_BASE_URL = "http://localhost:8000"

MONGODB_CONTAINER = "auth-mongodb"
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin@aidcec",  # Please change this
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
        "username": f"User{i:02d}",
        "email": f"user{i:02d}@aidcec.com",
        "password": f"User{i:02d}@aidcec",
        "role": "enduser",
    }
    for i in range(1, 101)
]

# For a REGULAR_USERS
# login through API_BASE_URL
# List the chatflow that he/she have access to [previously given by Admin]


def get_user_token(user):
    """Log in as a specified user and get the access token"""
    print(f"\n--- Getting access token for user: {user['username']} ---")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/chat/authenticate",
            json={
                "username": user["username"],
                "password": user["password"],
            },
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print(f"✅ Got access token for {user['username']}")
                return token
            else:
                print(f"❌ No access token in response for {user['username']}")
        else:
            print(
                f"❌ Failed to get token for {user['username']}: {response.status_code} {response.text}"
            )
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    return None


def list_accessible_chatflows(token, username):
    """
    Lists accessible chatflows for the given user token.
    Returns the ID of the first accessible chatflow, or None.
    """
    print(f"\n--- Listing accessible chatflows for user: {username} ---")
    if not token:
        print("❌ Cannot list chatflows without a token.")
        return None
    chatflows_url = f"{API_BASE_URL}/api/v1/chatflows"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(chatflows_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {username} has access to {len(data)} chatflows.")
            if data:
                print(f"First accessible chatflow: {data[0]}")
                return data[0]["id"] if "id" in data[0] else None
            else:
                print(f"No accessible chatflows for {username}.")
                return None
        else:
            print(
                f"❌ Failed to list chatflows for {username}: {response.status_code} {response.text}"
            )
            return None
    except requests.RequestException as e:
        print(f"❌ Request error while listing chatflows for {username}: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error while listing chatflows for {username}: {e}")
        return None


def test_chat_predict(token, username, chatflow_id, question):
    """
    Tests the chat predict endpoint for a given chatflow_id and question.
    """
    print(
        f"\n--- Testing chat predict for user: {username} on chatflow: {chatflow_id} ---"
    )
    if not token:
        print("❌ Cannot test predict without a token.")
        return
    if not chatflow_id:
        print("❌ Cannot test predict without a chatflow_id.")
        return
    predict_url = f"{API_BASE_URL}/api/v1/chat/predict"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "chatflow_id": chatflow_id,
        "question": question,
    }
    try:
        response = requests.post(predict_url, headers=headers, json=payload)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry_prefix = f"[{timestamp}] User '{username}' predicting on chatflow '{chatflow_id}' with question '{question}':"
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Prediction response: {data}")
            with open(LOG_PATH, "a") as log_file:
                log_file.write(f"{log_entry_prefix} SUCCESS\n{data}\n")
        else:
            print(f"❌ Prediction failed: {response.status_code} {response.text}")
            with open(LOG_PATH, "a") as log_file:
                log_file.write(f"{log_entry_prefix} FAIL\n{response.text}\n")
    except requests.RequestException as e:
        print(
            f"❌ Request error during prediction for {username} on chatflow {chatflow_id}: {e}"
        )
        with open(LOG_PATH, "a") as log_file:
            log_file.write(f"Request error: {e}\n")
    except Exception as e:
        print(
            f"❌ Unexpected error during prediction for {username} on chatflow {chatflow_id}: {e}"
        )
        with open(LOG_PATH, "a") as log_file:
            log_file.write(f"Unexpected error: {e}\n")


# Admin Functions
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
                token = data.get("access_token")  # Try the same key as regular users
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


def list_all_chatflows_as_admin(token):
    """Test listing all chatflows from database as admin"""
    print("\n--- Listing All Chatflows (Admin) ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}

        # Test without deleted chatflows
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows", headers=headers
        )

        if response.status_code == 200:
            chatflows = response.json()
            print(f"✅ Retrieved {len(chatflows)} active chatflows")

            # Display all chatflows for verification
            for i, chatflow in enumerate(chatflows):
                print(
                    f"  {i+1}. ID: {chatflow.get('flowise_id', 'N/A')}, Name: {chatflow.get('name', 'N/A')}"
                )

            # Log result
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Admin listed {len(chatflows)} chatflows\n"
                )

            # Return the first chatflow's flowise_id for assignment testing
            if chatflows:
                return chatflows[0].get("flowise_id")
            else:
                print("ℹ️ No chatflows available for assignment")
                return None
        else:
            print(
                f"❌ Failed to list chatflows: {response.status_code} - {response.text}"
            )
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Admin failed to list chatflows: {response.status_code}\n"
                )
            return None

    except requests.RequestException as e:
        print(f"❌ Request error during chatflow listing: {e}")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"[{timestamp}] Admin chatflow listing request error: {e}\n")
        return None
    except Exception as e:
        print(f"❌ Unexpected error during chatflow listing: {e}")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(
                f"[{timestamp}] Admin chatflow listing unexpected error: {e}\n"
            )
        return None


def assign_user_to_chatflow_by_email(token, chatflow_id, user_email):
    """Assign a user to a chatflow using their email address (corrected for admin.py)"""
    print(f"\n--- Assigning User '{user_email}' to Chatflow '{chatflow_id}' ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        # Use the correct endpoint and JSON body as per admin.py
        payload = {"email": user_email}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users",
            headers=headers,
            json=payload,
        )
        if response.status_code == 200:
            data = response.json()
            print(
                f"✅ Successfully assigned user '{user_email}' to chatflow '{chatflow_id}'"
            )
            print(f"   Assignment details: {json.dumps(data, indent=2)}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Admin assigned user '{user_email}' to chatflow '{chatflow_id}'\n"
                )
            return True
        else:
            print(
                f"❌ Failed to assign user to chatflow: {response.status_code} - {response.text}"
            )
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Admin failed to assign user '{user_email}' to chatflow '{chatflow_id}': {response.status_code}\n"
                )
            return False
    except requests.RequestException as e:
        print(f"❌ Request error during user assignment: {e}")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"[{timestamp}] Admin user assignment request error: {e}\n")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during user assignment: {e}")
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(
                f"[{timestamp}] Admin user assignment unexpected error: {e}\n"
            )
        return False


def clear_user_chatflow_assignments(admin_token, user_email, chatflow_id):
    """Clear existing user assignments to avoid conflicts (corrected for admin.py)"""
    print(
        f"\n🧹 Clearing existing assignments for '{user_email}' and chatflow '{chatflow_id}'"
    )
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Use the correct endpoint and query parameter as per admin.py
        response = requests.delete(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users",
            headers=headers,
            params={"email": user_email},
        )
        if response.status_code == 200:
            print(f"✅ Cleared existing assignment for '{user_email}'")
            return True
        elif response.status_code == 404:
            print(f"ℹ️ No existing assignment found for '{user_email}' (this is fine)")
            return True
        else:
            print(
                f"⚠️ Could not clear assignment: {response.status_code} - {response.text}"
            )
            return False
    except Exception as e:
        print(f"⚠️ Error clearing assignment: {e}")
        return False


# ADD THIS NEW FUNCTION: Verify the assignment worked
def verify_user_assignment(admin_token, chatflow_id, user_email):
    """Verify that the user assignment was successful by checking the database"""
    print(
        f"\n--- Verifying Assignment for '{user_email}' to Chatflow '{chatflow_id}' ---"
    )
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}

        # List users assigned to this chatflow
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users",
            headers=headers,
        )

        if response.status_code == 200:
            users = response.json()
            print(f"✅ Found {len(users)} users assigned to chatflow '{chatflow_id}':")

            user_found = False
            for user in users:
                user_email_in_list = user.get("email", "N/A")
                print(f"   - {user.get('username', 'N/A')} ({user_email_in_list})")
                if user_email_in_list == user_email:
                    user_found = True
                    print(f"   ✅ Target user '{user_email}' found in assignment list")

            if not user_found:
                print(f"   ⚠️ Target user '{user_email}' NOT found in assignment list")

            return user_found
        else:
            print(
                f"❌ Failed to list chatflow users: {response.status_code} - {response.text}"
            )
            return False

    except Exception as e:
        print(f"❌ Error verifying assignment: {e}")
        return False


def debug_database_state():
    """Debug function to check database state directly"""
    print("\n🔍 DEBUGGING: Database State Check")

    try:
        import pymongo

        client = pymongo.MongoClient(
            "mongodb://testuser:testpass@localhost:27020/flowise_proxy_test"
        )
        db = client["flowise_proxy_test"]

        # Check users
        users = list(db.users.find({"email": "user1@example.com"}))
        print(f"👤 Users with email 'user1@example.com': {len(users)}")
        if users:
            user = users[0]
            print(f"   - User ID: {user.get('_id')}")
            print(f"   - External ID: {user.get('external_id')}")
            print(f"   - Email: {user.get('email')}")

        # Check UserChatflow assignments
        if users:
            user_id = str(users[0]["_id"])
            assignments = list(db.userchatflows.find({"user_id": user_id}))
            print(f"🔗 UserChatflow assignments for user {user_id}: {len(assignments)}")
            for assignment in assignments:
                print(f"   - Chatflow ID: {assignment.get('chatflow_id')}")
                print(f"   - Is Active: {assignment.get('is_active')}")
                print(f"   - Assigned At: {assignment.get('assigned_at')}")

        # Also check by external_id
        if users:
            external_id = users[0].get("external_id")
            if external_id:
                assignments_by_external = list(
                    db.userchatflows.find({"user_id": external_id})
                )
                print(
                    f"🔗 UserChatflow assignments for external_id {external_id}: {len(assignments_by_external)}"
                )

        client.close()

    except Exception as e:
        print(f"❌ Database debug error: {e}")


def list_accessible_chatflows_enhanced(token, username):
    """Enhanced version with detailed debugging"""
    print(f"\n--- Listing accessible chatflows for user: {username} ---")
    if not token:
        print("❌ Cannot list chatflows without a token.")
        return None

    chatflows_url = f"{API_BASE_URL}/api/v1/chatflows"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        print(f"🔍 Making request to: {chatflows_url}")
        print(f"🔍 Headers: Authorization: Bearer {token[:20]}...")

        response = requests.get(chatflows_url, headers=headers)

        print(f"🔍 Response Status: {response.status_code}")
        print(f"🔍 Response Headers: {dict(response.headers)}")
        print(f"🔍 Response Body: {response.text}")

        if response.status_code == 200:
            chatflows = response.json()
            print(f"✅ API returned {len(chatflows)} chatflows")

            if chatflows:
                print(f"✅ Accessible chatflows for {username}:")
                for cf in chatflows:
                    print(f"  - ID: {cf.get('id')}, Name: {cf.get('name')}")
                return chatflows[0].get("id")
            else:
                print(f"❌ Empty chatflows list returned for {username}")
                return None
        else:
            print(f"❌ Failed to list chatflows for {username}: {response.status_code}")
            print(f"❌ Error response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Exception during chatflows request: {e}")
        import traceback

        traceback.print_exc()
        return None


def test_alternative_chatflows_endpoint(token, username):
    """Test the /my-chatflows endpoint instead"""
    print(f"\n--- Testing Alternative My-Chatflows Endpoint for {username} ---")

    my_chatflows_url = f"{API_BASE_URL}/api/v1/chatflows/my-chatflows"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(my_chatflows_url, headers=headers)

        print(f"🔍 Response Status: {response.status_code}")
        print(f"🔍 Response Body: {response.text}")

        if response.status_code == 200:
            chatflows = response.json()
            print(f"✅ My-Chatflows API returned {len(chatflows)} chatflows")

            if chatflows:
                print(f"✅ Accessible chatflows via my-chatflows for {username}:")
                for cf in chatflows:
                    print(f"  - ID: {cf.get('id')}, Name: {cf.get('name')}")
                return chatflows[0].get("id")
            else:
                print(f"ℹ️ Empty chatflows list returned from my-chatflows")
                return None
        else:
            print(f"❌ Failed to get my-chatflows: {response.status_code}")
            print(f"❌ Error response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Exception during my-chatflows request: {e}")
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
    print("\\\\n--- Testing Chatflow Sync ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/sync", headers=headers
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Chatflow sync successful")
            print(
                f"📊 Sync Results: total_fetched={data.get('total_fetched',0)}, created={data.get('created',0)}, updated={data.get('updated',0)}, deleted={data.get('deleted',0)}, errors={data.get('errors',0)}"
            )
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Chatflow sync completed: {json.dumps(data)}\\\\n"
                )
            return True
        else:
            print(f"❌ Chatflow sync failed: {response.status_code} - {response.text}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Chatflow sync failed: {response.status_code} - {response.text}\\\\n"
                )
            return False
    except requests.RequestException as e:
        print(f"❌ Request error during chatflow sync: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during chatflow sync: {e}")
        return False


def sync_chatflows_via_api(admin_token):
    """Sync chatflows from Flowise to local DB using the admin API endpoint."""
    print("\n🔄 Performing chatflow sync via server endpoint...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/sync", headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chatflow sync via API successful: {data}")
            return True
        else:
            print(
                f"❌ Chatflow sync via API failed: {response.status_code} {response.text}"
            )
            return False
    except Exception as e:
        print(f"❌ Exception during chatflow sync via API: {e}")
        return False


# Main execution flow with admin setup and user testing:
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 USER ACCESS, LIST & CHAT TEST SUITE 🚀")
    print("=" * 60)
    with open(LOG_PATH, "w") as log_file:
        log_file.write(f"User Access Test Log - {datetime.datetime.now()}\n")
    # Get admin token (for setup if needed)
    admin_token = get_user_token(ADMIN_USER)
    if not admin_token:
        print("❌ Could not get admin token. Exiting.")
        exit(1)
    # Sync users and chatflows if needed (call your sync functions here if available)
    user_emails_to_sync = [user["email"] for user in SUPERVISOR_USERS] + [
        user["email"] for user in REGULAR_USERS
    ]
    print("\n🔄 Syncing Users by Email...")
    user_sync_successful = test_sync_users_by_email(admin_token, user_emails_to_sync)
    if user_sync_successful:
        print("✅ User sync process completed successfully.")
    else:
        print("⚠️ User sync process completed with some failures.")
    # Perform chatflow sync using the server endpoint
    sync_successful = sync_chatflows_via_api(admin_token)
    if not sync_successful:
        print(
            "❌ Critical: Chatflow sync via API failed. Some tests might not be meaningful. Continuing..."
        )
    # List all chatflows as admin and pick one
    target_chatflow_id = list_all_chatflows_as_admin(admin_token)
    if not target_chatflow_id:
        print("❌ No chatflows available for assignment. Exiting.")
        exit(1)
    # Assign user1 to the chatflow as admin
    assignment_success = assign_user_to_chatflow_by_email(
        admin_token, target_chatflow_id, REGULAR_USERS[0]["email"]
    )
    if not assignment_success:
        print(f"❌ Failed to assign user1 to chatflow {target_chatflow_id}. Exiting.")
        exit(1)
    # Verify the assignment to debug the issue
    print("\n🕵️  Verifying the assignment directly after the API call...")
    verification_passed = verify_user_assignment(
        admin_token, target_chatflow_id, REGULAR_USERS[0]["email"]
    )
    if not verification_passed:
        print(
            "‼️  Verification failed. The API call to assign the user might have succeeded, but the user is not showing up as assigned."
        )
        print("   Running a database state check for more details...")
        debug_database_state()
    else:
        print("✅ Verification PASSED: The admin API confirms the user is assigned.")
        print(
            "   The issue likely lies in the user-facing endpoint for listing chatflows or data synchronization."
        )
    # Log in as user1 and test access
    user = REGULAR_USERS[0]
    user_token = get_user_token(user)
    if user_token:
        chatflow_id = list_accessible_chatflows(user_token, user["username"])
        if chatflow_id:
            test_chat_predict(
                user_token, user["username"], chatflow_id, "Hello, can you help me?"
            )
        else:
            print(f"❌ No accessible chatflows for user {user['username']}.")
    else:
        print(f"❌ Could not get token for user {user['username']}.")


"""
An Example of the output of the tests:
============================================================
🚀 USER ACCESS, LIST & CHAT TEST SUITE 🚀
============================================================

--- Getting access token for user: admin ---
✅ Got access token for admin

🔄 Syncing Users by Email...
\\n--- Testing User Sync by Email ---
Attempting to sync user: supervisor1@example.com
✅ User sync successful for supervisor1@example.com: success
Attempting to sync user: supervisor2@example.com
✅ User sync successful for supervisor2@example.com: success
Attempting to sync user: user1@example.com
✅ User sync successful for user1@example.com: success
Attempting to sync user: user2@example.com
✅ User sync successful for user2@example.com: success
📊 User Sync Summary: 4 successful, 0 failed.
✅ User sync process completed successfully.

🔄 Performing chatflow sync via server endpoint...
✅ Chatflow sync via API successful: {'total_fetched': 2, 'created': 0, 'updated': 2, 'deleted': 0, 'errors': 0, 'error_details': []}

--- Listing All Chatflows (Admin) ---
✅ Retrieved 2 active chatflows
  1. ID: 7a2f12b2-25eb-46e0-856a-a08cf5a99c0f, Name: eduhkTest
  2. ID: e13cbaa3-c909-4570-8c49-78b45115f34a, Name: deepSearchAWS

--- Assigning User 'user1@example.com' to Chatflow '7a2f12b2-25eb-46e0-856a-a08cf5a99c0f' ---
✅ Successfully assigned user 'user1@example.com' to chatflow '7a2f12b2-25eb-46e0-856a-a08cf5a99c0f'
   Assignment details: {
  "email": "user1@example.com",
  "status": "Reactivated",
  "message": "Existing inactive assignment has been reactivated."
}

🕵️  Verifying the assignment directly after the API call...

--- Verifying Assignment for 'user1@example.com' to Chatflow '7a2f12b2-25eb-46e0-856a-a08cf5a99c0f' ---
✅ Found 4 users assigned to chatflow '7a2f12b2-25eb-46e0-856a-a08cf5a99c0f':
   - user1 (user1@example.com)
   ✅ Target user 'user1@example.com' found in assignment list
   - user2 (user2@example.com)
   - supervisor1 (supervisor1@example.com)
   - supervisor2 (supervisor2@example.com)
✅ Verification PASSED: The admin API confirms the user is assigned.
   The issue likely lies in the user-facing endpoint for listing chatflows or data synchronization.

--- Getting access token for user: user1 ---
✅ Got access token for user1

--- Listing accessible chatflows for user: user1 ---
✅ user1 has access to 1 chatflows.
First accessible chatflow: {'id': '7a2f12b2-25eb-46e0-856a-a08cf5a99c0f', 'name': 'eduhkTest', 'description': '', 'is_public': False}

--- Testing chat predict for user: user1 on chatflow: 7a2f12b2-25eb-46e0-856a-a08cf5a99c0f ---
✅ Prediction response: {'response': '{"event":"start","data":"Of"}{"event":"token","data":"Of"}{"event":"token","data":" course! I\'d"}{"event":"token","data":" be happy to help."}{"event":"token","data":" What do"}{"event":"token","data":" you need assistance with?\\n\\n"}{"event":"token","data":"If"}{"event":"token","data":" you have"}{"event":"token","data":" a specific"}{"event":"token","data":" question, whether"}{"event":"token","data":" it\'s about"}{"event":"token","data":" a topic,"}{"event":"token","data":" need"}{"event":"token","data":" some"}{"event":"token","data":" information"}{"event":"token","data":", or"}{"event":"token","data":" require"}{"event":"token","data":" guidance"}{"event":"token","data":" on a particular task"}{"event":"token","data":", feel"}{"event":"token","data":" free to ask."}{"event":"token","data":" Here"}{"event":"token","data":" are"}{"event":"token","data":" a few categories"}{"event":"token","data":" I"}{"event":"token","data":" can"}{"event":"token","data":" help with:\\n\\n"}{"event":"token","data":"1. **General"}{"event":"token","data":" Knowledge"}{"event":"token","data":"**:"}{"event":"token","data":" Facts"}{"event":"token","data":","}{"event":"token","data":" history"}{"event":"token","data":", science"}{"event":"token","data":", etc"}{"event":"token","data":".\\n2. **Technology**:"}{"event":"token","data":" Software"}{"event":"token","data":","}{"event":"token","data":" hardware, troubleshooting"}{"event":"token","data":","}{"event":"token","data":" etc.\\n3. **Health"}{"event":"token","data":" and"}{"event":"token","data":" Wellness**: Basic"}{"event":"token","data":" health"}{"event":"token","data":" tips"}{"event":"token","data":", fitness"}{"event":"token","data":" advice"}{"event":"token","data":", etc.\\n4. **"}{"event":"token","data":"Education"}{"event":"token","data":"**: Study"}{"event":"token","data":" tips, explanations"}{"event":"token","data":" of"}{"event":"token","data":" concepts, etc.\\n5."}{"event":"token","data":" **Entertainment**: Movies"}{"event":"token","data":", books"}{"event":"token","data":", games"}{"event":"token","data":", etc"}{"event":"token","data":".\\n6. **Every"}{"event":"token","data":"day Tasks"}{"event":"token","data":"**: Cooking"}{"event":"token","data":" recipes"}{"event":"token","data":", DIY"}{"event":"token","data":" projects"}{"event":"token","data":", etc"}{"event":"token","data":".\\n\\n"}{"event":"token","data":"Just"}{"event":"token","data":" let me know what you’"}{"event":"token","data":"re looking"}{"event":"token","data":" for!"}{"event":"metadata","data":{"chatId":"18794cd5-020a-4b36-96dd-2240636443aa","chatMessageId":"71f03722-018a-4f88-9834-70ac51e0939f","question":"Hello, can you help me?","sessionId":"18794cd5-020a-4b36-96dd-2240636443aa","memoryType":"Buffer Memory"}}{"event":"end","data":"[DONE]"}', 'metadata': {'chatflow_id': '7a2f12b2-25eb-46e0-856a-a08cf5a99c0f', 'cost': 1, 'remaining_credits': 457, 'user': 'user1', 'streaming': True}}

Another example of the tests:
--- Testing chat predict for user: user1 on chatflow: e13cbaa3-c909-4570-8c49-78b45115f34a ---
✅ Prediction response: {'response': '{"event":"agentFlowEvent","data":"INPROGRESS"}{"event":"nextAgentFlow","data":{"nodeId":"startAgentflow_0","nodeLabel":"Start","status":"INPROGRESS"}}{"event":"nextAgentFlow","data":{"nodeId":"startAgentflow_0","nodeLabel":"Start","status":"FINISHED"}}{"event":"agentFlowExecutedData","data":[{"nodeId":"startAgentflow_0","nodeLabel":"Start","data":{"id":"startAgentflow_0","name":"startAgentflow","input":{"question":"Hello, can you help me?"},"output":{"question":"Hello, can you help me?","ephemeralMemory":true},"state":{}},"previousNodeIds":[],"status":"FINISHED"}]}{"event":"nextAgentFlow","data":{"nodeId":"llmAgentflow_0","nodeLabel":"Topic Enhancer","status":"INPROGRESS"}}{"event":"nextAgentFlow","data":{"nodeId":"llmAgentflow_0","nodeLabel":"Topic Enhancer","status":"FINISHED"}}{"event":"agentFlowExecutedData","data":[{"nodeId":"startAgentflow_0","nodeLabel":"Start","data":{"id":"startAgentflow_0","name":"startAgentflow","input":{"question":"Hello, can you help me?"},"output":{"question":"Hello, can you help me?","ephemeralMemory":true},"state":{}},"previousNodeIds":[],"status":"FINISHED"},{"nodeId":"llmAgentflow_0","nodeLabel":"Topic Enhancer","data":{"id":"llmAgentflow_0","name":"llmAgentflow","input":{"messages":[{"role":"developer","content":"Your only role is to improve the user query for more clarity. Do not add any meta comments."},{"role":"user","content":"Hello, can you help me?"}],"llmModel":"awsChatBedrock","llmEnableMemory":false,"llmReturnResponseAs":"userMessage","llmModelConfig":{"credential":"","region":"us-east-1","model":"","customModel":"us.amazon.nova-lite-v1:0","streaming":true,"temperature":0.7,"max_tokens_to_sample":"10000","allowImageUploads":"","llmModel":"awsChatBedrock","FLOWISE_CREDENTIAL_ID":"36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"}},"output":{"content":"Certainly! Here\'s a refined version of your query for better clarity:\\n\\n\\"Hello, could you please assist me with something? I could use some help with [specific issue or topic]. Thank you!\\"","timeMetadata":{"start":1750819099785,"end":1750819100978,"delta":1193},"calledTools":[],"usageMetadata":{"input_tokens":27,"output_tokens":43,"total_tokens":70}},"state":{},"chatHistory":[{"role":"user","content":"Hello, can you help me?"},{"role":"user","content":"Certainly! Here\'s a refined version of your query for better clarity:\\n\\n\\"Hello, could you please assist me with something? I could use some help with [specific issue or topic]. Thank you!\\"","name":"topic_enhancer"}]},"previousNodeIds":["startAgentflow_0"],"status":"FINISHED"}]}{"event":"nextAgentFlow","data":{"nodeId":"agentAgentflow_0","nodeLabel":"Agent 0","status":"INPROGRESS"}}{"event":"nextAgentFlow","data":{"nodeId":"agentAgentflow_0","nodeLabel":"Agent 0","status":"FINISHED"}}{"event":"agentFlowExecutedData","data":[{"nodeId":"startAgentflow_0","nodeLabel":"Start","data":{"id":"startAgentflow_0","name":"startAgentflow","input":{"question":"Hello, can you help me?"},"output":{"question":"Hello, can you help me?","ephemeralMemory":true},"state":{}},"previousNodeIds":[],"status":"FINISHED"},{"nodeId":"llmAgentflow_0","nodeLabel":"Topic Enhancer","data":{"id":"llmAgentflow_0","name":"llmAgentflow","input":{"messages":[{"role":"developer","content":"Your only role is to improve the user query for more clarity. Do not add any meta comments."},{"role":"user","content":"Hello, can you help me?"}],"llmModel":"awsChatBedrock","llmEnableMemory":false,"llmReturnResponseAs":"userMessage","llmModelConfig":{"credential":"","region":"us-east-1","model":"","customModel":"us.amazon.nova-lite-v1:0","streaming":true,"temperature":0.7,"max_tokens_to_sample":"10000","allowImageUploads":"","llmModel":"awsChatBedrock","FLOWISE_CREDENTIAL_ID":"36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"}},"output":{"content":"Certainly! Here\'s a refined version of your query for better clarity:\\n\\n\\"Hello, could you please assist me with something? I could use some help with [specific issue or topic]. Thank you!\\"","timeMetadata":{"start":1750819099785,"end":1750819100978,"delta":1193},"calledTools":[],"usageMetadata":{"input_tokens":27,"output_tokens":43,"total_tokens":70}},"state":{},"chatHistory":[{"role":"user","content":"Hello, can you help me?"},{"role":"user","content":"Certainly! Here\'s a refined version of your query for better clarity:\\n\\n\\"Hello, could you please assist me with something? I could use some help with [specific issue or topic]. Thank you!\\"","name":"topic_enhancer"}]},"previousNodeIds":["startAgentflow_0"],"status":"FINISHED"},{"nodeId":"agentAgentflow_0","nodeLabel":"Agent 0","data":{"id":"agentAgentflow_0","name":"agentAgentflow","input":{"messages":[{"role":"system","content":"You are Agent 0. Your goal is to explore any topic provided by the user in depth with Agent 1.\\n\\n1.  Start: Introduce the topic to Agent 1. Share your initial thoughts and any assumptions you have.\\n    \\n2.  Research & Share:\\n    \\n    *   Use **Brave API** to find a range of information and different viewpoints on the topic. Look for URLs that seem promising for more detail.\\n        \\n    *   Present what you find to Agent 1, especially any complexities, counter-arguments, or conflicting data.\\n        \\n    *   Clearly state your sources:\\n        \\n        *   \\"google API found...\\"\\n            \\n        *   \\"After scraping \\\\[URL\\\\], the content shows...\\"\\n            \\n3.  Discuss & Deepen:\\n    \\n    *   Listen to Agent 1. Ask probing questions.\\n        \\n    *   If needed, use your tools again (google API to find more, Web Scraper to analyze a specific page) during the conversation to verify points or explore new angles.\\n        \\n4.  Mindset: Be curious, analytical, and open to different perspectives. Aim for a thorough understanding, not just agreement."},{"role":"user","content":"Hello, can you help me?"},{"role":"user","content":"Certainly! Here\'s a refined version of your query for better clarity:\\n\\n\\"Hello, could you please assist me with something? I could use some help with [specific issue or topic]. Thank you!\\"","name":"topic_enhancer"}],"agentModel":"awsChatBedrock","agentTools":[{"agentSelectedTool":"braveSearchAPI","agentSelectedToolRequiresHumanInput":"","agentSelectedToolConfig":{"agentSelectedTool":"braveSearchAPI","FLOWISE_CREDENTIAL_ID":"8b68b2fc-db18-4fa8-95b1-547a8986349a"}}],"agentKnowledgeDocumentStores":[],"agentEnableMemory":true,"agentMemoryType":"allMessages","agentReturnResponseAs":"assistantMessage","agentModelConfig":{"credential":"","region":"us-east-1","model":"","customModessages","agentReturnResponseAs":"assistantMessage","agentModelConfig":{"credential":"","region":"us-east-1","model":"","customModel":"us.amazon.nova-lite-v1:0","streaming":true,"temperature":"0","max_tokens_to_sample":"10000","allowImageUploads":"","agentModeessages","agentReturnResponseAs":"assistantMessage","agentModelConfig":{"credential":"","region":"us-east-1","model":"","customModel":"us.amazon.nova-lite-v1:0","streaming":true,"temperature":"0","max_tokens_to_sample":"10000","allowImageUploads":"","agentModel":"awsChatBedrock","FLOWISE_CREDENTIAL_ID":"36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"}},"output":{"content":"<thinking>I see the useressages","agentReturnResponseAs":"assistantMessage","agentModelConfig":{"credential":"","region":"us-east-1","model":"","customModel":"us.amazon.nova-lite-v1:0","streaming":true,"temperature":"0","max_tokens_to_sample":"10000","allowImageUploads":"","agentModel":"awsChatBedrock","FLOWISE_CREDENTIAL_ID":"36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"}},"output":{"content":"<thinking>I see the user has provided a refined version of their query template, but I need to understand what specific issue or topic they need assistancel":"us.amazon.nova-lite-v1:0","streaming":true,"temperature":"0","max_tokens_to_sample":"10000","allowImageUploads":"","agentModel":"awsChatBedrock","FLOWISE_CREDENTIAL_ID":"36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"}},"output":{"content":"<thinking>I see the userl":"awsChatBedrock","FLOWISE_CREDENTIAL_ID":"36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"}},"output":{"content":"<thinking>I see the user has provided a refined version of their query template, but I need to understand what specific issue or topic they need assistanc has provided a refined version of their query template, but I need to understand what specific issue or topic they need assistance with. I\'ll start by acknowledging their template and asking for the specific topic they want to explore.</thinking>\\n\\nHello!e with. I\'ll start by acknowledging their template and asking for the specific topic they want to explore.</thinking>\\n\\nHello! Certainly, I\'d be happy to assist you. Could you please let me know what specific issue or topic you\'d like to explore today? T Certainly, I\'d be happy to assist you. Could you please let me know what specific issue or topic you\'d like to explore today? Thank you!","timeMetadata":{"start":1750819100988,"end":1750819102492,"delta":1504},"calledTools":[],"usageMetadata":{"input_tokenshank you!","timeMetadata":{"start":1750819100988,"end":1750819102492,"delta":1504},"calledTools":[],"usageMetadata":{"input_tokens":718,"output_tokens":88,"total_tokens":806,"tool_call_tokens":0},"availableTools":[{"name":"brave-search","description":"a search engine. useful for when you need to answer questions about current events. input should be a search query.","schema":{"type":"object","properties":{"input":{"type":"string"}},"additionalProperties":false},"toolNode":{"label":"BraveSearch API","name":"braveSearchAPI"}}]},"state":{},"chatHistory":[{"role":"assistant","content":"<thinking>I see the user has provided a refined version of thrchAPI"}}]},"state":{},"chatHistory":[{"role":"assistant","content":"<thinking>I see the user has provided a refined version of their query template, but I need to understand what specific issue or topic they need assistance with. I\'ll start by acknowledging their template and asking for the specific topic they want to explore.</thinking>\\n\\nHello! Certainly, I\'d be happy to assist you. Could you please let me know what specific issue or topic you\'d like to explore today? Thank you!","name":"agent_0"}]},"previousNodeIds":["llmAgentflow_0"],"status":"FINISHED"}]}{"event":"nextAgentFlow","data":{"nodeId":"agentAgentflow_1","nodeLabel":"Agent 1","status":"INPROGRESS"}}{"event":"nextAgentFlow","data":{"nodeId":"agentAgentflow_1","nodeLabel":"Agent 1","status":"FINISHED"}}{"event":"agentFlowExecutedData","data":[{"nodeId":"startAgentflow_0","nodeLabel":"Start","data":{"id":"startAgentflow_0","name":"startAgentflow","input":{"question":"Hello, can you help me?"},"output":{"question":"Hello, can you help me?","ephemeralMemory":true},"state":{}},"previousNodeIds":[],"status":"FINISHED"},{"nodeId":"llmAgentflow_0","nodeLabel":"Topic Enhancer","data":{"id":"llmAgentflow_0","name":"llmAgentflow","input":{"messages":[{"role":"developer","content":"Your only role is to improve the user query for more clarity. Do not add any meta comments."},{"
"""
