import json
import requests
import subprocess
import time
import sys
import os
import datetime  # Ensure datetime is imported
import pymongo  # For direct DB check

# This script is designed to test Chat history Retrieval using chatflowIDs and sessionIDs
# using the API. It will create a session for a regular user, ask questions, and verify responses.

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Configuration

API_BASE_URL = "http://localhost:8000"

MONGODB_CONTAINER = "auth-mongodb"
ADMIN_USER = {
    "username": "admin",
    "email": "<admin@example.com>",
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


def list_all_chat_sessions(token, username, chatflow_id):
    """
    Lists all chat sessions for the user and chatflow.
    Returns a list of session_ids if successful.
    """
    print(f"\n--- Listing all chat sessions for user: {username} ---")
    if not token:
        print("❌ Cannot list sessions without a token.")
        return None

    sessions_url = f"{API_BASE_URL}/api/v1/chat/sessions"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(sessions_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            sessions = data.get("sessions", [])
            print(f"✅ Found {data.get('count', 0)} sessions for {username}.")
            if sessions:
                for i, session in enumerate(sessions):
                    print(f"  - Session {i+1}:")
                    print(f"    - Session ID: {session.get('session_id')}")
                    print(f"    - Chatflow ID: {session.get('chatflow_id')}")
                    print(f"    - Topic: {session.get('topic')}")
                    print(f"    - Created At: {session.get('created_at')}")
                    print(f"    - First Message: {session.get('first_message')}")
            return sessions
        else:
            print(
                f"❌ Failed to list sessions for {username}: {response.status_code} {response.text}"
            )
            return None
    except requests.RequestException as e:
        print(f"❌ Request error while listing sessions for {username}: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error while listing sessions for {username}: {e}")
        return None


def create_chat_session(token, username, chatflow_id, topic="Test Session"):
    """
    Creates a new chat session for the user and chatflow.
    Returns the session_id if successful.
    """
    print(
        f"\n--- Creating chat session for user: {username} on chatflow: {chatflow_id} ---"
    )
    if not all([token, chatflow_id]):
        print("❌ Token and chatflow_id are required.")
        return None

    session_url = f"{API_BASE_URL}/api/v1/chat/sessions"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "topic": topic}

    try:
        response = requests.post(session_url, headers=headers, json=payload)
        if response.status_code == 201:
            data = response.json()
            session_id = data.get("session_id")
            print(f"✅ Session created successfully: {session_id}")
            return session_id
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


def test_chat_predict_stream_store_with_session(
    token, username, chatflow_id, session_id, question
):
    """
    Tests the chat predict stream/store endpoint using a specific session_id.
    """
    print(
        f"\n--- Testing chat predict STREAM/STORE with session_id for user: {username} ---"
    )
    if not all([token, chatflow_id, session_id]):
        print("❌ Token, chatflow_id, and session_id are required.")
        return

    predict_url = f"{API_BASE_URL}/api/v1/chat/predict/stream/store"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "chatflow_id": chatflow_id,
        "question": question,
        "sessionId": session_id,
    }

    try:
        with requests.post(
            predict_url, headers=headers, json=payload, stream=True
        ) as response:
            if response.status_code == 200:
                print(f"✅ Stream started successfully for {username}. Chunks:")
                full_response = ""
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        decoded_chunk = chunk.decode("utf-8")
                        print(decoded_chunk, end="")
                        full_response += decoded_chunk
                print("\n--- End of Stream ---")
            else:
                print(
                    f"❌ Failed to start stream for {username}: {response.status_code} {response.text}"
                )
    except requests.RequestException as e:
        print(f"❌ Request error during stream: {e}")
    except Exception as e:
        print(f"❌ Unexpected error during stream: {e}")


