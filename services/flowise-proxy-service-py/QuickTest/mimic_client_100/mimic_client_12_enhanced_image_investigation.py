#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Enhanced Image Upload & File System Investigation Script (12)

This script provides comprehensive investigation of image upload and retrieval issues:
1. Authenticates as admin and sets up environment
2. Authenticates as regular user
3. Tests database connectivity
4. Creates and uploads test image
5. Investigates file storage in database
6. Tests file retrieval through various endpoints
7. Analyzes chat history for image data
8. Provides detailed debugging information

Enhanced Features:
- Direct file system API testing
- Database file storage verification
- Chat history image data analysis
- Multiple retrieval endpoint testing
- Comprehensive error logging
- File system debugging
"""

import os
import sys
import requests
import json
import time
import base64
from datetime import datetime
from colorama import init, Fore, Style
from PIL import Image
import io

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Configuration
API_BASE_URL = "http://localhost:8000"
LOG_FILE = "enhanced_image_investigation_12.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Target chatflow ID that supports image uploads
TARGET_CHATFLOW_ID = "2042ba88-d822-4503-a4b4-8fddd3cea18c"

# Users
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin@aidcec",
}

REGULAR_USERS_LIST = [
    {
        "username": f"User{i:02d}",
        "email": f"user{i:02d}@aidcec.com",
        "password": f"User{i:02d}@aidcec",
        "role": "enduser",
    }
    for i in range(1, 3)
]

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


def assign_user_to_chatflow(admin_token, chatflow_id, user_email):
    """Assign a user to a chatflow"""
    log_message(f"\n--- Assigning User '{user_email}' to Chatflow '{chatflow_id}' ---")
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"email": user_email}
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/{chatflow_id}/users",
            headers=headers,
            json=payload,
        )
        if response.status_code == 200:
            log_message(
                f"{Fore.GREEN}✅ Successfully assigned user '{user_email}' to chatflow"
            )
            return True
        else:
            log_message(
                f"{Fore.RED}❌ Failed to assign user: {response.status_code} - {response.text}"
            )
            return False
    except Exception as e:
        log_message(f"{Fore.RED}❌ Error during user assignment: {e}")
        return False


def create_test_image():
    """Create a simple test image and return it as base64 encoded string."""
    try:
        # Create a simple 100x100 red image
        img = Image.new("RGB", (100, 100), color="red")

        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        img_bytes.seek(0)

        # Encode as base64
        img_b64 = base64.b64encode(img_bytes.getvalue()).decode("utf-8")

        log_message(f"{Fore.GREEN}✅ Test image created successfully")
        log_message(f"   > Image size: {len(img_bytes.getvalue())} bytes")
        log_message(f"   > Base64 length: {len(img_b64)} characters")

        return img_b64, "image/png", "test_image.png"

    except Exception as e:
        log_message(f"{Fore.RED}❌ Error creating test image: {e}")
        return None, None, None


class StreamParser:
    """A class to process a stream of concatenated JSON objects."""

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


def send_chat_message_with_image(
    token, username, chatflow_id, question, image_data=None, session_id=None
):
    """Send a chat message with optional image upload and extract session_id from the stream."""
    log_message(
        f"\n--- Sending message with image for {username} on chatflow {chatflow_id} ---"
    )
    log_message(f"   > Message: '{question}'")
    log_message(f"   > Image attached: {'Yes' if image_data else 'No'}")
    if session_id:
        log_message(f"   > Using existing session_id: {session_id}")

    url = f"{API_BASE_URL}/api/v1/chat/predict/stream/store"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "question": question}

    if session_id:
        payload["sessionId"] = session_id

    # Add image upload if provided
    if image_data:
        img_b64, mime_type, filename = image_data
        payload["uploads"] = [
            {
                "data": f"data:{mime_type};base64,{img_b64}",
                "type": "file",
                "name": filename,
                "mime": mime_type,
            }
        ]
        log_message(f"   > Image upload: {filename} ({mime_type})")

    full_response = ""
    extracted_session_id = session_id

    try:
        with requests.post(
            url, json=payload, headers=headers, stream=True, timeout=120
        ) as response:
            if response.status_code == 200:
                log_message(f"{Fore.GREEN}✅ Stream started successfully")

                parser = StreamParser()

                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        decoded_chunk = chunk.decode("utf-8")
                        events = parser.process_chunk(decoded_chunk)

                        for event in events:
                            if event.get("event") == "session_id":
                                extracted_session_id = event.get("data")
                                log_message(
                                    f"🔑 Extracted session_id: {extracted_session_id}"
                                )
                            elif event.get("event") == "metadata":
                                meta_session_id = event.get("data", {}).get("sessionId")
                                if meta_session_id:
                                    extracted_session_id = meta_session_id
                                    log_message(
                                        f"🔑 Extracted session_id from metadata: {extracted_session_id}"
                                    )
                            elif event.get("event") == "token":
                                token_data = event.get("data", "")
                                full_response += token_data

                log_message(f"{Fore.GREEN}✅ Stream completed successfully")
                log_message(f"   > Response length: {len(full_response)} characters")

            else:
                log_message(
                    f"{Fore.RED}❌ Stream failed: {response.status_code} - {response.text}"
                )

    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to send chat message: {e}")

    return full_response, extracted_session_id


def get_chat_history(token, session_id):
    """Retrieve the chat history for a given session with enhanced debugging."""
    log_message(f"\n--- Retrieving chat history for session: {session_id} ---")
    url = f"{API_BASE_URL}/api/v1/chat/sessions/{session_id}/history"
    headers = {"Authorization": f"Bearer {token}"}

    log_message(f"   > Request URL: {url}")
    log_message(f"   > Session ID: {session_id}")

    try:
        response = requests.get(url, headers=headers)
        log_message(f"   > HTTP Status: {response.status_code}")

        if response.status_code == 404:
            log_message(f"{Fore.RED}❌ Session not found: {session_id}")
            return []

        response.raise_for_status()

        response_data = response.json()
        history = response_data.get("history", [])
        log_message(f"{Fore.GREEN}✅ Retrieved {len(history)} messages from session.")

        return history

    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to get chat history: {e}")
        return []


def investigate_file_storage(token, session_id):
    """Investigate file storage and retrieval through various endpoints."""
    log_message(f"\n--- Investigating File Storage for Session: {session_id} ---")

    # Get chat history to find file references
    history = get_chat_history(token, session_id)

    if not history:
        log_message(f"{Fore.RED}❌ No history found to investigate")
        return

    log_message(f"   > Analyzing {len(history)} messages for file data...")

    file_ids = []
    for i, message in enumerate(history):
        log_message(f"\n   📨 Message {i+1}: {message.get('role', 'unknown')}")

        # Check for file_ids in message
        if "file_ids" in message:
            msg_file_ids = message.get("file_ids", [])
            log_message(f"      > file_ids: {msg_file_ids}")
            if msg_file_ids and isinstance(msg_file_ids, list):
                file_ids.extend(msg_file_ids)
            elif msg_file_ids is not None:
                file_ids.append(msg_file_ids)  # Single file ID

        # Check for uploads in message
        if "uploads" in message:
            uploads = message.get("uploads", [])
            log_message(f"      > uploads: {len(uploads)} files")
            if uploads and isinstance(uploads, list):
                for upload in uploads:
                    log_message(
                        f"         - {upload.get('name', 'unknown')} ({upload.get('mime', 'unknown')})"
                    )
                    # Check if upload has file_id
                    if "file_id" in upload:
                        file_ids.append(upload["file_id"])

        # Check for has_files flag
        if "has_files" in message:
            has_files = message.get("has_files", False)
            log_message(f"      > has_files: {has_files}")

        # Check message content for file references
        content = message.get("content", "")
        if content and ("file" in content.lower() or "image" in content.lower()):
            log_message(f"      > Content mentions files/images: {content[:100]}...")

    # Test file retrieval endpoints
    if file_ids:
        log_message(f"\n   🔍 Testing file retrieval for {len(file_ids)} file IDs...")
        for file_id in file_ids:
            test_file_retrieval(token, file_id)
    else:
        log_message(f"{Fore.YELLOW}⚠️ No file IDs found in message history")


def test_file_retrieval(token, file_id):
    """Test file retrieval through various endpoints."""
    log_message(f"\n   🔍 Testing file retrieval for file_id: {file_id}")

    headers = {"Authorization": f"Bearer {token}"}

    # Test different file retrieval endpoints based on actual API
    endpoints = [
        f"/api/v1/chat/files/{file_id}",  # Main file endpoint
        f"/api/v1/chat/files/{file_id}?download=true",  # Download endpoint
        f"/api/v1/chat/files/{file_id}/thumbnail",  # Thumbnail endpoint
        f"/api/v1/chat/files/{file_id}/thumbnail?size=100",  # Small thumbnail
        f"/api/v1/chat/files/{file_id}/thumbnail?size=300",  # Medium thumbnail
    ]

    for endpoint in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        try:
            response = requests.get(url, headers=headers)
            log_message(f"      > {endpoint}: {response.status_code}")

            if response.status_code == 200:
                content_type = response.headers.get("content-type", "unknown")
                content_length = response.headers.get("content-length", "unknown")
                log_message(
                    f"         ✅ Success - Type: {content_type}, Size: {content_length}"
                )

                # If it's an image, try to save it for verification
                if "image" in content_type:
                    try:
                        filename = (
                            f"retrieved_image_{file_id}_{endpoint.split('/')[-1]}.png"
                        )
                        filename = filename.replace("?", "_").replace("=", "_")
                        with open(filename, "wb") as f:
                            f.write(response.content)
                        log_message(f"         💾 Image saved as {filename}")
                    except Exception as e:
                        log_message(f"         ❌ Failed to save image: {e}")

            elif response.status_code == 404:
                log_message(f"         ❌ File not found")
            else:
                log_message(f"         ❌ Error: {response.text[:100]}...")

        except requests.RequestException as e:
            log_message(f"         ❌ Request failed: {e}")


def test_file_system_endpoints(token):
    """Test various file system related endpoints."""
    log_message(f"\n--- Testing File System Endpoints ---")

    headers = {"Authorization": f"Bearer {token}"}

    # Test file listing endpoints based on actual API
    endpoints = [
        "/api/v1/chat/files/session/dummy",  # Files by session (will need real session)
        "/api/v1/chat/files/message/dummy",  # Files by message (will need real message)
    ]

    for endpoint in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        try:
            response = requests.get(url, headers=headers)
            log_message(f"   > {endpoint}: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    log_message(f"      ✅ Found {len(data)} files")
                    for file_info in data[:3]:  # Show first 3 files
                        log_message(f"         - {file_info}")
                elif isinstance(data, dict):
                    log_message(f"      ✅ Response: {data}")
                else:
                    log_message(f"      ✅ Response type: {type(data)}")
            elif response.status_code == 404:
                log_message(f"      ℹ️ Endpoint not found (expected for dummy IDs)")
            else:
                log_message(f"      ❌ Error: {response.text[:100]}...")

        except requests.RequestException as e:
            log_message(f"      ❌ Request failed: {e}")


def test_session_files(token, session_id):
    """Test getting files for a specific session."""
    log_message(f"\n--- Testing Session Files for: {session_id} ---")

    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API_BASE_URL}/api/v1/chat/files/session/{session_id}"

    try:
        response = requests.get(url, headers=headers)
        log_message(f"   > Session files endpoint: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            log_message(f"      ✅ Found {len(data)} files in session")
            return data
        else:
            log_message(f"      ❌ Error: {response.text[:100]}...")
            return []

    except requests.RequestException as e:
        log_message(f"      ❌ Request failed: {e}")
        return []


def main():
    """Main execution flow for enhanced image investigation."""
    log_message(
        f"\n{Style.BRIGHT}🔍 Enhanced Image Upload & File System Investigation 🔍"
    )
    log_message(f"=" * 80)

    # 1. Admin Setup
    admin_token = get_token(ADMIN_USER)
    if not admin_token:
        log_message(f"{Fore.RED}❌ Failed to get admin token. Exiting.")
        sys.exit(1)

    if not sync_chatflows(admin_token):
        log_message(f"{Fore.RED}❌ Failed to sync chatflows. Exiting.")
        sys.exit(1)

    target_chatflow_id = TARGET_CHATFLOW_ID
    log_message(f"Using target chatflow: {target_chatflow_id}")

    if not assign_user_to_chatflow(
        admin_token, target_chatflow_id, REGULAR_USER["email"]
    ):
        log_message(f"{Fore.RED}❌ Failed to assign user to chatflow. Exiting.")
        sys.exit(1)

    # 2. User Test
    user_token = get_token(REGULAR_USER)
    if not user_token:
        log_message(f"{Fore.RED}❌ Failed to get user token. Exiting.")
        sys.exit(1)

    # 3. Test file system endpoints
    test_file_system_endpoints(user_token)

    # 4. Create test image
    image_data = create_test_image()
    if not image_data[0]:
        log_message(f"{Fore.RED}❌ Failed to create test image. Exiting.")
        sys.exit(1)

    # 5. Send message with image
    test_question = "Can you describe what you see in this image?"
    assistant_reply, session_id = send_chat_message_with_image(
        user_token,
        REGULAR_USER["username"],
        target_chatflow_id,
        test_question,
        image_data,
    )

    if not session_id:
        log_message(
            f"{Fore.RED}❌ Critical error: Could not obtain session_id. Aborting test."
        )
        sys.exit(1)

    # Wait for processing
    log_message(f"\n--- Waiting for message processing ---")
    time.sleep(5)

    # 6. Send follow-up message
    follow_up_question = "What color was the image I just sent?"
    assistant_reply_2, _ = send_chat_message_with_image(
        user_token,
        REGULAR_USER["username"],
        target_chatflow_id,
        follow_up_question,
        None,
        session_id,
    )

    # Wait for processing
    time.sleep(3)

    # 7. Investigate file storage
    investigate_file_storage(user_token, session_id)

    # 8. Test session-specific file endpoints
    session_files = test_session_files(user_token, session_id)

    # 9. If we found files in the session, test their retrieval
    if session_files:
        log_message(f"\n--- Testing File Retrieval for Session Files ---")
        for file_info in session_files:
            if "file_id" in file_info:
                test_file_retrieval(user_token, file_info["file_id"])

    # 10. Final summary
    log_message(f"\n{Style.BRIGHT}📊 INVESTIGATION SUMMARY:")
    log_message(f"   > Session ID: {session_id}")
    log_message(
        f"   > Image upload: {'✅ Success' if assistant_reply else '❌ Failed'}"
    )
    log_message(
        f"   > Follow-up response: {'✅ Success' if assistant_reply_2 else '❌ Failed'}"
    )
    log_message(f"   > Target chatflow: {target_chatflow_id}")
    log_message(f"   > Test image: {image_data[2]} ({image_data[1]})")

    log_message(f"\n{Style.BRIGHT}✨ Enhanced Investigation Complete ✨")
    log_message(f"📝 Full logs saved to: {LOG_PATH}")


if __name__ == "__main__":
    # Clear log file for a fresh run
    with open(LOG_PATH, "w") as f:
        f.write("")
    main()
