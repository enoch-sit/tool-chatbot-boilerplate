import json
import requests
import time
import os
import pymongo

# Configuration
API_BASE_URL = "http://localhost:8000"
MONGODB_URI = (
    "mongodb://admin:password@localhost:27017/flowise_proxy_test?authSource=admin"
)

LOG_FILE = "chat_history_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Users
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

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


def get_admin_token():
    """Get admin access token"""
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
            token = data.get("access_token")
            if token:
                print("✅ Admin access token obtained")
                return token
            else:
                print("❌ Access token not found in response")
        else:
            print(f"❌ Failed to log in as admin: {response.text}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    return None


def sync_chatflows_via_api(admin_token):
    """Sync chatflows from Flowise to local DB"""
    print("\n🔄 Performing chatflow sync via server endpoint...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/sync", headers=headers
        )
        if response.status_code == 200:
            print("✅ Chatflow sync successful")
            return True
        else:
            print(f"❌ Chatflow sync failed: {response.status_code} {response.text}")
            return False
    except Exception as e:
        print(f"❌ Exception during chatflow sync: {e}")
        return False


def list_all_chatflows_as_admin(token):
    """List all chatflows as admin"""
    print("\n--- Listing All Chatflows (Admin) ---")
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


def assign_user_to_chatflow_by_email(token, chatflow_id, user_email):
    """Assign a user to a chatflow"""
    print(f"\n--- Assigning User '{user_email}' to Chatflow '{chatflow_id}' ---")
    try:
        headers = {"Authorization": f"Bearer {token}"}
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


def get_user_token(user):
    """Get access token for a user"""
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
                print(f"❌ No access token in response")
        else:
            print(f"❌ Failed to get token: {response.status_code} {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    return None


def list_accessible_chatflows(token, username, flow_idx=0):
    """List accessible chatflows for a user"""
    print(f"\n--- Listing accessible chatflows for user: {username} ---")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{API_BASE_URL}/api/v1/chatflows", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {username} has access to {len(data)} chatflows")
            return data[flow_idx]["id"] if data and "id" in data[flow_idx] else None
        else:
            print(
                f"❌ Failed to list chatflows: {response.status_code} {response.text}"
            )
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


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
        self.buffer = self.buffer.replace("}{", "}\n{")
        parts = self.buffer.split("\n")

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
                self.buffer = part + self.buffer

        return extracted_events


def send_chat_message(token, username, chatflow_id, question, session_id=None):
    """Send a message to the streaming endpoint and return session_id"""
    print(f"\n--- Sending message for user: {username} on chatflow: {chatflow_id} ---")
    print(f"Question: {question}")
    if session_id:
        print(f"Using existing Session ID: {session_id}")

    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "question": question}
    if session_id:
        payload["session_id"] = session_id

    parser = StreamParser()
    new_session_id = session_id

    try:
        with requests.post(
            f"{API_BASE_URL}/api/v1/chat/predict/stream/store",
            headers=headers,
            json=payload,
            stream=True,
            timeout=(30, 300),
        ) as response:
            if response.status_code == 200:
                print(f"✅ Stream started for {username}")
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        decoded_chunk = chunk.decode("utf-8")
                        events = parser.process_chunk(decoded_chunk)
                        for event in events:
                            if event.get("event") == "session_id":
                                new_session_id = event.get("data")
                                print(
                                    f"🔑 Extracted session_id from 'session_id' event: {new_session_id}"
                                )
                            elif event.get("event") == "metadata":
                                meta_session_id = event.get("data", {}).get("sessionId")
                                if meta_session_id:
                                    new_session_id = meta_session_id
                                    print(
                                        f"🔑 Extracted session_id from 'metadata' event: {new_session_id}"
                                    )
                print("✅ Stream finished.")
            else:
                print(f"❌ Stream failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error during stream processing: {e}")

    return new_session_id


def get_user_sessions(token):
    """Get all sessions for the current user"""
    print(f"\n--- Getting all sessions for user ---")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{API_BASE_URL}/api/v1/chat/sessions", headers=headers)
        if response.status_code == 200:
            data = response.json()
            sessions = data.get("sessions", [])
            print(f"✅ User has {data.get('count', 0)} sessions")
            return sessions
        else:
            print(f"❌ Failed to get sessions: {response.status_code} {response.text}")
            return []
    except Exception as e:
        print(f"❌ Error getting sessions: {e}")
        return []


def get_chathistory(token, session_id):
    """Get chat history from session_id"""
    print(f"\n--- Getting chat history for session: {session_id} ---")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/v1/chat/sessions/{session_id}/history", headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Retrieved {data.get('count', 0)} messages from session")
            return data.get("history", [])
        else:
            print(
                f"❌ Failed to get chat history: {response.status_code} {response.text}"
            )
            return []
    except Exception as e:
        print(f"❌ Error getting chat history: {e}")
        return []


