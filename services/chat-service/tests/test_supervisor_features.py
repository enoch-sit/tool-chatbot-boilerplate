#!/usr/bin/env python3
import requests
import json
import sys
import time
import asyncio
import aiohttp
from colorama import Fore, Style, init
from datetime import datetime

# Initialize colorama for colored terminal output
init(autoreset=True)

# Configuration
AUTH_SERVICE_URL = "http://localhost:3000/api"
ACCOUNTING_SERVICE_URL = "http://localhost:3001/api"
CHAT_SERVICE_URL = "http://localhost:3002/api"

# Test user credentials
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

# Use the first regular user and supervisor for testing
TEST_USER = REGULAR_USERS[0]
SUPERVISOR_USER = SUPERVISOR_USERS[0]

ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

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

class SupervisorTester:
    def __init__(self):
        self.session = requests.Session()
        self.supervisor_token = None
        self.user_token = None
        self.admin_token = None
        self.supervisor_headers = {}
        self.user_headers = {}
        self.admin_headers = {}
        self.session_id = None
    
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
    
    def authenticate_all_users(self):
        """Authenticate as regular user, supervisor, and admin"""
        all_passed = True
        
        # Regular user auth
        Logger.header("AUTHENTICATING AS REGULAR USER")
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
                self.user_headers = {
                    "Authorization": f"Bearer {self.user_token}",
                    "X-User-ID": TEST_USER["username"]
                }
                Logger.success(f"Authentication successful for {TEST_USER['username']}")
            else:
                Logger.error(f"Authentication failed: {response.status_code}, {response.text}")
                all_passed = False
        except requests.RequestException as e:
            Logger.error(f"Authentication error: {str(e)}")
            all_passed = False
        
        # Supervisor auth
        Logger.header("AUTHENTICATING AS SUPERVISOR")
        try:
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/auth/login",
                json={
                    "username": SUPERVISOR_USER["username"],
                    "password": SUPERVISOR_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.supervisor_token = data.get("accessToken")
                self.supervisor_headers = {
                    "Authorization": f"Bearer {self.supervisor_token}",
                    "X-User-ID": SUPERVISOR_USER["username"]
                }
                Logger.success(f"Authentication successful for {SUPERVISOR_USER['username']}")
            else:
                Logger.error(f"Authentication failed: {response.status_code}, {response.text}")
                all_passed = False
        except requests.RequestException as e:
            Logger.error(f"Authentication error: {str(e)}")
            all_passed = False
        
        # Admin auth
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
                self.admin_headers = {
                    "Authorization": f"Bearer {self.admin_token}"
                }
                Logger.success(f"Authentication successful for {ADMIN_USER['username']}")
            else:
                Logger.error(f"Authentication failed: {response.status_code}, {response.text}")
                all_passed = False
        except requests.RequestException as e:
            Logger.error(f"Authentication error: {str(e)}")
            all_passed = False
        
        return all_passed
    
    def allocate_credits_to_test_user(self):
        """Allocate credits to the test user"""
        Logger.header("ALLOCATING CREDITS")
        
        if not self.admin_token:
            Logger.error("Admin token not available. Authenticate as admin first.")
            return False
        
        try:
            response = self.session.post(
                f"{ACCOUNTING_SERVICE_URL}/credits/allocate",
                headers=self.admin_headers,
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
    
    def create_chat_session_as_user(self):
        """Create a new chat session as the regular user"""
        Logger.header("CREATING NEW CHAT SESSION")
        
        if not self.user_token:
            Logger.error("User token not available. Authenticate as user first.")
            return False
        
        try:
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions",
                headers=self.user_headers,
                json={
                    "title": f"Test Chat Session {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                    "initialMessage": "Hello, this is a test message for supervisor features"
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
    
    def supervisor_search_users(self):
        """Test the supervisor's ability to search for users"""
        Logger.header("SUPERVISOR SEARCH USERS")
        
        if not self.supervisor_token:
            Logger.error("Supervisor token not available. Authenticate as supervisor first.")
            return False
        
        try:
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
                    headers=self.supervisor_headers
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
            
            # Try to get account info for debugging
            try:
                me_response = self.session.get(
                    f"{AUTH_SERVICE_URL}/auth/me",
                    headers=self.supervisor_headers
                )
                
                if me_response.status_code == 200:
                    me_data = me_response.json()
                    Logger.info(f"Current supervisor account: {json.dumps(me_data, indent=2)}")
                else:
                    Logger.warning(f"Failed to get account info: {me_response.status_code}")
            except Exception as e:
                Logger.error(f"Error getting account info: {str(e)}")
            
            return False
                
        except requests.RequestException as e:
            Logger.error(f"User search error: {str(e)}")
            return False
    
    def supervisor_list_user_sessions(self):
        """Test the supervisor's ability to list a user's chat sessions"""
        Logger.header("SUPERVISOR LIST USER SESSIONS")
        
        if not self.supervisor_token:
            Logger.error("Supervisor token not available. Authenticate as supervisor first.")
            return False
        
        try:
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/{TEST_USER['username']}/sessions",
                headers=self.supervisor_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                sessions = data.get("sessions", [])
                Logger.success(f"Retrieved {len(sessions)} sessions for user {TEST_USER['username']}")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to list user sessions: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"User sessions listing error: {str(e)}")
            return False
    
    def supervisor_get_specific_session(self):
        """Test the supervisor's ability to get details of a specific session"""
        Logger.header("SUPERVISOR GET SPECIFIC USER SESSION")
        
        if not self.supervisor_token:
            Logger.error("Supervisor token not available. Authenticate as supervisor first.")
            return False
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
        
        try:
            # First, get the list of sessions to find the right user ID and session ID
            list_response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/{TEST_USER['username']}/sessions",
                headers=self.supervisor_headers
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
            
            # Now get the specific session using the correct IDs
            Logger.info(f"Getting session details with user ID: {correct_user_id}, session ID: {self.session_id}")
            
            response = self.session.get(
                f"{CHAT_SERVICE_URL}/chat/users/{correct_user_id}/sessions/{self.session_id}",
                headers=self.supervisor_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success(f"Retrieved session details successfully!")
                Logger.info(json.dumps(data, indent=2))
                return True
            else:
                Logger.error(f"Failed to get user session: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"User session retrieval error: {str(e)}")
            return False
    
    async def test_supervisor_observation(self):
        """Test the supervisor's ability to observe an active chat session"""
        Logger.header("SUPERVISOR OBSERVATION")
        
        if not self.supervisor_token or not self.user_token:
            Logger.error("Missing tokens. Both supervisor and user must be authenticated.")
            return False
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
        
        try:
            # First send a regular (non-streaming) message as the user
            # This ensures the chat session has content before we attempt streaming
            Logger.info("Sending initial non-streaming message to prepare session")
            prep_response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/messages",
                headers=self.user_headers,
                json={
                    "message": "Hello, this is a test message before streaming",
                    "modelId": "amazon.titan-text-express-v1:0"
                }
            )
            
            if prep_response.status_code != 200:
                Logger.warning(f"Failed to send prep message: {prep_response.status_code}, but continuing...")
            else:
                Logger.success("Sent initial message successfully")
                # Wait a moment for message processing
                await asyncio.sleep(1)
            
            user_headers = {"Authorization": f"Bearer {self.user_token}"}
            sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
            
            # Create separate sessions for user and supervisor
            user_session = aiohttp.ClientSession()
            supervisor_session = aiohttp.ClientSession()
            
            try:
                # Step 1: Start streaming session as user
                stream_url = f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/stream"
                
                Logger.info(f"Starting streaming request to {stream_url}")
                
                stream_task = asyncio.create_task(
                    self._continuous_stream(user_session, stream_url, user_headers)
                )
                
                # Increase delay to avoid race conditions - the server needs time to establish streaming
                await asyncio.sleep(3)
                
                # Step 2: Attempt supervisor observation with retry logic
                max_retries = 3
                observe_success = False
                
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
                    if observe_success:
                        break
                        
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
                    "modelId": "amazon.titan-text-express-v1:0"
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
    
    def delete_chat_session(self):
        """Delete the test chat session"""
        Logger.header("DELETING CHAT SESSION")
        
        if not self.user_token or not self.session_id:
            Logger.error("User token or session ID not available.")
            return False
        
        try:
            response = self.session.delete(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}",
                headers=self.user_headers
            )
            
            if response.status_code == 200:
                Logger.success(f"Chat session deleted successfully")
                self.session_id = None
                return True
            else:
                Logger.error(f"Failed to delete chat session: {response.status_code}, {response.text}")
                return False
        except requests.RequestException as e:
            Logger.error(f"Chat session deletion error: {str(e)}")
            return False

async def run_test():
    Logger.header("SUPERVISOR FEATURES TEST SCRIPT")
    
    tester = SupervisorTester()
    results = []
    
    # Check services health
    if not tester.check_services_health():
        Logger.error("Services check failed. Cannot continue with tests.")
        return False
    
    # Authenticate all users
    if not tester.authenticate_all_users():
        Logger.error("Authentication failed. Cannot continue with tests.")
        return False
    
    # Allocate credits to test user
    if not tester.allocate_credits_to_test_user():
        Logger.warning("Credit allocation failed. Some tests may fail.")
    
    # Create a chat session as the regular user
    if not tester.create_chat_session_as_user():
        Logger.error("Failed to create chat session. Cannot continue with supervisor tests.")
        return False
    
    # Run supervisor tests
    test_sequence = [
        ("Supervisor search users", tester.supervisor_search_users),
        ("Supervisor list user sessions", tester.supervisor_list_user_sessions),
        ("Supervisor get specific session", tester.supervisor_get_specific_session)
    ]
    
    # Execute regular supervisor tests
    for test_name, test_func in test_sequence:
        Logger.info(f"\n{'=' * 60}")
        Logger.info(f"TEST: {test_name}")
        Logger.info(f"{'=' * 60}")
        success = test_func()
        results.append((test_name, success))
    
    # Execute observation test (async)
    Logger.info(f"\n{'=' * 60}")
    Logger.info(f"TEST: Supervisor observation")
    Logger.info(f"{'=' * 60}")
    observation_success = await tester.test_supervisor_observation()
    results.append(("Supervisor observation", observation_success))
    
    # Clean up resources
    if tester.session_id:
        tester.delete_chat_session()
    
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
    
    return all_passed

if __name__ == "__main__":
    success = asyncio.run(run_test())
    sys.exit(0 if success else 1)