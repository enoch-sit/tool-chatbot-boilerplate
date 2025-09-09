#!/usr/bin/env python3
"""
Auth-Accounting Workflow Testing Script
This script tests the information flow between Authentication and Accounting services
as documented in the FlowSequence.md blueprint.

It focuses on the user registration, login, and credit allocation scenarios.
"""

import json
import requests
import time
import sys
import os
import uuid
import datetime
import argparse
from typing import Dict, List, Optional, Tuple, Any
from colorama import init, Fore, Style

# Initialize colorama for cross-platform colored terminal output
init()

# Configuration - Services URLs
AUTH_SERVICE_URL = "http://localhost:3000"
ACCOUNTING_SERVICE_URL = "http://localhost:3001"

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

# Setup logging
LOG_DIR = "test_logs"
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, f"auth_acc_workflow_test_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

class TestLogger:
    def __init__(self, log_file: str):
        self.log_file = log_file
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write(f"# Auth-Accounting Workflow Test Log - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
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
        
        # Write to log file with utf-8 encoding
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + "\n")

logger = TestLogger(LOG_FILE)

class AuthAccountingTester:
    def __init__(self):
        self.admin_token = None
        self.test_user_token = None
        self.test_user_id = None
        self.test_user_verification_token = None
        self.session = requests.Session()
        self.credit_allocation_id = None
    
    def check_services_health(self) -> bool:
        """Check if both services are running and healthy"""
        logger.log("Checking services health...", "INFO")
        
        services = [
            {"name": "Authentication", "url": f"{AUTH_SERVICE_URL}/health"},
            {"name": "Accounting", "url": f"{ACCOUNTING_SERVICE_URL}/health"}
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
                    # Validate JWT token structure
                    token_parts = self.test_user_token.split('.')
                    if len(token_parts) == 3:
                        logger.log("JWT token structure is valid", "SUCCESS")
                        try:
                            # Decode the payload part (second part)
                            import base64
                            # Fix padding for base64 decoding
                            payload = token_parts[1] + '=' * (4 - len(token_parts[1]) % 4)
                            decoded_payload = base64.b64decode(payload).decode('utf-8')
                            payload_json = json.loads(decoded_payload)
                            
                            # Check for required fields in the JWT payload
                            required_fields = ['sub', 'username', 'role', 'exp']
                            missing_fields = [field for field in required_fields if field not in payload_json]
                            
                            if not missing_fields:
                                logger.log(f"JWT payload contains all required fields: {', '.join(required_fields)}", "SUCCESS")
                                logger.log(f"User role from JWT: {payload_json.get('role')}", "INFO")
                            else:
                                logger.log(f"JWT payload missing fields: {', '.join(missing_fields)}", "WARNING")
                        except Exception as e:
                            logger.log(f"Error decoding JWT payload: {str(e)}", "WARNING")
                            
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
            
            # Step 1: Verify JWT works across services by checking admin access to Accounting service
            logger.log("Verifying admin access to Accounting service with JWT", "INFO")
            auth_check_response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/api/usage/system-stats",
                headers=headers
            )
            
            if auth_check_response.status_code == 200:
                logger.log("✅ JWT cross-service validation successful - Admin token valid in Accounting service", "SUCCESS")
            elif auth_check_response.status_code == 403:
                logger.log("❌ JWT is valid but user lacks admin privileges in Accounting service", "ERROR")
                return False
            elif auth_check_response.status_code == 401:
                logger.log("❌ JWT is invalid or not recognized by Accounting service", "ERROR")
                return False
            else:
                logger.log(f"❌ Unexpected response: {auth_check_response.status_code} - {auth_check_response.text}", "ERROR")
                return False
            
            # Step 2: Allocate credits to the test user
            logger.log(f"Allocating credits to test user ID: {self.test_user_id}", "INFO")
            
            # Set up credit allocation data
            allocation_data = {
                "userId": self.test_user_id,
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
                
                # Step 3: Verify user account was created in Accounting service based on JWT data
                logger.log("Verifying user account was created in Accounting service based on JWT data", "INFO")
                
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
                        logger.log("✅ User account was automatically created in Accounting service", "SUCCESS")
                    else:
                        logger.log(f"Failed to verify user balance: {balance_response.text}", "WARNING")
                        return False
                
                return True
            else:
                logger.log(f"Credit allocation failed: {response.text}", "ERROR")
                return False
                
        except requests.RequestException as e:
            logger.log(f"Credit allocation error: {str(e)}", "ERROR")
            return False

    def test_jwt_security(self) -> bool:
        """Test JWT security aspects and validation across services"""
        logger.log("\n=== Testing JWT Security Between Services ===", "INFO")
        
        if not self.test_user_token:
            logger.log("Test user token not available", "ERROR")
            return False
        
        # Test 1: Verify JWT works for user in Accounting service
        try:
            user_headers = {"Authorization": f"Bearer {self.test_user_token}"}
            
            # Check if token is valid in Accounting service
            balance_response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/api/credits/balance",
                headers=user_headers
            )
            
            if balance_response.status_code == 200:
                logger.log("✅ JWT is valid in Accounting service", "SUCCESS")
            else:
                logger.log(f"❌ JWT validation failed in Accounting service: {balance_response.text}", "ERROR")
                return False
            
            # Test 2: Verify expired/invalid JWT is rejected
            logger.log("Testing invalid JWT rejection", "INFO")
            
            # Create an invalid token by changing a character
            invalid_token = self.test_user_token[:-1] + ('X' if self.test_user_token[-1] != 'X' else 'Y')
            invalid_headers = {"Authorization": f"Bearer {invalid_token}"}
            
            invalid_response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/api/credits/balance",
                headers=invalid_headers
            )
            
            if invalid_response.status_code == 401:
                logger.log("✅ Invalid JWT correctly rejected by Accounting service", "SUCCESS")
            else:
                logger.log(f"❌ Invalid JWT not properly rejected: {invalid_response.status_code}", "ERROR")
                return False
            
            # Test 3: Verify role-based access control
            logger.log("Testing role-based access control", "INFO")
            
            # Try to access admin endpoint with regular user token
            admin_endpoint_response = self.session.get(
                f"{ACCOUNTING_SERVICE_URL}/api/usage/system-stats",
                headers=user_headers
            )
            
            if admin_endpoint_response.status_code == 403:
                logger.log("✅ Regular user correctly denied access to admin endpoint", "SUCCESS")
            elif admin_endpoint_response.status_code == 401:
                logger.log("❌ JWT validation failed when testing RBAC", "ERROR")
                return False
            elif admin_endpoint_response.status_code == 200:
                logger.log("❌ Security issue: Regular user has access to admin endpoint", "ERROR")
                return False
            else:
                logger.log(f"❌ Unexpected response during RBAC test: {admin_endpoint_response.status_code}", "ERROR")
                return False
            
            return True
                
        except requests.RequestException as e:
            logger.log(f"JWT security test error: {str(e)}", "ERROR")
            return False

