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


def send_chat_message(token, username, chatflow_id, question, session_id=None):
    """Send a message to the streaming endpoint and return session_id"""
    print(f"\n--- Sending message for user: {username} on chatflow: {chatflow_id} ---")
    print(f"Question: {question}")
    if session_id:
        print(f"Session ID: {session_id}")

    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "question": question}
    if session_id:
        payload["sessionId"] = session_id

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/chat/predict/stream/store",
            headers=headers,
            json=payload,
            stream=True,
            timeout=(30, 300),
        )
        if response.status_code == 200:
            print(f"✅ Stream started for {username}")
            for chunk in response.iter_content(chunk_size=None):
                if chunk:
                    decoded_chunk = chunk.decode("utf-8")
                    if '"event":"metadata"' in decoded_chunk:
                        metadata = json.loads(
                            decoded_chunk.split('{"event":"metadata","data":')[1].split(
                                "}"
                            )[0]
                        )
                        session_id = metadata.get("sessionId")
                        print(f"🔍 Found session_id: {session_id}")
                        return session_id
        else:
            print(f"❌ Stream failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    return session_id


def verify_chat_history(session_id):
    """Verify chat history in MongoDB"""
    print(f"\n--- Verifying chat history for session_id: {session_id} ---")
    try:
        client = pymongo.MongoClient(MONGODB_URI)
        db = client["flowise_proxy_test"]
        collection = db["chat_messages"]
        messages = list(
            collection.find({"session_id": session_id}).sort("created_at", 1)
        )
        if messages:
            print(f"✅ Found {len(messages)} messages")
            for msg in messages:
                print(
                    f"   - {msg['role']}: {msg['content'][:50]}... (created_at: {msg['created_at']})"
                )
            return True
        else:
            print(f"❌ No messages found for session_id: {session_id}")
            return False
    except Exception as e:
        print(f"❌ Error verifying chat history: {e}")
        return False


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
    chatflow_selected = 1
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

        # Send initial message and verify history
        session_id = send_chat_message(
            user_token, user["username"], accessible_chatflow_id, "Hello, how are you?"
        )
        if session_id:
            verify_chat_history(session_id)

        # Test session continuity
        print(f"\n🔄 Testing session continuity")
        questions = ["My name is TestUser. Remember this.", "What is my name?"]
        for question in questions:
            session_id = send_chat_message(
                user_token,
                user["username"],
                accessible_chatflow_id,
                question,
                session_id,
            )
            if session_id:
                verify_chat_history(session_id)
            time.sleep(2)

    print("\n" + "=" * 60)
    print("✨ Chat History Test Complete ✨")
    print(f"📝 Logs at: {LOG_PATH}")


if __name__ == "__main__":
    main()
