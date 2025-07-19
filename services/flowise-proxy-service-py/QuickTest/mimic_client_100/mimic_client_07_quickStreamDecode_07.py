import json
import requests
import subprocess
import time
import sys
import os
import datetime
import pymongo
import re

# This script investigates streaming format from chatflow responses
# Updated to handle incomplete stream events and provide robust parsing
# Includes proper user sync, chatflow assignment, and verification steps
# mode con: cols=120 lines=3000 # to increase console buffer size for better output visibility

LOG_FILE = "stream_decode_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration - matching existing scripts exactly
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
    for i in range(1, 3)
]


class StreamParser:
    """
    A class to process a stream of concatenated JSON objects.
    Based on the frontend StreamParser pattern from the context [[1]][doc_1].
    """

    def __init__(self):
        self.buffer = ""
        self.events = []
        self.errors = []

    def process_chunk(self, chunk_text):
        """Process a chunk of stream data and extract complete JSON events"""
        self.buffer += chunk_text

        # Find all complete JSON objects in the buffer
        # Stream format: {"event":"start"}{"event":"chunk", "data":"hello"}{"event":"end"} [[1]][doc_1]
        events_extracted = []

        while self.buffer:
            # Find the start of a JSON object
            start_idx = self.buffer.find('{"event"')
            if start_idx == -1:
                break

            # Remove any content before the JSON start
            if start_idx > 0:
                self.buffer = self.buffer[start_idx:]

            # Try to find a complete JSON object
            brace_count = 0
            end_idx = -1
            in_string = False
            escape_next = False

            for i, char in enumerate(self.buffer):
                if escape_next:
                    escape_next = False
                    continue

                if char == "\\":
                    escape_next = True
                    continue

                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue

                if not in_string:
                    if char == "{":
                        brace_count += 1
                    elif char == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break

            if end_idx == -1:
                # No complete JSON object found, wait for more data
                break

            # Extract the complete JSON object
            json_str = self.buffer[:end_idx]
            self.buffer = self.buffer[end_idx:]

            # Try to parse the JSON
            try:
                event_data = json.loads(json_str)
                events_extracted.append(event_data)
                self.events.append(event_data)
            except json.JSONDecodeError as e:
                error_info = {
                    "error": str(e),
                    "json_str": (
                        json_str[:200] + "..." if len(json_str) > 200 else json_str
                    ),
                    "buffer_remaining": len(self.buffer),
                }
                self.errors.append(error_info)

        return events_extracted

    def get_incomplete_buffer(self):
        """Get any remaining incomplete data in the buffer"""
        return self.buffer

    def get_all_events(self):
        """Get all successfully parsed events"""
        return self.events

    def get_errors(self):
        """Get all parsing errors"""
        return self.errors


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
            if not token:
                token = data.get("accessToken")
            if not token:
                token = data.get("token", {}).get("accessToken")

            if not token and isinstance(data, dict):
                print(f"Response structure: {json.dumps(data, indent=2)}")
                for key, value in data.items():
                    if isinstance(value, str) and len(value) > 40:
                        token = value
                        print(f"Found potential token in field: {key}")
                        break

            if token:
                print("✅ Admin access token obtained")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] Admin '{ADMIN_USER['username']}' logged in successfully\n"
                    )
                return token
            else:
                print("❌ Access token not found in response")
                print(f"Response data: {data}")
        else:
            print(f"❌ Failed to log in as admin: {response.text}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

    return None


def test_sync_users_by_email(token, emails):
    """Test syncing users by email"""
    print("\n--- Testing User Sync by Email ---")
    if not emails:
        print("No emails provided for user sync.")
        return False

    headers = {"Authorization": f"Bearer {token}"}
    all_successful = True
    successful_syncs = 0
    failed_syncs = 0

    for email in emails:
        print(f"Attempting to sync user: {email}")
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/admin/users/sync-by-email",
                headers=headers,
                json={"email": email},
            )
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"✅ User sync successful for {email}: {data.get('status')}")
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] User sync successful for {email}: {data.get('status')}\n"
                    )
                successful_syncs += 1
            else:
                print(
                    f"❌ User sync failed for {email}: {response.status_code} - {response.text}"
                )
                all_successful = False
                failed_syncs += 1
        except Exception as e:
            print(f"❌ Error during user sync for {email}: {e}")
            all_successful = False
            failed_syncs += 1

    print(
        f"📊 User Sync Summary: {successful_syncs} successful, {failed_syncs} failed."
    )
    return all_successful


