#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Image Upload Testing Script (10)

This script tests image upload functionality with file uploads. It:
1.  Authenticates as an admin to set up the environment (sync chatflows, assign user).
2.  Authenticates as a regular user.
3.  Creates a test image and encodes it as base64.
4.  Sends a message with an image upload to the chatflow.
5.  Verifies the image upload was processed correctly.
6.  Retrieves and displays the chat history for the session.
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
        
        # Handle concatenated JSON objects
        self.buffer = self.buffer.replace("}{", "}\n{")
        parts = self.buffer.split("\n")

        # Process complete parts (all except the last one, which might be incomplete)
        complete_parts = parts[:-1]
        remaining_buffer = parts[-1] if parts else ""
        
        # If the remaining buffer looks like a complete JSON object, try to parse it too
        if remaining_buffer.strip().startswith('{') and remaining_buffer.strip().endswith('}'):
            try:
                json.loads(remaining_buffer.strip())
                complete_parts.append(remaining_buffer.strip())
                remaining_buffer = ""
            except json.JSONDecodeError:
                pass  # Keep it in buffer for next chunk
        
        self.buffer = remaining_buffer

        extracted_events = []
        for part in complete_parts:
            if not part.strip():
                continue
            try:
                event = json.loads(part.strip())
                self.events.append(event)
                extracted_events.append(event)
            except json.JSONDecodeError:
                # Put failed part back in buffer for next iteration
                self.buffer = part + self.buffer

        return extracted_events

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Configuration
API_BASE_URL = "http://localhost:8000"
LOG_FILE = "image_upload_test_10.log"
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
    for i in range(1, 101)
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
            minimal_png_b64 = (
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            )
            log_message(f"{Fore.YELLOW}⚠️ PIL not available, using minimal 1x1 PNG")
            return minimal_png_b64, "image/png", "minimal_test.png"

    except Exception as e:
        log_message(f"{Fore.RED}❌ Error creating test image: {e}")
        return None, None, None


def send_chat_message_with_image(
    token, username, chatflow_id, question, image_data=None, session_id=None
):
    """Send a chat message with optional image upload and extract session_id from the stream."""
    log_message(f"\n--- Sending message with image for {username} on chatflow {chatflow_id} ---")
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

            # Initialize stream parser
            stream_parser = StreamParser()

            for chunk in response.iter_content(chunk_size=None):
                if chunk:
                    decoded_chunk = chunk.decode("utf-8", errors="ignore")
                    events = stream_parser.process_chunk(decoded_chunk)
                    
                    for event in events:
                        # Log important events
                        event_type = event.get('event', 'unknown')
                        if event_type == "session_id":
                            if not extracted_session_id:
                                extracted_session_id = event.get("data")
                                log_message(
                                    f"{Fore.GREEN}✅ Extracted session_id: {extracted_session_id}"
                                )
                        elif event_type == "token":
                            full_response += event.get("data", "")
                        elif event_type == "file_upload":
                            file_info = event.get("data", {})
                            log_message(
                                f"{Fore.BLUE}📎 File upload event: {file_info.get('filename', 'unknown')} - {file_info.get('status', 'unknown')}"
                            )
                        elif event_type == "error":
                            log_message(f"{Fore.RED}⚠️ Stream error: {event.get('data', 'Unknown error')}")
                        elif event_type == "end":
                            log_message(f"{Fore.CYAN}🏁 Stream ended")
                        elif event_type == "metadata":
                            log_message(f"{Fore.YELLOW}📋 Metadata received")

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

    # 3. Create test image
    image_data = create_test_image()
    if not image_data[0]:  # If image creation failed
        log_message(f"{Fore.RED}❌ Failed to create test image. Exiting.")
        sys.exit(1)

    # 4. Image Upload Test
    # Send a message with image upload
    test_question = "Can you describe what you see in this image?"
    assistant_reply, session_id = send_chat_message_with_image(
        user_token, REGULAR_USER["username"], target_chatflow_id, test_question, image_data
    )

    if not session_id:
        log_message(
            f"{Fore.RED}❌ Critical error: Could not obtain session_id. Aborting test."
        )
        sys.exit(1)

    # Wait a moment to ensure the message is processed and stored
    time.sleep(2)

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

    # 6. Verification
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
    if assistant_reply_2 and ("red" in assistant_reply_2.lower() or "color" in assistant_reply_2.lower()):
        log_message(
            f"\n{Fore.GREEN}✅ FOLLOW-UP SUCCESS: Assistant seems to recall the image context."
        )
    else:
        log_message(
            f"\n{Fore.YELLOW}⚠️ FOLLOW-UP UNCLEAR: Assistant response: '{assistant_reply_2}'"
        )

    # 7. Get and display history
    get_chat_history(user_token, session_id)

    log_message(f"\n{Style.BRIGHT}✨ Image Upload Test Complete ✨")
    log_message(f"📝 Full logs at: {LOG_PATH}")
    log_message(f"🎯 Target chatflow: {target_chatflow_id}")
    log_message(f"📎 Test image: {image_data[2]} ({image_data[1]})")


if __name__ == "__main__":
    # Clear log file for a fresh run
    with open(LOG_PATH, "w") as f:
        f.write("")
    main()
