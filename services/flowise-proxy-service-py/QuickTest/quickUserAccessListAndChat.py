
import json
import requests
import subprocess
import time
import sys
import os
import datetime # Ensure datetime is imported
import pymongo # For direct DB check

LOG_FILE = "chatflow_sync_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration
AUTH_URL = "http://localhost:3000"
API_BASE_URL = "http://localhost:8000"
ACCOUNT_BASE_URL = "http://localhost:3001"

MONGODB_CONTAINER = "auth-mongodb"
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

# Test users for role verification
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

## For a REGULAR_USERS
# login through API_BASE_URL
# List the chatflow that he/she have access to [previously given by Admin]

def login_user_and_list_chatflows(user_credentials):
    """
    Logs in a user and lists their accessible chatflows.
    Assumes API_BASE_URL/api/v1/login and API_BASE_URL/api/v1/chatflows
    """
    login_url = f"{API_BASE_URL}/api/v1/login" # Adjust if your login endpoint is different
    chatflows_url = f"{API_BASE_URL}/api/v1/chatflows" # Adjust if your chatflows endpoint is different

    session = requests.Session() # Use a session to persist cookies if needed, or manage tokens manually

    # 1. Login user
    try:
        print(f"Attempting to log in user: {user_credentials['email']}")
        login_payload = {
            "email": user_credentials["email"],
            "password": user_credentials["password"]
        }
        response = session.post(login_url, json=login_payload)
        response.raise_for_status() # Raises an HTTPError for bad responses (4XX or 5XX)
        
        login_data = response.json()
        access_token = login_data.get("accessToken") # Or whatever your token field is named

        if not access_token:
            print(f"Login failed for {user_credentials['email']}: No access token in response.")
            print(f"Response: {login_data}")
            return

        print(f"Login successful for {user_credentials['email']}.")

        # 2. List chatflows using the access token
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        print(f"Fetching chatflows for {user_credentials['email']}...")
        response = session.get(chatflows_url, headers=headers) # Or requests.get if not using session for this
        response.raise_for_status()

        chatflows_data = response.json()
        print(f"Chatflows accessible to {user_credentials['email']}:")
        print(json.dumps(chatflows_data, indent=2))

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response content: {response.text}")
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred: {req_err}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# Example usage with the first regular user:
if __name__ == "__main__":
    if REGULAR_USERS:
        first_user = REGULAR_USERS[0]
        # Note: You might need to ensure your Flowise instance or proxy is running
        # and the endpoints /api/v1/login and /api/v1/chatflows exist and function as expected.
        # login_user_and_list_chatflows(first_user) # Uncomment to run
        print("Example function login_user_and_list_chatflows defined.")
        print("Uncomment the call in __main__ to test it.")
        login_user_and_list_chatflows(first_user)
    else:
        print("No regular users defined to test with.")