def sync_chatflows_via_api(admin_token):
    """Sync chatflows from Flowise to local DB"""
    print("\n🔄 Performing chatflow sync via server endpoint...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/admin/chatflows/sync", headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print("✅ Chatflow sync successful")
            print(f"📊 Sync Results:")
            print(f"   - Total fetched: {data.get('total_fetched', 0)}")
            print(f"   - Created: {data.get('created', 0)}")
            print(f"   - Updated: {data.get('updated', 0)}")
            print(f"   - Deleted: {data.get('deleted', 0)}")
            print(f"   - Errors: {data.get('errors', 0)}")

            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Chatflow sync completed: {json.dumps(data)}\n"
                )
            return True
        else:
            print(
                f"❌ Chatflow sync via API failed: {response.status_code} {response.text}"
            )
            return False
    except Exception as e:
        print(f"❌ Exception during chatflow sync via API: {e}")
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

            for i, chatflow in enumerate(chatflows):
                print(
                    f"  {i+1}. ID: {chatflow.get('flowise_id', 'N/A')}, Name: {chatflow.get('name', 'N/A')}"
                )

            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Admin listed {len(chatflows)} chatflows\n"
                )

            if chatflows:
                return [
                    chatflow.get("flowise_id")
                    for chatflow in chatflows
                    if chatflow.get("flowise_id")
                ]
            else:
                print("ℹ️ No chatflows available for assignment")
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
            data = response.json()
            print(
                f"✅ Successfully assigned user '{user_email}' to chatflow '{chatflow_id}'"
            )
            print(f"   Assignment details: {json.dumps(data, indent=2)}")
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Admin assigned user '{user_email}' to chatflow '{chatflow_id}'\n"
                )
            return True
        else:
            print(
                f"❌ Failed to assign user to chatflow: {response.status_code} - {response.text}"
            )
            return False
    except Exception as e:
        print(f"❌ Error during user assignment: {e}")
        return False


def list_accessible_chatflows(token, username):
    """List accessible chatflows for user"""
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
    except Exception as e:
        print(f"❌ Error while listing chatflows for {username}: {e}")
        return None


def analyze_stream_events(events):
    """Analyze parsed stream events and provide detailed breakdown"""
    analysis = {
        "total_events": len(events),
        "event_types": {},
        "event_sequence": [],
        "agent_flow_progression": [],
        "token_content": [],
        "metadata_info": {},
        "errors_found": [],
    }

    for i, event in enumerate(events):
        event_type = event.get("event", "unknown")
        event_data = event.get("data", "")

        # Track event types
        if event_type not in analysis["event_types"]:
            analysis["event_types"][event_type] = []
        analysis["event_types"][event_type].append(i)

        # Track event sequence
        analysis["event_sequence"].append(
            {
                "index": i,
                "type": event_type,
                "data_type": type(event_data).__name__,
                "data_preview": str(event_data)[:100] if event_data else "",
            }
        )

        # Analyze specific event types based on test output [[3]][doc_3]
        if event_type == "agentFlowEvent":
            analysis["agent_flow_progression"].append(
                {"index": i, "status": event_data}
            )
        elif event_type == "nextAgentFlow":
            if isinstance(event_data, dict):
                analysis["agent_flow_progression"].append(
                    {
                        "index": i,
                        "nodeId": event_data.get("nodeId"),
                        "nodeLabel": event_data.get("nodeLabel"),
                        "status": event_data.get("status"),
                    }
                )
        elif event_type == "token":
            analysis["token_content"].append({"index": i, "content": event_data})
        elif event_type == "metadata":
            if isinstance(event_data, dict):
                analysis["metadata_info"] = {
                    "index": i,
                    "sessionId": event_data.get("sessionId"),
                    "chatId": event_data.get("chatId"),
                    "question": event_data.get("question"),
                    "memoryType": event_data.get("memoryType"),
                }

    return analysis


