#!/usr/bin/env python3
"""
User Session and Chat Testing Script
This script tests a user's ability to start a chat session implicitly
by sending a message and then continuing the conversation.
"""

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


def test_chat_and_get_session_id(token, username, chatflow_id, question):
    """
    Starts a chat, implicitly creating a session, and extracts the session_id
    from the response stream.
    """
    print(f"\n--- Testing Chat and Retrieving Session ID for user: {username} ---")
    url = f"{API_BASE_URL}/api/v1/chat/predict/stream/store"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "question": question}
    session_id = None
    buffer = ""

    try:
        with requests.post(url, headers=headers, json=payload, stream=True) as response:
            if response.status_code == 200:
                print(f"✅ Stream started for user {username}. Chunks:")
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        chunk_text = chunk.decode("utf-8")
                        print(chunk_text, end="", flush=True)
                        buffer += chunk_text

                        # Process buffer for complete JSON objects
                        while True:
                            # Find the boundaries of a JSON object
                            start_index = buffer.find("{")
                            end_index = buffer.find("}", start_index)

                            if start_index != -1 and end_index != -1:
                                json_str = buffer[start_index : end_index + 1]
                                try:
                                    data = json.loads(json_str)
                                    # Extract session_id from the first relevant event
                                    if not session_id:
                                        if (
                                            data.get("event") == "session_id"
                                            and "data" in data
                                        ):
                                            session_id = data["data"]
                                            print(
                                                f"\n✅ Extracted session_id: {session_id}"
                                            )
                                        elif (
                                            data.get("event") == "metadata"
                                            and "sessionId" in data
                                        ):
                                            session_id = data["sessionId"]
                                            print(
                                                f"\n✅ Extracted session_id from metadata: {session_id}"
                                            )

                                    # Move buffer past the processed JSON
                                    buffer = buffer[end_index + 1 :]

                                except json.JSONDecodeError:
                                    # Incomplete JSON object, wait for more chunks
                                    break
                            else:
                                # No complete JSON object in buffer
                                break
                print("\n--- End of Stream ---")
            else:
                print(
                    f"❌ Failed to start stream: {response.status_code} - {response.text}"
                )

    except requests.RequestException as e:
        print(f"❌ Request error: {e}")

    if not session_id:
        print("❌ CRITICAL: Failed to extract session_id from the stream.")

    return session_id


def test_chat_predict_stream_with_session(
    token, username, chatflow_id, session_id, question
):
    """Test the chat stream endpoint with an existing session_id."""
    print(f"\n--- Continuing chat with session_id: {session_id} ---")
    url = f"{API_BASE_URL}/api/v1/chat/predict/stream/store"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "chatflow_id": chatflow_id,
        "question": question,
        "session_id": session_id,
    }
    try:
        with requests.post(url, headers=headers, json=payload, stream=True) as response:
            if response.status_code == 200:
                print(f"✅ Stream continued successfully for user {username}. Chunks:")
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        print(chunk.decode("utf-8"), end="")
                print("\n--- End of Stream ---")
                return True
            else:
                print(
                    f"❌ Failed to continue stream: {response.status_code} - {response.text}"
                )
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
    return False


# Main execution
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 IMPLICIT SESSION & CHAT TEST SUITE 🚀")
    print("=" * 60)

    # 1. Select a regular user for testing
    test_user = REGULAR_USERS[1]  # Using user2

    # 2. Get the user's access token
    user_token = get_user_token(test_user)

    if user_token:
        # 3. List accessible chatflows for the user
        chatflow_id = list_accessible_chatflows(user_token, test_user["username"])

        if chatflow_id:
            # 4. Start a new chat, which implicitly creates a session
            # and returns the session_id from the stream.
            first_question = "Hello, what is the capital of France?"
            session_id = test_chat_and_get_session_id(
                user_token, test_user["username"], chatflow_id, first_question
            )

            if session_id:
                # 5. Use the obtained session_id to continue the conversation
                second_question = "What is its population?"
                test_chat_predict_stream_with_session(
                    user_token,
                    test_user["username"],
                    chatflow_id,
                    session_id,
                    second_question,
                )
            else:
                print("\n❌ Test failed: Could not obtain session_id to continue chat.")
        else:
            print(
                f"\n❌ Test failed: No accessible chatflows found for {test_user['username']}."
            )
    else:
        print(
            f"\n❌ Test failed: Could not get access token for {test_user['username']}."
        )

    print("\n" + "=" * 60)
    print("✨ Test Suite Finished ✨")
    print("=" * 60)
