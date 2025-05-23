#!/usr/bin/env python3
import requests
import json
import sys
import time
import traceback
import uuid
import sseclient
from colorama import Fore, Style, init
import unittest

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
    def header(message):
        print(f"\n{Fore.MAGENTA}{'=' * 80}")
        print(f"{Fore.MAGENTA}{message}")
        print(f"{Fore.MAGENTA}{'=' * 80}{Style.RESET_ALL}")

class MessagingTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.headers = {}
        self.session_id = None
        self.streaming_session_id = None
    
    def check_services_health(self):
        """Check if all three services are healthy"""
        Logger.header("CHECKING SERVICES HEALTH")
        
        services = [ 
            {"name": "Auth Service", "url": f"{AUTH_SERVICE_URL.replace('/api', '')}/health"},
            {"name": "Accounting Service", "url": f"{ACCOUNTING_SERVICE_URL.replace('/api', '')}/health"},
            {"name": "Chat Service", "url": f"{CHAT_SERVICE_URL}/health"}
        ]
        
        all_healthy = True
        
        for service in services:
            try:
                Logger.info(f"Checking {service['name']} at {service['url']}...")
                response = self.session.get(service["url"], timeout=5)
                Logger.info(f"Response status: {response.status_code}")
                if response.status_code == 200:
                    try:
                        data = response.json()
                        Logger.success(f"{service['name']} is healthy: {json.dumps(data)}")
                    except json.JSONDecodeError:
                        Logger.success(f"{service['name']} is healthy")
                else:
                    Logger.error(f"{service['name']} returned status code {response.status_code}")
                    Logger.error(f"Response: {response.text}")
                    all_healthy = False
            except requests.RequestException as e:
                Logger.error(f"{service['name']} health check failed: {str(e)}")
                all_healthy = False
        
        if not all_healthy:
            Logger.error("One or more services are not healthy. This may cause test failures.")
            
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
                Logger.success(f"Admin authentication successful")
                return True
            else:
                Logger.error(f"Admin authentication failed: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Admin authentication error: {str(e)}")
            return False
    
    def allocate_credits(self, amount=5000):
        """Allocate credits to the test user"""
        Logger.header("ALLOCATING CREDITS")
        
        if not self.admin_token:
            Logger.error("Admin token not available. Authenticate as admin first.")
            return False
            
        try:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.post(
                f"{ACCOUNTING_SERVICE_URL}/credits/allocate",
                headers=admin_headers,
                json={
                    "userId": TEST_USER["username"],
                    "credits": amount,
                    "expiryDays": 30,
                    "notes": "Test credit allocation"
                }
            )
            
            if response.status_code == 201:
                data = response.json()
                Logger.success(f"Successfully allocated {amount} credits to {TEST_USER['username']}")
                return True
            else:
                Logger.error(f"Credit allocation failed: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Credit allocation error: {str(e)}")
            return False
    
    def allocate_non_streaming_credits(self, amount=20000):
        """Allocate higher amount of credits specifically for non-streaming testing"""
        Logger.header("ALLOCATING CREDITS FOR NON-STREAMING TESTS")
        return self.allocate_credits(amount)
    
    def create_chat_session(self):
        """Create a new chat session"""
        Logger.header("CREATING NEW CHAT SESSION")
        
        try:
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions",
                headers=self.headers,
                json={
                    "title": f"Test Chat Session {int(time.time())}",
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
                Logger.info(json.dumps(data, indent=2))
                
                # Return the first available model for tests
                available_models = [m for m in models if m.get("available", False)]
                if available_models:
                    return available_models[0]["id"]
                else:
                    return None
            else:
                Logger.error(f"Failed to get available models: {response.status_code}, {response.text}")
                return None
                
        except requests.RequestException as e:
            Logger.error(f"Model retrieval error: {str(e)}")
            return None

    def send_non_streaming_message(self, model_id):
        """Send a regular (non-streaming) message with enhanced debugging"""
        Logger.header(f"SENDING NON-STREAMING MESSAGE USING {model_id}")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
        
        # Enhanced logging for request details
        Logger.info(f"Session ID: {self.session_id}")
        Logger.info(f"Model ID: {model_id}")
        Logger.info(f"Headers: {json.dumps(self.headers)}")
        
        # Additional debugging: check user balance before sending message
        try:
            Logger.info("Checking credit balance before sending message...")
            balance_response = requests.get(
                f"{ACCOUNTING_SERVICE_URL}/credits/balance",
                headers=self.headers
            )
            
            if balance_response.status_code == 200:
                balance_data = balance_response.json()
                Logger.info(f"Current credit balance: {json.dumps(balance_data)}")
                
                # Warn if balance is low
                if balance_data.get('totalCredits', 0) < 100:
                    Logger.warning(f"Credit balance is low: {balance_data.get('totalCredits')} credits")
            else:
                Logger.warning(f"Failed to get credit balance: {balance_response.status_code}")
                Logger.info(balance_response.text)
        except Exception as e:
            Logger.warning(f"Error checking credit balance: {str(e)}")
        
        # Try manually checking credits first
        try:
            Logger.info("Manually checking credit availability...")
            # DEBUG.MD_NOTE: Credit Service Integration Issues
            # The debug.md mentions: "Error checking user credits: Request failed with status code 400
            # Message: Missing or invalid required fields" due to sending an empty JSON object `{}`
            # to the accounting service\'s /credits/check endpoint.
            # This specific manual check in the test script *does* send a payload with "userId"
            # and "requiredCredits", which seems correct.
            # The error in debug.md likely refers to an *internal* call made by the chat-service
            # to the accounting-service, which should be investigated in the chat-service codebase.
            # Ensure that all calls to /credits/check include necessary fields like userId, modelId, etc.
            credit_check_response = requests.post(
                f"{ACCOUNTING_SERVICE_URL}/credits/check",
                headers=self.headers,
                json={
                    "userId": TEST_USER["username"], # Corrected payload
                    "requiredCredits": 5 
                }
            )
            
            Logger.info(f"Credit check response status: {credit_check_response.status_code}")
            Logger.info(f"Credit check response: {credit_check_response.text}")
        except Exception as e:
            Logger.warning(f"Error in manual credit check: {str(e)}")
        
        try:
            Logger.info(f"Sending non-streaming message with model {model_id}...")
            req_start_time = time.time()
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/messages",
                headers=self.headers,
                json={
                    "message": "What are the three primary colors?",
                    "modelId": model_id
                },
                timeout=60
            )
            req_duration = time.time() - req_start_time
            
            # Detailed response logging
            Logger.info(f"Request completed in {req_duration:.2f} seconds")
            Logger.info(f"Response status: {response.status_code}")
            Logger.info(f"Response headers: {dict(response.headers)}")
            
            # Log truncated response body (first 500 chars)
            response_text = response.text
            Logger.info(f"Response body (truncated): {response_text[:500]}")
            if len(response_text) > 500:
                Logger.info("Response too long to display in full")
            
            # Enhanced error handling based on status code
            if response.status_code == 200:
                Logger.success(f"Non-streaming message with {model_id} sent successfully!")
                try:
                    data = response.json()
                    Logger.info(json.dumps(data, indent=2))
                    return True
                except json.JSONDecodeError:
                    Logger.warning("Response not in JSON format")
                    return True  # Still consider it a success if status is 200
            elif response.status_code == 402:
                Logger.warning("Message failed due to insufficient credits")
                Logger.info(response.text)
                return False
            else:
                Logger.error(f"Failed to send message: {response.status_code}")
                Logger.info(response.text)
                return False
                
        except requests.exceptions.Timeout:
            Logger.error("Request timed out. The model might be taking too long to respond.")
            return False
        except requests.exceptions.ConnectionError:
            Logger.error("Connection error. The chat service might be overloaded or unreachable.")
            return False
        except requests.RequestException as e:
            Logger.error(f"Message sending error: {str(e)}")
            return False
        except json.JSONDecodeError:
            Logger.error("Failed to parse JSON response from server")
            Logger.info(f"Raw response: {response.text[:200]}...")
            return False
        except Exception as e:
            Logger.error(f"Unexpected error: {str(e)}")
            Logger.error(traceback.format_exc())
            return False
    
    def test_specific_nova_models(self):
        """Test the sendMessage endpoint with specific Nova models"""
        Logger.header("TESTING SPECIFIC NOVA MODELS (NON-STREAMING)")
        
        models_to_test = [
            'amazon.nova-micro-v1:0', # Corrected model ID
            'amazon.nova-lite-v1:0'   # Corrected model ID
        ]
        
        results = {}
        
        for model_id in models_to_test:
            Logger.header(f"TESTING MODEL: {model_id}")
            result = self.send_non_streaming_message(model_id)
            results[model_id] = result
            
            # Add a small delay between requests to avoid rate limiting
            time.sleep(3)
        
        # Print summary
        Logger.header("NOVA MODELS TEST SUMMARY")
        all_passed = True
        for model_id, success in results.items():
            status = "PASS" if success else "FAIL"
            if success:
                Logger.success(f"{status} - {model_id}")
            else:
                Logger.error(f"{status} - {model_id}")
                all_passed = False
        
        return all_passed
    
    def send_streaming_message(self, model_id):
        """Send a streaming message with improved handling for race conditions"""
        Logger.header("SENDING STREAMING MESSAGE TO: " + str(model_id))
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
            
        try:
            response = requests.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/stream",
                headers=self.headers,
                json={
                    "message": "Tell me about artificial intelligence",
                    "modelId": model_id
                },
                stream=True
            )
            
            if response.status_code == 200:
                Logger.success("Streaming response started! Showing chunks...")
                
                # Extract streaming session ID with thorough header checking
                self.streaming_session_id = None
                for header, value in response.headers.items():
                    if header.lower() == 'x-streaming-session-id'.lower():
                        self.streaming_session_id = value
                        Logger.info(f"Streaming session ID: {self.streaming_session_id}")
                        break
                        
                if not self.streaming_session_id:
                    # If not in headers, generate a temporary one
                    self.streaming_session_id = f"stream-{int(time.time())}-{str(id(self))[-8:]}"
                    Logger.info(f"Generated temporary streaming ID: {self.streaming_session_id}")
                
                client = sseclient.SSEClient(response)
                full_response = ""
                chunks_received = 0
                tokens_used = 100  # Default value
                
                for event in client.events():
                    Logger.info(f"Received SSE event: event=\'{event.event}\', data=\'{event.data}\', id=\'{event.id}\', retry=\'{event.retry}\'") # Log all SSE events
                    if event.event == "chunk":
                        try:
                            Logger.info(f"Raw chunk data: {event.data}") # Log raw event data
                            # DEBUG.MD_NOTE: SSE Parsing Errors
                            # "Error parsing SSE chunk: Unexpected token \\ in JSON at position XX". 
                            # This suggests that the JSON strings being sent in the SSE stream from the server 
                            # might contain unescaped characters or be malformed.
                            # This points to a server-side issue in the chat-service when generating SSE chunks.
                            data = json.loads(event.data)
                            text = data.get('text', '')
                            full_response += text
                            chunks_received += 1
                            
                            if chunks_received <= 3:  # Show only first 3 chunks
                                Logger.info(f"Chunk {chunks_received}: {text}")
                        except Exception as e:
                            Logger.warning(f"Failed to parse chunk: {str(e)}")
                    elif event.event == "done":
                        try:
                            data = json.loads(event.data)
                            tokens_used = data.get('tokensUsed', 100)
                            Logger.info(f"Stream complete. Tokens used: {tokens_used}")
                        except Exception as e:
                            Logger.warning(f"Failed to parse done event: {str(e)}")
                            
                    # If we've received enough chunks, break early
                    if chunks_received >= 10:
                        Logger.info("Received enough chunks, finishing test...")
                        break
                
                Logger.success(f"Received {chunks_received} chunks. Total response length: {len(full_response)}")
                
                # Add delay to prevent race conditions - allow server to process streaming session
                Logger.info("Adding delay to allow server processing...")
                time.sleep(2)
                
                # Update the stream response with retry mechanism
                max_retries = 3
                for attempt in range(max_retries):
                    Logger.info(f"Updating chat with stream response (Attempt {attempt+1}/{max_retries})...")
                    
                    try:
                        update_response = self.session.post(
                            f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/update-stream",
                            headers=self.headers,
                            json={
                                "completeResponse": full_response or "AI response placeholder",
                                "streamingSessionId": self.streaming_session_id,
                                "tokensUsed": tokens_used
                            }
                        )
                        
                        if update_response.status_code == 200:
                            Logger.success("Stream response updated successfully!")
                            Logger.info(json.dumps(update_response.json(), indent=2))
                            return True
                        elif update_response.status_code == 400 and "mismatch" in update_response.text.lower():
                            # This indicates a streaming session ID mismatch - might be a race condition
                            if attempt < max_retries - 1:
                                Logger.warning(f"Session ID mismatch. Retrying in {(attempt+1)*2} seconds...")
                                time.sleep((attempt+1) * 2)  # Progressive backoff
                            else:
                                Logger.error("All attempts failed due to session ID mismatch")
                                return False
                        else:
                            Logger.error(f"Failed to update stream response: {update_response.status_code}, {update_response.text}")
                            if attempt < max_retries - 1:
                                Logger.info(f"Retrying in {(attempt+1)} seconds...")
                                time.sleep(attempt + 1)
                            else:
                                return False
                    except Exception as e:
                        Logger.error(f"Stream update error: {str(e)}")
                        if attempt < max_retries - 1:
                            time.sleep(attempt + 1)
                        else:
                            return False
                    
                return False  # All retries failed
                    
            elif response.status_code == 402:
                Logger.warning("Streaming message failed due to insufficient credits")
                Logger.info(response.text)
                return False
            else:
                Logger.error(f"Failed to start streaming: {response.status_code}, {response.text}")
                return False
                
        except Exception as e:
            Logger.error(f"Streaming error: {str(e)}")
            import traceback
            Logger.warning(traceback.format_exc())
            return False
    
    def delete_chat_session(self):
        """Delete the current chat session"""
        Logger.header("DELETING CHAT SESSION")
        
        if not self.session_id:
            Logger.error("No active session ID. Nothing to delete.")
            return False
            
        try:
            response = self.session.delete(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Chat session deleted successfully!")
                Logger.info(json.dumps(data, indent=2))
                self.session_id = None
                return True
            else:
                Logger.error(f"Failed to delete chat session: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Chat session deletion error: {str(e)}")
            return False
    
    def get_api_version(self):
        """Get the API version from the /api/version endpoint"""
        Logger.header("GETTING API VERSION")
        
        try:
            response = self.session.get(f"{CHAT_SERVICE_URL}/version")
            
            if response.status_code == 200:
                Logger.success(f"API version retrieved successfully")
                Logger.info(f"API Version: {response.text}")
                return response.text
            else:
                Logger.error(f"Failed to get API version: {response.status_code}, {response.text}")
                return None
                
        except requests.RequestException as e:
            Logger.error(f"API version retrieval error: {str(e)}")
            return None

def run_test():
    Logger.header("CHAT MESSAGE SENDING TEST SCRIPT")
    
    tester = MessagingTester()
    results = []
    
    # Check services health
    if not tester.check_services_health():
        Logger.error("Services check failed. Cannot continue with tests.")
        sys.exit(1)
    
    # Authenticate users
    if not tester.authenticate():
        Logger.error("Test user authentication failed. Cannot continue with tests.")
        sys.exit(1)
        
    if not tester.authenticate_admin():
        Logger.warning("Admin authentication failed. Some tests may fail.")
    
    # Allocate more credits specifically for non-streaming tests
    tester.allocate_non_streaming_credits()
    
    # Create a new chat session
    if not tester.create_chat_session():
        Logger.error("Failed to create chat session. Cannot continue with tests.")
        sys.exit(1)
    
    # Get available models
    model_id = tester.get_available_models()
    if not model_id:
        Logger.error("Failed to retrieve available models. Using default model.")
        model_id = "amazon.titan-text-express-v1"
    
    Logger.info(f"Using model: {model_id} for testing")
    
    # Test the specific Nova models as requested
    nova_test_result = tester.test_specific_nova_models()
    results.append(("Test Nova models (non-streaming)", nova_test_result))
    
    # Run the regular tests
    test_sequence = [
        ("Send non-streaming message with default model", lambda: tester.send_non_streaming_message(model_id)),
        ("Send streaming message with default model", lambda: tester.send_streaming_message(model_id))
    ]
    
    # Execute tests
    for test_name, test_func in test_sequence:
        Logger.header(f"TEST: {test_name}")
        success = test_func()
        results.append((test_name, success))
    
    # Clean up resources
    tester.delete_chat_session()
    
    # Get and display API version at the end
    api_version = tester.get_api_version()
    
    # Print test results summary
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
    
    if api_version:
        Logger.info(f"Chat Service API Version: {api_version}")
    
    return all_passed

def test_nova_models_only():
    """Run only the Nova models test"""
    Logger.header("NOVA MODELS TEST SCRIPT")
    
    tester = MessagingTester()
    
    # Check services health
    if not tester.check_services_health():
        Logger.error("Services check failed. Cannot continue with tests.")
        sys.exit(1)
    
    # Authenticate
    if not tester.authenticate():
        Logger.error("Test user authentication failed. Cannot continue with tests.")
        sys.exit(1)
        
    if not tester.authenticate_admin():
        Logger.warning("Admin authentication failed. Some tests may fail.")
    
    # Allocate credits
    tester.allocate_non_streaming_credits(30000)
    
    # Create session
    if not tester.create_chat_session():
        Logger.error("Failed to create chat session. Cannot continue with tests.")
        sys.exit(1)
    
    # Run Nova models test
    success = tester.test_specific_nova_models()
    
    # Clean up
    tester.delete_chat_session()
    
    # Get and display API version at the end
    api_version = tester.get_api_version()
    
    # Print result
    if success:
        Logger.success("NOVA MODELS TEST: PASSED")
    else:
        Logger.error("NOVA MODELS TEST: FAILED")
    
    if api_version:
        Logger.info(f"Chat Service API Version: {api_version}")
    
    return success

# Unit test class for sending messages
class TestSendMessages(unittest.TestCase):

    def test_create_session_and_send_initial_message(self):
        """
        Tests creating a new chat session and sending an initial message.
        This test includes placeholder authentication headers. For the userId validation
        error to be resolved, the chat-service must be able to validate the
        auth_token and derive a userId from it.
        """
        # Placeholder for obtaining a valid token and user ID.
        # In a real test environment, this token would be dynamically generated
        # or retrieved from a secure configuration.
        auth_token = "FAKE_TOKEN_PLACEHOLDER"
        
        # The session.controller.ts uses req.headers['x-user-id'] for 'username',
        # while 'userId' is expected to come from req.user.userId (populated by auth middleware from the token).
        user_id_header_for_username = "test_user_from_python" 

        headers = {
            "Authorization": f"Bearer {auth_token}",
            "X-User-ID": user_id_header_for_username, 
            "Content-Type": "application/json"
        }

        session_payload = {
            "title": "Test Session from Python Script",
            "initialMessage": "Hello, this is an initial message from test_send_messages.py!"
            # "modelId": "your_default_model_id_here" # Optional: specify a modelId if needed
        }

        print(f"Attempting to create chat session at {CHAT_SERVICE_BASE_URL}/sessions with payload: {json.dumps(session_payload)} and headers: {headers}")

        try:
            # Endpoint for creating a chat session is typically /sessions
            response = requests.post(
                f"{CHAT_SERVICE_BASE_URL}/sessions", # Assuming this is the endpoint from chat-service routes
                headers=headers,
                data=json.dumps(session_payload),
                timeout=10 # Adding a timeout for the request
            )

            print(f"Response Status Code: {response.status_code}")
            print(f"Response Body: {response.text}")

            # Check if the session was created successfully (HTTP 201 Created)
            self.assertEqual(response.status_code, 201, 
                             f"Failed to create session. Status: {response.status_code}, Body: {response.text}")
            
            response_data = response.json()
            self.assertIn("sessionId", response_data, 
                          "The 'sessionId' was not found in the response after creating a session.")
            
            session_id = response_data["sessionId"]
            print(f"Successfully created chat session with ID: {session_id}")

            # Placeholder for further tests:
            # For example, sending more messages to the created session_id
            # message_payload = {
            #     "message": "This is a follow-up message."
            # }
            # message_response = requests.post(
            #     f"{CHAT_SERVICE_BASE_URL}/sessions/{session_id}/messages", # Assuming endpoint structure
            #     headers=headers,
            #     data=json.dumps(message_payload)
            # )
            # self.assertEqual(message_response.status_code, 200, "Failed to send follow-up message.")
            # print(f"Successfully sent follow-up message to session {session_id}")


        except requests.exceptions.HTTPError as http_err:
            self.fail(f"HTTP error occurred during chat session creation: {http_err} - Response: {http_err.response.text if http_err.response else 'No response'}")
        except requests.exceptions.ConnectionError as conn_err:
            self.fail(f"Connection error occurred: Could not connect to {CHAT_SERVICE_BASE_URL}/sessions. Ensure chat-service is running. Error: {conn_err}")
        except requests.exceptions.Timeout as timeout_err:
            self.fail(f"Request timed out: {timeout_err}")
        except requests.exceptions.RequestException as req_err:
            self.fail(f"An unexpected request error occurred during chat session creation: {req_err}")
        except json.JSONDecodeError as json_err:
            self.fail(f"Failed to decode JSON response: {json_err}. Response text: {response.text if 'response' in locals() else 'No response object'}")
        except Exception as e:
            self.fail(f"An unexpected error occurred in the test: {e}")

if __name__ == "__main__":
    # Check if we should run only the Nova models test
    if len(sys.argv) > 1 and sys.argv[1] == "--nova-only":
        success = test_nova_models_only()
    else:
        success = run_test()
    
    sys.exit(0 if success else 1)

    # This allows running the test directly from the command line
    unittest.main()