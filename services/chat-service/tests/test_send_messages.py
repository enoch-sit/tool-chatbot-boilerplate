#!/usr/bin/env python3
import requests
import json
import sys
import time
import sseclient
from colorama import Fore, Style, init

# Initialize colorama for colored terminal output
init(autoreset=True)

# Configuration
AUTH_SERVICE_URL = "http://localhost:3000/api"
ACCOUNTING_SERVICE_URL = "http://localhost:3001/api"
CHAT_SERVICE_URL = "http://localhost:3002/api"

# Test user credentials
TEST_USER = {
    "username": "user1",
    "email": "user1@example.com",
    "password": "User1@123",
    "role": "enduser",
}

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
        """Send a regular (non-streaming) message"""
        Logger.header("SENDING NON-STREAMING MESSAGE")
        
        if not self.session_id:
            Logger.error("No active session ID. Create a session first.")
            return False
            
        try:
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/messages",
                headers=self.headers,
                json={
                    "message": "Tell me about machine learning",
                    "modelId": model_id
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                Logger.success("Message sent successfully!")
                Logger.info(f"Response contains: {data.keys()}")
                Logger.info(f"Message: {data.get('message', 'No message')}")
                return True
            elif response.status_code == 402:
                Logger.warning("Message failed due to insufficient credits")
                Logger.info(response.text)
                return False
            else:
                Logger.error(f"Failed to send message: {response.status_code}, {response.text}")
                return False
                
        except requests.RequestException as e:
            Logger.error(f"Message sending error: {str(e)}")
            return False
    
    def send_streaming_message(self, model_id):
        """Send a streaming message"""
        Logger.header("SENDING STREAMING MESSAGE")
        
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
                
                # Extract streaming session ID from headers if available
                self.streaming_session_id = response.headers.get("X-Streaming-Session-Id")
                if self.streaming_session_id:
                    Logger.info(f"Streaming session ID: {self.streaming_session_id}")
                else:
                    # If not in headers, generate a temporary one
                    self.streaming_session_id = f"stream-{int(time.time())}"
                    Logger.info(f"Generated temporary streaming ID: {self.streaming_session_id}")
                
                client = sseclient.SSEClient(response)
                full_response = ""
                chunks_received = 0
                
                for event in client.events():
                    if event.event == "chunk":
                        try:
                            data = json.loads(event.data)
                            text = data.get('text', '')
                            full_response += text
                            chunks_received += 1
                            
                            if chunks_received <= 3:  # Show only first 3 chunks
                                Logger.info(f"Chunk {chunks_received}: {text}")
                        except:
                            pass
                    elif event.event == "done":
                        try:
                            data = json.loads(event.data)
                            tokens_used = data.get('tokensUsed', 100)
                            Logger.info(f"Stream complete. Tokens used: {tokens_used}")
                        except:
                            pass
                            
                    # If we've received enough chunks, break early
                    if chunks_received >= 10:
                        Logger.info("Received enough chunks, finishing test...")
                        break
                
                Logger.success(f"Received {chunks_received} chunks. Total response length: {len(full_response)}")
                
                # Update the stream response
                Logger.info("Updating chat with stream response...")
                
                return self.update_stream_response(full_response)
                
            elif response.status_code == 402:
                Logger.warning("Streaming message failed due to insufficient credits")
                Logger.info(response.text)
                return False
            else:
                Logger.error(f"Failed to start streaming: {response.status_code}, {response.text}")
                return False
                
        except Exception as e:
            Logger.error(f"Streaming error: {str(e)}")
            return False
    
    def update_stream_response(self, response_text):
        """Update the chat with a streaming response"""
        
        if not self.streaming_session_id:
            Logger.error("No streaming session ID available.")
            return False
            
        try:
            # Note: Make sure to include the correct parameters according to API
            update_response = self.session.post(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/update-stream",
                headers=self.headers,
                json={
                    "completeResponse": response_text or "AI response placeholder",
                    "streamingSessionId": self.streaming_session_id,
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
                
        except Exception as e:
            Logger.error(f"Stream update error: {str(e)}")
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
    
    # Allocate credits to test user
    tester.allocate_credits()
    
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
    
    # Run tests
    test_sequence = [
        ("Send non-streaming message", lambda: tester.send_non_streaming_message(model_id)),
        ("Send streaming message", lambda: tester.send_streaming_message(model_id))
    ]
    
    # Execute tests
    for test_name, test_func in test_sequence:
        Logger.header(f"TEST: {test_name}")
        success = test_func()
        results.append((test_name, success))
    
    # Clean up resources
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
    success = run_test()
    sys.exit(0 if success else 1)