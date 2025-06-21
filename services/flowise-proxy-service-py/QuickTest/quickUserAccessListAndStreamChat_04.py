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
            log_file.write(
                f"[{timestamp}] User '{username}' predicting on chatflow '{chatflow_id}': Request error: {e}\n"
            )
    except Exception as e:
        print(
            f"❌ Unexpected error during prediction for {username} on chatflow {chatflow_id}: {e}"
        )
        with open(LOG_PATH, "a") as log_file:
            log_file.write(
                f"[{timestamp}] User '{username}' predicting on chatflow '{chatflow_id}': Unexpected error: {e}\n"
            )


def test_chat_predict_stream(token, username, chatflow_id, question):
    """
    Tests the chat predict stream endpoint for a given chatflow_id and question.
    """
    print(
        f"\n--- Testing chat predict STREAM for user: {username} on chatflow: {chatflow_id} ---"
    )
    if not token:
        print("❌ Cannot test predict stream without a token.")
        return
    if not chatflow_id:
        print("❌ Cannot test predict stream without a chatflow_id.")
        return
    predict_url = f"{API_BASE_URL}/api/v1/chat/predict/stream"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "chatflow_id": chatflow_id,
        "question": question,
    }
    try:
        # Use stream=True to handle the streaming response
        response = requests.post(
            predict_url, headers=headers, json=payload, stream=True
        )
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry_prefix = f"[{timestamp}] User '{username}' streaming on chatflow '{chatflow_id}' with question '{question}':"

        if response.status_code == 200:
            print(f"✅ Stream started successfully for {username}. Chunks:")
            full_response = ""
            # Iterate over the response chunks
            for chunk in response.iter_content(
                chunk_size=None
            ):  # Use iter_content for raw bytes
                if chunk:
                    decoded_chunk = chunk.decode("utf-8")  # Decode bytes to string
                    print(
                        decoded_chunk, end="", flush=True
                    )  # Print chunk without newline, flush to show immediately
                    full_response += decoded_chunk
            print("\n--- End of Stream ---")  # Print a newline at the end

            with open(LOG_PATH, "a") as log_file:
                log_file.write(
                    f"{log_entry_prefix} SUCCESS - Full response: {full_response}\n"
                )
        else:
            print(
                f"❌ Prediction stream failed for {username} on chatflow {chatflow_id}: {response.status_code}"
            )
            error_message = response.text
            print(f"   Error: {error_message}")
            with open(LOG_PATH, "a") as log_file:
                log_file.write(
                    f"{log_entry_prefix} FAILED - Status: {response.status_code}, Error: {error_message}\n"
                )

    except requests.RequestException as e:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(
            f"❌ Request error during prediction stream for {username} on chatflow {chatflow_id}: {e}"
        )
        with open(LOG_PATH, "a") as log_file:
            log_file.write(
                f"[{timestamp}] User '{username}' predicting on chatflow '{chatflow_id}': Request error: {e}\n"
            )
    except Exception as e:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(
            f"❌ Unexpected error during prediction stream for {username} on chatflow {chatflow_id}: {e}"
        )
        with open(LOG_PATH, "a") as log_file:
            log_file.write(
                f"[{timestamp}] User '{username}' predicting on chatflow '{chatflow_id}': Unexpected error: {e}\n"
            )


# Main execution
if __name__ == "__main__":

    # User login and tests
    for user in REGULAR_USERS:
        user_token = get_user_token(user)
        if user_token:
            chatflow_id = list_accessible_chatflows(user_token, user["username"])
            if chatflow_id:
                test_chat_predict(
                    user_token, user["username"], chatflow_id, "Hello, can you help me?"
                )
                test_chat_predict_stream(
                    user_token, user["username"], chatflow_id, "Tell me a story."
                )
            else:
                print(f"❌ No accessible chatflows for user {user['username']}.")
        else:
            print(f"❌ Could not get token for user {user['username']}.")