def test_name_recall(user_token, username, chatflow_id):
    """Test if the bot can recall the user's name from chat history"""
    print("\n" + "=" * 20 + " TESTING NAME RECALL " + "=" * 20)

    # 1. Start a conversation by telling the bot a name
    session_id = send_chat_message(
        user_token,
        username,
        chatflow_id,
        "My name is John",
    )

    if not session_id:
        print("❌ Failed to start conversation for name recall test.")
        return

    # Give a moment for processing
    time.sleep(5)

    # 2. Ask the bot to recall the name
    send_chat_message(
        user_token,
        username,
        chatflow_id,
        "What is my name?",
        session_id=session_id,
    )

    # Give a moment for processing
    time.sleep(5)

    # 2. Ask the bot to recall the name
    send_chat_message(
        user_token,
        username,
        chatflow_id,
        "What is my name? Please recall it.",
        session_id=session_id,
    )

    # 3. Get the history and verify
    history = get_chathistory(user_token, session_id)

    if history and len(history) >= 4:
        print("✅ History found for name recall test.")
        # The history should be [user, assistant, user, assistant]
        user_question = history[-2].get("content")
        assistant_response = history[-1].get("content")

        print(f"   User asked: '{user_question}'")
        print(f"   Assistant responded: '{assistant_response}'")

        if "john" in assistant_response.lower():
            print("✅ SUCCESS: Bot correctly recalled the name 'John'.")
        else:
            print("❌ FAILED: Bot did not recall the name 'John'.")
    else:
        print("❌ FAILED: Could not retrieve sufficient history for verification.")

    print("=" * 20 + " FINISHED NAME RECALL TEST " + "=" * 20)


def main():
    print("=" * 60)
    print("🚀 CHAT HISTORY TEST SUITE 🚀")
    print("=" * 60)

    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Could not get admin token. Exiting.")
        exit(1)

    # Sync chatflows
    if not sync_chatflows_via_api(admin_token):
        print("❌ Chatflow sync failed. Exiting.")
        exit(1)

    # List chatflows and assign users
    chatflow_ids = list_all_chatflows_as_admin(admin_token)
    if not chatflow_ids:
        print("❌ No chatflows available. Exiting.")
        exit(1)
    chatflow_selected = 2
    chatflow_id = chatflow_ids[chatflow_selected]
    for user in REGULAR_USERS:
        assign_user_to_chatflow_by_email(admin_token, chatflow_id, user["email"])

    # Test chat history for each user
    for user in [REGULAR_USERS[0]]:
        print(f"\n👤 Testing with user: {user['username']}")
        user_token = get_user_token(user)
        if not user_token:
            continue

        accessible_chatflow_id = list_accessible_chatflows(
            user_token,
            user["username"],
            chatflow_selected,  # change this to select different chatflow if needed
        )
        if not accessible_chatflow_id:
            continue

        # Run the name recall test
        test_name_recall(user_token, user["username"], accessible_chatflow_id)

        # Create a new session to ensure there is history to fetch
        print("\n\n--- Creating a new chat session to test history retrieval ---")
        send_chat_message(
            user_token,
            user["username"],
            accessible_chatflow_id,
            "This is a test message to create a session.",
        )
        print("--- Finished creating chat session ---\n")

        # I need to get all the sessions from the current user
        # TODO 1
        # Using session ids I can get all the user chat_history
        # I need to get all the sessions from the current user
        # TODO 1 - IMPLEMENTED
        # Get all user sessions first
        user_sessions = get_user_sessions(user_token)

        if user_sessions:
            print(
                f"\n📋 Found {len(user_sessions)} sessions for user {user['username']}"
            )

            # Using session ids I can get all the user chat_history
            for session in user_sessions:
                session_id = session.get("session_id")
                topic = session.get("topic", "No topic")
                created_at = session.get("created_at")

                print(f"\n🗨️  Session: {session_id}")
                print(f"   Topic: {topic}")
                print(f"   Created: {created_at}")

                # Get full chat history for this session
                chat_history = get_chathistory(user_token, session_id)

                if chat_history:
                    print(f"   💬 Messages in this session:")
                    for i, message in enumerate(chat_history):
                        role = message.get("role", "unknown")
                        content = message.get("content", "")
                        created_at = message.get("created_at", "")

                        # Truncate long messages for display
                        content_preview = (
                            content[:100] + "..." if len(content) > 100 else content
                        )
                        print(f"      {i+1}. [{role}] {content_preview}")
                else:
                    print(f"   📭 No messages found in this session")
        else:
            print(f"\n📭 No sessions found for user {user['username']}")

    print("\n" + "=" * 60)
    print("✨ Chat History Test Complete ✨")
    print(f"📝 Logs at: {LOG_PATH}")


if __name__ == "__main__":
    main()

# Reference example
# --- Getting chat history for session: 0c06ae7c-7856-5eda-8e2a-66647e8e88c4 ---
# ✅ Retrieved 2 messages from session
#    💬 Messages in this session:
#       1. [user] What is a large language model?
#       2. [assistant] [{"event": "start", "data": "A"}, {"event": "token", "data": "A large language model (LLM) is a type...

# 🗨️  Session: 7b12790e-3cf9-5717-8b9f-21457c1c068b
#    Topic: What is a large language model?
#    Created: 2025-07-02T05:51:32.882000
#    First message: What is a large language model?

# --- Getting chat history for session: 7b12790e-3cf9-5717-8b9f-21457c1c068b ---
# ✅ Retrieved 2 messages from session
#    💬 Messages in this session:
#       1. [user] What is a large language model?
#       2. [assistant] [{"event": "start", "data": "A"}, {"event": "token", "data": "A large language model (LLM) is a type...

# ============================================================
# ✨ Chat History Test Complete ✨
# 📝 Logs at: C:\Users\user\Documents\ThankGodForJesusChrist\ThankGodForTools\tool-chatbot-boilerplate\services\flowise-proxy-service-py\QuickTest\mimic_client\chat_history_test.log
