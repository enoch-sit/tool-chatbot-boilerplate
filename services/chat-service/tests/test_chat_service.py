#!/usr/bin/env python3
import requests
import json
import time
import sys
import asyncio
import aiohttp
import sseclient
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
                    "credits": 100  # Request to check if user has 100 credits
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
                    json={"message": "Tell me about artificial intelligence", "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"},
                    stream=True
                )
                
                if response.status_code == 200:
                    Logger.success("Streaming response started! Showing first chunks...")
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
                                data = json.loads(event.data)
                                Logger.info(f"Chunk: {data.get('text', '')}")
                                full_response += data.get('text', '')
                                chunks += 1
                            except:
                                pass
                    
                    # Extract streaming session ID from headers if available
                    self.streaming_session_id = response.headers.get("X-Streaming-Session-Id")
                    if self.streaming_session_id:
                        Logger.info(f"Streaming session ID: {self.streaming_session_id}")
                    
                    # Update the stream response
                    Logger.info("Updating chat with stream response...")
                    update_response = self.session.post(
                        f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/update-stream",
                        headers=self.headers,
                        json={
                            "completeResponse": full_response or "AI response placeholder",
                            "streamingSessionId": self.streaming_session_id or f"stream-{int(time.time())}-test",
                            "tokensUsed": 100
                        }
                    )
                    
                    if update_response.status_code == 200:
                        Logger.success("Stream response updated successfully!")
                        Logger.info(json.dumps(update_response.json(), indent=2))
                        return True
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
                # Regular non-streaming message
                response = self.session.post(
                    f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/{endpoint}",
                    headers=self.headers,
                    json={"message": "Tell me about machine learning", "modelId": "amazon.titan-text-express-v1:0"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    Logger.success("Non-streaming message sent successfully!")
                    Logger.info(json.dumps(data, indent=2))
                    return True
                elif response.status_code == 402:
                    Logger.warning("Non-streaming message failed due to insufficient credits")
                    try:
                        error_data = json.loads(response.text)
                        Logger.info(json.dumps(error_data, indent=2))
                    except:
                        Logger.info(f"Raw error: {response.text}")
                    return False
                else:
                    Logger.error(f"Failed to send non-streaming message: {response.status_code}, {response.text}")
                    return False
                    
        except Exception as e:
            Logger.error(f"Message sending error: {str(e)}")
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
                    "credits": initial_balance + 5000  # Request more credits than available
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
            # Start a streaming session in another thread/task
            streaming_task = asyncio.create_task(self.async_stream_message())
            
            # Give it a moment to start
            await asyncio.sleep(2)
            
            # Now supervisor observes the session
            sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
            
            # Set up SSE client for observation
            async with aiohttp.ClientSession() as session:
                observe_url = f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/observe"
                
                async with session.get(observe_url, headers=sup_headers) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        Logger.error(f"Observation request failed: {error_text}")
                        # Cancel our streaming task
                        streaming_task.cancel()
                        return False
                    
                    Logger.success("Supervisor observation started")
                    
                    # Process the SSE stream from the observation
                    chunk_count = 0
                    async for line in resp.content:
                        chunk_str = line.decode('utf-8').strip()
                        if chunk_str.startswith('data:'):
                            Logger.info(f"Observed: {chunk_str}")
                            chunk_count += 1
                            if chunk_count >= 5:
                                Logger.info("... (truncating observation output)")
                                break
            
            # Cancel the streaming task if it's still running
            if not streaming_task.done():
                streaming_task.cancel()
                
            return True
                
        except Exception as e:
            Logger.error(f"Supervisor observation error: {str(e)}")
            return False

    async def async_stream_message(self):
        """Async helper to stream a message for observation test"""
        try:
            async with aiohttp.ClientSession() as session:
                stream_url = f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/stream"
                
                async with session.post(
                    stream_url, 
                    headers=self.headers,
                    json={
                        "message": "Tell me about microservices architecture",
                        "userId": TEST_USER["username"]  # Adding userId here as well
                    }
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        Logger.error(f"Streaming request failed: {error_text}")
                        return False
                    
                    async for chunk in resp.content:
                        # Just letting the stream run for observation
                        await asyncio.sleep(0.1)
                    
            return True
        except Exception as e:
            Logger.error(f"Async streaming error: {str(e)}")
            return False

    def check_usage_stats(self):
        """Check the test user's usage statistics"""
        Logger.header("CHECKING USAGE STATISTICS")
        
        try:
            response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/usage/stats",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Retrieved usage statistics")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to get usage statistics: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Usage statistics retrieval error: {str(e)}")
            return False

    def delete_chat_session(self):
        """Delete the current chat session"""
        Logger.header("DELETING CHAT SESSION")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
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

    def supervisor_search_users(self):
        """Test supervisor ability to search users (admin/supervisor only)"""
        Logger.header("SUPERVISOR SEARCH USERS")
        
        if not self.supervisor_token:
            Logger.error("No supervisor token. Authenticate as supervisor first.")
            return False
            
        try:
            sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
            
            # Search for regular user
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/search?query={TEST_USER['username']}",
                headers=sup_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                users = data.get("users", [])
                Logger.success(f"Search returned {len(users)} users")
                Logger.info(json.dumps(data, indent=2))
                return True
            elif response.status_code == 403:
                Logger.warning("Permission denied: Only admins and supervisors can search users")
                return False
            else:
                Logger.error(f"Failed to search users: {response.status_code}, {response.text}")
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
            
            # Get specific session for the test user
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/{TEST_USER['username']}/sessions/{self.session_id}",
                headers=sup_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Retrieved session {self.session_id} for user {TEST_USER['username']}")
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

