#!/usr/bin/env python3
import requests
import json
import sys
import time
from colorama import Fore, Style, init

# Initialize colorama for colored terminal output
init(autoreset=True)

# Configuration
AUTH_SERVICE_URL = "http://localhost:3000/api"
ACCOUNTING_SERVICE_URL = "http://localhost:3001/api"

# Test user credentials
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

class CreditTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.headers = {}
    
    def check_services_health(self):
        """Check if auth and accounting services are healthy"""
        Logger.header("CHECKING SERVICES HEALTH")
        
        services = [ 
            {"name": "Auth Service", "url": f"{AUTH_SERVICE_URL.replace('/api', '')}/health"},
            {"name": "Accounting Service", "url": f"{ACCOUNTING_SERVICE_URL.replace('/api', '')}/health"}
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
    
    def test_credit_check_endpoint(self):
        """Test the credit checking endpoint with retry mechanism"""
        Logger.header("TESTING CREDIT CHECK ENDPOINT")
        
        # Add retry mechanism for potentially flaky network operations
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    Logger.info(f"Retry attempt {attempt+1}/{max_retries}...")
                
                response = self.session.post(
                    f"{ACCOUNTING_SERVICE_URL}/credits/check",
                    headers=self.headers,
                    json={
                        "requiredCredits": 100  # Corrected parameter name
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    Logger.success(f"Credit check successful: Has sufficient credits = {data.get('sufficient', False)}")
                    Logger.info(json.dumps(data, indent=2))
                    return True
                # Handle specific error codes that might benefit from retry
                elif response.status_code in [502, 503, 504]:  # Gateway errors, service unavailable
                    if attempt < max_retries - 1:
                        retry_delay = (attempt + 1) * 2  # Progressive backoff: 2s, 4s, 6s...
                        Logger.warning(f"Service temporarily unavailable ({response.status_code}). Retrying in {retry_delay}s...")
                        time.sleep(retry_delay)
                    else:
                        Logger.error(f"Credit check failed after {max_retries} attempts: {response.status_code}")
                        return False
                else:
                    Logger.error(f"Credit check failed: {response.status_code}, {response.text}")
                    return False
                    
            except requests.RequestException as e:
                Logger.error(f"Credit check error: {str(e)}")
                if attempt < max_retries - 1:
                    retry_delay = (attempt + 1) * 2
                    Logger.warning(f"Network error. Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    return False
        
        return False  # All retries failed
    
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

def run_test():
    Logger.header("CREDIT SERVICE API TEST SCRIPT")
    
    tester = CreditTester()
    
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
    
    # Check credit balance
    tester.check_credit_balance()
    
    # Test credit check endpoint with corrected parameters
    tester.test_credit_check_endpoint()

if __name__ == "__main__":
    run_test()