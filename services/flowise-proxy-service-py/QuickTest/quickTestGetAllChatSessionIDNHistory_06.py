import json
import requests
import subprocess
import time
import sys
import os
import datetime  # Ensure datetime is imported
import pymongo  # For direct DB check

# This script is designed to test Chat history Retrieval using chatflowIDs and sessionIDs
# using the API. It will create a session for a regular user, ask questions, and verify responses.

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Configuration

AUTH_URL = "<http://localhost:3000>"
API_BASE_URL = "<http://localhost:8000>"
ACCOUNT_BASE_URL = "<http://localhost:3001>"

MONGODB_CONTAINER = "auth-mongodb"
ADMIN_USER = {
    "username": "admin",
    "email": "<admin@example.com>",
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

# For a REGULAR_USERS

# login through API_BASE_URL

# List the chatflow that he/she have access to [previously given by Admin]


def get_user_token(user):
    """Log in as a specified user and get the access token"""
    print(f"\n--- Getting access token for user: {user['username']} ---")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/chat/authenticate",
            json={
                "username": user["username"],
                "password": user["password"],
            },
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print(f"✅ Got access token for {user['username']}")
                return token
            else:
                print(f"❌ No access token in response for {user['username']}")
        else:
            print(
                f"❌ Failed to get token for {user['username']}: {response.status_code} {response.text}"
            )
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    return None


def list_accessible_chatflows(token, username):
    """
    Lists accessible chatflows for the given user token.
    Returns the ID of the first accessible chatflow, or None.
    """
    print(f"\n--- Listing accessible chatflows for user: {username} ---")
    if not token:
        print("❌ Cannot list chatflows without a token.")
        return None
    chatflows_url = f"{API_BASE_URL}/api/v1/chatflows"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(chatflows_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {username} has access to {len(data)} chatflows.")
            if data:
                print(f"First accessible chatflow: {data[0]}")
                return data[0]["id"] if "id" in data[0] else None
            else:
                print(f"No accessible chatflows for {username}.")
                return None
        else:
            print(
                f"❌ Failed to list chatflows for {username}: {response.status_code} {response.text}"
            )
            return None
    except requests.RequestException as e:
        print(f"❌ Request error while listing chatflows for {username}: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error while listing chatflows for {username}: {e}")
        return None


def list_all_chat_sessions(token, username, chatflow_id):
    """
    Lists all chat sessions for the user and chatflow.
    Returns a list of session_ids if successful.
    """
