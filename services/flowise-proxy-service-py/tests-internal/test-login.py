#!/usr/bin/env python3
"""
Docker Login Test Script for Flowise Proxy Service

This script tests login functionality against the deployed Docker container
using predefined test credentials and validates JWT token responses.

Usage: python test-login.py [--host localhost] [--port 8000]
"""

import sys
import os
import requests
import json
import jwt
import time
from datetime import datetime
from typing import Dict, List, Optional

# Test credentials
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

class DockerLoginTester:
    """Test login functionality against Docker deployment"""
    
    def __init__(self, host: str = "localhost", port: int = 8000):
        self.base_url = f"http://{host}:{port}"
        self.auth_endpoint = f"{self.base_url}/api/chat/authenticate"
        self.chatflows_endpoint = f"{self.base_url}/api/chatflows"
        self.test_results = []
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = f"{status} {test_name}"
        if details:
            result += f": {details}"
        
        self.test_results.append((test_name, passed, details))
        print(result)
    
    def test_service_health(self) -> bool:
        """Test if the service is running and reachable"""
        try:
            response = requests.get(f"{self.base_url}/docs", timeout=5)
            if response.status_code == 200:
                self.log_test("Service Health Check", True, f"Service accessible at {self.base_url}")
                return True
            else:
                self.log_test("Service Health Check", False, f"HTTP {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            self.log_test("Service Health Check", False, "Connection refused - service not running")
            return False
        except Exception as e:
            self.log_test("Service Health Check", False, f"Error: {str(e)}")
            return False
    
    def attempt_login(self, user: Dict) -> Optional[Dict]:
        """Attempt login with user credentials"""
        try:
            login_data = {
                "username": user["username"],
                "password": user["password"]
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            response = requests.post(
                self.auth_endpoint,
                json=login_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"   Login failed with status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"   Login error: {str(e)}")
            return None
    
    def validate_jwt_token(self, token: str, expected_user: Dict) -> bool:
        """Validate JWT token structure and claims"""
        try:
            # Decode without verification to check structure
            header = jwt.get_unverified_header(token)
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Check algorithm
            if header.get("alg") != "HS256":
                print(f"   ❌ Wrong algorithm: {header.get('alg')} (expected HS256)")
                return False
            
            # Check required claims
            required_claims = ["user_id", "username", "exp", "iat", "iss", "aud"]
            missing_claims = [claim for claim in required_claims if claim not in payload]
            
            if missing_claims:
                print(f"   ❌ Missing claims: {missing_claims}")
                return False
            
            # Check username matches
            if payload.get("username") != expected_user["username"]:
                print(f"   ❌ Username mismatch: {payload.get('username')} != {expected_user['username']}")
                return False
            
            # Check issuer and audience
            if payload.get("iss") != "flowise-proxy-service":
                print(f"   ❌ Wrong issuer: {payload.get('iss')}")
                return False
            
            if payload.get("aud") != "flowise-api":
                print(f"   ❌ Wrong audience: {payload.get('aud')}")
                return False
            
            # Check expiration
            exp = payload.get("exp")
            if exp and exp < time.time():
                print(f"   ❌ Token expired")
                return False
            
            print(f"   ✅ JWT valid: algorithm={header.get('alg')}, claims={len(payload)}")
            return True
            
        except Exception as e:
            print(f"   ❌ JWT validation error: {str(e)}")
            return False
    
    def test_authenticated_request(self, token: str) -> bool:
        """Test authenticated request using JWT token"""
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            }
            
            response = requests.get(
                self.chatflows_endpoint,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 404]:  # 404 is OK if no chatflows exist
                print(f"   ✅ Authenticated request successful: HTTP {response.status_code}")
                return True
            else:
                print(f"   ❌ Authenticated request failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Authenticated request error: {str(e)}")
            return False
    
    def test_user_login(self, user: Dict, user_type: str) -> bool:
        """Test complete login flow for a user"""
        print(f"\n🔐 Testing {user_type}: {user['username']}")
        
        # Attempt login
        login_response = self.attempt_login(user)
        if not login_response:
            self.log_test(f"{user_type} Login ({user['username']})", False, "Login request failed")
            return False
        
        # Check response structure
        if "access_token" not in login_response:
            self.log_test(f"{user_type} Login ({user['username']})", False, "No access_token in response")
            return False
        
        token = login_response["access_token"]
        
        # Validate JWT token
        if not self.validate_jwt_token(token, user):
            self.log_test(f"{user_type} JWT Validation ({user['username']})", False, "JWT validation failed")
            return False
        
        # Test authenticated request
        if not self.test_authenticated_request(token):
            self.log_test(f"{user_type} Auth Request ({user['username']})", False, "Authenticated request failed")
            return False
        
        self.log_test(f"{user_type} Complete Flow ({user['username']})", True, "All tests passed")
        return True
    
    def run_all_tests(self) -> Dict:
        """Run all login tests"""
        print("🚀 Docker Login Test Suite for Flowise Proxy Service")
        print("=" * 60)
        print(f"Target: {self.base_url}")
        print(f"Auth Endpoint: {self.auth_endpoint}")
        print()
        
        # Test service health first
        if not self.test_service_health():
            print("\n❌ Service health check failed. Ensure Docker container is running.")
            return {"status": "FAIL", "reason": "Service not accessible"}
        
        print()
        
        # Test all users
        all_users = [
            (ADMIN_USER, "Admin User"),
            *[(user, f"Supervisor User") for user in SUPERVISOR_USERS],
            *[(user, f"Regular User") for user in REGULAR_USERS]
        ]
        
        passed = 0
        total = len(all_users)
        
        for user, user_type in all_users:
            if self.test_user_login(user, user_type):
                passed += 1
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} users logged in successfully")
        
        if passed == total:
            print("🎉 All login tests PASSED! HS256 JWT implementation working correctly.")
            status = "PASS"
        else:
            print("⚠️  Some login tests FAILED. Check implementation or user setup.")
            status = "FAIL"
        
        return {
            "status": status,
            "passed": passed,
            "total": total,
            "base_url": self.base_url,
            "results": self.test_results
        }
    
    def test_invalid_credentials(self) -> bool:
        """Test login with invalid credentials"""
        print("\n🔒 Testing Invalid Credentials")
        
        invalid_users = [
            {"username": "nonexistent", "password": "wrongpass"},
            {"username": "admin", "password": "wrongpassword"},
            {"username": "", "password": ""},
        ]
        
        all_passed = True
        
        for invalid_user in invalid_users:
            response = self.attempt_login(invalid_user)
            if response is None:
                print(f"   ✅ Correctly rejected: {invalid_user['username']}")
            else:
                print(f"   ❌ Should have rejected: {invalid_user['username']}")
                all_passed = False
        
        self.log_test("Invalid Credentials Test", all_passed, "Security validation")
        return all_passed

def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Docker login functionality")
    parser.add_argument("--host", default="localhost", help="Docker host (default: localhost)")
    parser.add_argument("--port", type=int, default=8000, help="Docker port (default: 8000)")
    parser.add_argument("--test-invalid", action="store_true", help="Also test invalid credentials")
    
    args = parser.parse_args()
    
    try:
        tester = DockerLoginTester(args.host, args.port)
        
        # Run main tests
        results = tester.run_all_tests()
        
        # Test invalid credentials if requested
        if args.test_invalid:
            tester.test_invalid_credentials()
        
        # Exit with appropriate code
        sys.exit(0 if results["status"] == "PASS" else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ FATAL ERROR during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()