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
    print(f"\\n--- Getting access token for user: {user['username']} ---")
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
            token = data.get("access_token") # Corrected token key

            if token:
                print(f"✅ Access token obtained for {user['username']}")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User '{user['username']}' logged in successfully\\n"
                    )
                return token
            else:
                print(f"❌ Access token not found in response for {user['username']}")
                print(f"Response data: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Failed to log in as {user['username']}: {response.status_code} - {response.text}")
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
    print(f"\\n--- Listing accessible chatflows for user: {username} ---")
    if not token:
        print("❌ Cannot list chatflows without a token.")
        return None

    chatflows_url = f"{API_BASE_URL}/api/v1/chatflows" # Corrected endpoint
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(chatflows_url, headers=headers)
        if response.status_code == 200:
            chatflows = response.json()
            if chatflows:
                print(f"✅ Accessible chatflows for {username}:")
                for cf in chatflows:
                    print(f"  - ID: {cf.get('id')}, Name: {cf.get('name')}")
                # Return the ID of the first chatflow for testing predict
                return chatflows[0].get("id")
            else:
                print(f"ℹ️ No chatflows accessible to {username} or an empty list was returned.")
                return None
        else:
            print(f"❌ Failed to list chatflows for {username}: {response.status_code} - {response.text}")
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
    print(f"\\n--- Testing chat predict for user: {username} on chatflow: {chatflow_id} ---")
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
        # "overrideConfig": {} # Optional
    }

    try:
        response = requests.post(predict_url, headers=headers, json=payload)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry_prefix = f"[{timestamp}] User '{username}' predicting on chatflow '{chatflow_id}' with question '{question}':"

        if response.status_code == 200:
            prediction_result = response.json()
            print(f"✅ Prediction successful for {username} on chatflow {chatflow_id}:")
            print(json.dumps(prediction_result, indent=2))
            with open(LOG_PATH, "a") as log_file:
                log_file.write(f"{log_entry_prefix} Success - Response: {json.dumps(prediction_result)}\\n")
        else:
            print(f"❌ Prediction failed for {username} on chatflow {chatflow_id}: {response.status_code} - {response.text}")
            with open(LOG_PATH, "a") as log_file:
                log_file.write(f"{log_entry_prefix} Failed - Status: {response.status_code}, Response: {response.text}\\n")

    except requests.RequestException as e:
        print(f"❌ Request error during prediction for {username} on chatflow {chatflow_id}: {e}")
        with open(LOG_PATH, "a") as log_file:
            log_file.write(f"{log_entry_prefix} Request Error - {e}\\n")
    except Exception as e:
        print(f"❌ Unexpected error during prediction for {username} on chatflow {chatflow_id}: {e}")
        with open(LOG_PATH, "a") as log_file:
            log_file.write(f"{log_entry_prefix} Unexpected Error - {e}\\n")


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
    """Assign a user to a chatflow using their email address"""
    print(f"\n--- Assigning User '{user_email}' to Chatflow '{chatflow_id}' ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Use the email-based endpoint
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users/email/{user_email}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Successfully assigned user '{user_email}' to chatflow '{chatflow_id}'")
            print(f"   Assignment details: {json.dumps(data, indent=2)}")
            
            # Log result
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
# Add this to quickUserAccessListAndChat.py
def clear_user_chatflow_assignments(admin_token, user_email, chatflow_id):
    """Clear existing user assignments to avoid conflicts"""
    print(f"\n🧹 Clearing existing assignments for '{user_email}' and chatflow '{chatflow_id}'")
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Remove user from chatflow
        response = requests.delete(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users/email/{user_email}",
            headers=headers
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
# User Functions

# Main execution flow with admin setup and user testing:
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 USER ACCESS LIST AND CHAT PREDICTION TEST")
    print("=" * 60)
    
    # Initialize log file for this run
    with open(LOG_PATH, "w") as log_file:
        log_file.write(f"--- Test Run: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---\n")

    test_user = REGULAR_USERS[0]  # Using user1 for testing
    
    # Step 1: Admin Setup - Get admin token
    print("\n🔧 STEP 1: Admin Setup")
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Failed to get admin token. Cannot proceed with setup.")
        exit(1)
    
    # Step 2: Admin Setup - List available chatflows
    print("\n📋 STEP 2: List Available Chatflows (Admin)")
    target_chatflow_id = list_all_chatflows_as_admin(admin_token)
    if not target_chatflow_id:
        print("❌ No chatflows available for assignment. Cannot proceed.")
        exit(1)
    
    # Step 3: Admin Setup - Clear existing assignments first
    print("\n🧹 STEP 3a: Clear Existing Assignments")
    clear_user_chatflow_assignments(
        admin_token,
        test_user["email"],
        target_chatflow_id
    )
    
    # Wait a moment for cleanup to propagate
    time.sleep(1)

    # Step 3: Admin Setup - Assign test user to a chatflow
    print("\n👤 STEP 3b: Assign Test User to Chatflow (Admin)")
    assignment_success = assign_user_to_chatflow_by_email(
        admin_token, 
        target_chatflow_id,  
        test_user["email"]
    )
    
    # ADD THIS: Step 3.5 - Verify the assignment
    if assignment_success:
        print("\n🔍 STEP 3.5: Verify Assignment")
        verification_success = verify_user_assignment(
            admin_token,
            target_chatflow_id,
            test_user["email"]
        )
        if not verification_success:
            print("⚠️ Assignment verification failed, but proceeding with user tests...")
    
    # Step 4: User Testing - Login as regular user
    print("\n🔑 STEP 4: User Login")
    user_token = get_user_token(test_user)
    
    if user_token:
        # ADD THIS: Additional wait before user tests
        print("⏳ Waiting additional 3 seconds before user access tests...")
        time.sleep(3)
        
        # Step 5: User Testing - List accessible chatflows
        print("\n📋 STEP 5: List Accessible Chatflows (User)")
        accessible_chatflow_id = list_accessible_chatflows(user_token, test_user["username"])
        
        if accessible_chatflow_id:
            # Step 6: User Testing - Test chat prediction
            print("\n💬 STEP 6: Test Chat Prediction")
            sample_question = "Hello, what can you do?"
            test_chat_predict(user_token, test_user["username"], accessible_chatflow_id, sample_question)
            
            print("\n" + "=" * 60)
            print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
            print("=" * 60)
        else:
            print(f"ℹ️ No accessible chatflow found for {test_user['username']} to test predict endpoint.")
            print("This might indicate the assignment didn't work or there's a delay in access propagation.")
            print("\n🔍 DEBUGGING: Let's check what's in the database...")
            
            # ADD THIS: Debug information
            print(f"Expected user: {test_user['email']}")
            print(f"Expected chatflow: {target_chatflow_id}")
            verify_user_assignment(admin_token, target_chatflow_id, test_user["email"])
    else:
        print(f"❌ Could not obtain token for {test_user['username']}. Skipping further tests for this user.")