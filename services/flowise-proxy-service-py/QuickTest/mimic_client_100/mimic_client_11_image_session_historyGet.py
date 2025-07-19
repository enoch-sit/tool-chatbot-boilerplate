#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Image Upload & Session History Investigation Script (11)

This script tests image upload functionality and investigates session retrieval issues. It:
1.  Authenticates as an admin to set up the environment (sync chatflows, assign user).
2.  Authenticates as a regular user.
3.  Checks database connectivity.
4.  Creates a test image and encodes it as base64.
5.  Sends a message with an image upload to the chatflow.
6.  Verifies the image upload was processed correctly.
7.  Sends a follow-up message to test context retention.
8.  Performs comprehensive session debugging:
    - Checks if session exists in database
    - Lists all sessions for comparison
    - Analyzes session creation timing
    - Investigates database synchronization issues
9.  Attempts to retrieve chat history with detailed error analysis.
10. Provides troubleshooting suggestions for any failures.

Enhanced Features:
- Database connectivity verification
- Session existence validation
- Comprehensive error logging
- Retry mechanisms for history retrieval
- Detailed debugging output
- Investigation summary with troubleshooting tips
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
LOG_FILE = "image_session_history_investigation_11.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Target chatflow ID that supports image uploads
TARGET_CHATFLOW_ID = "2042ba88-d822-4503-a4b4-8fddd3cea18c"

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


def create_test_image():
    """Create a simple test image and return it as base64 encoded string."""
    try:
        # Try to use PIL if available, otherwise create a simple test pattern
        try:
            from PIL import Image as PILImage
            import io

            # Create a simple 100x100 red image
            img = PILImage.new("RGB", (100, 100), color="red")

            # Add some text/pattern to make it more interesting
            try:
                from PIL import ImageDraw, ImageFont

                draw = ImageDraw.Draw(img)
                draw.text((10, 10), "TEST", fill="white")
                draw.rectangle([20, 30, 80, 70], outline="white", width=2)
            except ImportError:
                # Just use the solid color if ImageDraw is not available
                pass

            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode()

            log_message(f"{Fore.GREEN}✅ Created test image using PIL (100x100 PNG)")
            return img_str, "image/png", "test_image.png"

        except ImportError:
            # Fallback: create a minimal valid PNG in base64
            # This is a 1x1 transparent PNG
            minimal_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            log_message(f"{Fore.YELLOW}⚠️ PIL not available, using minimal 1x1 PNG")
            return minimal_png_b64, "image/png", "minimal_test.png"

    except Exception as e:
        log_message(f"{Fore.RED}❌ Error creating test image: {e}")
        return None, None, None


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
            response.raise_for_status()
            log_message(f"{Fore.CYAN}   ... Assistant is responding ...")

            # Use the robust buffer-based parsing method from mimic_client_09
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

                        # Extract session_id from session_id event
                        if (
                            event_data.get("event") == "session_id"
                            and not extracted_session_id
                        ):
                            extracted_session_id = event_data.get("data")
                            log_message(
                                f"{Fore.GREEN}✅ Extracted session_id: {extracted_session_id}"
                            )

                        # Collect token events for response
                        elif event_data.get("event") == "token":
                            full_response += event_data.get("data", "")

                        # Handle file upload events
                        elif event_data.get("event") == "files_uploaded":
                            log_message(
                                f"{Fore.BLUE}📎 Files uploaded: {event_data.get('data', {})}"
                            )

                        # Handle other events
                        elif event_data.get("event") == "start":
                            log_message(f"{Fore.GREEN}🚀 Stream started")
                        elif event_data.get("event") == "end":
                            log_message(f"{Fore.CYAN}🏁 Stream ended")
                        elif event_data.get("event") == "metadata":
                            log_message(f"{Fore.YELLOW}📋 Metadata received")
                        elif event_data.get("event") == "error":
                            log_message(
                                f"{Fore.RED}⚠️ Stream error: {event_data.get('data', 'Unknown error')}"
                            )

                    except json.JSONDecodeError:
                        # Log parsing errors for debugging
                        log_message(
                            f"{Fore.YELLOW}⚠️ Could not decode JSON chunk: {json_str}"
                        )
                        pass

                # Keep the last part in buffer for next iteration
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
            return full_response.strip(), extracted_session_id
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to send chat message: {e}")
        return None, extracted_session_id