def investigate_stream_format(token, username, chatflow_id, question, session_id=None):
    """Investigate streaming format using enhanced parsing to handle incomplete events"""
    print(
        f"\n--- Testing chat predict STREAM for user: {username} on chatflow: {chatflow_id} ---"
    )
    print(f"Question: {question}")
    if session_id:
        print(f"Session ID: {session_id}")

    if not token or not chatflow_id:
        print("❌ Cannot test predict stream without token or chatflow_id.")
        return None

    predict_url = f"{API_BASE_URL}/api/v1/chat/predict/stream"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"chatflow_id": chatflow_id, "question": question}

    if session_id:
        payload["sessionId"] = session_id

    # Initialize investigation log
    investigation_log = {
        "user": username,
        "chatflow_id": chatflow_id,
        "question": question,
        "session_id": session_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "chunks": [],
        "events": [],
        "analysis": {},
        "errors": [],
        "connection_status": "unknown",
    }

    try:
        # Enhanced streaming with timeout and error handling [[2]][doc_2]
        response = requests.post(
            predict_url,
            headers=headers,
            json=payload,
            stream=True,
            timeout=(30, 300),  # Connection timeout 30s, read timeout 300s
        )

        investigation_log["connection_status"] = f"HTTP {response.status_code}"

        if response.status_code == 200:
            print(f"✅ Stream started successfully for {username}. Processing chunks:")

            # Initialize stream parser
            stream_parser = StreamParser()
            chunk_count = 0

            try:
                # Process stream using enhanced parser
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        chunk_count += 1
                        decoded_chunk = chunk.decode("utf-8")

                        # Log chunk information
                        chunk_info = {
                            "index": chunk_count,
                            "size": len(decoded_chunk),
                            "content": decoded_chunk,
                            "preview": (
                                decoded_chunk[:200] + "..."
                                if len(decoded_chunk) > 200
                                else decoded_chunk
                            ),
                        }
                        investigation_log["chunks"].append(chunk_info)

                        # Print chunk for immediate feedback
                        print(f"📦 Chunk {chunk_count} ({len(decoded_chunk)} chars)")
                        print(decoded_chunk, end="", flush=True)

                        # Parse events from chunk
                        try:
                            new_events = stream_parser.process_chunk(decoded_chunk)
                            if new_events:
                                print(
                                    f"\n🔍 Parsed {len(new_events)} events from chunk {chunk_count}"
                                )
                        except Exception as parse_error:
                            error_info = {
                                "chunk_index": chunk_count,
                                "error": str(parse_error),
                                "chunk_preview": decoded_chunk[:100],
                            }
                            investigation_log["errors"].append(error_info)
                            print(
                                f"\n⚠️ Parse error in chunk {chunk_count}: {parse_error}"
                            )

            except Exception as stream_error:
                # Handle connection errors like "InvalidChunkLength" mentioned in context
                investigation_log["connection_status"] = (
                    f"STREAM_ERROR: {str(stream_error)}"
                )
                investigation_log["errors"].append(
                    {
                        "type": "stream_error",
                        "error": str(stream_error),
                        "chunks_processed": chunk_count,
                    }
                )
                print(f"\n❌ Stream error after {chunk_count} chunks: {stream_error}")

            print("\n--- End of Stream ---")

            # Get all parsed events and analyze
            all_events = stream_parser.get_all_events()
            parse_errors = stream_parser.get_errors()
            incomplete_buffer = stream_parser.get_incomplete_buffer()

            investigation_log["events"] = all_events
            investigation_log["parse_errors"] = parse_errors
            investigation_log["incomplete_buffer"] = incomplete_buffer

            # Perform detailed analysis
            if all_events:
                analysis = analyze_stream_events(all_events)
                investigation_log["analysis"] = analysis

                print(f"\n📊 Stream Analysis Results:")
                print(f"   Total chunks received: {chunk_count}")
                print(f"   Total events parsed: {len(all_events)}")
                print(f"   Parse errors: {len(parse_errors)}")
                print(f"   Incomplete buffer size: {len(incomplete_buffer)} chars")

                # Display event type breakdown
                print(f"   Event types found:")
                for event_type, indices in analysis["event_types"].items():
                    print(f"     - {event_type}: {len(indices)} occurrences")

                # Show agent flow progression if available [[3]][doc_3]
                if analysis["agent_flow_progression"]:
                    print(f"   Agent Flow Progression:")
                    for step in analysis["agent_flow_progression"][
                        :5
                    ]:  # Show first 5 steps
                        if "nodeId" in step:
                            print(
                                f"     - {step.get('nodeLabel', 'N/A')} ({step.get('nodeId', 'N/A')}): {step.get('status', 'N/A')}"
                            )
                        else:
                            print(f"     - Status: {step.get('status', 'N/A')}")

                # Show metadata if available
                if analysis["metadata_info"]:
                    meta = analysis["metadata_info"]
                    print(f"   Session Metadata:")
                    print(f"     - Session ID: {meta.get('sessionId', 'N/A')}")
                    print(f"     - Chat ID: {meta.get('chatId', 'N/A')}")
                    print(f"     - Memory Type: {meta.get('memoryType', 'N/A')}")

            # Show parse errors if any
            if parse_errors:
                print(f"\n⚠️ Parse Errors Found:")
                for error in parse_errors[:3]:  # Show first 3 errors
                    print(f"   - {error['error']}")
                    print(f"     JSON preview: {error['json_str'][:50]}...")

            # Show incomplete buffer if any
            if incomplete_buffer:
                print(f"\n📝 Incomplete Buffer ({len(incomplete_buffer)} chars):")
                print(f"   {incomplete_buffer[:100]}...")

        else:
            investigation_log["connection_status"] = (
                f"HTTP_ERROR {response.status_code}"
            )
            investigation_log["errors"].append(
                {
                    "type": "http_error",
                    "status_code": response.status_code,
                    "response_text": response.text,
                }
            )
            print(f"❌ Stream failed: {response.status_code} - {response.text}")

    except Exception as e:
        investigation_log["connection_status"] = f"EXCEPTION: {str(e)}"
        investigation_log["errors"].append(
            {"type": "request_exception", "error": str(e)}
        )
        print(f"❌ Request error: {e}")

    finally:
        # Always write investigation log regardless of success or failure
        try:
            chunk_log_path = os.path.join(SCRIPT_DIR, "stream_chunk_investigation.log")
            with open(chunk_log_path, "a", encoding="utf-8") as chunk_log_file:
                log_entry = json.dumps(investigation_log, indent=2, ensure_ascii=False)
                chunk_log_file.write(f"\n{'='*80}\n")
                chunk_log_file.write(
                    f"INVESTIGATION LOG - {investigation_log['timestamp']}\n"
                )
                chunk_log_file.write(f"{'='*80}\n")
                chunk_log_file.write(log_entry)
                chunk_log_file.write(f"\n{'='*80}\n\n")
            print(f"📝 Investigation logged to: {chunk_log_path}")
        except Exception as write_error:
            print(f"❌ Failed to write investigation log: {write_error}")

        # Also write to main log
        try:
            with open(LOG_PATH, "a", encoding="utf-8") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                status = investigation_log["connection_status"]
                events_count = len(investigation_log.get("events", []))
                log_file.write(
                    f"[{timestamp}] Stream investigation - User: {username}, Status: {status}, Events: {events_count}\n"
                )
        except Exception as log_error:
            print(f"❌ Failed to write to main log: {log_error}")

    return investigation_log.get("events", [])