def main():
    logger.log("Starting Auth-Accounting workflow test", "INFO")
    logger.log("This test validates the JWT sharing and information flow between Authentication and Accounting services", "INFO")
    
    tester = AuthAccountingTester()
    
    # Check if services are running
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
        {"id": 4, "name": "JWT Security Tests", "func": tester.test_jwt_security}
    ]
    
    # Login as admin for scenarios that need it
    admin_logged_in = tester.login_admin()
    if not admin_logged_in:
        logger.log("Admin login failed, some scenarios may fail", "WARNING")
    
    # Run all scenarios
    for scenario in scenarios:
        logger.log(f"\n{'=' * 50}", "INFO")
        logger.log(f"Testing Scenario {scenario['id']}: {scenario['name']}", "INFO")
        logger.log(f"{'=' * 50}", "INFO")
        
        start_time = time.time()
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
    report_path = os.path.join(LOG_DIR, f"auth_acc_workflow_test_report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.md")
    
    with open(report_path, 'w',encoding='utf-8') as f:
        f.write("# Auth-Accounting Workflow Test Report\n\n")
        f.write(f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Environment\n\n")
        f.write(f"- Authentication Service: {AUTH_SERVICE_URL}\n")
        f.write(f"- Accounting Service: {ACCOUNTING_SERVICE_URL}\n\n")
        
        f.write("## Test Scenarios Results\n\n")
        f.write("| ID | Scenario | Status | Duration |\n")
        f.write("|---:|:---------|:------:|:--------:|\n")
        
        for result in test_results:
            f.write(f"| {result['id']} | {result['name']} | {result['status']} | {result['duration']} |\n")
        
        f.write("\n## JWT Information Flow Details\n\n")
        
        # Add detailed JWT flow information
        f.write("### User Registration Flow\n\n")
        f.write("1. User is registered in Authentication service\n")
        f.write("2. Email verification is completed\n")
        f.write("3. Authentication service marks user as verified\n\n")
        
        f.write("### Login and JWT Issuance\n\n")
        f.write("1. Authentication service verifies user credentials\n")
        f.write("2. JWT token is generated containing user ID, username, email, and role\n")
        f.write("3. JWT is signed with a secret shared by both services\n")
        f.write("4. Token is returned to the client for subsequent requests\n\n")
        
        f.write("### Cross-Service Authentication\n\n")
        f.write("1. Client sends JWT in Authorization header to either service\n")
        f.write("2. Each service independently verifies the JWT signature using the shared secret\n")
        f.write("3. User identity and permissions are extracted from the validated token\n")
        f.write("4. No direct database queries between services - only JWT data is trusted\n\n")
        
        f.write("### First-Time User in Accounting Service\n\n")
        f.write("1. When a user first accesses the Accounting service, their JWT is validated\n")
        f.write("2. If the user doesn't exist in the Accounting database, a new record is created\n")
        f.write("3. User identity information is extracted from the JWT payload\n")
        f.write("4. This allows seamless user creation across services without shared databases\n\n")
        
        f.write("## JWT Security Notes\n\n")
        f.write("- All services share the same JWT secret for token verification\n")
        f.write("- Services don't share database access - they only trust validated JWT tokens\n")
        f.write("- User data flows through JWT payloads, not through direct database queries\n")
        f.write("- Only the Authentication Service can issue new tokens\n")
    
    logger.log(f"\nTest report generated: {report_path}", "SUCCESS")
    logger.log(f"Log file: {LOG_FILE}", "INFO")

if __name__ == "__main__":
    main()