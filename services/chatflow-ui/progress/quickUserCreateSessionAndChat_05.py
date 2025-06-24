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


def create_chat_session(token, username, chatflow_id, topic="Test Session"):
    """
    Creates a new chat session for the user and chatflow.
    Returns the session_id if successful.
    """
    print(
        f"\n--- Creating chat session for user: {username} on chatflow: {chatflow_id} ---"
    )
    if not token:
        print("❌ Cannot create session without a token.")
        return None
    if not chatflow_id:
        print("❌ Cannot create session without a chatflow_id.")
        return None

    session_url = f"{API_BASE_URL}/api/v1/chat/sessions"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "topic": topic}

    try:
        response = requests.post(session_url, headers=headers, json=payload)
        if response.status_code == 201:  # Created
            data = response.json()
            session_id = data.get("session_id")
            if session_id:
                print(f"✅ Session created successfully for {username}.")
                print(f"   - Session ID: {session_id}")
                print(f"   - Chatflow ID: {data.get('chatflow_id')}")
                print(f"   - Created At: {data.get('created_at')}")
                return session_id
            else:
                print(f"❌ Session created but no session_id in response: {data}")
                return None
        else:
            print(
                f"❌ Failed to create session: {response.status_code} {response.text}"
            )
            return None
    except requests.RequestException as e:
        print(f"❌ Request error while creating session: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error while creating session: {e}")
        return None


def test_chat_predict_stream_with_session(
    token, username, chatflow_id, session_id, question
):
    """
    Tests the chat predict stream endpoint using a specific session_id.
    """
    print(f"\n--- Testing chat predict STREAM with session_id for user: {username} ---")
    if not all([token, chatflow_id, session_id]):
        print(
            "❌ Cannot test predict stream without token, chatflow_id, and session_id."
        )
        return

    predict_url = f"{API_BASE_URL}/api/v1/chat/predict/stream"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "chatflow_id": chatflow_id,
        "question": question,
        "sessionId": session_id,  # Pass the created session ID here
    }

    try:
        print(f"   Using Session ID: {session_id}")
        print(f"   Question: {question}")
        response = requests.post(
            predict_url, headers=headers, json=payload, stream=True
        )

        if response.status_code == 200:
            print(f"✅ Stream started successfully for {username}. Chunks:")
            full_response = ""
            for chunk in response.iter_content(chunk_size=None):
                if chunk:
                    decoded_chunk = chunk.decode("utf-8")
                    print(decoded_chunk, end="", flush=True)
                    full_response += decoded_chunk
            print("\n--- End of Stream ---")
            print(f"✅ Full response received for session {session_id}.")
        else:
            print(f"❌ Prediction stream failed for {username}: {response.status_code}")
            print(f"   Error: {response.text}")

    except requests.RequestException as e:
        print(f"❌ Request error during prediction stream: {e}")
    except Exception as e:
        print(f"❌ Unexpected error during prediction stream: {e}")


# Main execution
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 CREATE SESSION & CHAT TEST SUITE 🚀")
    print("=" * 60)

    # Use the first regular user for the test
    test_user = REGULAR_USERS[0]

    # 1. Get user token
    user_token = get_user_token(test_user)

    if user_token:
        # 2. List accessible chatflows to get a valid chatflow_id
        chatflow_id = list_accessible_chatflows(user_token, test_user["username"])

        if chatflow_id:
            # 3. Create a new chat session
            session_id = create_chat_session(
                user_token,
                test_user["username"],
                chatflow_id,
                topic="My First API Session",
            )

            if session_id:
                # 4. Use the created session to ask a question
                test_chat_predict_stream_with_session(
                    user_token,
                    test_user["username"],
                    chatflow_id,
                    session_id,
                    "Hello, this is the first message in our new session. My Name is John",
                )

                # 5. Ask a follow-up question in the same session
                test_chat_predict_stream_with_session(
                    user_token,
                    test_user["username"],
                    chatflow_id,
                    session_id,
                    "This is the second message. Do you remember my name?",
                )
            else:
                print("❌ Could not create a session, skipping chat test.")
        else:
            print(
                f"❌ No accessible chatflows for user {test_user['username']}, skipping session and chat tests."
            )
            print("   Please ensure the user is assigned to a chatflow by an admin.")
    else:
        print(
            f"❌ Could not get token for user {test_user['username']}. Aborting test."
        )

    print("\n" + "=" * 60)
    print("✨ Test Suite Finished ✨")
    print("=" * 60)
