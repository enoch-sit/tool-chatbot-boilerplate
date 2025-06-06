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


def allocate_credit_to_user(user, token):
    """Allocate credit to a user using the admin token"""
    print(f"\n--- Allocating credits to {user['username']} ---")

    # Default credit allocation amounts
    credit_amounts = {
        "supervisor": 1000,  # Supervisors get 1000 credits
        "enduser": 500,  # Regular users get 500 credits
    }

    credit_amount = credit_amounts.get(
        user["role"], 100
    )  # Default 100 if role not found

    try:
        response = requests.post(
            f"{ACCOUNT_BASE_URL}/api/credits/allocate",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "userId": user.get("userId"),  # Assuming userId is available
                "credits": credit_amount,
                "expiryDays": 365,  # Credits expire in 1 year
                "notes": f"Initial credit allocation for {user['role']} user {user['username']}",
            },
        )

        if response.status_code == 201:
            data = response.json()
            print(
                f"✅ Successfully allocated {credit_amount} credits to {user['username']}"
            )

            # Log successful allocation
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Allocated {credit_amount} credits to {user['role']}: "
                    f"username='{user['username']}', email='{user['email']}'\n"
                )
            return True
        else:
            print(
                f"❌ Failed to allocate credits to {user['username']}: {response.text}"
            )
            return False

    except requests.RequestException as e:
        print(f"❌ Request error while allocating credits to {user['username']}: {e}")
        return False
    except Exception as e:
        print(
            f"❌ Unexpected error while allocating credits to {user['username']}: {e}"
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
    all_users = SUPERVISOR_USERS + REGULAR_USERS

    successful_allocations = 0
    failed_allocations = 0

    # Allocate credits to each user
    for user in all_users:
        # Note: In a real scenario, you would need to get the userId from the user management system
        # For this example, we'll assume the userId is the same as username or needs to be fetched
        user["userId"] = user[
            "username"
        ]  # Placeholder - adjust based on your user ID system

        success = allocate_credit_to_user(user, admin_token)
        if success:
            successful_allocations += 1
        else:
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