def get_session_history(token, username, session_id):
    """
    Retrieves the message history for a specific session.
    """
    print(f"\n--- Getting history for session: {session_id} for user: {username} ---")
    if not all([token, session_id]):
        print("❌ Token and session_id are required.")
        return

    history_url = f"{API_BASE_URL}/api/v1/chat/sessions/{session_id}/history"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(history_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            history = data.get("history", [])
            print(f"✅ Found {data.get('count', 0)} messages in session {session_id}.")
            if history:
                for msg in history:
                    print(
                        f"  - [{msg.get('created_at')}] {msg.get('role')}: {msg.get('content')}"
                    )
            return history
        else:
            print(
                f"❌ Failed to get history for {username}: {response.status_code} {response.text}"
            )
            return None
    except requests.RequestException as e:
        print(f"❌ Request error while getting history: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error while getting history: {e}")
        return None


def main():
    """Main test execution function"""
    print("--- Starting Chat Session and History Retrieval Test ---")

    # Use the first regular user for the test
    test_user = REGULAR_USERS[0]
    username = test_user["username"]

    # 1. Get user token
    token = get_user_token(test_user)
    if not token:
        print("\n--- Test failed: Could not get user token. ---")
        return

    # 2. List accessible chatflows and get the first one
    chatflow_id = list_accessible_chatflows(token, username)
    if not chatflow_id:
        print("\n--- Test failed: No accessible chatflows found. ---")
        return

    # 3. Create a new chat session
    session_topic = f"Test Session at {datetime.datetime.now()}"
    session_id = create_chat_session(token, username, chatflow_id, topic=session_topic)
    if not session_id:
        print("\n--- Test failed: Could not create a chat session. ---")
        return

    # 4. List all sessions to verify creation
    list_all_chat_sessions(token, username, chatflow_id)

    # 5. Send a couple of messages to the session
    test_chat_predict_stream_store_with_session(
        token, username, chatflow_id, session_id, "Hello, who are you?"
    )
    time.sleep(2)  # Give a moment for processing
    test_chat_predict_stream_store_with_session(
        token, username, chatflow_id, session_id, "What can you do?"
    )
    time.sleep(2)

    # 6. Retrieve and verify the session history
    history = get_session_history(token, username, session_id)
    if history and len(history) >= 4:  # 2 user messages + 2 assistant responses
        print(
            "\n✅ --- Test Passed: Successfully retrieved and verified chat history. ---"
        )
    else:
        print("\n❌ --- Test Failed: History verification failed. ---")
        print(
            f"Expected at least 4 messages, but got {len(history) if history else 0}."
        )


if __name__ == "__main__":
    main()


# --- Testing chat predict STREAM/STORE with session_id for user: user1 ---
# ✅ Stream started successfully for user1. Chunks:
# {"event":"start","data":"I"}{"event":"token","data":"I"}{"event":"token","data":" can help"}{"event":"token","data":" with a variety"}{"event":"token","data":" of tasks and"}{"event":"token","data":" provide"}{"event":"token","data":" information on"}{"event":"token","data":" many"}{"event":"token","data":" topics"}{"event":"token","data":". Here are some things"}{"event":"token","data":" I can do:\n\n1."}{"event":"token","data":" **Answer"}{"event":"token","data":" Questions:** Provide information on a"}{"event":"token","data":" wide range of topics, from"}{"event":"token","data":" science"}{"event":"token","data":" and history to technology"}{"event":"token","data":" and entertainment.\n"}{"event":"token","data":"2. **Offer"}{"event":"token","data":" Recommendations"}{"event":"token","data":":** Suggest"}{"event":"token","data":" books, movies"}{"event":"token","data":", music"}{"event":"token","data":", and other"}{"event":"token","data":" media"}{"event":"token","data":" based on your preferences.\n3"}{"event":"token","data":". **Help with"}{"event":"token","data":" Homework"}{"event":"token","data":":** Assist"}{"event":"token","data":" with explanations"}{"event":"token","data":" and"}{"event":"token","data":" solutions"}{"event":"token","data":" for"}{"event":"token","data":" math problems,"}{"event":"token","data":" science questions"}{"event":"token","data":", and other"}{"event":"token","data":" academic"}{"event":"token","data":" topics"}{"event":"token","data":".\n4. **Provide"}{"event":"token","data":" How"}{"event":"token","data":"-To"}{"event":"token","data":" Guides:** Offer step"}{"event":"token","data":"-by-step instructions for"}{"event":"token","data":" various tasks"}{"event":"token","data":", such as cooking recipes"}{"event":"token","data":", DIY"}{"event":"token","data":" projects"}{"event":"token","data":", and"}{"event":"token","data":" tech"}{"event":"token","data":" setup"}{"event":"token","data":"s.\n5. **Language"}{"event":"token","data":" Assistance"}{"event":"token","data":":** Help with translations"}{"event":"token","data":", grammar checks"}{"event":"token","data":", and language learning"}{"event":"token","data":" tips"}{"event":"token","data":".\n6. **General"}{"event":"token","data":" Knowledge"}{"event":"token","data":":** Share"}{"event":"token","data":" facts"}{"event":"token","data":","}{"event":"token","data":" trivia, and interesting"}{"event":"token","data":" information on"}{"event":"token","data":" various"}{"event":"token","data":" subjects"}{"event":"token","data":".\n7. **Tech"}{"event":"token","data":" Support:** Offer"}{"event":"token","data":" basic troubleshooting"}{"event":"token","data":" tips for"}{"event":"token","data":" common tech"}{"event":"token","data":" issues.\n\nIf you have a"}{"event":"token","data":" specific question"}{"event":"token","data":" or need help with"}{"event":"token","data":" something, just"}{"event":"token","data":" let me know!"}{"event":"metadata","data":{"chatId":"00a3d788-a7ab-4d8c-9ec3-63b1adb37ea3","chatMessageId":"df0ef8cc-5e82-477d-8f6a-c15624eaae55","question":"What can you do?","sessionId":"00a3d788-a7ab-4d8c-9ec3-63b1adb37ea3","memoryType":"Buffer Memory"}}{"event":"end","data":"[DONE]"}
# --- End of Stream ---

# --- Getting history for session: 00a3d788-a7ab-4d8c-9ec3-63b1adb37ea3 for user: user1 ---
# ✅ Found 4 messages in session 00a3d788-a7ab-4d8c-9ec3-63b1adb37ea3.
#   - [2025-06-21T14:04:14.442000] user: Hello, who are you?
#   - [2025-06-21T14:04:15.988000] assistant: Hello! I am an AI system built by a team of inventors at Amazon. My purpose is to assist you with a wide range of tasks, answer your questions, and provide information to the best of my abilities. If you have any questions or need help with something, feel free to ask!
#   - [2025-06-21T14:04:20.119000] user: What can you do?
#   - [2025-06-21T14:04:22.337000] assistant: I can help with a variety of tasks and provide information on many topics. Here are some things I can do:

# 1. **Answer Questions:** Provide information on a wide range of topics, from science and history to technology and entertainment.
# 2. **Offer Recommendations:** Suggest books, movies, music, and other media based on your preferences.
# 3. **Help with Homework:** Assist with explanations and solutions for math problems, science questions, and other academic topics.
# 4. **Provide How-To Guides:** Offer step-by-step instructions for various tasks, such as cooking recipes, DIY projects, and tech setups.
# 5. **Language Assistance:** Help with translations, grammar checks, and language learning tips.
# 6. **General Knowledge:** Share facts, trivia, and interesting information on various subjects.
# 7. **Tech Support:** Offer basic troubleshooting tips for common tech issues.

# If you have a specific question or need help with something, just let me know!

# ✅ --- Test Passed: Successfully retrieved and verified chat history. ---
