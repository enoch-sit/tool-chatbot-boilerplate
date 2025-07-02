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


def list_all_chat_sessions(token, username):
    """Lists all chat sessions for the logged-in user."""
    print(f"\n--- Listing all chat sessions for user: {username} ---")
    url = f"{API_BASE_URL}/api/v1/chat/sessions"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            sessions = response.json().get("sessions", [])
            print(f"✅ Found {len(sessions)} sessions.")
            for session in sessions:
                print(
                    f"  - Session ID: {session['session_id']}, Topic: {session.get('topic', 'N/A')}"
                )
            return [s["session_id"] for s in sessions]
        else:
            print(
                f"❌ Failed to list sessions: {response.status_code} - {response.text}"
            )
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
    return []


class StreamParser:
    """
    A class to process a stream of concatenated JSON objects.
    Handles incomplete data and extracts full JSON events.
    """

    def __init__(self):
        self.buffer = ""
        self.events = []

    def process_chunk(self, chunk_text):
        """Process a chunk of stream data and extract complete JSON events"""
        self.buffer += chunk_text
        # The stream sends JSON objects one after another, sometimes concatenated.
        # We can split the buffer by the start of a new JSON object '}{'
        self.buffer = self.buffer.replace('}{', '}\n{')
        parts = self.buffer.split('\n')
        
        complete_parts = parts[:-1]
        self.buffer = parts[-1] if parts else ""

        extracted_events = []
        for part in complete_parts:
            if not part:
                continue
            try:
                event = json.loads(part)
                self.events.append(event)
                extracted_events.append(event)
            except json.JSONDecodeError:
                # If a part fails, it might be incomplete.
                # Prepend it to the buffer for the next chunk.
                self.buffer = part + self.buffer
        
        return extracted_events


def send_chat_message(token, username, chatflow_id, question, session_id=None):
    """
    Sends a message to the streaming endpoint. If session_id is None,
    a new session is created implicitly and its ID is extracted and returned.
    Otherwise, it continues the existing session.
    """
    if session_id:
        print(f"\n--- Continuing chat for session: {session_id} ---")
    else:
        print(f"\n--- Starting new chat for user: {username} ---")

    url = f"{API_BASE_URL}/api/v1/chat/predict/stream/store"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "question": question}
    if session_id:
        payload["session_id"] = session_id

    new_session_id = None
    response_successful = False
    parser = StreamParser()

    try:
        with requests.post(
            url, headers=headers, json=payload, stream=True, timeout=(30, 300)
        ) as response:
            response_successful = response.status_code == 200
            if response_successful:
                print("✅ Stream started successfully. Chunks:")
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        chunk_text = chunk.decode("utf-8")
                        print(chunk_text, end="")
                        events = parser.process_chunk(chunk_text)
                        for event in events:
                            # Extract session_id from either 'session_id' or 'metadata' event
                            if event.get("event") == "session_id":
                                new_session_id = event.get("data")
                                print(f"\n✅ Extracted session_id from 'session_id' event: {new_session_id}")
                            elif event.get("event") == "metadata":
                                meta_session_id = event.get("data", {}).get("sessionId")
                                if meta_session_id:
                                    new_session_id = meta_session_id
                                    print(f"\n✅ Extracted session_id from 'metadata' event: {new_session_id}")
                print("\n--- End of Stream ---")
            else:
                print(
                    f"❌ Failed to send message: {response.status_code} - {response.text}"
                )

    except requests.RequestException as e:
        print(f"❌ Request error: {e}")

    if not session_id:
        if not new_session_id:
            print("❌ CRITICAL: Failed to extract session_id from new chat stream.")
        return new_session_id
    return session_id if response_successful else None


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


