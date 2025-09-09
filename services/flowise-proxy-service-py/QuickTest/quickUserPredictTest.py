\
#!/usr/bin/env python3
"""
Quick User Predict Test Script
This script tests the chat predict functionality for a regular user.

PREREQUISITES:
1. Flowise-Proxy service (localhost:8000) must be running.
2. External Auth service (localhost:3000) must be running.
3. MongoDB (auth-mongodb or test instance) must be running.
4. At least one user should exist and be synced (e.g., user1@example.com).
5. At least one chatflow should exist and be synced.
6. The user should be assigned to that chatflow.
   (Run quickAddUserToChatflow.py to set this up if needed)
"""

import json
import requests
import sys
import os
import datetime

# Configuration (consistent with other quickTest scripts)
LOG_FILE = "quickUserPredictTest.log" # Specific log for this test
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

API_BASE_URL = "http://localhost:8000"
ADMIN_USER = { # Needed for initial syncs
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}
# Define a test user - ensure this user exists in the external auth
# and has been synced to the local proxy DB.
TEST_USER = {
    "username": "user1",
    "email": "user1@example.com",
    "password": "User1@123", # Ensure this matches the password in external auth
}

# Helper function to get admin token (copied from other scripts for self-containment)
def get_admin_token():
    """Log in as admin and get the access token"""
    print("\\\\n--- Getting admin access token ---")
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
            token = data.get("accessToken") or data.get("access_token") or data.get("token", {}).get("accessToken")
            if token:
                print("✅ Admin access token obtained")
                return token
            else:
                print(f"❌ Admin access token not found in response: {data}")
        else:
            print(f"❌ Failed to log in as admin: {response.status_code} - {response.text}")
    except requests.RequestException as e:
        print(f"❌ Request error getting admin token: {e}")
    except Exception as e:
        print(f"❌ Unexpected error getting admin token: {e}")
    return None

def test_sync_users_by_email(token, emails):
    """Test syncing users by email from external auth to local DB"""
    print("\\\\n--- Testing User Sync by Email ---")
    if not emails:
        print("No emails provided for user sync.")
        return False
    headers = {"Authorization": f"Bearer {token}"}
    all_successful = True
    for email in emails:
        print(f"Attempting to sync user: {email}")
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/admin/users/sync-by-email",
                headers=headers,
                json={"email": email}
            )
            if response.status_code in [200, 201]:
                print(f"✅ User sync/creation successful for {email}")
            else:
                print(f"❌ User sync failed for {email}: {response.status_code} - {response.text}")
                all_successful = False
        except Exception as e:
            print(f"❌ Error syncing user {email}: {e}")
            all_successful = False
    return all_successful

def test_sync_chatflows(token):
    """Test syncing chatflows from Flowise endpoint to database"""
    print("\\\\n--- Testing Chatflow Sync ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{API_BASE_URL}/api/v1/admin/chatflows/sync", headers=headers)
        if response.status_code == 200:
            print("✅ Chatflow sync successful")
            return True
        else:
            print(f"❌ Chatflow sync failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error syncing chatflows: {e}")
        return False

# Helper function to get user token
def get_user_token(user_credentials):
    print(f"\\\\n--- Getting access token for user: {user_credentials['username']} ---")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/chat/authenticate",
            json=user_credentials
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token") # Standard key for user tokens
            if token:
                print(f"✅ Access token obtained for {user_credentials['username']}")
                return token
            else:
                print(f"❌ Access token not found for {user_credentials['username']}: {data}")
        else:
            print(f"❌ Failed to log in as {user_credentials['username']}: {response.status_code} - {response.text}")
    except requests.RequestException as e:
        print(f"❌ Request error getting user token: {e}")
    except Exception as e:
        print(f"❌ Unexpected error getting user token: {e}")
    return None

# Function to list accessible chatflows for the user
def list_accessible_chatflows(user_token, username):
    print(f"\\\\n--- Listing accessible chatflows for user: {username} ---")
    if not user_token:
        print("❌ Cannot list chatflows without a user token.")
        return None
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{API_BASE_URL}/api/v1/chatflows", headers=headers)
        if response.status_code == 200:
            chatflows = response.json()
            if chatflows:
                print(f"✅ Accessible chatflows for {username}:")
                for cf in chatflows:
                    print(f"  - ID: {cf.get('id')}, Name: {cf.get('name')}")
                return chatflows # Return the list of chatflows
            else:
                print(f"ℹ️ No chatflows accessible to {username}.")
        else:
            print(f"❌ Failed to list chatflows for {username}: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error listing chatflows for {username}: {e}")
    return None

