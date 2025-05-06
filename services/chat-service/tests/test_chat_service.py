import requests
import json
import time
import sseclient
import sys

# Configuration
AUTH_SERVICE_URL = "http://localhost:3000/api"  # External Auth Service
CHAT_SERVICE_URL = "http://localhost:3002/api"  # Chat Service

# User credentials (from ExternalAuthUser.md)
USER = {
    "username": "user1",
    "email": "user1@example.com",
    "password": "User1@123"
}

class ChatServiceTester:
    def __init__(self):
        self.auth_token = None
        self.headers = {}
        self.session_id = None
        
    def authenticate(self):
        """Authenticate with the External Auth Service"""
        print("Authenticating with External Auth Service...")
        try:
            response = requests.post(
                f"{AUTH_SERVICE_URL}/auth/login",
                json={"email": USER["email"], "password": USER["password"]}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("accessToken")
                self.headers = {"Authorization": f"Bearer {self.auth_token}"}
                print("✓ Authentication successful!")
                return True
            else:
                print(f"✗ Authentication failed: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            print(f"✗ Authentication error: {str(e)}")
            return False
    
    def get_available_models(self):
        """Get available models from Chat Service"""
        print("\nGetting available models...")
        try:
            response = requests.get(
                f"{CHAT_SERVICE_URL}/models",
                headers=self.headers
            )
            
            if response.status_code == 200:
                models = response.json()
                print("✓ Available models retrieved successfully!")
                print(json.dumps(models, indent=2))
                return True
            else:
                print(f"✗ Failed to get models: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            print(f"✗ Error getting models: {str(e)}")
            return False
    
    def create_chat_session(self):
        """Create a new chat session"""
        print("\nCreating a new chat session...")
        try:
            response = requests.post(
                f"{CHAT_SERVICE_URL}/chat/sessions",
                headers=self.headers,
                json={
                    "title": "Test Chat Session",
                    "initialMessage": "Hello, this is a test message"
                }
            )
            
            if response.status_code == 201:
                data = response.json()
                self.session_id = data.get("sessionId")
                print(f"✓ Chat session created successfully! Session ID: {self.session_id}")
                print(json.dumps(data, indent=2))
                return True
            else:
                print(f"✗ Failed to create chat session: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            print(f"✗ Error creating chat session: {str(e)}")
            return False
    
    def list_chat_sessions(self):
        """List all chat sessions for the user"""
        print("\nListing chat sessions...")
        try:
            response = requests.get(
                f"{CHAT_SERVICE_URL}/chat/sessions",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Chat sessions retrieved successfully!")
                print(json.dumps(data, indent=2))
                return True
            else:
                print(f"✗ Failed to list chat sessions: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            print(f"✗ Error listing chat sessions: {str(e)}")
            return False
    
    def get_chat_messages(self):
        """Get messages from a chat session"""
        if not self.session_id:
            print("✗ No active session ID. Create a session first.")
            return False
            
        print(f"\nGetting messages for session {self.session_id}...")
        try:
            response = requests.get(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/messages",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Chat messages retrieved successfully!")
                print(json.dumps(data, indent=2))
                return True
            else:
                print(f"✗ Failed to get chat messages: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            print(f"✗ Error getting chat messages: {str(e)}")
            return False
    
    def send_message(self, streaming=False):
        """Send a message to the chat session"""
        if not self.session_id:
            print("✗ No active session ID. Create a session first.")
            return False
            
        endpoint = "stream" if streaming else "messages"
        print(f"\nSending {'streaming ' if streaming else ''}message to session {self.session_id}...")
        
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
                    print("✓ Streaming response started! Showing first chunks...")
                    client = sseclient.SSEClient(response)
                    
                    # Print just a few chunks to demonstrate it's working
                    chunks = 0
                    full_response = ""
                    for event in client.events():
                        if chunks >= 5:
                            print("... (truncating stream output)")
                            break
                        
                        if event.event == "chunk":
                            try:
                                data = json.loads(event.data)
                                print(f"Chunk: {data.get('text')}")
                                full_response += data.get('text', '')
                                chunks += 1
                            except:
                                pass
                    
                    # Update the stream response
                    print("\nUpdating chat with stream response...")
                    update_response = requests.post(
                        f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/update-stream",
                        headers=self.headers,
                        json={
                            "completeResponse": full_response or "AI response placeholder",
                            "streamingSessionId": f"stream-{int(time.time())}-test",
                            "tokensUsed": 100
                        }
                    )
                    
                    if update_response.status_code == 200:
                        print("✓ Stream response updated successfully!")
                        print(json.dumps(update_response.json(), indent=2))
                        return True
                    else:
                        print(f"✗ Failed to update stream response: {update_response.status_code}, {update_response.text}")
                        return False
                else:
                    print(f"✗ Failed to start streaming: {response.status_code}, {response.text}")
                    return False
            else:
                # Regular non-streaming message
                response = requests.post(
                    f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}/{endpoint}",
                    headers=self.headers,
                    json={"message": "Hello, this is a test message"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print("✓ Message sent successfully!")
                    print(json.dumps(data, indent=2))
                    return True
                else:
                    print(f"✗ Failed to send message: {response.status_code}, {response.text}")
                    return False
        except Exception as e:
            print(f"✗ Error sending message: {str(e)}")
            return False
    
    def delete_chat_session(self):
        """Delete a chat session"""
        if not self.session_id:
            print("✗ No active session ID. Create a session first.")
            return False
            
        print(f"\nDeleting chat session {self.session_id}...")
        try:
            response = requests.delete(
                f"{CHAT_SERVICE_URL}/chat/sessions/{self.session_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✓ Chat session deleted successfully!")
                print(json.dumps(data, indent=2))
                self.session_id = None
                return True
            else:
                print(f"✗ Failed to delete chat session: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            print(f"✗ Error deleting chat session: {str(e)}")
            return False


def run_tests():
    print("=" * 80)
    print("CHAT SERVICE API TEST SCRIPT")
    print("=" * 80)
    print(f"Auth Service URL: {AUTH_SERVICE_URL}")
    print(f"Chat Service URL: {CHAT_SERVICE_URL}")
    print("-" * 80)
    
    tester = ChatServiceTester()
    
    # First authenticate
    if not tester.authenticate():
        print("\nAuthentication failed. Cannot continue with tests.")
        sys.exit(1)
    
    # Run through the test sequence
    test_sequence = [
        ("Get available models", tester.get_available_models),
        ("Create a new chat session", tester.create_chat_session),
        ("List chat sessions", tester.list_chat_sessions),
        ("Get chat messages", tester.get_chat_messages),
        ("Send a regular message", lambda: tester.send_message(streaming=False)),
        ("Send a streaming message", lambda: tester.send_message(streaming=True)),
        ("Delete the chat session", tester.delete_chat_session)
    ]
    
    results = []
    
    for test_name, test_func in test_sequence:
        print("\n" + "-" * 80)
        print(f"TEST: {test_name}")
        print("-" * 80)
        success = test_func()
        results.append((test_name, success))
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST RESULTS SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for test_name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status} - {test_name}")
        all_passed = all_passed and success
    
    print("\nOVERALL RESULT:", "✓ PASSED" if all_passed else "✗ FAILED")


if __name__ == "__main__":
    run_tests()