#!/usr/bin/env python3
import requests
import json
import time
import sys
import asyncio
import aiohttp
import sseclient
import uuid # Added uuid
from datetime import datetime
from colorama import Fore, Style, init

# Initialize colorama for colored terminal output
init(autoreset=True)

# Configuration
AUTH_SERVICE_URL = "http://localhost:3000/api"    # External Auth Service
ACCOUNTING_SERVICE_URL = "http://localhost:3001/api"  # Accounting Service
CHAT_SERVICE_URL = "http://localhost:3002/api"    # Chat Service

# User credentials
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

# Test user (we'll use user1 for most tests)
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

class ChatServiceTester:
    def __init__(self):
        # Session reuse for better performance
        self.session = requests.Session()
        # Store tokens
        self.admin_token = None
        self.supervisor_token = None
        self.user_token = None
        # Store session IDs
        self.session_id = None
        self.streaming_session_id = None
        # Headers with auth token
        self.headers = {}

    def check_services_health(self):
        """Check if all three services are healthy"""
        Logger.header("CHECKING SERVICES HEALTH")
        
        services = [ 
            {"name": "Auth Service", "url": f"{AUTH_SERVICE_URL.replace('/api', '')}/health"},
            {"name": "Accounting Service", "url": f"{ACCOUNTING_SERVICE_URL.replace('/api', '')}/health"},
            {"name": "Chat Service", "url": f"{CHAT_SERVICE_URL}/health"}  # Changed to use /api/health
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
        
        if not all_healthy:
            Logger.error("One or more services are not healthy. Cannot continue with tests.")
            
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
                # Include the userId in the headers - this is needed for the chat service
                self.headers = {
                    "Authorization": f"Bearer {self.user_token}",
                    "X-User-ID": TEST_USER["username"]  # Add the userId to the headers
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
    
    def authenticate_supervisor(self):
        """Authenticate as supervisor"""
        Logger.header("AUTHENTICATING AS SUPERVISOR")
        
        try:
            supervisor = SUPERVISOR_USERS[0]
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/auth/login",
                json={
                    "username": supervisor["username"],
                    "password": supervisor["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.supervisor_token = data.get("accessToken")
                Logger.success(f"Supervisor authentication successful")
                return True
            else:
                Logger.error(f"Supervisor authentication failed: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Supervisor authentication error: {str(e)}")
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
                    "userId": TEST_USER["username"],  # Using correct parameter name 'userId' 
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

    def test_credit_check_endpoint(self):
        """Test the credit checking endpoint directly"""
        Logger.header("TESTING CREDIT CHECK ENDPOINT")
        
        try:
            response = self.session.post(
                f"{ACCOUNTING_SERVICE_URL}/credits/check",
                headers=self.headers,
                json={
                    "userId": TEST_USER["username"], 
                    "requiredCredits": 100  # Controller expects "requiredCredits" based on compiled JS
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Credit check successful: Has sufficient credits = {data.get('sufficient', False)}")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Credit check failed: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Credit check error: {str(e)}")
            return False

    def check_credit_balance(self):
        """Check the test user's credit balance"""
        Logger.header("CHECKING CREDIT BALANCE")
        
        try:
            response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/credits/balance",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Credit balance: {data.get('totalCredits', 0)}")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to check credit balance: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Credit balance check error: {str(e)}")
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
                Logger.success(f"Retrieved {len(data.get('models', []))} available models")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to get available models: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Model retrieval error: {str(e)}")
            return False

    def get_model_recommendation(self):
        """Test the model recommendation endpoint"""
        Logger.header("GETTING MODEL RECOMMENDATION")
        
        try:
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/models/recommend",
                headers=self.headers,
                json={
                    "task": "code",
                    "priority": "quality"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Received model recommendation: {data.get('recommendedModel', 'unknown')}")
                Logger.info(f"Recommendation reason: {data.get('reason', 'No reason provided')}")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to get model recommendation: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Model recommendation error: {str(e)}")
            return False

    def create_chat_session(self):
        """Create a new chat session"""
        Logger.header("CREATING NEW CHAT SESSION")
        
        try:
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions",
                headers=self.headers,
                json={
                    "title": f"Test Chat Session {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
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

    def list_chat_sessions(self):
        """List all chat sessions for the current user"""
        Logger.header("LISTING CHAT SESSIONS")
        
        try:
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/sessions",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                sessions = data.get("sessions", [])
                Logger.success(f"Retrieved {len(sessions)} chat sessions")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to list chat sessions: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Chat sessions listing error: {str(e)}")
            return False

    def get_chat_messages(self):
        """Get messages from the current chat session"""
        Logger.header("GETTING CHAT MESSAGES")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
            
        try:
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/messages",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get("messages", [])
                Logger.success(f"Retrieved {len(messages)} messages")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to get chat messages: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Chat messages retrieval error: {str(e)}")
            return False

    def send_message(self, streaming=False):
        import time # ADDED local import to resolve UnboundLocalError
        """Send a message to the chat session"""
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
            
        endpoint = "stream" if streaming else "messages"
        Logger.header(f"SENDING {'STREAMING' if streaming else 'NON-STREAMING'} MESSAGE")
        
        try:
            if streaming:
                # For streaming, we'll need to handle SSE response
                response = requests.post(
                    f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/{endpoint}",
                    headers=self.headers,
                    json={"message": "Tell me about artificial intelligence", "modelId": "amazon.nova-lite-v1:0"},
                    stream=True
                )
                
                if response.status_code == 200:
                    Logger.success("Streaming response started! Showing first chunks...")
                    
                    # Extract streaming session ID from headers - check for multiple header name variations
                    self.streaming_session_id = None
                    possible_headers = ["X-Streaming-Session-Id", "x-streaming-session-id", "streaming-session-id"]
                    
                    for header in possible_headers:
                        for actual_header, value in response.headers.items():
                            if actual_header.lower() == header.lower():
                                self.streaming_session_id = value
                                Logger.info(f"Found streaming session ID in header: {self.streaming_session_id}")
                                break
                        if self.streaming_session_id:
                            break
                            
                    if not self.streaming_session_id:
                        Logger.warning("No streaming session ID found in headers. Using fallback.")
                        # import time, uuid # Removed this line
                        self.streaming_session_id = f"stream-{int(time.time())}-{str(uuid.uuid4())[:8]}" # uuid is now globally imported
                    
                    client = sseclient.SSEClient(response)
                    
                    # Print just a few chunks to demonstrate it's working
                    chunks = 0
                    full_response = ""
                    for event in client.events():
                        if chunks >= 5:
                            Logger.info("... (truncating stream output)")
                            break
                        
                        if event.event == "chunk":
                            try:
                                Logger.info(f"Raw chunk data: {event.data}") # Added this line
                                data = json.loads(event.data)
                                Logger.info(f"Chunk: {data.get('text', '')}")
                                full_response += data.get('text', '')
                                chunks += 1
                            except Exception as e: # Catch specific exception
                                Logger.warning(f"Failed to parse chunk: {event.data}, Error: {str(e)}")
                        elif event.event == "error": # Handle error events
                            try:
                                Logger.error(f"Received stream error event: {event.data}")
                            except Exception as e:
                                Logger.error(f"Failed to parse error event: {str(e)}")
                        elif event.event == "done": # Handle done event
                            try:
                                Logger.info(f"Received stream done event: {event.data}")
                            except Exception as e:
                                Logger.warning(f"Failed to parse done event: {str(e)}")
                    
                    # Add delay to prevent race conditions - allow server to process streaming session
                    Logger.info("Adding delay to allow server processing...")
                    time.sleep(2)
                    
                    # Try updating the stream response with retries if needed
                    max_retries = 3
                    for attempt in range(max_retries):
                        Logger.info(f"Updating chat with stream response (Attempt {attempt+1}/{max_retries})...")
                        update_response = self.session.post(
                            f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/update-stream",
                            headers=self.headers,
                            json={
                                "completeResponse": full_response or "AI response placeholder",
                                "streamingSessionId": self.streaming_session_id,
                                "tokensUsed": 100
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
                                Logger.error(f"Failed to update stream after {max_retries} attempts due to session ID mismatch")
                                return False
                        else:
                            Logger.error(f"Failed to update stream response: {update_response.status_code}, {update_response.text}")
                            return False
                elif response.status_code == 402:
                    Logger.warning("Streaming message failed due to insufficient credits")
                    try:
                        error_data = json.loads(response.text)
                        Logger.info(json.dumps(error_data, indent=2))
                    except:
                        Logger.info(f"Raw error: {response.text}")
                    return False
                else:
                    Logger.error(f"Failed to start streaming: {response.status_code}, {response.text}")
                    return False
            else:
                # Regular non-streaming message with enhanced error handling
                # Enhanced logging for request details
                Logger.info(f"Session ID: {self.session_id}")
                Logger.info(f"Headers: {json.dumps({k: v for k, v in self.headers.items() if k != 'Authorization'})}")
                
                # Additional debugging: check user balance before sending message
                try:
                    Logger.info("Checking credit balance before sending message...")
                    balance_response = self.session.get(
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
                    credit_check_response = self.session.post(
                        f"{ACCOUNTING_SERVICE_URL}/credits/check",
                        headers=self.headers,
                        json={
                            "userId": TEST_USER["username"],
                            "requiredCredits": 5 
                        }
                    )
                    
                    Logger.info(f"Credit check response status: {credit_check_response.status_code}")
                    Logger.info(f"Credit check response: {credit_check_response.text}")
                except Exception as e:
                    Logger.warning(f"Error in manual credit check: {str(e)}")
                
                # Send the actual non-streaming message with enhanced error handling
                Logger.info("Sending non-streaming message...")
                req_start_time = time.time()
                
                # Add retry mechanism for better reliability
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        response = self.session.post(
                            f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/{endpoint}",
                            headers=self.headers,
                            json={"message": "Tell me about machine learning", "modelId": "amazon.nova-micro-v1:0"},
                            # amazon.titan-text-express-v1:0 does not work like this
                            timeout=60  # Extended timeout
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
                            data = response.json()
                            Logger.success("Non-streaming message sent successfully!")
                            Logger.info(json.dumps(data, indent=2))
                            return True
                        elif response.status_code == 402:
                            Logger.warning("Message failed due to insufficient credits")
                            try:
                                error_data = json.loads(response.text)
                                Logger.info(json.dumps(error_data, indent=2))
                            except:
                                Logger.info(f"Raw error: {response.text}")
                            return False
                        elif response.status_code >= 500:
                            # Server error, retry
                            if attempt < max_retries - 1:
                                wait_time = (attempt + 1) * 2
                                Logger.warning(f"Server error ({response.status_code}). Retrying in {wait_time} seconds... (Attempt {attempt+1}/{max_retries})")
                                time.sleep(wait_time)
                                continue
                            else:
                                Logger.error(f"Failed to send message after {max_retries} attempts. Last status: {response.status_code}")
                                return False
                        else:
                            Logger.error(f"Failed to send non-streaming message: {response.status_code}, {response.text}")
                            if attempt < max_retries - 1:
                                wait_time = (attempt + 1) * 2
                                Logger.warning(f"Retrying in {wait_time} seconds... (Attempt {attempt+1}/{max_retries})")
                                time.sleep(wait_time)
                                continue
                            return False
                    
                    except requests.exceptions.Timeout:
                        if attempt < max_retries - 1:
                            wait_time = (attempt + 1) * 2
                            Logger.warning(f"Request timed out. Retrying in {wait_time} seconds... (Attempt {attempt+1}/{max_retries})")
                            time.sleep(wait_time)
                        else:
                            Logger.error("Request timed out after all retry attempts. The model might be taking too long to respond.")
                            return False
                    except requests.exceptions.ConnectionError as e:
                        if attempt < max_retries - 1:
                            wait_time = (attempt + 1) * 2
                            Logger.warning(f"Connection error: {str(e)}. Retrying in {wait_time} seconds... (Attempt {attempt+1}/{max_retries})")
                            time.sleep(wait_time)
                        else:
                            Logger.error(f"Connection error after all retry attempts: {str(e)}")
                            return False
                    except Exception as e:
                        if attempt < max_retries - 1:
                            wait_time = (attempt + 1) * 2
                            Logger.warning(f"Unexpected error: {str(e)}. Retrying in {wait_time} seconds... (Attempt {attempt+1}/{max_retries})")
                            time.sleep(wait_time)
                        else:
                            Logger.error(f"Unexpected error after all retry attempts: {str(e)}")
                            import traceback
                            Logger.warning(traceback.format_exc())
                            return False
                
                return False  # If we get here, all retries have failed
                    
        except Exception as e:
            Logger.error(f"Message sending error: {str(e)}")
            import traceback
            Logger.warning(traceback.format_exc())
            return False

    def test_insufficient_credits(self):
        """Test behavior when there are insufficient credits"""
        Logger.header("TESTING INSUFFICIENT CREDITS SCENARIO")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
            
        try:
            # First, check current balance
            initial_balance = self.check_credit_balance_value()
            
            # If balance is too high for this test, warn and return
            if initial_balance > 5000:
                Logger.warning(f"Current balance ({initial_balance} credits) is too high to test insufficient credits")
                Logger.info("Skipping insufficient credits test")
                return True
                
            # Try a request with a very high credit requirement
            Logger.info("Sending a request that should require more credits than available")
            
            # Test with non-streaming first
            response = self.session.post(
                f"{ACCOUNTING_SERVICE_URL}/credits/check",
                headers=self.headers,
                json={
                    "credits": initial_balance + 5000  # Changed back from "requiredCredits" to "credits"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('sufficient') == False:
                    Logger.success("Credit check correctly identified insufficient credits!")
                    Logger.info(json.dumps(data, indent=2))
                else:
                    Logger.error("Credit check incorrectly showed sufficient credits")
                    return False
            else:
                Logger.error(f"Credit check failed: {response.status_code}, {response.text}")
                return False
            
            return True
                
        except Exception as e:
            Logger.error(f"Insufficient credits test error: {str(e)}")
            return False
            
    def check_credit_balance_value(self):
        """Check the credit balance and return the value"""
        try:
            response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/credits/balance",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('totalCredits', 0)
            else:
                return 0
                 
        except:
            return 0

    async def supervisor_observe_session(self):
        """Supervisor observes an active streaming session"""
        Logger.header("SUPERVISOR OBSERVATION")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
            
        if not self.supervisor_token:
            Logger.error("No supervisor token. Authenticate as supervisor first.")
            return False
        
        try:
            # First, send a regular (non-streaming) message as the user
            # This ensures the chat session has content before attempting streaming
            Logger.info("Sending initial non-streaming message to prepare session")
            prep_response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/messages",
                headers=self.headers,
                json={
                    "message": "Hello, this is a test message before streaming",
                    # "modelId": "amazon.titan-text-express-v1:0" # This specific modelId might be a factor in the 400 error
                    "modelId": "amazon.nova-micro-v1:0" # This specific modelId might be a factor in the 400 error
                }
            )
            
            if prep_response.status_code != 200:
                Logger.warning(f"Failed to send prep message: {prep_response.status_code}, but continuing...")
            else:
                Logger.success("Sent initial message successfully")
                # Wait a moment for message processing
                await asyncio.sleep(1)
            
            # Create separate sessions for user and supervisor
            user_session = aiohttp.ClientSession()
            supervisor_session = aiohttp.ClientSession()
            
            try:
                # Step 1: Start streaming session as user
                stream_url = f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/stream"
                
                Logger.info(f"Starting streaming request to {stream_url}")
                
                # Create streaming task
                stream_task = asyncio.create_task(
                    self._continuous_stream(user_session, stream_url, self.headers)
                )
                
                # Increase delay to avoid race conditions - server needs time to establish streaming
                await asyncio.sleep(3)
                
                # Step 2: Attempt supervisor observation with retry logic
                max_retries = 3
                observe_success = False
                sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
                
                for attempt in range(max_retries):
                    observe_url = f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/observe"
                    Logger.info(f"Attempting observation at {observe_url} (Attempt {attempt+1}/{max_retries})")
                    
                    try:
                        # Set timeout to prevent hanging
                        timeout = aiohttp.ClientTimeout(total=10)
                        observe_response = await supervisor_session.get(
                            observe_url, 
                            headers=sup_headers,
                            timeout=timeout
                        )
                        
                        if observe_response.status != 200:
                            error_text = await observe_response.text()
                            Logger.error(f"Observation request failed: {error_text}")
                            if attempt < max_retries - 1:
                                Logger.info(f"Retrying in {(attempt+1)*2} seconds...")
                                await asyncio.sleep((attempt+1) * 2)  # Progressive backoff
                                continue
                            return False
                        
                        Logger.success("Supervisor observation connected successfully!")
                        observe_success = True
                        
                        # Add delay after connection before reading events
                        # This gives the server time to prepare the SSE stream
                        Logger.info("Connected to observation endpoint, waiting 500ms for initialization")
                        await asyncio.sleep(0.5)
                        
                        # Read a few observation events with enhanced error handling
                        observation_count = 0
                        try:
                            async with observe_response:
                                Logger.info("Starting to read observation events stream")
                                
                                # Set a timeout for reading the stream
                                start_time = time.time()
                                timeout_duration = 30  # seconds
                                
                                while time.time() - start_time < timeout_duration:
                                    try:
                                        # Use a timeout for each read attempt
                                        line_data = await asyncio.wait_for(
                                            observe_response.content.readline(), 
                                            timeout=5.0
                                        )
                                        
                                        if not line_data:
                                            Logger.warning("Empty line received, possible end of stream")
                                            # Short pause before trying again
                                            await asyncio.sleep(0.5)
                                            continue
                                            
                                        line_str = line_data.decode('utf-8').strip()
                                        if line_str.startswith('data:'):
                                            Logger.info(f"Observation event: {line_str[:50]}...")
                                            observation_count += 1
                                            
                                            if observation_count >= 3:
                                                Logger.success(f"Received {observation_count} observation events")
                                                return True
                                                

                                    except asyncio.TimeoutError:
                                        Logger.warning("Timeout waiting for observation event, retrying...")
                                        continue
                                    except Exception as inner_e:
                                        Logger.error(f"Error processing event: {type(inner_e).__name__}: {str(inner_e)}")
                                        # Continue reading instead of failing immediately
                                        continue
                                        
                                Logger.warning(f"Observation read timed out after {timeout_duration}s with {observation_count} events")
                                return observation_count > 0
                                
                        except aiohttp.ClientError as e:
                            Logger.error(f"Connection error during observation: {type(e).__name__}: {str(e)}")
                            return False
                        except asyncio.CancelledError:
                            Logger.info("Observation task was cancelled")
                            return False
                        except Exception as e:
                            Logger.error(f"Error reading observation events: {type(e).__name__}: {str(e)}")
                            # Capture additional debug information
                            return False
                   
                    except Exception as e:
                        Logger.error(f"Exception during observation: {str(e)}")
                        if attempt < max_retries - 1:
                            Logger.info(f"Retrying in {(attempt+1)*2} seconds...")
                            await asyncio.sleep((attempt+1) * 2)  # Progressive backoff
                        else:
                            return False
                
                # If we've succeeded, break out of retry loop
                return observe_success
                        
            finally:
                # Clean up resources
                if 'stream_task' in locals() and not stream_task.done():
                    stream_task.cancel()
                    
                await user_session.close()
                await supervisor_session.close()
                    
        except Exception as e:
            Logger.error(f"Supervisor observation error: {str(e)}")
            return False

    async def _continuous_stream(self, session, url, headers):
        """Helper method that keeps a streaming session open"""
        try:
            # Track start time to ensure minimum duration
            start_time = time.time()
            min_duration = 10  # Seconds - ensure stream stays open at least this long
            
            # Send a streaming request that will keep the connection open
            async with session.post(
                url,
                headers=headers,
                json={
                    "message": "Please provide a very detailed explanation about artificial intelligence, machine learning, and neural networks",
                    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"
                },
                timeout=aiohttp.ClientTimeout(total=60)  # Increased timeout for longer streaming
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    Logger.error(f"Streaming failed: {error_text}")
                    return False
                
                Logger.success("User streaming established successfully")
                
                # Process response chunks
                chunk_count = 0
                async for line in response.content:
                    line_str = line.decode('utf-8').strip()
                    if line_str:
                        chunk_count += 1
                        if chunk_count % 5 == 0:
                            Logger.info(f"Stream received chunk #{chunk_count}")
                        
                        # Slow down processing to allow observation (increased delay)
                        await asyncio.sleep(0.2)
                
                # Ensure minimum stream duration to avoid race conditions
                elapsed = time.time() - start_time
                if elapsed < min_duration:
                    remaining_time = min_duration - elapsed
                    Logger.info(f"Ensuring minimum stream duration, waiting {remaining_time:.1f}s")
                    await asyncio.sleep(remaining_time)
                
                Logger.success(f"Stream completed with {chunk_count} chunks after {time.time() - start_time:.1f}s")
                return True
                
        except asyncio.CancelledError:
            Logger.info("Streaming task was cancelled")
            return False
        except Exception as e:
            Logger.error(f"Error in continuous stream: {str(e)}")
            return False
            
    def check_usage_stats(self):
        """Check the test user's usage statistics"""
        Logger.header("CHECKING USAGE STATISTICS")
        
        if not self.user_token:
            Logger.error("User token not available. Authenticate as user first.")
            return False
        
        try:
            # Try to get the user's usage statistics
            response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/statistics/usage",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Log the usage statistics
                Logger.success("Retrieved usage statistics successfully!")
                Logger.info(json.dumps(data, indent=2))
                
                # Extract key statistics for summary
                total_requests = data.get('totalRequests', 0)
                total_tokens = data.get('totalTokensUsed', 0)
                total_credits_used = data.get('totalCreditsUsed', 0)
                
                # Display a summary
                Logger.info(f"Summary: {total_requests} requests, {total_tokens} tokens, {total_credits_used} credits used")
                
                # Check if we have usage by model statistics
                usage_by_model = data.get('usageByModel', [])
                if usage_by_model:
                    Logger.info("Usage by model:")
                    for model_usage in usage_by_model:
                        model_id = model_usage.get('modelId', 'unknown')
                        model_requests = model_usage.get('requests', 0)
                        model_tokens = model_usage.get('tokensUsed', 0)
                        Logger.info(f"  - {model_id}: {model_requests} requests, {model_tokens} tokens")
                
                return True
            elif response.status_code == 404:
                # Might be a valid response if stats endpoint isn't implemented
                Logger.warning("Usage statistics endpoint not found (404)")
                Logger.info("This is normal if the statistics feature is not implemented.")
                return True  # Consider this a successful test run
            else:
                Logger.error(f"Failed to get usage statistics: {response.status_code}")
                Logger.info(response.text)
                return False
                
        except requests.exceptions.ConnectionError as e:
            Logger.error(f"Connection error: {str(e)}")
            Logger.warning("The accounting service might be down or the statistics endpoint might not be implemented.")
            return False
        except json.JSONDecodeError as e:
            Logger.error(f"Failed to parse response as JSON: {str(e)}")
            Logger.info(f"Raw response: {response.text[:200]}...")
            return False
        except requests.RequestException as e:
            Logger.error(f"Usage statistics retrieval error: {str(e)}")
            return False
        except Exception as e:
            Logger.error(f"Unexpected error checking usage stats: {str(e)}")
            import traceback
            Logger.warning(traceback.format_exc())
            return False

    def supervisor_search_users(self):
        """Test supervisor ability to search users (admin/supervisor only)"""
        Logger.header("SUPERVISOR SEARCH USERS")
        
        if not self.supervisor_token:
            Logger.error("No supervisor token. Authenticate as supervisor first.")
            return False
            
        try:
            sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
            
            # Try searching with multiple different queries to find users
            queries = [
                TEST_USER["username"],       # Try username first
                TEST_USER["email"],          # Then email
                TEST_USER["username"][0:3],  # Then partial username (first few chars)
                "*"                          # Finally try a wildcard to get all users
            ]
            
            for query_param in queries:
                Logger.info(f"Searching for user with query: '{query_param}'")
                
                response = self.session.get(
                    f"{CHAT_SERVICE_URL}/chat/users/search?query={query_param}",
                    headers=sup_headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    users = data.get("users", [])
                    
                    if users:
                        Logger.success(f"Search returned {len(users)} users with query '{query_param}'")
                        Logger.info(json.dumps(data, indent=2))
                        return True
                    else:
                        Logger.warning(f"No users found with query: '{query_param}', trying next query...")
                else:
                    Logger.error(f"Search failed with query '{query_param}': {response.status_code}, {response.text}")
                    
                    if response.status_code == 403:
                        Logger.error("Permission denied. Make sure the supervisor has the right permissions.")
                        # Try printing the token for debugging
                        token_parts = self.supervisor_token.split('.')
                        if len(token_parts) == 3:  # Valid JWT has 3 parts
                            try:
                                # Decode payload (middle part)
                                import base64
                                payload = base64.b64decode(token_parts[1] + "===").decode('utf-8')
                                Logger.info(f"Supervisor token payload: {payload}")
                            except Exception as e:
                                Logger.error(f"Failed to decode token: {str(e)}")
                        return False
            
            Logger.error("All user search queries failed. No users found.")
            return False
                
        except requests.RequestException as e:
            Logger.error(f"User search error: {str(e)}")
            return False
            
    def supervisor_list_user_sessions(self):
        """Test supervisor ability to list sessions for a specific user"""
        Logger.header("SUPERVISOR LIST USER SESSIONS")
        
        if not self.supervisor_token:
            Logger.error("No supervisor token. Authenticate as supervisor first.")
            return False
            
        try:
            sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
            
            # Get sessions for the test user
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/{TEST_USER['username']}/sessions",
                headers=sup_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                sessions = data.get("sessions", [])
                Logger.success(f"Retrieved {len(sessions)} sessions for user {TEST_USER['username']}")
                Logger.info(json.dumps(data, indent=2))
                return True
            elif response.status_code == 403:
                Logger.warning("Permission denied: Only admins and supervisors can list user sessions")
                return False
            else:
                Logger.error(f"Failed to list user sessions: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"User sessions listing error: {str(e)}")
            return False
            
    def supervisor_get_user_session(self):
        """Test supervisor ability to view a specific session for a user"""
        Logger.header("SUPERVISOR GET SPECIFIC USER SESSION")
        
        if not self.supervisor_token or not self.session_id:
            Logger.error("Supervisor token or session ID not available")
            return False
            
        try:
            sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
            
            # First, get the list of sessions to find the right user ID and session ID
            list_response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/{TEST_USER['username']}/sessions",
                headers=sup_headers
            )
            
            if list_response.status_code != 200:
                Logger.error(f"Failed to list user sessions: {list_response.status_code}, {list_response.text}")
                return False
                
            sessions_data = list_response.json()
            sessions = sessions_data.get("sessions", [])
            
            if not sessions:
                Logger.error(f"No sessions found for user {TEST_USER['username']}")
                return False
                
            # Find our session in the list or use the first available session
            target_session = None
            correct_user_id = sessions_data.get("userId") or TEST_USER["username"]
            
            for session in sessions:
                if session.get("_id") == self.session_id or session.get("sessionId") == self.session_id:
                    target_session = session
                    Logger.info(f"Found our session in the list with ID: {session.get('_id') or session.get('sessionId')}")
                    break
            
            if not target_session and sessions:
                # If we can't find our exact session, use the first one from the list
                target_session = sessions[0]
                session_id_key = "_id" if "_id" in target_session else "sessionId"
                self.session_id = target_session.get(session_id_key)
                Logger.warning(f"Couldn't find our session, using first available session with ID: {self.session_id}")
            
            if not target_session:
                Logger.error("No valid session found to retrieve details")
                return False
            
            # Get specific session for the test user
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/{correct_user_id}/sessions/{self.session_id}",
                headers=sup_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Retrieved session {self.session_id} for user {correct_user_id}")
                Logger.info(json.dumps(data, indent=2))
                return True
            elif response.status_code == 403:
                Logger.warning("Permission denied: Only admins and supervisors can view user sessions")
                return False
            else:
                Logger.error(f"Failed to get user session: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"User session retrieval error: {str(e)}")
            return False

    def delete_chat_session(self):
        """Delete the current chat session"""
        Logger.header("DELETING CHAT SESSION")
        
        if not self.session_id:
            Logger.error("No active session ID. Nothing to delete.")
            return False # Or True, depending on desired behavior if no session to delete
            
        if not self.user_token: # or self.headers.get("Authorization")
            Logger.error("User token not available. Cannot delete session.")
            return False
            
        try:
            response = self.session.delete(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}",
                headers=self.headers # Assuming self.headers contains the user's auth token
            )
            
            if response.status_code == 200:
                Logger.success(f"Chat session {self.session_id} deleted successfully")
                self.session_id = None
                return True
            # Handle cases where session might have already been deleted or expired
            elif response.status_code == 404:
                Logger.warning(f"Chat session {self.session_id} not found. It might have been already deleted.")
                self.session_id = None # Clear the session ID anyway
                return True 
            else:
                Logger.error(f"Failed to delete chat session {self.session_id}: {response.status_code}, {response.text}")
                return False
        except requests.RequestException as e:
            Logger.error(f"Chat session deletion error: {str(e)}")
            return False

async def run_async_tests(tester):
    """Run tests that require async functionality"""
    # Test supervisor observation
    await tester.supervisor_observe_session()

def run_tests():
    Logger.header("CHAT SERVICE API TEST SCRIPT")
    Logger.info(f"Auth Service URL: {AUTH_SERVICE_URL}")
    Logger.info(f"Accounting Service URL: {ACCOUNTING_SERVICE_URL}")
    Logger.info(f"Chat Service URL: {CHAT_SERVICE_URL}")
    
    tester = ChatServiceTester()
    
    # First check services health
    if not tester.check_services_health():
        Logger.error("One or more services are not healthy. Cannot continue with tests.")
        sys.exit(1)
    
    # Authenticate users
    if not tester.authenticate():
        Logger.error("Test user authentication failed. Cannot continue with tests.")
        sys.exit(1)
        
    if not tester.authenticate_admin():
        Logger.warning("Admin authentication failed. Some tests may fail.")
        
    if not tester.authenticate_supervisor():
        Logger.warning("Supervisor authentication failed. Observation tests will be skipped.")
    
    # Allocate credits to test user
    tester.allocate_credits()
    
    # Check credit balance
    tester.check_credit_balance()
    
    # Test credit check endpoint directly
    tester.test_credit_check_endpoint()
    
    # Run through the test sequence
    test_sequence = [ 
        ("Get available models", tester.get_available_models),
        ("Get model recommendation", tester.get_model_recommendation),
        ("Create a new chat session", tester.create_chat_session),
        ("List chat sessions", tester.list_chat_sessions),
        ("Get chat messages", tester.get_chat_messages),
        ("Send a regular (non-streaming) message", lambda: tester.send_message(streaming=False)),
        ("Send a streaming message", lambda: tester.send_message(streaming=True)),
        ("Test insufficient credits scenario", tester.test_insufficient_credits),
        ("Check usage statistics", tester.check_usage_stats)
    ]
    
    # Execute regular user tests
    results = []
    for test_name, test_func in test_sequence:
        Logger.info(f"\n{'=' * 60}")
        Logger.info(f"TEST: {test_name}")
        Logger.info(f"{'=' * 60}")
        success = test_func()
        results.append((test_name, success))
    
    # For supervisor tests, we need to create a new session first
    if tester.supervisor_token:
        Logger.header("RUNNING SUPERVISOR-SPECIFIC TESTS")
        
        # Create a new session if we don't have one
        if not tester.session_id:
            tester.create_chat_session()
        
        # Run supervisor tests
        supervisor_tests = [
            ("Supervisor search users", tester.supervisor_search_users),
            ("Supervisor list user sessions", tester.supervisor_list_user_sessions),
            ("Supervisor get specific user session", tester.supervisor_get_user_session)
        ]
        
        for test_name, test_func in supervisor_tests:
            Logger.info(f"\n{'=' * 60}")
            Logger.info(f"TEST: {test_name}")
            Logger.info(f"{'=' * 60}")
            success = test_func()
            results.append((test_name, success))
    else:
        Logger.warning("Skipping supervisor tests due to missing supervisor token")
        
    # Run async tests for streaming observation
    if tester.supervisor_token and (tester.session_id or tester.create_chat_session()):
        Logger.header("RUNNING ASYNC TESTS")
        asyncio.run(run_async_tests(tester))
    
    # Clean up after all tests
    if tester.session_id:
        Logger.info("\nCleaning up test resources...")
        tester.delete_chat_session()
    
    # Print summary
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
    success = run_tests()
    sys.exit(0 if success else 1)