def check_database_connectivity(token):
    """Check basic database connectivity through API."""
    log_message(f"\n--- Checking database connectivity ---")
    url = f"{API_BASE_URL}/api/v1/chat/sessions"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            log_message(f"{Fore.GREEN}✅ Database connection successful")
            return True
        else:
            log_message(
                f"{Fore.RED}❌ Database connection issue: {response.status_code}"
            )
            return False
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Database connectivity error: {e}")
        return False


def check_session_exists(token, session_id):
    """Check if a session exists by attempting to retrieve its history."""
    log_message(f"\n--- Checking if session exists: {session_id} ---")
    log_message(
        f"   > Note: Session existence will be validated through history retrieval"
    )

    # Since the dedicated session check endpoint doesn't exist,
    # we'll use the history endpoint to validate session existence
    url = f"{API_BASE_URL}/api/v1/chat/sessions/{session_id}/history"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers)
        log_message(f"   > Session check status: {response.status_code}")

        if response.status_code == 200:
            log_message(
                f"{Fore.GREEN}✅ Session exists in database (validated through history endpoint)"
            )
            return True
        elif response.status_code == 404:
            log_message(f"{Fore.YELLOW}⚠️ Session not found in database (404)")
            log_message(f"   > Response: {response.text}")
            return False
        else:
            log_message(f"{Fore.RED}❌ Unexpected status code: {response.status_code}")
            log_message(f"   > Response: {response.text}")
            return False

    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to check session existence: {e}")
        return False


def list_all_sessions(token):
    """List all sessions to help debug session issues."""
    log_message(f"\n--- Listing all sessions for debugging ---")
    url = f"{API_BASE_URL}/api/v1/chat/sessions"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        sessions_data = response.json()
        sessions = sessions_data.get("sessions", [])
        log_message(f"{Fore.GREEN}✅ Found {len(sessions)} total sessions")

        if sessions:
            log_message(f"   Recent sessions (last 5):")
            for i, session in enumerate(sessions[-5:]):  # Show last 5 sessions
                session_id = session.get("id", "unknown")
                chatflow_id = session.get("chatflow_id", "unknown")
                created_at = session.get("created_at", "unknown")
                updated_at = session.get("updated_at", "unknown")
                log_message(f"     {i+1}. ID: {session_id}")
                log_message(f"        Chatflow: {chatflow_id}")
                log_message(f"        Created: {created_at}")
                log_message(f"        Updated: {updated_at}")
        else:
            log_message(f"{Fore.YELLOW}⚠️ No sessions found in database")

        return sessions

    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to list sessions: {e}")
        return []