def get_user_credits(token, username):
    """Gets the credit balance for the given user."""
    print(f"\n--- Getting credit balance for user: {username} ---")
    if not token:
        print("❌ Cannot get credits without a token.")
        return None
    credits_url = f"{API_BASE_URL}/api/v1/chat/credits"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(credits_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            credits = data.get("totalCredits")
            print(f"✅ {username} has {credits} credits.")
            return credits
        else:
            print(
                f"❌ Failed to get credits for {username}: {response.status_code} {response.text}"
            )
            return None
    except requests.RequestException as e:
        print(f"❌ Request error while getting credits for {username}: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error while getting credits for {username}: {e}")
        return None


def main():
    """Main test execution flow"""
    print("\n" + "=" * 60)
    print("🚀 CHAT SESSION & HISTORY TEST SUITE 🚀")
    print("=" * 60)

    test_user = REGULAR_USERS[0]
    user_token = get_user_token(test_user)
    if not user_token:
        print(f"\n❌ Test failed: Could not get token for {test_user['username']}.")
        return

    chatflow_id = list_accessible_chatflows(user_token, test_user["username"])
    if not chatflow_id:
        print(f"\n❌ Test failed: No accessible chatflows for {test_user['username']}.")
        return

    first_question = "What is a large language model?"
    session_id = send_chat_message(
        user_token, test_user["username"], chatflow_id, first_question
    )

    if not session_id:
        print("\n❌ Test failed: Did not get a session_id from the first message.")
        return

    second_question = "Tell me more about their architecture."
    send_chat_message(
        user_token, test_user["username"], chatflow_id, second_question, session_id
    )

    time.sleep(2) # Allow time for db operations
    user_sessions = list_all_chat_sessions(user_token, test_user["username"])
    if session_id in user_sessions:
        print(f"✅ Verification successful: Session {session_id} found in user's session list.")
    else:
        print(f"❌ Verification failed: Session {session_id} NOT found in user's session list.")

    get_session_history(user_token, test_user["username"], session_id)

    get_user_credits(user_token, test_user["username"])


if __name__ == "__main__":
    main()

# some reference output
# --- Listing all chat sessions for user: user1 ---
# ✅ Found 3 sessions.
#   - Session ID: 8b54a4ba-8176-5763-8538-e74812372e17, Topic: Tell me more about their architecture.      
#   - Session ID: 0c06ae7c-7856-5eda-8e2a-66647e8e88c4, Topic: What is a large language model?
#   - Session ID: 7b12790e-3cf9-5717-8b9f-21457c1c068b, Topic: What is a large language model?
# ✅ Verification successful: Session 0c06ae7c-7856-5eda-8e2a-66647e8e88c4 found in user's session list.   

# --- Getting history for session: 0c06ae7c-7856-5eda-8e2a-66647e8e88c4 for user: user1 ---
# ✅ Found 2 messages in session 0c06ae7c-7856-5eda-8e2a-66647e8e88c4.
#   - [2025-07-02T05:56:06.175000] user: What is a large language model?
#   - [2025-07-02T05:56:08.255000] assistant: [{"event": "start", "data": "A"}, {"event": "token", "data": "A large language model (LLM) is a type of artificial intelligence (AI) model that is designed to understand and generate human language. These models are built using deep learning techniques, specifically neural networks, and are trained on vast amounts of text data from various sources such as books, articles, websites, and more. Here are some key aspects of large language models:\n\n### Key Characteristics:\n\n1. **Size and Scale**:\n   - **Parameters**: LLMs typically have billions or even trillions of parameters, which are the internal variables that the model adjusts during training to improve its performance.\n   - **Training Data**: They are trained on extensive datasets that can include millions or even billions of words, allowing them to learn the nuances of language.\n\n2. **Architecture**:\n   - **Transformers**: Most modern LLMs use the Transformer architecture, which was introduced in the paper \"Attention is All You Need\" by Vaswani et al. in 2017. This architecture"}, {"event": "metadata", "data": {"chatId": "0c06ae7c-7856-5eda-8e2a-66647e8e88c4", "chatMessageId": "5f1f9af5-4e51-4884-8b8d-16b9001b3c5f", "question": "What is a large language model?", "sessionId": "0c06ae7c-7856-5eda-8e2a-66647e8e88c4", "memoryType": "Buffer Memory"}}, {"event": "end", "data": "[DONE]"}]

# --- Getting credit balance for user: user1 ---
# ✅ user1 has 410 credits.