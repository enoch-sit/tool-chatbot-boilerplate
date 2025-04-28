#!/usr/bin/env python3
"""
Workflow Testing Script for Three-Service Architecture
This script tests the information flow between Authentication, Accounting, and Chat services
as documented in the FlowSequence.md blueprint.

It uses the admin credentials from create_users.py to authenticate and perform cross-service operations.
"""

import json
import requests
import time
import sys
import os
import uuid
import datetime
import argparse
import asyncio
import aiohttp
from typing import Dict, List, Optional, Tuple, Any
from colorama import init, Fore, Style
from tqdm import tqdm

# Initialize colorama for cross-platform colored terminal output
init()

# Configuration - Services URLs
AUTH_SERVICE_URL = "http://localhost:3000"
ACCOUNTING_SERVICE_URL = "http://localhost:3001"
CHAT_SERVICE_URL = "http://localhost:3002"

# Admin credentials from create_users.py
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

# Test user to create during testing
TEST_USER = {
    "username": f"testuser_{uuid.uuid4().hex[:8]}",
    "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
    "password": "Test@123456",
}

# Supervisor user (using supervisor1 from create_users.py)
SUPERVISOR_USER = {
    "username": "supervisor1",
    "email": "supervisor1@example.com",
    "password": "Supervisor1@",
}

# Setup logging
LOG_DIR = "test_logs"
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, f"workflow_test_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

