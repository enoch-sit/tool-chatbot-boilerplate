#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Session and Chat History Testing Script (09)

This script tests session continuity and history recall. It:
1.  Authenticates as an admin to set up the environment (sync chatflows, assign user).
2.  Authenticates as a regular user.
3.  Sends an initial message ("My name is John") to a chatflow.
4.  Extracts the `session_id` from the initial response stream.
5.  Sends a second message ("What is my name?") using the extracted `session_id`.
6.  Verifies if the assistant correctly recalls the name from the session history.
7.  Retrieves and displays the chat history for the session.
"""

import os
import sys
import requests
import json
import time
from datetime import datetime
from colorama import init, Fore, Style

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Configuration
API_BASE_URL = "http://localhost:8000"
LOG_FILE = "session_history_test_09.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Users

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
REGULAR_USERS_LIST = [
    {
        "username": f"User{i:02d}",
        "email": f"user{i:02d}@aidcec.com",
        "password": f"User{i:02d}@aidcec",
        "role": "enduser",
    }
    for i in range(1, 101)
]

ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

REGULAR_USER = REGULAR_USERS_LIST[0]  # Use the first user for testing


def log_message(message):
    """Logs a message to both the console and the log file."""
    print(message)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] {message}\n")


def get_token(user):
    """Authenticate and retrieve a token for the given user."""
    endpoint = "/api/v1/chat/authenticate"

    url = f"{API_BASE_URL}{endpoint}"
    log_message(f"\n--- Authenticating {user['username']} ---")
    try:
        response = requests.post(url, json=user)
        response.raise_for_status()
        token = response.json().get("access_token")
        if token:
            log_message(
                f"{Fore.GREEN}✅ Authentication successful for {user['username']}."
            )
            return token
        else:
            log_message(
                f"{Fore.RED}❌ Authentication failed for {user['username']}: 'access_token' not in response."
            )
            return None
    except requests.RequestException as e:
        log_message(
            f"{Fore.RED}❌ Authentication request failed for {user['username']}: {e}"
        )
        return None


def sync_chatflows(admin_token):
    """Sync chatflows from Flowise."""
    log_message("\n--- Syncing chatflows ---")
    url = f"{API_BASE_URL}/api/v1/admin/chatflows/sync"
    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        response = requests.post(url, headers=headers)
        response.raise_for_status()
        log_message(f"{Fore.GREEN}✅ Chatflow sync successful.")
        return True
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Chatflow sync failed: {e}")
        return False


def list_all_chatflows(token):
    """List all chatflows"""
    print("\n--- Listing All Chatflows ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/chatflows", headers=headers
        )
        if response.status_code == 200:
            chatflows = response.json()
            print(f"✅ Retrieved {len(chatflows)} active chatflows")
            if chatflows:
                return [
                    chatflow.get("flowise_id")
                    for chatflow in chatflows
                    if chatflow.get("flowise_id")
                ]
            else:
                print("ℹ️ No chatflows available")
                return []
        else:
            print(
                f"❌ Failed to list chatflows: {response.status_code} - {response.text}"
            )
            return []
    except Exception as e:
        print(f"❌ Error during chatflow listing: {e}")
        return []


def assign_user_to_chatflow(admin_token, chatflow_id, user_email):
    """Assign a user to a chatflow"""
    print(f"\n--- Assigning User '{user_email}' to Chatflow '{chatflow_id}' ---")
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"email": user_email}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users",
            headers=headers,
            json=payload,
        )
        if response.status_code == 200:
            print(f"✅ Successfully assigned user '{user_email}' to chatflow")
            return True
        else:
            print(f"❌ Failed to assign user: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error during user assignment: {e}")
        return False


def send_chat_message_and_get_session(
    token, username, chatflow_id, question, session_id=None
):
    """Send a chat message and extract session_id from the stream if not provided."""
    log_message(f"\n--- Sending message for {username} on chatflow {chatflow_id} ---")
    log_message(f"   > Message: '{question}'")
    if session_id:
        log_message(f"   > Using existing session_id: {session_id}")

    url = f"{API_BASE_URL}/api/v1/chat/predict/stream/store"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "question": question}
    if session_id:
        payload["sessionId"] = session_id

    full_response = ""
    extracted_session_id = session_id

    try:
        with requests.post(
            url, json=payload, headers=headers, stream=True, timeout=120
        ) as response:
            response.raise_for_status()
            log_message(f"{Fore.CYAN}   ... Assistant is responding ...")

            buffer = ""
            for chunk in response.iter_content(chunk_size=None):
                buffer += chunk.decode("utf-8", errors="ignore")
                # Process buffer by splitting on '}{' which separates JSON objects
                parts = buffer.split("}{")
                for i, part in enumerate(parts[:-1]):
                    # Reconstruct the JSON object string
                    if i > 0:
                        json_str = "{" + part + "}"
                    else:
                        json_str = part + "}"

                    try:
                        event_data = json.loads(json_str)
                        if (
                            event_data.get("event") == "session_id"
                            and not extracted_session_id
                        ):
                            extracted_session_id = event_data.get("data")
                            log_message(
                                f"{Fore.GREEN}✅ Extracted session_id: {extracted_session_id}"
                            )

                        if event_data.get("event") == "token":
                            full_response += event_data.get("data", "")
                    except json.JSONDecodeError:
                        log_message(
                            f"{Fore.YELLOW}⚠️ Could not decode JSON chunk: {json_str}"
                        )
                        pass

                # The last part is kept in the buffer for the next iteration
                if len(parts) > 1:
                    buffer = "{" + parts[-1]
                else:
                    buffer = parts[0]

            # Process any remaining data in the buffer
            if buffer:
                try:
                    event_data = json.loads(buffer)
                    if (
                        event_data.get("event") == "session_id"
                        and not extracted_session_id
                    ):
                        extracted_session_id = event_data.get("data")
                        log_message(
                            f"{Fore.GREEN}✅ Extracted session_id: {extracted_session_id}"
                        )

                    if event_data.get("event") == "token":
                        full_response += event_data.get("data", "")
                except json.JSONDecodeError:
                    # It might be the final metadata or end event, or an incomplete chunk
                    pass

            log_message(f"{Style.BRIGHT}   < Assistant response: {full_response}")
            return full_response, extracted_session_id
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to send chat message: {e}")
        return None, extracted_session_id


def get_chat_history(token, session_id):
    """Retrieve the chat history for a given session."""
    log_message(f"\n--- Retrieving chat history for session: {session_id} ---")
    url = f"{API_BASE_URL}/api/v1/chat/sessions/{session_id}/history"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        history = response.json().get("history", [])
        log_message(f"{Fore.GREEN}✅ Retrieved {len(history)} messages from session.")
        log_message(f"   Raw history string: {json.dumps(history)}")

        for msg in history:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            created_at = msg.get("created_at", "No timestamp")

            # Assistant content might be a JSON string of events, try to parse for display
            if role == "assistant":
                try:
                    # The content for assistant is a stringified list of JSON objects
                    # It looks like "[{...}, {...}]"
                    events = json.loads(content)
                    assistant_text = "".join(
                        [e.get("data", "") for e in events if e.get("event") == "token"]
                    )
                    content = assistant_text if assistant_text else content
                except (json.JSONDecodeError, TypeError):
                    pass  # Keep original content if not a parsable JSON
            log_message(f"      [{created_at}] [{role.capitalize()}]: {content}")
        return history
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to get chat history: {e}")
        return []


def main():
    """Main execution flow."""
    # 1. Admin Setup
    admin_token = get_token(ADMIN_USER)
    if not admin_token:
        sys.exit(1)

    if not sync_chatflows(admin_token):
        sys.exit(1)

    chatflows = list_all_chatflows(admin_token)
    if not chatflows:
        log_message(f"{Fore.RED}No chatflows available to test. Exiting.")
        sys.exit(1)

    # Use the first available chatflow for the test
    flowise_idx = 2
    target_chatflow_id = chatflows[flowise_idx]
    log_message(f"Selected chatflow for testing: {target_chatflow_id}")

    if not assign_user_to_chatflow(
        admin_token, target_chatflow_id, REGULAR_USER["email"]
    ):
        sys.exit(1)

    # 2. User Test
    user_token = get_token(REGULAR_USER)
    if not user_token:
        sys.exit(1)

    # 3. Conversation Test
    # First message: Introduce name, get session_id
    first_question = "Hi, my name is John."
    assistant_reply_1, session_id = send_chat_message_and_get_session(
        user_token, REGULAR_USER["username"], target_chatflow_id, first_question
    )

    if not session_id:
        log_message(
            f"{Fore.RED}❌ Critical error: Could not obtain session_id. Aborting test."
        )
        sys.exit(1)

    # Wait a moment to ensure the first message is processed and stored
    time.sleep(2)

    # Second message: Ask for the name back
    second_question = "What is my name?"
    assistant_reply_2, _ = send_chat_message_and_get_session(
        user_token,
        REGULAR_USER["username"],
        target_chatflow_id,
        second_question,
        session_id,
    )

    # 4. Verification
    if assistant_reply_2 and "john" in assistant_reply_2.lower():
        log_message(
            f"\n{Fore.GREEN}✅ VERIFICATION SUCCESS: Assistant correctly recalled the name 'John'."
        )
    else:
        log_message(
            f"\n{Fore.RED}❌ VERIFICATION FAILED: Assistant did not recall the name. Response: '{assistant_reply_2}'"
        )

    # 5. Get and display history
    get_chat_history(user_token, session_id)

    log_message(f"\n{Style.BRIGHT}✨ Session and History Test Complete ✨")
    log_message(f"📝 Full logs at: {LOG_PATH}")


if __name__ == "__main__":
    # Clear log file for a fresh run
    with open(LOG_PATH, "w") as f:
        f.write("")
    main()
