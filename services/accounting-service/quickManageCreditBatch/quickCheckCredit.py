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
from urllib.parse import quote

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


def check_user_credits(admin_token, user_id, username, user_type):
    """Check credit balance for a specific user"""
    print(f"\n--- Checking credits for {user_type}: {username} ---")
    try:
        # URL encode the user_id in case it's an email
        encoded_user_id = quote(user_id, safe="")
        response = requests.get(
            f"{ACCOUNT_BASE_URL}/api/credits/balance/{encoded_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        if response.status_code == 200:
            data = response.json()
            total_credits = data.get("totalCredits", 0)
            active_allocations = data.get("activeAllocations", [])

            print(f"✅ {username} - Total Credits: {total_credits}")
            if active_allocations:
                print(f"   Active Allocations: {len(active_allocations)}")
                for allocation in active_allocations:
                    remaining = allocation.get("remainingCredits", 0)
                    expires_at = allocation.get("expiresAt", "N/A")
                    print(f"   - Remaining: {remaining}, Expires: {expires_at}")
            else:
                print("   No active allocations")

            # Log successful credit check
            with open(LOG_PATH, "a") as log_file:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_file.write(
                    f"[{timestamp}] Checked credits for {user_type}: username='{username}', "
                    f"user_id='{user_id}', total_credits={total_credits}, "
                    f"active_allocations={len(active_allocations)}\n"
                )

            return {
                "success": True,
                "credits": total_credits,
                "allocations": active_allocations,
            }

        elif response.status_code == 404:
            print(f"❌ User {username} not found in accounting system")
            return {"success": False, "error": "User not found"}
        else:
            print(f"❌ Failed to check credits for {username}: {response.text}")
            return {"success": False, "error": response.text}

    except requests.RequestException as e:
        print(f"❌ Request error checking credits for {username}: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        print(f"❌ Unexpected error checking credits for {username}: {e}")
        return {"success": False, "error": str(e)}


def check_all_users_credits(admin_token):
    """Check credits for all supervisor and regular users"""
    print("\n=== Checking Credits for All Users ===")

    all_users = SUPERVISOR_USERS + REGULAR_USERS
    results = []

    for user in all_users:
        # For this example, we'll use username as user_id
        # In a real system, you'd need to get the actual user ID from the auth service
        user_id = user[
            "email"
        ]  # This should be replaced with actual user ID lookup or email
        result = check_user_credits(
            admin_token, user_id, user["username"], user["role"]
        )
        results.append(
            {"username": user["username"], "role": user["role"], "result": result}
        )

        # Small delay between requests
        time.sleep(0.5)

    # Summary
    print("\n=== Credit Check Summary ===")
    successful_checks = sum(1 for r in results if r["result"]["success"])
    total_checks = len(results)
    print(f"Successful checks: {successful_checks}/{total_checks}")

    for result in results:
        status = "✅" if result["result"]["success"] else "❌"
        credits = result["result"].get("credits", "N/A")
        print(f"{status} {result['username']} ({result['role']}): {credits} credits")

    return results


def check_specific_user_credits(admin_token, username):
    """Check credits for a specific user by username"""
    print(f"\n=== Checking Credits for Specific User: {username} ===")

    # Find user in our lists
    all_users = SUPERVISOR_USERS + REGULAR_USERS
    target_user = None

    for user in all_users:
        if user["username"] == username:
            target_user = user
            break

    if not target_user:
        print(f"❌ User '{username}' not found in configured users list")
        return {"success": False, "error": "User not found in configuration"}

    # Use username as user_id (replace with actual ID lookup in real system)
    user_id = target_user["username"]
    return check_user_credits(
        admin_token, user_id, target_user["username"], target_user["role"]
    )


def main():
    # Create log file header if it doesn't exist or is empty
    if not os.path.exists(LOG_PATH) or os.path.getsize(LOG_PATH) == 0:
        with open(LOG_PATH, "w") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"# User Credit Check Log - Started {timestamp}\n")
            log_file.write(
                "# Format: [timestamp] Checked credits for user_type: username='xxx', user_id='xxx', total_credits=xxx, active_allocations=xxx\n\n"
            )

    # Get admin access token
    admin_token = get_admin_token()
    if not admin_token:
        sys.exit(1)

    print("\n=== Starting Credit Check Process ===")

    # Check if user wants to check specific user or all users
    if len(sys.argv) > 1:
        # Check specific user
        username = sys.argv[1]
        result = check_specific_user_credits(admin_token, username)
        if result["success"]:
            print(f"\n✅ Credit check completed for {username}")
        else:
            print(
                f"\n❌ Credit check failed for {username}: {result.get('error', 'Unknown error')}"
            )
    else:
        # Check all users
        results = check_all_users_credits(admin_token)

        # Log summary
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            successful = sum(1 for r in results if r["result"]["success"])
            total = len(results)
            log_file.write(
                f"[{timestamp}] Credit check summary: {successful}/{total} successful\n"
            )

        print(
            f"\n✅ Credit check process completed. Check {LOG_PATH} for detailed logs."
        )


if __name__ == "__main__":
    main()
