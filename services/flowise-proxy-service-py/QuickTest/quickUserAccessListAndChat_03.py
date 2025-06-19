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
            print(f"❌ Failed to get token for {user['username']}: {response.status_code} {response.text}")
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
            print(f"❌ Failed to list chatflows for {username}: {response.status_code} {response.text}")
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
    print(f"\n--- Testing chat predict for user: {username} on chatflow: {chatflow_id} ---")
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
        print(f"❌ Request error during prediction for {username} on chatflow {chatflow_id}: {e}")
        with open(LOG_PATH, "a") as log_file:
            log_file.write(f"Request error: {e}\n")
    except Exception as e:
        print(f"❌ Unexpected error during prediction for {username} on chatflow {chatflow_id}: {e}")
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
            f"{API_BASE_URL}/api/v1/admin/chatflows",
            headers=headers
        )
        
        if response.status_code == 200:
            chatflows = response.json()
            print(f"✅ Retrieved {len(chatflows)} active chatflows")
            
            # Display all chatflows for verification
            for i, chatflow in enumerate(chatflows):
                print(f"  {i+1}. ID: {chatflow.get('flowise_id', 'N/A')}, Name: {chatflow.get('name', 'N/A')}")
            
            # Log result
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(f"[{timestamp}] Admin listed {len(chatflows)} chatflows\n")
            
            # Return the first chatflow's flowise_id for assignment testing
            if chatflows:
                return chatflows[0].get('flowise_id')
            else:
                print("ℹ️ No chatflows available for assignment")
                return None
        else:
            print(f"❌ Failed to list chatflows: {response.status_code} - {response.text}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(f"[{timestamp}] Admin failed to list chatflows: {response.status_code}\n")
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
            log_file.write(f"[{timestamp}] Admin chatflow listing unexpected error: {e}\n")
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
            json=payload
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Successfully assigned user '{user_email}' to chatflow '{chatflow_id}'")
            print(f"   Assignment details: {json.dumps(data, indent=2)}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(f"[{timestamp}] Admin assigned user '{user_email}' to chatflow '{chatflow_id}'\n")
            return True
        else:
            print(f"❌ Failed to assign user to chatflow: {response.status_code} - {response.text}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(f"[{timestamp}] Admin failed to assign user '{user_email}' to chatflow '{chatflow_id}': {response.status_code}\n")
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
            log_file.write(f"[{timestamp}] Admin user assignment unexpected error: {e}\n")
        return False

def clear_user_chatflow_assignments(admin_token, user_email, chatflow_id):
    """Clear existing user assignments to avoid conflicts (corrected for admin.py)"""
    print(f"\n🧹 Clearing existing assignments for '{user_email}' and chatflow '{chatflow_id}'")
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Use the correct endpoint and query parameter as per admin.py
        response = requests.delete(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users",
            headers=headers,
            params={"email": user_email}
        )
        if response.status_code == 200:
            print(f"✅ Cleared existing assignment for '{user_email}'")
            return True
        elif response.status_code == 404:
            print(f"ℹ️ No existing assignment found for '{user_email}' (this is fine)")
            return True
        else:
            print(f"⚠️ Could not clear assignment: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"⚠️ Error clearing assignment: {e}")
        return False

# ADD THIS NEW FUNCTION: Verify the assignment worked
def verify_user_assignment(admin_token, chatflow_id, user_email):
    """Verify that the user assignment was successful by checking the database"""
    print(f"\n--- Verifying Assignment for '{user_email}' to Chatflow '{chatflow_id}' ---")
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # List users assigned to this chatflow
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users",
            headers=headers
        )
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Found {len(users)} users assigned to chatflow '{chatflow_id}':")
            
            user_found = False
            for user in users:
                user_email_in_list = user.get('email', 'N/A')
                print(f"   - {user.get('username', 'N/A')} ({user_email_in_list})")
                if user_email_in_list == user_email:
                    user_found = True
                    print(f"   ✅ Target user '{user_email}' found in assignment list")
            
            if not user_found:
                print(f"   ⚠️ Target user '{user_email}' NOT found in assignment list")
            
            return user_found
        else:
            print(f"❌ Failed to list chatflow users: {response.status_code} - {response.text}")
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
            user_id = str(users[0]['_id'])
            assignments = list(db.userchatflows.find({"user_id": user_id}))
            print(f"🔗 UserChatflow assignments for user {user_id}: {len(assignments)}")
            for assignment in assignments:
                print(f"   - Chatflow ID: {assignment.get('chatflow_id')}")
                print(f"   - Is Active: {assignment.get('is_active')}")
                print(f"   - Assigned At: {assignment.get('assigned_at')}")
                
        # Also check by external_id 
        if users:
            external_id = users[0].get('external_id')
            if external_id:
                assignments_by_external = list(db.userchatflows.find({"user_id": external_id}))
                print(f"🔗 UserChatflow assignments for external_id {external_id}: {len(assignments_by_external)}")
        
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
                json={"email": email}
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
            elif response.status_code == 201: # Created
                data = response.json()
                print(f"✅ User created and synced for {email}: {data.get('status')}")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User created and synced for {email}: {data.get('status')}\\\\n"
                    )
                successful_syncs += 1
            else:
                print(f"❌ User sync failed for {email}: {response.status_code} - {response.text}")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User sync failed for {email}: {response.status_code} - {response.text}\\\\n"
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
    print("\\\\n--- Testing Chatflow Sync ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/sync",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chatflow sync successful")
            print(f"📊 Sync Results: total_fetched={data.get('total_fetched',0)}, created={data.get('created',0)}, updated={data.get('updated',0)}, deleted={data.get('deleted',0)}, errors={data.get('errors',0)}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(f"[{timestamp}] Chatflow sync completed: {json.dumps(data)}\\\\n")
            return True
        else:
            print(f"❌ Chatflow sync failed: {response.status_code} - {response.text}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(f"[{timestamp}] Chatflow sync failed: {response.status_code} - {response.text}\\\\n")
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
        response = requests.post(f"{API_BASE_URL}/api/v1/admin/chatflows/sync", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chatflow sync via API successful: {data}")
            return True
        else:
            print(f"❌ Chatflow sync via API failed: {response.status_code} {response.text}")
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
    user_emails_to_sync = [user["email"] for user in SUPERVISOR_USERS] + [user["email"] for user in REGULAR_USERS]
    print("\n🔄 Syncing Users by Email...")
    user_sync_successful = test_sync_users_by_email(admin_token, user_emails_to_sync)
    if user_sync_successful:
        print("✅ User sync process completed successfully.")
    else:
        print("⚠️ User sync process completed with some failures.")
    # Perform chatflow sync using the server endpoint
    sync_successful = sync_chatflows_via_api(admin_token)
    if not sync_successful:
        print("❌ Critical: Chatflow sync via API failed. Some tests might not be meaningful. Continuing...")
    # List all chatflows as admin and pick one
    target_chatflow_id = list_all_chatflows_as_admin(admin_token)
    if not target_chatflow_id:
        print("❌ No chatflows available for assignment. Exiting.")
        exit(1)
    # Assign user1 to the chatflow as admin
    assignment_success = assign_user_to_chatflow_by_email(admin_token, target_chatflow_id, REGULAR_USERS[0]["email"])
    if not assignment_success:
        print(f"❌ Failed to assign user1 to chatflow {target_chatflow_id}. Exiting.")
        exit(1)
    # Verify the assignment to debug the issue
    print("\n🕵️  Verifying the assignment directly after the API call...")
    verification_passed = verify_user_assignment(admin_token, target_chatflow_id, REGULAR_USERS[0]["email"])
    if not verification_passed:
        print("‼️  Verification failed. The API call to assign the user might have succeeded, but the user is not showing up as assigned.")
        print("   Running a database state check for more details...")
        debug_database_state()
    else:
        print("✅ Verification PASSED: The admin API confirms the user is assigned.")
        print("   The issue likely lies in the user-facing endpoint for listing chatflows or data synchronization.")
    # Log in as user1 and test access
    user = REGULAR_USERS[0]
    user_token = get_user_token(user)
    if user_token:
        chatflow_id = list_accessible_chatflows(user_token, user["username"])
        if chatflow_id:
            test_chat_predict(user_token, user["username"], chatflow_id, "Hello, can you help me?")
        else:
            print(f"❌ No accessible chatflows for user {user['username']}.")
    else:
        print(f"❌ Could not get token for user {user['username']}.")