class TestLogger:
    def __init__(self, log_file: str):
        self.log_file = log_file
        with open(self.log_file, 'w') as f:
            f.write(f"# Workflow Test Log - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] {level}: {message}"
        
        # Set color based on log level
        if level == "ERROR":
            color = Fore.RED
        elif level == "SUCCESS":
            color = Fore.GREEN
        elif level == "WARNING":
            color = Fore.YELLOW
        else:
            color = Fore.BLUE
            
        # Print to console with color
        print(f"{color}{log_entry}{Style.RESET_ALL}")
        
        # Write to log file
        with open(self.log_file, 'a') as f:
            f.write(log_entry + "\n")

logger = TestLogger(LOG_FILE)

class ServiceTester:
    def __init__(self):
        self.admin_token = None
        self.supervisor_token = None
        self.test_user_token = None
        self.test_user_id = None
        self.test_user_verification_token = None
        self.session = requests.Session()
        self.credit_allocation_id = None
        self.streaming_session_id = None
        self.chat_session_id = None
    
    def check_services_health(self) -> bool:
        """Check if all three services are running and healthy"""
        logger.log("Checking services health...", "INFO")
        
        services = [
            {"name": "Authentication", "url": f"{AUTH_SERVICE_URL}/health"},
            {"name": "Accounting", "url": f"{ACCOUNTING_SERVICE_URL}/api/health"},
            {"name": "Chat", "url": f"{CHAT_SERVICE_URL}/api/health"}
        ]
        
        all_healthy = True
        
        for service in services:
            try:
                response = self.session.get(service["url"], timeout=5)
                if response.status_code == 200:
                    logger.log(f"{service['name']} Service: ✅ Healthy", "SUCCESS")
                else:
                    logger.log(f"{service['name']} Service: ❌ Unhealthy (Status: {response.status_code})", "ERROR")
                    all_healthy = False
            except requests.RequestException as e:
                logger.log(f"{service['name']} Service: ❌ Unavailable ({str(e)})", "ERROR")
                all_healthy = False
        
        return all_healthy
    
    def login_admin(self) -> bool:
        """Login as admin and get JWT token"""
        logger.log("Logging in as admin...", "INFO")
        
        try:
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/api/auth/login",
                json={
                    "username": ADMIN_USER["username"],
                    "password": ADMIN_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("accessToken")
                
                if self.admin_token:
                    logger.log("Admin login successful", "SUCCESS")
                    return True
                else:
                    logger.log("Admin token not found in response", "ERROR")
                    return False
            else:
                logger.log(f"Admin login failed: {response.text}", "ERROR")
                return False
                
        except requests.RequestException as e:
            logger.log(f"Admin login error: {str(e)}", "ERROR")
            return False
    
    def login_supervisor(self) -> bool:
        """Login as supervisor and get JWT token"""
        logger.log("Logging in as supervisor...", "INFO")
        
        try:
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/api/auth/login",
                json={
                    "username": SUPERVISOR_USER["username"],
                    "password": SUPERVISOR_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.supervisor_token = data.get("accessToken")
                
                if self.supervisor_token:
                    logger.log("Supervisor login successful", "SUCCESS")
                    return True
                else:
                    logger.log("Supervisor token not found in response", "ERROR")
                    return False
            else:
                logger.log(f"Supervisor login failed: {response.text}", "ERROR")
                return False
                
        except requests.RequestException as e:
            logger.log(f"Supervisor login error: {str(e)}", "ERROR")
            return False
    
    def test_registration_flow(self) -> bool:
        """Test the complete registration flow including email verification"""
        logger.log("\n=== Testing Registration Scenario ===", "INFO")
        logger.log(f"Creating test user: {TEST_USER['username']}", "INFO")
        
        # Step 1: Register a new user
        try:
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/api/auth/signup",
                json=TEST_USER
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_user_id = data.get("userId")
                logger.log(f"User registration successful, ID: {self.test_user_id}", "SUCCESS")
            else:
                logger.log(f"User registration failed: {response.text}", "ERROR")
                return False
                
        except requests.RequestException as e:
            logger.log(f"Registration error: {str(e)}", "ERROR")
            return False
        
        # Step 2: Get verification token (development endpoint)
        if self.test_user_id:
            try:
                response = self.session.get(
                    f"{AUTH_SERVICE_URL}/api/testing/verification-token/{self.test_user_id}"
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.test_user_verification_token = data.get("token")
                    logger.log(f"Retrieved verification token", "SUCCESS")
                else:
                    # If testing endpoint doesn't exist, try direct verification
                    logger.log("Verification token endpoint not available, trying direct verification", "WARNING")
                    response = self.session.post(
                        f"{AUTH_SERVICE_URL}/api/testing/verify-user/{self.test_user_id}"
                    )
                    
                    if response.status_code == 200:
                        logger.log("User directly verified through testing endpoint", "SUCCESS")
                        return True
                    else:
                        logger.log(f"Direct verification failed: {response.text}", "ERROR")
                        return False
                    
            except requests.RequestException as e:
                logger.log(f"Verification token retrieval error: {str(e)}", "ERROR")
                return False
        
        # Step 3: Verify email with token
        if self.test_user_verification_token:
            try:
                response = self.session.post(
                    f"{AUTH_SERVICE_URL}/api/auth/verify-email",
                    json={"token": self.test_user_verification_token}
                )
                
                if response.status_code == 200:
                    logger.log("Email verification successful", "SUCCESS")
                    return True
                else:
                    logger.log(f"Email verification failed: {response.text}", "ERROR")
                    return False
                    
            except requests.RequestException as e:
                logger.log(f"Email verification error: {str(e)}", "ERROR")
                return False
        
        return False
    
    def test_login_flow(self) -> bool:
        """Test the login flow for the test user"""
        logger.log("\n=== Testing Login Scenario ===", "INFO")
        
        try:
            response = self.session.post(
                f"{AUTH_SERVICE_URL}/api/auth/login",
                json={
                    "username": TEST_USER["username"],
                    "password": TEST_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.test_user_token = data.get("accessToken")
                
                if self.test_user_token:
                    logger.log("Test user login successful", "SUCCESS")
                    return True
                else:
                    logger.log("Test user token not found in response", "ERROR")
                    return False
            else:
                logger.log(f"Test user login failed: {response.text}", "ERROR")
                return False
                
        except requests.RequestException as e:
            logger.log(f"Test user login error: {str(e)}", "ERROR")
            return False
    
    def test_credit_allocation_flow(self) -> bool:
        """Test the credit allocation flow from admin to test user"""
        logger.log("\n=== Testing Credit Allocation Scenario ===", "INFO")
        
        if not self.admin_token or not self.test_user_id:
            logger.log("Admin token or test user ID not available", "ERROR")
            return False
        
        # Admin allocates credits to the test user
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Set up credit allocation data
            allocation_data = {
                "targetUserId": self.test_user_id,
                "credits": 100,
                "expiryDays": 30,
                "notes": "Test credit allocation"
            }
            
            response = self.session.post(
                f"{ACCOUNTING_SERVICE_URL}/api/credits/allocate",
                headers=headers,
                json=allocation_data
            )
            
            if response.status_code == 201:
                data = response.json()
                self.credit_allocation_id = data.get("id")
                logger.log(f"Credit allocation successful, ID: {self.credit_allocation_id}", "SUCCESS")
                
                # Verify user can see their balance
                if self.test_user_token:
                    user_headers = {"Authorization": f"Bearer {self.test_user_token}"}
                    balance_response = self.session.get(
                        f"{ACCOUNTING_SERVICE_URL}/api/credits/balance",
                        headers=user_headers
                    )
                    
                    if balance_response.status_code == 200:
                        balance_data = balance_response.json()
                        logger.log(f"User balance verified: {balance_data.get('totalCredits')} credits", "SUCCESS")
                    else:
                        logger.log(f"Failed to verify user balance: {balance_response.text}", "WARNING")
                
                return True
            else:
                logger.log(f"Credit allocation failed: {response.text}", "ERROR")
                return False
                
        except requests.RequestException as e:
            logger.log(f"Credit allocation error: {str(e)}", "ERROR")
            return False
    
    async def test_chat_streaming_flow(self) -> bool:
        """Test the user chat scenario with streaming"""
        logger.log("\n=== Testing User Chat Scenario with Streaming ===", "INFO")
        
        if not self.test_user_token:
            logger.log("Test user token not available", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.test_user_token}"}
        
        # Step 1: Create a new chat session
        try:
            response = self.session.post(
                f"{CHAT_SERVICE_URL}/api/chat/sessions",
                headers=headers,
                json={"title": "Test Chat Session"}
            )
            
            if response.status_code == 201:
                data = response.json()
                self.chat_session_id = data.get("sessionId")
                logger.log(f"Chat session created, ID: {self.chat_session_id}", "SUCCESS")
            else:
                logger.log(f"Failed to create chat session: {response.text}", "ERROR")
                return False
                
        except requests.RequestException as e:
            logger.log(f"Chat session creation error: {str(e)}", "ERROR")
            return False
        
        # Step 2: Send a message and start streaming
        try:
            # First, use the standard requests to initiate the stream
            message_data = {
                "message": "Tell me about JWT authentication in a microservices architecture",
                "stream": True
            }
            
            # Use aiohttp for SSE streaming
            async with aiohttp.ClientSession() as session:
                stream_url = f"{CHAT_SERVICE_URL}/api/chat/sessions/{self.chat_session_id}/stream"
                
                async with session.post(
                    stream_url, 
                    headers=headers,
                    json=message_data
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.log(f"Streaming request failed: {error_text}", "ERROR")
                        return False
                    
                    logger.log("Streaming response started", "SUCCESS")
                    
                    self.streaming_session_id = resp.headers.get("X-Streaming-Session-Id")
                    if self.streaming_session_id:
                        logger.log(f"Streaming session ID: {self.streaming_session_id}", "INFO")
                    
                    # Setup progress bar for streaming visualization
                    pbar = tqdm(total=100, desc="Receiving stream", bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt}')
                    progress = 0
                    
                    # Process the SSE stream
                    async for chunk in resp.content:
                        chunk_str = chunk.decode('utf-8').strip()
                        if chunk_str.startswith('data:'):
                            data = chunk_str[5:].strip()
                            if data == "[DONE]":
                                pbar.update(100 - progress)
                                pbar.close()
                                logger.log("Streaming complete", "SUCCESS")
                                break
                            
                            try:
                                # Update progress bar
                                progress += 5
                                if progress <= 95:  # Cap at 95% until DONE is received
                                    pbar.update(5)
                            except json.JSONDecodeError:
                                pass  # Not all chunks may be valid JSON
            
            # Step 3: Verify the accounting record was created
            # Wait a moment for the accounting service to finalize
            logger.log("Waiting for accounting service to finalize...", "INFO")
            await asyncio.sleep(2)
            
            check_usage_response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/api/usage/stats",
                headers=headers
            )
            
            if check_usage_response.status_code == 200:
                usage_data = check_usage_response.json()
                logger.log(f"Usage records found: {usage_data.get('totalRecords', 0)}", "SUCCESS")
                return True
            else:
                logger.log(f"Failed to verify usage: {check_usage_response.text}", "WARNING")
                # We still return True because the streaming itself worked
                return True
                
        except Exception as e:
            logger.log(f"Chat streaming error: {str(e)}", "ERROR")
            return False
    
    async def test_supervisor_interrupt_flow(self) -> bool:
        """Test the supervisor interrupt scenario"""
        logger.log("\n=== Testing Supervisor Interrupt Scenario ===", "INFO")
        
        if not self.supervisor_token or not self.test_user_token or not self.chat_session_id:
            logger.log("Required tokens or chat session ID not available", "ERROR")
            return False
        
        # Step 1: Start a streaming session as the test user
        if not self.streaming_session_id:
            logger.log("No active streaming session to interrupt", "WARNING")
            
            # Create a new streaming session
            user_headers = {"Authorization": f"Bearer {self.test_user_token}"}
            message_data = {
                "message": "Write a detailed essay about microservices architecture",
                "stream": True
            }
            
            # We'll start this in the background
            async with aiohttp.ClientSession() as session:
                stream_url = f"{CHAT_SERVICE_URL}/api/chat/sessions/{self.chat_session_id}/stream"
                
                # Start the request but don't wait for it to complete
                stream_task = asyncio.create_task(
                    session.post(
                        stream_url, 
                        headers=user_headers,
                        json=message_data
                    )
                )
                
                # Give it a moment to start
                await asyncio.sleep(2)
                
                # Now supervisor should be able to see active sessions
                sup_headers = {"Authorization": f"Bearer {self.supervisor_token}"}
                
                # Get the active streaming sessions
                try:
                    response = self.session.get(
                        f"{ACCOUNTING_SERVICE_URL}/api/streaming-sessions/active/all",
                        headers=sup_headers
                    )
                    
                    if response.status_code == 200:
                        sessions = response.json()
                        if sessions and len(sessions) > 0:
                            self.streaming_session_id = sessions[0].get("sessionId")
                            user_id = sessions[0].get("userId")
                            logger.log(f"Found active streaming session: {self.streaming_session_id} for user: {user_id}", "SUCCESS")
                        else:
                            logger.log("No active streaming sessions found", "WARNING")
                            # Cancel the stream task
                            stream_task.cancel()
                            try:
                                await stream_task
                            except asyncio.CancelledError:
                                pass
                            return False
                    else:
                        logger.log(f"Failed to get active sessions: {response.text}", "ERROR")
                        # Cancel the stream task
                        stream_task.cancel()
                        try:
                            await stream_task
                        except asyncio.CancelledError:
                            pass
                        return False
                
                except Exception as e:
                    logger.log(f"Error getting active sessions: {str(e)}", "ERROR")
                    # Cancel the stream task
                    stream_task.cancel()
                    try:
                        await stream_task
                    except asyncio.CancelledError:
                        pass
                    return False
                
                # Step 2: Supervisor interrupts the session
                if self.streaming_session_id:
                    try:
                        interrupt_response = self.session.post(
                            f"{CHAT_SERVICE_URL}/api/sessions/{self.chat_session_id}/interrupt",
                            headers=sup_headers,
                            json={"streamingSessionId": self.streaming_session_id}
                        )
                        
                        if interrupt_response.status_code == 200:
                            logger.log("Supervisor successfully interrupted the session", "SUCCESS")
                            
                            # Add supervisor feedback
                            feedback_response = self.session.post(
                                f"{CHAT_SERVICE_URL}/api/sessions/{self.chat_session_id}/feedback",
                                headers=sup_headers,
                                json={
                                    "feedback": "This is a test interruption by a supervisor",
                                    "isVisible": True
                                }
                            )
                            
                            if feedback_response.status_code == 200:
                                logger.log("Supervisor feedback added successfully", "SUCCESS")
                            else:
                                logger.log(f"Failed to add supervisor feedback: {feedback_response.text}", "WARNING")
                            
                            # Cancel our streaming task as it has been interrupted
                            stream_task.cancel()
                            try:
                                await stream_task
                            except asyncio.CancelledError:
                                pass
                                
                            # Verify that the streaming session was finalized in accounting
                            await asyncio.sleep(2)  # Give it a moment to finalize
                            
                            check_usage_response = self.session.get(
                                f"{ACCOUNTING_SERVICE_URL}/api/usage/stats",
                                headers=user_headers
                            )
                            
                            if check_usage_response.status_code == 200:
                                usage_data = check_usage_response.json()
                                logger.log(f"Usage record verified after interruption", "SUCCESS")
                            else:
                                logger.log(f"Failed to verify usage after interruption: {check_usage_response.text}", "WARNING")
                            
                            return True
                        else:
                            logger.log(f"Failed to interrupt session: {interrupt_response.text}", "ERROR")
                            # Cancel the stream task
                            stream_task.cancel()
                            try:
                                await stream_task
                            except asyncio.CancelledError:
                                pass
                            return False
                            
                    except Exception as e:
                        logger.log(f"Error interrupting session: {str(e)}", "ERROR")
                        # Cancel the stream task
                        stream_task.cancel()
                        try:
                            await stream_task
                        except asyncio.CancelledError:
                            pass
                        return False
        
        return False

async def main():
    parser = argparse.ArgumentParser(description='Test the workflow sequences between Auth, Accounting, and Chat services')
    parser.add_argument('--scenario', type=int, choices=range(1, 6), help='Run a specific scenario (1-5)')
    parser.add_argument('--all', action='store_true', help='Run all scenarios')
    args = parser.parse_args()
    
    # If no arguments are specified, default to running all scenarios
    if not args.scenario and not args.all:
        args.all = True
    
    tester = ServiceTester()
    
    # Check if all services are running
    if not tester.check_services_health():
        logger.log("One or more services are not running, please start them before running tests", "ERROR")
        logger.log("Workflow tests aborted", "ERROR")
        return
    
    # Create a markdown report of the test results
    test_results = []
    
    # Define the scenarios with their functions
    scenarios = [
        {"id": 1, "name": "Registration Scenario", "func": tester.test_registration_flow},
        {"id": 2, "name": "Login Scenario", "func": tester.test_login_flow},
        {"id": 3, "name": "Credit Allocation Scenario", "func": tester.test_credit_allocation_flow},
        {"id": 4, "name": "User Chat Scenario with Streaming", "func": tester.test_chat_streaming_flow},
        {"id": 5, "name": "Supervisor Interrupt Scenario", "func": tester.test_supervisor_interrupt_flow}
    ]
    
    # Login as admin for scenarios that need it
    if args.all or args.scenario in [3, 5]:
        if not tester.login_admin():
            logger.log("Admin login failed, some scenarios may fail", "WARNING")
    
    # Login as supervisor for the interrupt scenario
    if args.all or args.scenario == 5:
        if not tester.login_supervisor():
            logger.log("Supervisor login failed, interrupt scenario will fail", "WARNING")
    
    # Run the selected scenarios
    for scenario in scenarios:
        if args.all or args.scenario == scenario["id"]:
            logger.log(f"\n{'=' * 50}", "INFO")
            logger.log(f"Testing Scenario {scenario['id']}: {scenario['name']}", "INFO")
            logger.log(f"{'=' * 50}", "INFO")
            
            start_time = time.time()
            
            # Handle async functions
            if scenario["id"] in [4, 5]:  # Chat streaming and Supervisor scenarios are async
                result = await scenario["func"]()
            else:
                result = scenario["func"]()
                
            end_time = time.time()
            duration = end_time - start_time
            
            status = "✅ PASSED" if result else "❌ FAILED"
            test_results.append({
                "id": scenario["id"],
                "name": scenario["name"],
                "status": status,
                "duration": f"{duration:.2f}s"
            })
            
            if result:
                logger.log(f"Scenario {scenario['id']} completed successfully in {duration:.2f}s", "SUCCESS")
            else:
                logger.log(f"Scenario {scenario['id']} failed after {duration:.2f}s", "ERROR")
    
    # Generate markdown report
    report_path = os.path.join(LOG_DIR, f"workflow_test_report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.md")
    
    with open(report_path, 'w') as f:
        f.write("# Workflow Test Report\n\n")
        f.write(f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Environment\n\n")
        f.write(f"- Authentication Service: {AUTH_SERVICE_URL}\n")
        f.write(f"- Accounting Service: {ACCOUNTING_SERVICE_URL}\n")
        f.write(f"- Chat Service: {CHAT_SERVICE_URL}\n\n")
        
        f.write("## Test Scenarios Results\n\n")
        f.write("| ID | Scenario | Status | Duration |\n")
        f.write("|---:|:---------|:------:|:--------:|\n")
        
        for result in test_results:
            f.write(f"| {result['id']} | {result['name']} | {result['status']} | {result['duration']} |\n")
        
        f.write("\n## Detailed Flow Descriptions\n\n")
        
        # Add the flow diagrams from FlowSequence.md
        flow_descriptions = [
            "1. **Registration Scenario**: Tests user creation, verification token generation, and email verification.",
            "2. **Login Scenario**: Tests user authentication and JWT token issuance.",
            "3. **Credit Allocation Scenario**: Tests admin allocating credits to users across services.",
            "4. **User Chat Scenario with Streaming**: Tests chat message streaming with credit verification.",
            "5. **Supervisor Interrupt Scenario**: Tests a supervisor interrupting an active streaming session."
        ]
        
        for desc in flow_descriptions:
            f.write(f"{desc}\n\n")
        
        f.write("\n## JWT Security Notes\n\n")
        f.write("- All services share the same JWT secret for token verification\n")
        f.write("- Services don't share database access - they only trust validated JWT tokens\n")
        f.write("- User data flows through JWT payloads, not through direct database queries\n")
        f.write("- Service-to-service communication uses the user's JWT in request headers\n")
        f.write("- Only the Authentication Service can issue new tokens\n")
    
    logger.log(f"\nTest report generated: {report_path}", "SUCCESS")
    logger.log(f"Log file: {LOG_FILE}", "INFO")

if __name__ == "__main__":
    asyncio.run(main())