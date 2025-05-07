#!/usr/bin/env python3
"""
Comprehensive Chat Service Testing Tool

This script automates testing of the Chat Service and its integrations with
Authentication and Accounting services. It scans Docker for service locations
and allows customization of endpoints.
# Basic usage with automatic service detection
python3 chat_service_tester.py

# With verbose output
python3 chat_service_tester.py -v

# Interactive mode to customize service URLs
python3 chat_service_tester.py -i

# Specify service URLs manually
python3 chat_service_tester.py --auth-url http://localhost:3000 --accounting-url http://localhost:3001 --chat-url http://localhost:3002
"""

import argparse
import json
import re
import subprocess
import sys
import time
import requests
import urllib3
from datetime import datetime
from pprint import pprint
from urllib.parse import urljoin

# Disable SSL warnings for testing environments
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Colors:
    """Terminal colors for output formatting"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class ChatServiceTester:
    """
    Main class for Chat Service testing.
    Handles service discovery, authentication, and test execution.
    """
    
    def __init__(self, args):
        """Initialize the tester with provided arguments."""
        self.args = args
        self.verbose = args.verbose
        
        # Service URLs (will be auto-detected or manually set)
        self.auth_url = args.auth_url
        self.accounting_url = args.accounting_url
        self.chat_url = args.chat_url
        
        # Tokens for different user roles
        self.admin_token = None
        self.supervisor_token = None
        self.user1_token = None
        self.user2_token = None
        
        # Active session data
        self.active_session_id = None
        self.streaming_session_id = None
        
        # Results tracking
        self.test_results = {
            "success": 0,
            "failure": 0,
            "skipped": 0,
            "total": 0,
            "details": []
        }
    
    def log(self, message, level="info", end='\n'):
        """Log messages with appropriate formatting based on level."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        if self.verbose or level != "debug":
            prefix = f"[{timestamp}] "
            if level == "info":
                print(f"{Colors.BLUE}{prefix}INFO:{Colors.ENDC} {message}", end=end)
            elif level == "success":
                print(f"{Colors.GREEN}{prefix}SUCCESS:{Colors.ENDC} {message}", end=end)
            elif level == "warning":
                print(f"{Colors.YELLOW}{prefix}WARNING:{Colors.ENDC} {message}", end=end)
            elif level == "error":
                print(f"{Colors.RED}{prefix}ERROR:{Colors.ENDC} {message}", end=end)
            elif level == "debug":
                print(f"{Colors.CYAN}{prefix}DEBUG:{Colors.ENDC} {message}", end=end)
            elif level == "header":
                print(f"\n{Colors.HEADER}{Colors.BOLD}{message}{Colors.ENDC}")
            sys.stdout.flush()
    
    def discover_services(self):
        """
        Discover services using Docker and update URLs if not manually specified.
        """
        self.log("Discovering service containers...", level="header")
        
        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "{{.Names}},{{.Ports}}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            docker_output = result.stdout.strip().split('\n')
            self.log(f"Found {len(docker_output)} running containers", level="debug")
            
            auth_container = None
            accounting_container = None
            chat_container = None
            
            # Search for service containers
            for line in docker_output:
                if not line:
                    continue
                    
                parts = line.split(',')
                if len(parts) < 2:
                    continue
                    
                container_name = parts[0]
                ports = parts[1]
                
                # Auth service
                if 'auth' in container_name.lower() and not auth_container and self.auth_url is None:
                    port_match = re.search(r'0.0.0.0:(\d+)->3000/tcp', ports)
                    if port_match:
                        port = port_match.group(1)
                        self.auth_url = f"http://localhost:{port}"
                        auth_container = container_name
                
                # Accounting service
                if 'accounting' in container_name.lower() and not accounting_container and self.accounting_url is None:
                    port_match = re.search(r'0.0.0.0:(\d+)->3001/tcp', ports)
                    if port_match:
                        port = port_match.group(1)
                        self.accounting_url = f"http://localhost:{port}"
                        accounting_container = container_name
                
                # Chat service
                if 'chat' in container_name.lower() and not chat_container and self.chat_url is None:
                    port_match = re.search(r'0.0.0.0:(\d+)->3002/tcp', ports)
                    if port_match:
                        port = port_match.group(1)
                        self.chat_url = f"http://localhost:{port}"
                        chat_container = container_name
            
            # Set default URLs if not found
            if self.auth_url is None:
                self.auth_url = "http://localhost:3000"
                self.log(f"Auth service not found in Docker, using default: {self.auth_url}", level="warning")
            else:
                self.log(f"Auth service found: {auth_container} at {self.auth_url}", level="success")
                
            if self.accounting_url is None:
                self.accounting_url = "http://localhost:3001"
                self.log(f"Accounting service not found in Docker, using default: {self.accounting_url}", level="warning")
            else:
                self.log(f"Accounting service found: {accounting_container} at {self.accounting_url}", level="success")
                
            if self.chat_url is None:
                self.chat_url = "http://localhost:3002"
                self.log(f"Chat service not found in Docker, using default: {self.chat_url}", level="warning")
            else:
                self.log(f"Chat service found: {chat_container} at {self.chat_url}", level="success")
                
        except subprocess.CalledProcessError as e:
            self.log(f"Error running docker ps: {e}", level="error")
            self.log("Using default service URLs", level="warning")
            if self.auth_url is None:
                self.auth_url = "http://localhost:3000"
            if self.accounting_url is None:
                self.accounting_url = "http://localhost:3001"
            if self.chat_url is None:
                self.chat_url = "http://localhost:3002"
        
        # Allow user to override URLs
        self.prompt_url_override()
        
        # Test connectivity to services
        self.test_connectivity()
    
    def prompt_url_override(self):
        """Prompt user to override detected URLs if needed."""
        if not self.args.interactive:
            return
            
        self.log("\nCurrent service URLs:", level="header")
        self.log(f"1. Auth Service:       {self.auth_url}")
        self.log(f"2. Accounting Service: {self.accounting_url}")
        self.log(f"3. Chat Service:       {self.chat_url}")
        
        override = input("\nWould you like to override any of these URLs? (y/N): ").strip().lower()
        if override == 'y':
            choice = input("Enter the number(s) of service to override (e.g., 1,3): ").strip()
            choices = [int(c) for c in choice.split(',') if c.isdigit() and 1 <= int(c) <= 3]
            
            if 1 in choices:
                self.auth_url = input(f"Enter new Auth Service URL [{self.auth_url}]: ").strip() or self.auth_url
            
            if 2 in choices:
                self.accounting_url = input(f"Enter new Accounting Service URL [{self.accounting_url}]: ").strip() or self.accounting_url
            
            if 3 in choices:
                self.chat_url = input(f"Enter new Chat Service URL [{self.chat_url}]: ").strip() or self.chat_url
            
            self.log("\nUpdated service URLs:", level="header")
            self.log(f"Auth Service:       {self.auth_url}")
            self.log(f"Accounting Service: {self.accounting_url}")
            self.log(f"Chat Service:       {self.chat_url}")
    
    def test_connectivity(self):
        """Test connectivity to all services."""
        self.log("\nTesting service connectivity...", level="header")
        
        # Test Auth Service
        try:
            response = requests.get(urljoin(self.auth_url, "/health"), timeout=5)
            if response.status_code == 200:
                self.log(f"Auth Service is reachable at {self.auth_url}", level="success")
            else:
                self.log(f"Auth Service returned unexpected status: {response.status_code}", level="warning")
        except requests.RequestException as e:
            self.log(f"Auth Service is unreachable at {self.auth_url}: {e}", level="error")
        
        # Test Accounting Service
        try:
            response = requests.get(urljoin(self.accounting_url, "/api/health"), timeout=5)
            if response.status_code == 200:
                self.log(f"Accounting Service is reachable at {self.accounting_url}", level="success")
            else:
                self.log(f"Accounting Service returned unexpected status: {response.status_code}", level="warning")
        except requests.RequestException as e:
            self.log(f"Accounting Service is unreachable at {self.accounting_url}: {e}", level="error")
        
        # Test Chat Service
        try:
            response = requests.get(urljoin(self.chat_url, "/api/health"), timeout=5)
            if response.status_code == 200:
                self.log(f"Chat Service is reachable at {self.chat_url}", level="success")
            else:
                self.log(f"Chat Service returned unexpected status: {response.status_code}", level="warning")
        except requests.RequestException as e:
            self.log(f"Chat Service is unreachable at {self.chat_url}: {e}", level="error")
    
    def run_test(self, test_name, test_func, *args, **kwargs):
        """Run a single test and track results."""
        self.test_results["total"] += 1
        
        self.log(f"\nRunning test: {test_name}...", level="header")
        start_time = time.time()
        
        try:
            result = test_func(*args, **kwargs)
            duration = time.time() - start_time
            
            if result:
                self.test_results["success"] += 1
                self.log(f"Test '{test_name}' passed in {duration:.2f}s", level="success")
            else:
                self.test_results["failure"] += 1
                self.log(f"Test '{test_name}' failed in {duration:.2f}s", level="error")
            
            self.test_results["details"].append({
                "name": test_name,
                "status": "success" if result else "failure",
                "duration": f"{duration:.2f}s"
            })
            
            return result
        except Exception as e:
            duration = time.time() - start_time
            self.test_results["failure"] += 1
            self.log(f"Test '{test_name}' failed with exception: {str(e)}", level="error")
            
            self.test_results["details"].append({
                "name": test_name,
                "status": "failure",
                "duration": f"{duration:.2f}s",
                "error": str(e)
            })
            
            return False
    
    def authenticate_users(self):
        """Authenticate all user types needed for testing."""
        self.log("\nAuthenticating test users...", level="header")
        
        # Authenticate as admin
        self.log("Authenticating as admin...", end=' ')
        try:
            response = requests.post(
                urljoin(self.auth_url, "/api/auth/login"),
                json={
                    "username": "admin",
                    "password": "admin@admin"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("accessToken")
                if self.admin_token:
                    self.log("Success", level="success")
                else:
                    self.log("Failed (No token in response)", level="error")
            else:
                self.log(f"Failed ({response.status_code})", level="error")
                self.log(f"Response: {response.text}", level="debug")
        except requests.RequestException as e:
            self.log(f"Failed ({str(e)})", level="error")
        
        # Authenticate as supervisor
        self.log("Authenticating as supervisor1...", end=' ')
        try:
            response = requests.post(
                urljoin(self.auth_url, "/api/auth/login"),
                json={
                    "username": "supervisor1",
                    "password": "Supervisor1@"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.supervisor_token = data.get("accessToken")
                if self.supervisor_token:
                    self.log("Success", level="success")
                else:
                    self.log("Failed (No token in response)", level="error")
            else:
                self.log(f"Failed ({response.status_code})", level="error")
                self.log(f"Response: {response.text}", level="debug")
        except requests.RequestException as e:
            self.log(f"Failed ({str(e)})", level="error")
        
        # Authenticate as user1
        self.log("Authenticating as user1...", end=' ')
        try:
            response = requests.post(
                urljoin(self.auth_url, "/api/auth/login"),
                json={
                    "username": "user1",
                    "password": "User1@123"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.user1_token = data.get("accessToken")
                if self.user1_token:
                    self.log("Success", level="success")
                else:
                    self.log("Failed (No token in response)", level="error")
            else:
                self.log(f"Failed ({response.status_code})", level="error")
                self.log(f"Response: {response.text}", level="debug")
        except requests.RequestException as e:
            self.log(f"Failed ({str(e)})", level="error")
        
        # Authenticate as user2
        self.log("Authenticating as user2...", end=' ')
        try:
            response = requests.post(
                urljoin(self.auth_url, "/api/auth/login"),
                json={
                    "username": "user2",
                    "password": "User2@123"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.user2_token = data.get("accessToken")
                if self.user2_token:
                    self.log("Success", level="success")
                else:
                    self.log("Failed (No token in response)", level="error")
            else:
                self.log(f"Failed ({response.status_code})", level="error")
                self.log(f"Response: {response.text}", level="debug")
        except requests.RequestException as e:
            self.log(f"Failed ({str(e)})", level="error")
        
        return all([self.admin_token, self.supervisor_token, self.user1_token, self.user2_token])
    
    def test_admin_allocate_credits(self):
        """Test admin allocating credits to user1."""
        if not self.admin_token:
            self.log("Admin token not available, skipping credit allocation test", level="warning")
            return False
        
        self.log("Allocating 1000 credits to user1...")
        try:
            response = requests.post(
                urljoin(self.accounting_url, "/api/credits/allocate"),
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json={
                    "targetUserId": "user1",
                    "credits": 1000,
                    "expiryDays": 30,
                    "notes": "Testing allocation"
                },
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.log(f"Credits allocated successfully: {data.get('credits')} credits", level="success")
                return True
            else:
                self.log(f"Failed to allocate credits: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error allocating credits: {str(e)}", level="error")
            return False
    
    def test_user_check_credits(self):
        """Test user1 checking their credit balance."""
        if not self.user1_token:
            self.log("User1 token not available, skipping credit check test", level="warning")
            return False
        
        self.log("Checking user1 credit balance...")
        try:
            response = requests.get(
                urljoin(self.accounting_url, "/api/credits/balance"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                credits = data.get("totalCredits", 0)
                self.log(f"User1 has {credits} credits", level="success")
                
                if credits > 0:
                    return True
                else:
                    self.log("User1 has no credits, subsequent tests may fail", level="warning")
                    return False
            else:
                self.log(f"Failed to check credits: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error checking credits: {str(e)}", level="error")
            return False
    
    def test_create_chat_session(self):
        """Test creating a new chat session as user1."""
        if not self.user1_token:
            self.log("User1 token not available, skipping session creation test", level="warning")
            return False
        
        self.log("Creating new chat session...")
        try:
            response = requests.post(
                urljoin(self.chat_url, "/api/chat/sessions"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                json={
                    "title": "Test Chat Session",
                    "initialMessage": "Hello, this is an automated test.",
                    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"
                },
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.active_session_id = data.get("sessionId")
                self.log(f"Chat session created with ID: {self.active_session_id}", level="success")
                return True
            else:
                self.log(f"Failed to create chat session: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error creating chat session: {str(e)}", level="error")
            return False
    
    def test_list_chat_sessions(self):
        """Test listing chat sessions as user1."""
        if not self.user1_token:
            self.log("User1 token not available, skipping list sessions test", level="warning")
            return False
        
        self.log("Listing chat sessions...")
        try:
            response = requests.get(
                urljoin(self.chat_url, "/api/chat/sessions"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                sessions = data.get("sessions", [])
                self.log(f"Found {len(sessions)} chat sessions", level="success")
                
                if self.verbose:
                    for idx, session in enumerate(sessions[:3], 1):
                        self.log(f"  {idx}. {session.get('title')} (ID: {session.get('sessionId')})")
                    
                    if len(sessions) > 3:
                        self.log(f"  ... and {len(sessions) - 3} more")
                
                return True
            else:
                self.log(f"Failed to list chat sessions: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error listing chat sessions: {str(e)}", level="error")
            return False
    
    def test_get_session_details(self):
        """Test retrieving details for a specific chat session."""
        if not self.user1_token or not self.active_session_id:
            self.log("User1 token or active session ID not available", level="warning")
            return False
        
        self.log(f"Getting details for session {self.active_session_id}...")
        try:
            response = requests.get(
                urljoin(self.chat_url, f"/api/chat/sessions/{self.active_session_id}"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                message_count = len(data.get("messages", []))
                self.log(f"Session has {message_count} messages", level="success")
                return True
            else:
                self.log(f"Failed to get session details: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error getting session details: {str(e)}", level="error")
            return False
    
    def test_send_non_streaming_message(self):
        """Test sending a non-streaming message to the chat session."""
        if not self.user1_token or not self.active_session_id:
            self.log("User1 token or active session ID not available", level="warning")
            return False
        
        self.log("Sending non-streaming message...")
        try:
            response = requests.post(
                urljoin(self.chat_url, f"/api/chat/sessions/{self.active_session_id}/messages"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                json={
                    "message": "What are three key principles of effective microservice architecture?",
                    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"
                },
                timeout=30  # Longer timeout for model response
            )
            
            if response.status_code == 200:
                self.log("Message sent successfully", level="success")
                return True
            else:
                self.log(f"Failed to send message: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error sending message: {str(e)}", level="error")
            return False
    
    def test_get_session_messages(self):
        """Test retrieving messages for a chat session."""
        if not self.user1_token or not self.active_session_id:
            self.log("User1 token or active session ID not available", level="warning")
            return False
        
        self.log("Getting session messages...")
        try:
            response = requests.get(
                urljoin(self.chat_url, f"/api/chat/sessions/{self.active_session_id}/messages"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get("messages", [])
                self.log(f"Retrieved {len(messages)} messages", level="success")
                
                if self.verbose and messages:
                    for idx, msg in enumerate(messages[:2], 1):
                        self.log(f"  Message {idx}: Role={msg.get('role')}, Content={msg.get('content')[:50]}...")
                    
                    if len(messages) > 2:
                        self.log(f"  ... and {len(messages) - 2} more messages")
                
                return True
            else:
                self.log(f"Failed to get messages: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error getting messages: {str(e)}", level="error")
            return False
    
    def test_get_available_models(self):
        """Test retrieving available models."""
        if not self.user1_token:
            self.log("User1 token not available", level="warning")
            return False
        
        self.log("Getting available models...")
        try:
            response = requests.get(
                urljoin(self.chat_url, "/api/models"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                self.log(f"Retrieved {len(models)} available models", level="success")
                
                if self.verbose and models:
                    for idx, model in enumerate(models[:3], 1):
                        self.log(f"  {idx}. {model.get('name')} (ID: {model.get('id')})")
                    
                    if len(models) > 3:
                        self.log(f"  ... and {len(models) - 3} more models")
                
                return True
            else:
                self.log(f"Failed to get models: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error getting models: {str(e)}", level="error")
            return False
    
    def test_get_model_recommendation(self):
        """Test getting a model recommendation based on task and priority."""
        if not self.user1_token:
            self.log("User1 token not available", level="warning")
            return False
        
        self.log("Getting model recommendation...")
        try:
            response = requests.post(
                urljoin(self.chat_url, "/api/models/recommend"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                json={
                    "task": "complex reasoning",
                    "priority": "quality"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                model = data.get("recommendedModel")
                reason = data.get("reason")
                self.log(f"Recommended model: {model}", level="success")
                self.log(f"Reason: {reason}", level="debug")
                return True
            else:
                self.log(f"Failed to get recommendation: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error getting recommendation: {str(e)}", level="error")
            return False
    
    def test_check_usage_stats(self):
        """Test checking usage statistics for user1."""
        if not self.user1_token:
            self.log("User1 token not available", level="warning")
            return False
        
        self.log("Checking usage statistics...")
        try:
            response = requests.get(
                urljoin(self.accounting_url, "/api/usage/stats"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                total_credits = data.get("totalCredits", 0)
                total_records = data.get("totalRecords", 0)
                self.log(f"Usage stats: {total_records} records, {total_credits} credits used", level="success")
                return True
            else:
                self.log(f"Failed to get usage stats: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error getting usage stats: {str(e)}", level="error")
            return False
    
    def test_supervisor_check_user_stats(self):
        """Test supervisor checking stats for a specific user."""
        if not self.supervisor_token:
            self.log("Supervisor token not available", level="warning")
            return False
        
        self.log("Supervisor checking user1 stats...")
        try:
            response = requests.get(
                urljoin(self.accounting_url, "/api/usage/stats/user1"),
                headers={"Authorization": f"Bearer {self.supervisor_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                total_credits = data.get("totalCredits", 0)
                total_records = data.get("totalRecords", 0)
                self.log(f"User1 stats (by supervisor): {total_records} records, {total_credits} credits used", level="success")
                return True
            else:
                self.log(f"Failed to get user stats: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error getting user stats: {str(e)}", level="error")
            return False
    
    def test_admin_system_stats(self):
        """Test admin checking system-wide statistics."""
        if not self.admin_token:
            self.log("Admin token not available", level="warning")
            return False
        
        self.log("Admin checking system-wide stats...")
        try:
            response = requests.get(
                urljoin(self.accounting_url, "/api/usage/system-stats"),
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                total_credits = data.get("totalCredits", 0)
                total_records = data.get("totalRecords", 0)
                self.log(f"System stats: {total_records} records, {total_credits} credits used", level="success")
                
                if self.verbose:
                    by_user = data.get("byUser", {})
                    self.log("Usage by user:")
                    for user, credits in by_user.items():
                        self.log(f"  {user}: {credits} credits")
                
                return True
            else:
                self.log(f"Failed to get system stats: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error getting system stats: {str(e)}", level="error")
            return False
    
    def test_delete_chat_session(self):
        """Test deleting a chat session."""
        if not self.user1_token or not self.active_session_id:
            self.log("User1 token or active session ID not available", level="warning")
            return False
        
        self.log(f"Deleting session {self.active_session_id}...")
        try:
            response = requests.delete(
                urljoin(self.chat_url, f"/api/chat/sessions/{self.active_session_id}"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                self.log("Session deleted successfully", level="success")
                self.active_session_id = None
                return True
            else:
                self.log(f"Failed to delete session: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error deleting session: {str(e)}", level="error")
            return False
    
    def test_invalid_model_id(self):
        """Test sending a request with an invalid model ID."""
        if not self.user1_token or not self.active_session_id:
            # Create a new session for this test
            self.test_create_chat_session()
            
        if not self.user1_token or not self.active_session_id:
            self.log("User1 token or active session ID not available", level="warning")
            return False
        
        self.log("Testing invalid model ID...")
        try:
            response = requests.post(
                urljoin(self.chat_url, f"/api/chat/sessions/{self.active_session_id}/messages"),
                headers={"Authorization": f"Bearer {self.user1_token}"},
                json={
                    "message": "Hello, this is a test with invalid model",
                    "modelId": "invalid-model-id-123"
                },
                timeout=10
            )
            
            # We expect this to fail with 400 Bad Request
            if response.status_code == 400:
                self.log("Received expected 400 Bad Request for invalid model ID", level="success")
                return True
            else:
                self.log(f"Unexpected response code: {response.status_code}", level="error")
                self.log(f"Response: {response.text}", level="debug")
                return False
        except requests.RequestException as e:
            self.log(f"Error sending request: {str(e)}", level="error")
            return False
    
    def print_summary(self):
        """Print a summary of all test results."""
        self.log("\nTest Summary", level="header")
        self.log(f"Total tests:  {self.test_results['total']}")
        self.log(f"Successes:    {self.test_results['success']}", level="success")
        self.log(f"Failures:     {self.test_results['failure']}", level="error" if self.test_results['failure'] > 0 else "info")
        self.log(f"Skipped:      {self.test_results['skipped']}", level="warning" if self.test_results['skipped'] > 0 else "info")
        
        success_rate = (self.test_results['success'] / self.test_results['total']) * 100 if self.test_results['total'] > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%")
        
        if self.verbose:
            self.log("\nTest Details", level="header")
            for idx, test in enumerate(self.test_results["details"], 1):
                status_color = Colors.GREEN if test["status"] == "success" else Colors.RED
                self.log(f"{idx}. {test['name']} - {status_color}{test['status'].upper()}{Colors.ENDC} ({test['duration']})")
                if test.get("error"):
                    self.log(f"   Error: {test['error']}", level="error")
    
    def run_tests(self):
        """Run all the tests in sequence."""
        self.discover_services()
        
        auth_success = self.authenticate_users()
        if not auth_success:
            self.log("Authentication failed for one or more users, some tests may be skipped", level="warning")
        
        # Core flow tests
        self.run_test("Admin allocates credits", self.test_admin_allocate_credits)
        self.run_test("User checks credit balance", self.test_user_check_credits)
        self.run_test("Create chat session", self.test_create_chat_session)
        self.run_test("List chat sessions", self.test_list_chat_sessions)
        self.run_test("Get session details", self.test_get_session_details)
        self.run_test("Send non-streaming message", self.test_send_non_streaming_message)
        self.run_test("Get session messages", self.test_get_session_messages)
        self.run_test("Get available models", self.test_get_available_models)
        self.run_test("Get model recommendation", self.test_get_model_recommendation)
        self.run_test("Check user usage stats", self.test_check_usage_stats)
        self.run_test("Supervisor checks user stats", self.test_supervisor_check_user_stats)
        self.run_test("Admin checks system stats", self.test_admin_system_stats)
        
        # Error case tests
        self.run_test("Test invalid model ID", self.test_invalid_model_id)
        
        # Cleanup
        if self.active_session_id:
            self.run_test("Delete chat session", self.test_delete_chat_session)
        
        self.print_summary()
        
        return self.test_results['failure'] == 0

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Chat Service Testing Tool")
    
    parser.add_argument("--auth-url", help="Authentication Service URL (default: auto-detect)")
    parser.add_argument("--accounting-url", help="Accounting Service URL (default: auto-detect)")
    parser.add_argument("--chat-url", help="Chat Service URL (default: auto-detect)")
    parser.add_argument("-i", "--interactive", action="store_true", help="Enable interactive mode for URL configuration")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose output")
    
    args = parser.parse_args()
    
    print(f"{Colors.HEADER}{Colors.BOLD}\nChat Service Testing Tool{Colors.ENDC}")
    print(f"Running tests at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    tester = ChatServiceTester(args)
    success = tester.run_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())