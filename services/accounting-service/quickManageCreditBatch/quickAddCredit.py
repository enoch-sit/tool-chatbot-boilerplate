#!/usr/bin/env python3
"""
User Management Script for Simple Authentication System
This script creates an admin user, promotes it to admin role, and uses it to create supervisors and regular users.
"""

import json
import requests
import subprocess
import time
import sys
import os
import datetime
import urllib

LOG_FILE = "add_credits.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration
API_BASE_URL = "http://localhost:3000"
ACCOUNT_BASE_URL = "http://localhost:3001"

MONGODB_CONTAINER = "auth-mongodb"
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin@aidcec",  # Please change this
    "role": "admin",  # update
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
        "username": f"User{i:02d}",
        "email": f"user{i:02d}@aidcec.com",
        "password": f"User{i:02d}@aidcec",
        "role": "enduser",
    }
    for i in range(1, 3)
]


# ADD Credit to Supervisor and Regular Users using the Admin User credentials
def get_admin_token():
    """Log in as admin and get the access token"""
    print("\n--- Getting admin access token ---")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/auth/login",
            json={
                "username": ADMIN_USER["username"],
                "password": ADMIN_USER["password"],
            },
        )

        if response.status_code == 200:
            data = response.json()
            # Try both access patterns to handle different API response formats
            token = data.get("accessToken")
            if not token:
                # Try nested format
                token = data.get("token", {}).get("accessToken")

            # If still no token, check for other formats based on API response
            if not token and isinstance(data, dict):
                # Print response structure for debugging
                print(f"Response structure: {json.dumps(data, indent=2)}")

                # Try to find any key that might contain the token
                for key, value in data.items():
                    if isinstance(value, str) and len(value) > 40:  # Likely a JWT token
                        token = value
                        print(f"Found potential token in field: {key}")
                        break

            if token:
                print("✅ Admin access token obtained")
                # Log successful login
                with open(LOG_PATH, "a") as log_file:
                    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_file.write(
                        f"[{timestamp}] Admin '{ADMIN_USER['username']}' logged in successfully\n"
                    )
                return token
            else:
                print("❌ Access token not found in response")
                print(f"Response data: {data}")
        else:
            print(f"❌ Failed to log in as admin: {response.text}")
    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

    return None


from typing import Dict, Optional, Any


def get_user_by_email(email: str, admin_token: str) -> Optional[Dict[str, Any]]:
    """
    Test the GET /api/admin/users/by-email/:email endpoint

    Args:
        email: User's email address
        admin_token: Admin JWT token for authentication

    Returns:
        Dict containing user info, or None if not found/error
    """
    print(f"\nTesting GET /api/admin/users/by-email/{email}")

    # URL encode the email
    encoded_email = urllib.parse.quote(email, safe="")
    url = f"{API_BASE_URL}/api/admin/users/by-email/{encoded_email}"

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {admin_token}",
    }

    try:
        print(f"Making request to: {url}")
        print(f"Headers: Authorization: Bearer {admin_token[:20]}...")

        response = requests.get(url, headers=headers, timeout=10)

        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Request successful!")
            print(f"Response: {json.dumps(data, indent=2)}")

            # Extract user data
            user_data = data.get("user")
            if user_data:
                return {
                    "user_id": user_data.get("_id"),
                    "username": user_data.get("username"),
                    "email": user_data.get("email"),
                    "role": user_data.get("role"),
                    "is_verified": user_data.get("isVerified", False),
                    "created_at": user_data.get("createdAt"),
                    "updated_at": user_data.get("updatedAt"),
                }
            else:
                print("⚠️ No user data in response")
                return None

        elif response.status_code == 404:
            print(f"❌ User not found: {email}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error response: {response.text}")
            return None

        elif response.status_code == 401:
            print("❌ Unauthorized - check admin token")
            return None

        elif response.status_code == 403:
            print("❌ Forbidden - admin access required")
            return None

        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None


def create_user_account(admin_token, sub, email, role, username=None):
    """
    Creates a new user account by calling the /api/admin/users endpoint.

    Args:
        base_url (str): The base URL of the accounting service.
        admin_token (str): The JWT token for an admin user.
        sub (str): The unique ID (sub/subject) for the new user.
        email (str): The email address for the new user.
        role (str): The role for the new user (e.g., 'enduser', 'supervisor', 'admin').
        username (str, optional): The username for the new user. Defaults to None.

    Returns:
        tuple: (status_code, response_data)
               response_data will be a dict if JSON, otherwise raw text.
               Returns (None, error_message_string) on request exception.
    """
    create_user_url = f"{ACCOUNT_BASE_URL}/api/admin/users"

    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }

    payload = {"sub": sub, "email": email, "role": role}

    if username:
        payload["username"] = username

    print(f"Attempting to create user with payload: {json.dumps(payload, indent=2)}")
    print(f"Target URL: {create_user_url}")

    try:
        response = requests.post(create_user_url, headers=headers, json=payload)

        response_data = None
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            response_data = response.text

        return response.status_code, response_data

    except requests.exceptions.RequestException as e:
        error_message = f"An error occurred: {e}"
        print(error_message)
        return None, error_message