# Function to test predict
def test_predict(user_token, username, chatflow_id, question):
    print(f"\\\\n--- Testing predict for user: {username} on chatflow: {chatflow_id} ---")
    if not user_token or not chatflow_id:
        print("❌ Missing user token or chatflow ID for predict test.")
        return False
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {"chatflow_id": chatflow_id, "question": question}
        response = requests.post(f"{API_BASE_URL}/api/v1/chat/predict", headers=headers, json=payload)
        
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry_prefix = f"[{timestamp}] User '{username}' predicting on chatflow '{chatflow_id}' with question '{question}':"

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Prediction successful for {username} on chatflow {chatflow_id}:")
            print(json.dumps(result, indent=2))
            with open(LOG_PATH, "a") as log_file:
                log_file.write(f"{log_entry_prefix} Success - Response: {json.dumps(result)}\\\\n")
            return True
        else:
            print(f"❌ Prediction failed: {response.status_code} - {response.text}")
            with open(LOG_PATH, "a") as log_file:
                log_file.write(f"{log_entry_prefix} Failed - Status: {response.status_code}, Response: {response.text}\\\\n")
            return False
    except Exception as e:
        print(f"❌ Error during prediction: {e}")
        with open(LOG_PATH, "a") as log_file:
            log_file.write(f"{log_entry_prefix} Error - {e}\\\\n")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 QUICK USER PREDICT TEST 🚀")
    print("=" * 60)

    with open(LOG_PATH, "w") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(f"[{timestamp}] Starting Quick User Predict Test\\\\n")

    # 1. Get Admin Token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Critical: Could not obtain admin token. Aborting predict test.")
        sys.exit(1)

    # 2. Sync Test User (and admin for good measure)
    users_to_sync = [TEST_USER["email"], ADMIN_USER["email"]]
    if not test_sync_users_by_email(admin_token, users_to_sync):
        print("⚠️ User sync had issues. Predict test might fail if test user is not available.")
    
    # 3. Sync Chatflows
    if not test_sync_chatflows(admin_token):
        print("❌ Critical: Chatflow sync failed. Cannot proceed with predict test.")
        sys.exit(1)

    # 4. Get Test User Token
    user_token = get_user_token({
        "username": TEST_USER["username"],
        "password": TEST_USER["password"]
    })
    if not user_token:
        print(f"❌ Critical: Could not obtain token for test user {TEST_USER['username']}. Aborting.")
        sys.exit(1)

    # 5. List accessible chatflows for the user to find one to test with
    accessible_chatflows = list_accessible_chatflows(user_token, TEST_USER["username"])
    if not accessible_chatflows:
        print(f"❌ No chatflows accessible to user {TEST_USER['username']}. Ensure user is assigned to at least one chatflow.")
        print("Consider running quickAddUserToChatflow.py to assign user to a chatflow.")
        sys.exit(1)
    
    # Select the first accessible chatflow for the predict test
    # Ensure the chatflow returned has an 'id' field, which is the proxy's internal ID.
    # The predict endpoint expects this internal 'id', not the 'flowise_id'.
    chatflow_to_test = accessible_chatflows[0]
    chatflow_id_for_predict = chatflow_to_test.get("id") 

    if not chatflow_id_for_predict:
        print(f"❌ Could not get a valid 'id' from the accessible chatflows for user {TEST_USER['username']}.")
        print(f"   Chatflow data: {chatflow_to_test}")
        sys.exit(1)

    print(f"ℹ️ Will use chatflow ID '{chatflow_id_for_predict}' (Name: {chatflow_to_test.get('name', 'N/A')}) for predict test.")

    # 6. Perform Predict Test
    question = "Hello, what can you do?"
    predict_success = test_predict(user_token, TEST_USER["username"], chatflow_id_for_predict, question)

    print("\\\\n" + "=" * 60)
    if predict_success:
        print("✅ Quick User Predict Test completed successfully.")
    else:
        print("❌ Quick User Predict Test failed.")
    print("=" * 60)