def verify_log_directory():
    """Verify log directory is writable"""
    try:
        test_file = os.path.join(SCRIPT_DIR, "test_write.tmp")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        print(f"✅ Log directory is writable: {SCRIPT_DIR}")
        return True
    except Exception as e:
        print(f"❌ Log directory is not writable: {e}")
        return False


def main():
    print("=" * 60)
    print("🚀 ENHANCED STREAM FORMAT INVESTIGATION TEST SUITE 🚀")
    print("=" * 60)

    # Verify log directory
    if not verify_log_directory():
        print("❌ Cannot write to log directory. Exiting.")
        exit(1)

    # Initialize log file
    with open(LOG_PATH, "w") as log_file:
        log_file.write(
            f"Enhanced Stream Decode Investigation Log - {datetime.datetime.now()}\n"
        )

    # Step 1: Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Could not get admin token. Exiting.")
        exit(1)

    # Step 2: Sync users by email
    user_emails_to_sync = [user["email"] for user in SUPERVISOR_USERS] + [
        user["email"] for user in REGULAR_USERS
    ]
    print("\n🔄 Syncing Users by Email...")
    user_sync_successful = test_sync_users_by_email(admin_token, user_emails_to_sync)
    if user_sync_successful:
        print("✅ User sync process completed successfully.")
    else:
        print("⚠️ User sync process completed with some failures.")

    # Step 3: Perform chatflow sync
    sync_successful = sync_chatflows_via_api(admin_token)
    if not sync_successful:
        print(
            "❌ Critical: Chatflow sync via API failed. Some tests might not be meaningful. Continuing..."
        )

    # Step 4: List all chatflows and assign users
    target_chatflow_ids = list_all_chatflows_as_admin(admin_token)
    if not target_chatflow_ids:
        print("❌ No chatflows available for assignment. Exiting.")
        exit(1)

    # Step 5: Assign users to chatflows
    for chatflow_id in target_chatflow_ids[:2]:  # Test with first 2 chatflows
        print(f"\n🔄 Setting up assignments for chatflow: {chatflow_id}")
        for user in REGULAR_USERS[:2]:  # Test with first 2 users
            assignment_success = assign_user_to_chatflow_by_email(
                admin_token, chatflow_id, user["email"]
            )
            if assignment_success:
                print(
                    f"✅ Successfully assigned {user['username']} to chatflow {chatflow_id}."
                )

    # Step 6: Enhanced stream format investigation
    print("\n🔍 Starting Enhanced Stream Format Investigation...")

    test_questions = [
        "Tell me a story.",
        "What is artificial intelligence?",
        "Explain quantum computing in simple terms.",
    ]

    for i, user in enumerate(REGULAR_USERS[:2]):
        print(f"\n👤 Testing with user: {user['username']} ({i+1}/2)")

        user_token = get_user_token(user)
        if not user_token:
            print(f"⚠️ Skipping tests for {user['username']} - authentication failed")
            continue

        chatflow_id = list_accessible_chatflows(user_token, user["username"])
        if not chatflow_id:
            print(
                f"❌ No accessible chatflows for user {user['username']}. Skipping stream tests."
            )
            continue

        # Test with different questions
        for j, question in enumerate(test_questions):
            print(f"\n🔄 Test {j+1}: {question}")

            # Basic streaming test
            events = investigate_stream_format(
                user_token, user["username"], chatflow_id, question
            )

            time.sleep(2)  # Pause between tests

        # Test session continuity
        print(f"\n🔄 Session Continuity Test")
        session_id = f"enhanced-stream-test-{int(time.time())}"

        investigate_stream_format(
            user_token,
            user["username"],
            chatflow_id,
            "My name is EnhancedTester. Please remember this for our conversation.",
            session_id,
        )

        time.sleep(1)

        investigate_stream_format(
            user_token,
            user["username"],
            chatflow_id,
            "Do you remember my name? What was it again?",
            session_id,
        )

        time.sleep(3)  # Pause between users

    print("\n" + "=" * 60)
    print("✨ Enhanced Stream Format Investigation Complete ✨")
    print("=" * 60)
    print(f"📝 Detailed logs available at:")
    print(f"   - Main log: {LOG_PATH}")
    print(
        f"   - Stream chunks: {os.path.join(SCRIPT_DIR, 'stream_chunk_investigation.log')}"
    )


if __name__ == "__main__":
    main()