def get_chat_history(token, session_id):
    """Retrieve the chat history for a given session with enhanced debugging."""
    log_message(f"\n--- Retrieving chat history for session: {session_id} ---")
    url = f"{API_BASE_URL}/api/v1/chat/sessions/{session_id}/history"
    headers = {"Authorization": f"Bearer {token}"}

    # Debug: Log the full request details
    log_message(f"   > Request URL: {url}")
    log_message(
        f"   > Session ID format: {type(session_id)} - Length: {len(str(session_id))}"
    )
    log_message(f"   > Authorization header present: {'Authorization' in headers}")

    try:
        response = requests.get(url, headers=headers)
        log_message(f"   > HTTP Status: {response.status_code}")
        log_message(f"   > Response headers: {dict(response.headers)}")

        if response.status_code == 404:
            log_message(f"{Fore.YELLOW}⚠️ Session not found (404). Possible causes:")
            log_message(f"   - Session ID may not exist in database yet")
            log_message(f"   - Database synchronization delay")
            log_message(f"   - Session ID format mismatch")
            log_message(f"   - Session expired or cleaned up")
            log_message(f"   > Raw response: {response.text}")
            return []

        response.raise_for_status()

        # Parse the full response
        response_data = response.json()
        log_message(f"   > Full response keys: {list(response_data.keys())}")

        history = response_data.get("history", [])
        log_message(f"{Fore.GREEN}✅ Retrieved {len(history)} messages from session.")

        if not history:
            log_message(
                f"{Fore.YELLOW}⚠️ No history found. Response content: {json.dumps(response_data, indent=2)}"
            )
            return []

        log_message(f"   Raw history (first 500 chars): {json.dumps(history)[:500]}...")

        for i, msg in enumerate(history):
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            created_at = msg.get("created_at", "No timestamp")
            message_id = msg.get("id", "no-id")

            log_message(
                f"   Message {i+1}: ID={message_id}, Role={role}, Created={created_at}"
            )

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
                    log_message(f"   Parsed assistant content: {content[:100]}...")
                except (json.JSONDecodeError, TypeError) as parse_error:
                    log_message(f"   Failed to parse assistant content: {parse_error}")
                    log_message(f"   Raw content: {content[:200]}...")
                    pass  # Keep original content if not a parsable JSON

            # Check for file uploads in user messages
            if role == "user" and ("uploads" in msg or msg.get("has_files", False)):
                # Check for uploads field (legacy) or has_files field (new format)
                if "uploads" in msg and msg["uploads"]:
                    uploads = msg.get("uploads", [])
                    log_message(
                        f"   📎 User message contains {len(uploads)} file uploads (enhanced format)"
                    )
                    for upload in uploads:
                        file_id = upload.get("file_id", "unknown")
                        name = upload.get("name", "unknown")
                        mime = upload.get("mime", "unknown")
                        size = upload.get("size", 0)
                        is_image = upload.get("is_image", False)
                        url = upload.get("url", "")
                        thumbnail_url = upload.get("thumbnail_url", "")
                        log_message(f"     - File: {name} ({mime}) - {size} bytes")
                        log_message(f"       ID: {file_id}")
                        log_message(f"       Image: {is_image}")
                        log_message(f"       URL: {url}")
                        if thumbnail_url:
                            log_message(f"       Thumbnail: {thumbnail_url}")
                            log_message(
                                f"       Thumbnail Small: {upload.get('thumbnail_small', '')}"
                            )
                            log_message(
                                f"       Thumbnail Medium: {upload.get('thumbnail_medium', '')}"
                            )
                elif msg.get("has_files", False):
                    file_ids = msg.get("file_ids", [])
                    log_message(
                        f"   📎 User message contains {len(file_ids)} file uploads (basic format)"
                    )
                    for file_id in file_ids:
                        log_message(f"     - File ID: {file_id}")

            log_message(f"      [{created_at}] [{role.capitalize()}]: {content}")

        return history

    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Failed to get chat history: {e}")
        if hasattr(e, "response") and e.response:
            log_message(f"   > Error response status: {e.response.status_code}")
            log_message(f"   > Error response text: {e.response.text}")
        return []