def allocate_credit_to_user(user, token):
    """Allocate credit to a user using the admin token by their email"""
    print(
        f"\n--- Allocating credits to {user['username']} (email: {user['email']}) ---"
    )

    # Default credit allocation amounts
    credit_amounts = {
        "admin": 5000,
        "supervisor": 6000,  # Supervisors get 6000 credits
        "enduser": 200,  # Regular users get 30 credits
    }

    credit_amount = credit_amounts.get(
        user["role"], 100
    )  # Default 100 if role not found

    try:
        response = requests.post(
            f"{ACCOUNT_BASE_URL}/api/credits/allocate-by-email",  # Updated endpoint
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "email": user["email"],  # Use email instead of userId
                "credits": credit_amount,
                "expiryDays": 365,  # Credits expire in 1 year
                "notes": f"Initial credit allocation for {user['role']} user {user['username']}",
            },
        )

        if (
            response.status_code == 201
        ):  # Assuming 201 for successful creation/allocation
            data = response.json()
            print(
                f"✅ Successfully allocated {credit_amount} credits to {user['username']} (email: {user['email']})"
            )

            # Log successful allocation
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Allocated {credit_amount} credits to {user['role']}: "
                    f"username='{user['username']}', email='{user['email']}' via email endpoint\n"
                )
            return True
        else:
            print(
                f"❌ Failed to allocate credits to {user['username']} (email: {user['email']}): {response.status_code} - {response.text}"
            )
            return False

    except requests.RequestException as e:
        print(
            f"❌ Request error while allocating credits to {user['username']} (email: {user['email']}): {e}"
        )
        return False
    except Exception as e:
        print(
            f"❌ Unexpected error while allocating credits to {user['username']} (email: {user['email']}): {e}"
        )
        return False


def main():
    # Create log file header if it doesn't exist or is empty
    if not os.path.exists(LOG_PATH) or os.path.getsize(LOG_PATH) == 0:
        with open(LOG_PATH, "w") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"# User Add Credit Log - Started {timestamp}\n")
            log_file.write(
                "# Format: [timestamp] Allocated credits to user_type: username='xxx', email='xxx'\n\n"
            )

    # Get admin access token
    admin_token = get_admin_token()
    if not admin_token:
        sys.exit(1)

    print("\n=== Starting Credit Allocation Process ===")

    # Combine all users that need credit allocation
    all_users = [ADMIN_USER] + SUPERVISOR_USERS + REGULAR_USERS

    successful_allocations = 0
    failed_allocations = 0

    # Allocate credits to each user
    for user in all_users:
        user_data = get_user_by_email(email=user["email"], admin_token=admin_token)

        # If user is found in the auth service, proceed to create account and allocate credit
        if user_data:
            # Create the user account in the accounting service
            status_code, response_data = create_user_account(
                admin_token,
                user_data["user_id"],  # This is the sub from the auth service
                user_data["email"],
                user_data["role"],
                user_data["username"],
            )

            # Check if the user was created or already exists (409 Conflict)
            if status_code == 201 or status_code == 409:
                # Now, allocate the credit
                success = allocate_credit_to_user(user, admin_token)
                if success:
                    successful_allocations += 1
                else:
                    failed_allocations += 1
            else:
                print(
                    f"❌ Failed to create user account for {user['email']}: {status_code} - {response_data}"
                )
                failed_allocations += 1
        else:
            # If user is not found in the auth service, log it and mark as failed
            print(
                f"⚠️ User with email {user['email']} not found in auth-service. Skipping credit allocation."
            )
            failed_allocations += 1

        # Small delay between requests to avoid overwhelming the server
        time.sleep(0.5)

    # Summary
    print(f"\n=== Credit Allocation Summary ===")
    print(f"✅ Successful allocations: {successful_allocations}")
    print(f"❌ Failed allocations: {failed_allocations}")
    print(f"📄 Log file: {LOG_PATH}")

    # Final log entry
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(
            f"\n[{timestamp}] Credit allocation completed - "
            f"Success: {successful_allocations}, Failed: {failed_allocations}\n"
        )

    if failed_allocations > 0:
        print("\n⚠️  Some credit allocations failed. Check the log file for details.")
        sys.exit(1)
    else:
        print("\n🎉 All credit allocations completed successfully!")


if __name__ == "__main__":
    main()
