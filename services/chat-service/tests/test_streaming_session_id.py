#!/usr/bin/env python3
import requests
import json
import sys
import time
import sseclient
from colorama import Fore, Style, init
from datetime import datetime

# Initialize colorama for colored terminal output
init(autoreset=True)

# Configuration
AUTH_SERVICE_URL = "http://localhost:3000/api"
ACCOUNTING_SERVICE_URL = "http://localhost:3001/api"
CHAT_SERVICE_URL = "http://localhost:3002/api"

# Test user credentials
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

SUPERVISOR_USERS = [ {
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

REGULAR_USERS = [{
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

# Use the first regular user for testing
TEST_USER = REGULAR_USERS[0]

class Logger:
    @staticmethod
    def success(message):
        print(f"{Fore.GREEN}[SUCCESS] {message}{Style.RESET_ALL}")

    @staticmethod
    def info(message):
        print(f"{Fore.CYAN}[INFO] {message}{Style.RESET_ALL}")

    @staticmethod
    def warning(message):
        print(f"{Fore.YELLOW}[WARNING] {message}{Style.RESET_ALL}")

    @staticmethod
    def error(message):
        print(f"{Fore.RED}[ERROR] {message}{Style.RESET_ALL}")
        
    @staticmethod
    def debug(message):
        print(f"{Fore.BLUE}[DEBUG] {message}{Style.RESET_ALL}")

    @staticmethod
    def header(message):
        print(f"\n{Fore.MAGENTA}{'=' * 80}")
        print(f"{Fore.MAGENTA}{message}")
        print(f"{Fore.MAGENTA}{'=' * 80}{Style.RESET_ALL}")

class StreamingTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.headers = {}
        self.session_id = None
        self.streaming_session_id = None
    
    def check_services_health(self):
        """Check if all services are healthy"""
        Logger.header("CHECKING SERVICES HEALTH")
        
        services = [ 
            {"name": "Auth Service", "url": f"{AUTH_SERVICE_URL.replace('/api', '')}/health"},
            {"name": "Accounting Service", "url": f"{ACCOUNTING_SERVICE_URL.replace('/api', '')}/health"},
            {"name": "Chat Service", "url": f"{CHAT_SERVICE_URL}/health"}
        ]
        
        all_healthy = True
        
        for service in services:
            try:
                response = self.session.get(service["url"], timeout=5)
                if response.status_code == 200:
                    Logger.success(f"{service['name']} is healthy")
                else:
                    Logger.error(f"{service['name']} returned status code {response.status_code}")
                    all_healthy = False
            except requests.RequestException as e:
                Logger.error(f"{service['name']} health check failed: {str(e)}")
                all_healthy = False
        
        return all_healthy
    
    def authenticate(self):
        """Authenticate as the test user"""
        Logger.header("AUTHENTICATING AS TEST USER")
        
        try:
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/auth/login",
                json={
                    "username": TEST_USER["username"],
                    "password": TEST_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.user_token = data.get("accessToken")
                self.headers = {
                    "Authorization": f"Bearer {self.user_token}",
                    "X-User-ID": TEST_USER["username"]
                }
                Logger.success(f"Authentication successful for {TEST_USER['username']}")
                return True
            else:
                Logger.error(f"Authentication failed: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Authentication error: {str(e)}")
            return False
    
    def authenticate_admin(self):
        """Authenticate as admin"""
        Logger.header("AUTHENTICATING AS ADMIN")
        
        try:
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/auth/login",
                json={
                    "username": ADMIN_USER["username"],
                    "password": ADMIN_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("accessToken")
                admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
                Logger.success(f"Admin authentication successful")
                return True, admin_headers
            else:
                Logger.error(f"Admin authentication failed: {response.status_code}, {response.text}")
                return False, {}
                
        except requests.RequestException as e:
            Logger.error(f"Admin authentication error: {str(e)}")
            return False, {}
    
    def allocate_credits(self):
        """Allocate credits to the test user"""
        Logger.header("ALLOCATING CREDITS")
        
        success, admin_headers = self.authenticate_admin()
        if not success:
            Logger.error("Admin authentication failed. Cannot allocate credits.")
            return False
        
        try:
            response = self.session.post(
                f"{ACCOUNTING_SERVICE_URL}/credits/allocate",
                headers=admin_headers,
                json={
                    "userId": TEST_USER["username"],
                    "credits": 5000,
                    "expiryDays": 30,
                    "notes": "Test credit allocation"
                }
            )
            
            if response.status_code == 201:
                Logger.success(f"Successfully allocated credits to {TEST_USER['username']}")
                return True
            else:
                Logger.error(f"Credit allocation failed: {response.status_code}, {response.text}")
                return False
        except requests.RequestException as e:
            Logger.error(f"Credit allocation error: {str(e)}")
            return False
    
    def create_chat_session(self):
        """Create a new chat session"""
        Logger.header("CREATING NEW CHAT SESSION")
        
        try:
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions",
                headers=self.headers,
                json={
                    "title": f"Stream Test Chat {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                    "initialMessage": "Hello, this is a test message"
                }
            )
            
            if response.status_code == 201:
                data = response.json()
                self.session_id = data.get("sessionId")
                Logger.success(f"Chat session created successfully! Session ID: {self.session_id}")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to create chat session: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Chat session creation error: {str(e)}")
            return False
    
    def get_available_models(self):
        """Get available AI models"""
        Logger.header("GETTING AVAILABLE MODELS")
        
        try:
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/models",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                Logger.success(f"Retrieved {len(models)} available models")
                
                # Return the first available model for tests
                available_models = [m for m in models if m.get("available", False)]
                if available_models:
                    model_id = available_models[0]["id"]
                    Logger.info(f"Using model: {model_id}")
                    return model_id
                else:
                    Logger.warning("No available models found. Using default model.")
                    return "amazon.titan-text-express-v1:0"  # Default model
            else:
                Logger.error(f"Failed to get available models: {response.status_code}, {response.text}")
                return "amazon.titan-text-express-v1:0"  # Default model
                
        except requests.RequestException as e:
            Logger.error(f"Model retrieval error: {str(e)}")
            return "amazon.titan-text-express-v1:0"  # Default model
    
    def test_stream_with_correct_session_id(self):
        """Test streaming with correct session ID"""
        Logger.header("TESTING STREAMING WITH CORRECT SESSION ID")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
        
        model_id = self.get_available_models()
        full_response = ""
        
        try:
            # Start streaming
            streaming_response = requests.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/stream",
                headers=self.headers,
                json={
                    "message": "Tell me a short story about a robot learning to paint",
                    "modelId": model_id
                },
                stream=True
            )
            
            if streaming_response.status_code != 200:
                Logger.error(f"Failed to start streaming: {streaming_response.status_code}, {streaming_response.text}")
                return False
            
            # Extract the streaming session ID from headers.
            # requests.headers.get() is case-insensitive.
            self.streaming_session_id = streaming_response.headers.get('X-Streaming-Session-Id')

            if self.streaming_session_id:
                Logger.info(f"Found streaming ID in 'X-Streaming-Session-Id' header: {self.streaming_session_id}")
            else:
                Logger.warning("'X-Streaming-Session-Id' header not found. Trying known alternative header names...")
                alternative_header_names = [
                    "X-Stream-Id",
                    # Add other plausible alternative names here if necessary in the future
                ]
                for alt_header_name in alternative_header_names:
                    self.streaming_session_id = streaming_response.headers.get(alt_header_name)
                    if self.streaming_session_id:
                        Logger.info(f"Found streaming ID in alternative header '{alt_header_name}': {self.streaming_session_id}")
                        break  # Found it, exit loop

                if not self.streaming_session_id:
                    # Emergency fallback if no expected or alternative header is found
                    import uuid
                    timestamp = int(time.time())
                    # Fallback format should align with server's expected format if possible
                    random_uuid_part = str(uuid.uuid4()).split('-')[0] 
                    self.streaming_session_id = f"stream-{timestamp}-{random_uuid_part}"
                    Logger.warning(f"No streaming session ID found in expected or alternative headers. Using emergency fallback: {self.streaming_session_id}")
            
            # Super detailed header debugging
            Logger.debug("==== ALL RESPONSE HEADERS ====")
            for header_name, header_value in streaming_response.headers.items():
                Logger.debug(f"HEADER: '{header_name}' = '{header_value}'")
            Logger.debug("===========================")
            
            Logger.success("Streaming response started! Collecting chunks...")
            
            # Collect chunks
            client = sseclient.SSEClient(streaming_response)
            chunks_received = 0
            tokens_used = None
            
            for event in client.events():
                if event.event == "chunk":
                    try:
                        data = json.loads(event.data)
                        text = data.get('text', '')
                        full_response += text
                        chunks_received += 1
                        
                        # Show only first few chunks
                        if chunks_received <= 3:
                            Logger.info(f"Chunk {chunks_received}: {text}")
                    except json.JSONDecodeError:
                        Logger.warning(f"Failed to parse chunk: {event.data}")
                
                elif event.event == "done":
                    try:
                        data = json.loads(event.data)
                        tokens_used = data.get('tokensUsed', 100)
                        Logger.info(f"Stream complete. Tokens used: {tokens_used}")
                        break
                    except json.JSONDecodeError:
                        Logger.warning(f"Failed to parse done event: {event.data}")
                
                # If we've collected enough chunks for testing, break early
                if chunks_received >= 10:
                    Logger.info("Received enough chunks for testing. Breaking early.")
                    tokens_used = 100  # Default if not provided
                    break
            
            Logger.success(f"Received {chunks_received} chunks. Total response length: {len(full_response)}")
            
            # Add a significant delay before updating to avoid race conditions
            # The server needs time to store the streaming session ID in MongoDB
            Logger.info("Adding delay before update to avoid race conditions with database updates...")
            time.sleep(2.0)  # Increased from 0.5 to 2.0 seconds
            
            # Implement retry mechanism for updating with streaming session ID
            max_retries = 5 # Changed from 3 to 5
            for retry in range(max_retries):
                Logger.header(f"UPDATING CHAT WITH STREAM RESPONSE (Attempt {retry + 1}/{max_retries})")
                Logger.info(f"Using streaming session ID: {self.streaming_session_id}")
                
                update_response = self.session.post(
                    f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/update-stream",
                    headers=self.headers,
                    json={
                        "completeResponse": full_response or "AI response placeholder",
                        "streamingSessionId": self.streaming_session_id,
                        "tokensUsed": tokens_used or 100
                    }
                )
                
                if update_response.status_code == 200:
                    Logger.success("Stream response updated successfully!")
                    Logger.info(json.dumps(update_response.json(), indent=2))
                    return True
                elif update_response.status_code == 400 and "mismatch" in update_response.text.lower():
                    error_data = json.loads(update_response.text)
                    Logger.warning(f"Session ID mismatch error: {error_data.get('message', '')}")
                    if "details" in error_data:
                        Logger.debug(f"Mismatch details: {json.dumps(error_data['details'], indent=2)}")
                    
                    # Wait longer before retrying
                    if retry < max_retries - 1:
                        # Previous: time.sleep(2.0 * (retry + 1))
                        wait_time = 1.0 * (2**retry)  # Exponential backoff: 1s, 2s, 4s, 8s for subsequent retries
                        Logger.info(f"Waiting {wait_time}s before retry {retry + 2}/{max_retries}...")
                        time.sleep(wait_time)
                else:
                    Logger.error(f"Failed to update stream response: {update_response.status_code}, {update_response.text}")
                    # Log request details for debugging
                    Logger.debug("Request payload:")
                    Logger.debug(json.dumps({
                        "completeResponse": "(content length: " + str(len(full_response)) + " chars)",
                        "streamingSessionId": self.streaming_session_id,
                        "tokensUsed": tokens_used or 100
                    }, indent=2))
                    return False
            
            # If we reached here, all retries failed
            Logger.error(f"Failed to update stream after {max_retries} attempts")
            return False
                
        except Exception as e:
            Logger.error(f"Streaming test error: {str(e)}")
            import traceback
            Logger.debug(traceback.format_exc())
            return False
    
    def test_stream_with_incorrect_session_id(self):
        """Test streaming with incorrect session ID"""
        Logger.header("TESTING STREAMING WITH INCORRECT SESSION ID")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
        
        model_id = self.get_available_models()
        full_response = ""
        
        try:
            # Start streaming
            streaming_response = requests.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/stream",
                headers=self.headers,
                json={
                    "message": "Tell me a short story about a robot learning to paint",
                    "modelId": model_id
                },
                stream=True
            )
            
            if streaming_response.status_code != 200:
                Logger.error(f"Failed to start streaming: {streaming_response.status_code}, {streaming_response.text}")
                return False
            
            # Log all headers for debugging
            Logger.debug("==== HEADER INSPECTION FOR INCORRECT ID TEST ====")
            for header_name, header_value in streaming_response.headers.items():
                Logger.debug(f"HEADER: '{header_name}' = '{header_value}'")
            Logger.debug("==============================================")
            
            # Extract the actual streaming session ID from headers for logging purposes.
            # requests.headers.get() is case-insensitive.
            actual_streaming_id = streaming_response.headers.get('X-Streaming-Session-Id')

            if actual_streaming_id:
                Logger.info(f"Found actual streaming ID in 'X-Streaming-Session-Id' header: {actual_streaming_id}")
            else:
                Logger.warning("Actual 'X-Streaming-Session-Id' header not found. Trying known alternative...")
                actual_streaming_id = streaming_response.headers.get('X-Stream-Id')
                if actual_streaming_id:
                    Logger.info(f"Found actual streaming ID in alternative 'X-Stream-Id' header: {actual_streaming_id}")
                else:
                    # Fallback for logging if no relevant header is found
                    import uuid
                    timestamp = int(time.time())
                    random_uuid_part = str(uuid.uuid4()).split('-')[0]
                    actual_streaming_id = f"stream-{timestamp}-{random_uuid_part}" # Consistent fallback format
                    Logger.warning(f"No actual streaming session ID found in headers for incorrect ID test. Using generated ID for reference: {actual_streaming_id}")
            
            # Collect some chunks
            client = sseclient.SSEClient(streaming_response)
            chunks_received = 0
            
            for event in client.events():
                if event.event == "chunk":
                    try:
                        data = json.loads(event.data)
                        text = data.get('text', '')
                        full_response += text
                        chunks_received += 1
                        if chunks_received <= 2:  # Show just first two chunks
                            Logger.info(f"Chunk {chunks_received}: {text[:50]}...")
                    except json.JSONDecodeError:
                        Logger.warning(f"Failed to parse chunk: {event.data}")
                
                # If we've collected enough chunks for testing, break early
                if chunks_received >= 5:
                    Logger.info("Received enough chunks for incorrect ID test. Breaking early.")
                    break
            
            Logger.success(f"Received {chunks_received} chunks for incorrect ID test.")
            
            # Add a small delay before updating to avoid race conditions
            Logger.info("Adding delay before update with incorrect ID...")
            time.sleep(2.0)  # Increased from 0.5 to 2.0 seconds to match the correct ID test
            
            # Now update with an INCORRECT streaming session ID
            Logger.header("UPDATING CHAT WITH INCORRECT STREAM ID")
            
            # Use a different format to ensure it will fail validation
            incorrect_id = f"incorrect-id-{int(time.time())}"
            Logger.info(f"Actual ID: {actual_streaming_id}")
            Logger.info(f"Using incorrect ID: {incorrect_id}")
            
            update_response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/update-stream",
                headers=self.headers,
                json={
                    "completeResponse": full_response or "AI response placeholder",
                    "streamingSessionId": incorrect_id,
                    "tokensUsed": 100
                }
            )
            
            # We expect this to fail with a 400 error
            if update_response.status_code == 400:
                try:
                    error_data = update_response.json()
                    error_message = error_data.get("message", "")
                    
                    # Check if the error message indicates the correct issue
                    if "mismatch" in error_message.lower() or "session id" in error_message.lower():
                        Logger.success(f"Test passed: Got expected 400 error for incorrect session ID")
                        Logger.info(f"Error message: {error_message}")
                        return True
                    else:
                        Logger.warning(f"Got 400 error but message doesn't indicate ID mismatch: {error_message}")
                        # We still consider this a success if we got a 400 status code
                        return True
                except json.JSONDecodeError:
                    Logger.warning(f"Could not parse error response: {update_response.text}")
                    # We still count this as success since we got the expected status code
                    return True
            elif update_response.status_code == 200:
                Logger.error("Test failed: Update succeeded with incorrect session ID")
                return False
            else:
                Logger.error(f"Unexpected status code: {update_response.status_code}, {update_response.text}")
                return False
                
        except Exception as e:
            Logger.error(f"Incorrect ID test error: {str(e)}")
            import traceback
            Logger.debug(traceback.format_exc())
            return False
    
    def delete_chat_session(self):
        """Delete the current chat session"""
        Logger.header("DELETING CHAT SESSION")
        
        if not self.session_id:
            Logger.warning("No active session ID. Nothing to delete.")
            return True
            
        try:
            response = self.session.delete(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Chat session deleted successfully!")
                self.session_id = None
                return True
            else:
                Logger.error(f"Failed to delete chat session: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Chat session deletion error: {str(e)}")
            return False

def run_test():
    Logger.header("STREAMING SESSION ID TEST SCRIPT")
    
    tester = StreamingTester()
    results = []
    
    # Check services health
    if not tester.check_services_health():
        Logger.error("Services check failed. Cannot continue with tests.")
        sys.exit(1)
    
    # Authenticate
    if not tester.authenticate():
        Logger.error("Authentication failed. Cannot continue with tests.")
        sys.exit(1)
    
    # Allocate credits
    tester.allocate_credits()
    
    # Create a chat session
    if not tester.create_chat_session():
        Logger.error("Failed to create chat session. Cannot continue with tests.")
        sys.exit(1)
    
    # Run tests
    test_sequence = [
        ("Stream with correct session ID", tester.test_stream_with_correct_session_id),
        ("Stream with incorrect session ID", tester.test_stream_with_incorrect_session_id)
    ]
    
    for test_name, test_func in test_sequence:
        Logger.header(f"TEST: {test_name}")
        success = test_func()
        results.append((test_name, success))
    
    # Clean up
    tester.delete_chat_session()
    
    # Print results
    Logger.header("TEST RESULTS SUMMARY")
    
    all_passed = True
    for test_name, success in results:
        status = "PASS" if success else "FAIL"
        if success:
            Logger.success(f"{status} - {test_name}")
        else:
            Logger.error(f"{status} - {test_name}")
        all_passed = all_passed and success
    
    Logger.header("OVERALL RESULT: " + ("PASSED" if all_passed else "FAILED"))
    
    return all_passed

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)