def main():
    """Main execution flow for image upload testing."""
    # 1. Admin Setup
    admin_token = get_token(ADMIN_USER)
    if not admin_token:
        sys.exit(1)

    if not sync_chatflows(admin_token):
        sys.exit(1)

    # Use the specific chatflow ID that supports image uploads
    target_chatflow_id = TARGET_CHATFLOW_ID
    log_message(f"Using target chatflow for image upload testing: {target_chatflow_id}")

    if not assign_user_to_chatflow(
        admin_token, target_chatflow_id, REGULAR_USER["email"]
    ):
        sys.exit(1)

    # 2. User Test
    user_token = get_token(REGULAR_USER)
    if not user_token:
        sys.exit(1)

    # 2.1 Check database connectivity
    if not check_database_connectivity(user_token):
        log_message(
            f"{Fore.RED}❌ Database connectivity issues detected. Continuing with caution..."
        )

    # 3. Create test image
    image_data = create_test_image()
    if not image_data[0]:  # If image creation failed
        log_message(f"{Fore.RED}❌ Failed to create test image. Exiting.")
        sys.exit(1)

    # 4. Image Upload Test
    # Send a message with image upload
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

    # Wait a moment to ensure the message is processed and stored
    time.sleep(3)

    # 5. Send a follow-up message without image
    follow_up_question = "What color was the image I just sent?"
    assistant_reply_2, _ = send_chat_message_with_image(
        user_token,
        REGULAR_USER["username"],
        target_chatflow_id,
        follow_up_question,
        None,  # No image this time
        session_id,
    )

    # Wait for database to fully commit the session
    log_message(f"\n--- Waiting for database synchronization ---")
    time.sleep(3)

    # 6. Session Debugging - Check if session exists
    log_message(f"\n--- SESSION DEBUGGING ---")
    log_message(f"   > Target session ID: {session_id}")
    log_message(f"   > Session ID type: {type(session_id)}")
    log_message(f"   > Session ID length: {len(str(session_id))}")

    # Check if session exists
    session_exists = check_session_exists(user_token, session_id)

    if not session_exists:
        log_message(
            f"{Fore.YELLOW}⚠️ Session doesn't exist, listing all sessions for debugging..."
        )
        all_sessions = list_all_sessions(user_token)

        # Try to find a session with matching chatflow_id
        matching_sessions = [
            s for s in all_sessions if s.get("chatflow_id") == target_chatflow_id
        ]
        if matching_sessions:
            log_message(
                f"{Fore.BLUE}🔍 Found {len(matching_sessions)} sessions with matching chatflow_id:"
            )
            for session in matching_sessions:
                log_message(f"   - Session ID: {session.get('id')}")
                log_message(f"     Created: {session.get('created_at')}")
                log_message(f"     Updated: {session.get('updated_at')}")

    # 7. Verification
    if assistant_reply and (len(assistant_reply) > 10):  # Basic response check
        log_message(
            f"\n{Fore.GREEN}✅ IMAGE UPLOAD SUCCESS: Assistant responded to image upload."
        )
        log_message(f"   Initial response length: {len(assistant_reply)} characters")
    else:
        log_message(
            f"\n{Fore.RED}❌ IMAGE UPLOAD FAILED: Assistant did not respond properly. Response: '{assistant_reply}'"
        )

    # Check if follow-up response references the image
    if assistant_reply_2 and (
        "red" in assistant_reply_2.lower() or "color" in assistant_reply_2.lower()
    ):
        log_message(
            f"\n{Fore.GREEN}✅ FOLLOW-UP SUCCESS: Assistant seems to recall the image context."
        )
    else:
        log_message(
            f"\n{Fore.YELLOW}⚠️ FOLLOW-UP UNCLEAR: Assistant response: '{assistant_reply_2}'"
        )

    # 8. Get and display history (main investigation target)
    log_message(f"\n--- ATTEMPTING TO RETRIEVE CHAT HISTORY ---")
    history = get_chat_history(user_token, session_id)

    if history:
        log_message(f"{Fore.GREEN}✅ Chat history retrieval successful!")
        log_message(f"   > Total messages in history: {len(history)}")

        # Analyze the history for image uploads
        user_messages = [msg for msg in history if msg.get("role") == "user"]
        assistant_messages = [msg for msg in history if msg.get("role") == "assistant"]

        log_message(f"   > User messages: {len(user_messages)}")
        log_message(f"   > Assistant messages: {len(assistant_messages)}")

        # Check if image uploads are preserved in history
        messages_with_uploads = [
            msg
            for msg in user_messages
            if ("uploads" in msg and msg["uploads"]) or msg.get("has_files", False)
        ]
        if messages_with_uploads:
            log_message(
                f"{Fore.BLUE}📎 Found {len(messages_with_uploads)} messages with file uploads in history"
            )
            for msg in messages_with_uploads:
                if "uploads" in msg and msg["uploads"]:
                    uploads = msg.get("uploads", [])
                    log_message(
                        f"   - Enhanced format: {len(uploads)} uploads with full metadata"
                    )
                    for upload in uploads:
                        log_message(
                            f"     * {upload.get('name', 'unknown')} ({upload.get('mime', 'unknown')})"
                        )
                        log_message(f"       Image: {upload.get('is_image', False)}")
                        log_message(f"       Display URL: {upload.get('url', 'none')}")
                        log_message(
                            f"       Download URL: {upload.get('download_url', 'none')}"
                        )
                        if upload.get("thumbnail_url"):
                            log_message(
                                f"       Thumbnail URL: {upload.get('thumbnail_url')}"
                            )
                            log_message(
                                f"       Thumbnail Sizes: Small={upload.get('thumbnail_small', 'none')}, Medium={upload.get('thumbnail_medium', 'none')}"
                            )
                elif msg.get("has_files", False):
                    file_ids = msg.get("file_ids", [])
                    log_message(
                        f"   - Basic format: {len(file_ids)} file IDs: {file_ids}"
                    )
        else:
            log_message(f"{Fore.YELLOW}⚠️ No file uploads found in chat history")

    else:
        log_message(f"{Fore.RED}❌ Chat history retrieval failed or returned empty")

        # Additional debugging - wait longer and try again
        log_message(f"{Fore.YELLOW}🔄 Attempting one more time with longer wait...")
        time.sleep(5)

        # Try to retrieve history again
        history_retry = get_chat_history(user_token, session_id)
        if history_retry:
            log_message(f"{Fore.GREEN}✅ Chat history retrieval successful on retry!")
            history = history_retry
        else:
            log_message(f"{Fore.RED}❌ Chat history retrieval failed on retry as well")

    log_message(
        f"\n{Style.BRIGHT}✨ Image Upload & Session History Investigation Complete ✨"
    )
    log_message(f"📝 Full logs at: {LOG_PATH}")
    log_message(f"🎯 Target chatflow: {target_chatflow_id}")
    log_message(f"📎 Test image: {image_data[2]} ({image_data[1]})")
    log_message(f"🔑 Session ID: {session_id}")

    # Investigation Summary
    log_message(f"\n{Style.BRIGHT}🔍 INVESTIGATION SUMMARY:")
    log_message(
        f"   > Image upload functionality: {'✅ Working' if assistant_reply else '❌ Failed'}"
    )
    log_message(
        f"   > Session ID extraction: {'✅ Working' if session_id else '❌ Failed'}"
    )
    log_message(
        f"   > Context retention: {'✅ Working' if assistant_reply_2 and ('red' in assistant_reply_2.lower() or 'color' in assistant_reply_2.lower()) else '❌ Failed'}"
    )
    log_message(
        f"   > Session existence: {'✅ Found' if session_exists else '❌ Not found'}"
    )
    log_message(f"   > History retrieval: {'✅ Working' if history else '❌ Failed'}")

    if not history:
        log_message(f"\n{Fore.YELLOW}🔧 TROUBLESHOOTING SUGGESTIONS:")
        log_message(f"   1. Check database synchronization timing")
        log_message(f"   2. Verify session storage implementation")
        log_message(f"   3. Check for race conditions in session creation")
        log_message(f"   4. Validate session ID format and constraints")
        log_message(f"   5. Review database indexes and performance")
        log_message(f"   6. Check for session cleanup/expiration policies")

    return history  # Return history for further analysis if needed


if __name__ == "__main__":
    # Clear log file for a fresh run
    with open(LOG_PATH, "w") as f:
        f.write("")
    main()
