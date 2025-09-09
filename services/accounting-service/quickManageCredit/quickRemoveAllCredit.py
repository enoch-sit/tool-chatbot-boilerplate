#!/usr/bin/env python3
"""
Credit Removal Script for Accounting Service
This script removes all credits from all configured users using admin credentials.
"""

import json
import requests
import time
import sys
import os
import datetime

LOG_FILE = "remove_credits.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration
API_BASE_URL = "http://localhost:3000"
ACCOUNT_BASE_URL = "http://localhost:3001"

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


def get_user_credit_allocations(admin_token, user_id, username):
    """Get all credit allocations for a user"""
    try:
        response = requests.get(
            f"{ACCOUNT_BASE_URL}/api/credits/balance/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        if response.status_code == 200:
            data = response.json()
            return data.get("activeAllocations", [])
        elif response.status_code == 404:
            print(f"ℹ️  User {username} not found in accounting system")
            return []
        else:
            print(f"❌ Failed to get allocations for {username}: {response.text}")
            return []

    except requests.RequestException as e:
        print(f"❌ Request error getting allocations for {username}: {e}")
        return []


def remove_all_credits_from_user(user, admin_token):
    """Remove all credits from a specific user"""
    username = user["username"]
    user_id = user.get("userId", username)  # Use userId if available, else username
    
    print(f"\n--- Removing all credits from {username} ---")

    try:
        # First, get current allocations
        allocations = get_user_credit_allocations(admin_token, user_id, username)
        
        if not allocations:
            print(f"ℹ️  No active credit allocations found for {username}")
            return True

        print(f"Found {len(allocations)} active allocation(s) for {username}")
        
        removed_count = 0
        failed_count = 0

        # Remove each allocation
        for allocation in allocations:
            allocation_id = allocation.get("_id") or allocation.get("id")
            remaining_credits = allocation.get("remainingCredits", 0)
            
            if not allocation_id:
                print(f"⚠️  Allocation missing ID, skipping...")
                failed_count += 1
                continue

            print(f"  Removing allocation {allocation_id} ({remaining_credits} credits)...")
            
            # Try different API endpoints for removing credits
            endpoints_to_try = [
                f"{ACCOUNT_BASE_URL}/api/credits/allocations/{allocation_id}",
                f"{ACCOUNT_BASE_URL}/api/credits/remove/{allocation_id}",
                f"{ACCOUNT_BASE_URL}/api/credits/revoke/{allocation_id}"
            ]
            
            success = False
            for endpoint in endpoints_to_try:
                try:
                    response = requests.delete(
                        endpoint,
                        headers={
                            "Authorization": f"Bearer {admin_token}",
                            "Content-Type": "application/json",
                        },
                    )

                    if response.status_code in [200, 204]:
                        print(f"    ✅ Removed allocation {allocation_id}")
                        removed_count += 1
                        success = True
                        break
                    elif response.status_code == 404:
                        print(f"    ℹ️  Allocation {allocation_id} already removed")
                        removed_count += 1
                        success = True
                        break
                    else:
                        print(f"    ❌ Failed via {endpoint}: {response.status_code} - {response.text}")
                        
                except requests.RequestException as e:
                    print(f"    ❌ Request error via {endpoint}: {e}")
                    continue

            if not success:
                # Try alternative approach: set remaining credits to 0
                try:
                    response = requests.patch(
                        f"{ACCOUNT_BASE_URL}/api/credits/allocations/{allocation_id}",
                        headers={
                            "Authorization": f"Bearer {admin_token}",
                            "Content-Type": "application/json",
                        },
                        json={"remainingCredits": 0}
                    )

                    if response.status_code == 200:
                        print(f"    ✅ Set allocation {allocation_id} credits to 0")
                        removed_count += 1
                        success = True
                    else:
                        print(f"    ❌ Failed to update allocation: {response.text}")
                        
                except requests.RequestException as e:
                    print(f"    ❌ Update request error: {e}")

            if not success:
                failed_count += 1

            # Small delay between allocation removals
            time.sleep(0.2)

        # Log the operation
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(
                f"[{timestamp}] Removed credits from {user['role']}: username='{username}', "
                f"user_id='{user_id}', removed_allocations={removed_count}, "
                f"failed_removals={failed_count}\n"
            )

        if failed_count == 0:
            print(f"✅ Successfully removed all credits from {username}")
            return True
        else:
            print(f"⚠️  Partially removed credits from {username}: {removed_count} success, {failed_count} failed")
            return False

    except Exception as e:
        print(f"❌ Unexpected error removing credits from {username}: {e}")
        return False


def main():
    # Create log file header if it doesn't exist or is empty
    if not os.path.exists(LOG_PATH) or os.path.getsize(LOG_PATH) == 0:
        with open(LOG_PATH, "w") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"# User Credit Removal Log - Started {timestamp}\n")
            log_file.write(
                "# Format: [timestamp] Removed credits from user_type: username='xxx', user_id='xxx', removed_allocations=xxx, failed_removals=xxx\n\n"
            )

    # Confirmation prompt
    print("⚠️  WARNING: This script will remove ALL credits from ALL configured users!")
    print("This action cannot be undone.")
    confirmation = input("Are you sure you want to continue? (yes/no): ").strip().lower()
    
    if confirmation not in ['yes', 'y']:
        print("Operation cancelled.")
        sys.exit(0)

    # Get admin access token
    admin_token = get_admin_token()
    if not admin_token:
        sys.exit(1)

    print("\n=== Starting Credit Removal Process ===")

    # Combine all users that need credit removal
    all_users = SUPERVISOR_USERS + REGULAR_USERS

    successful_removals = 0
    failed_removals = 0

    # Remove credits from each user
    for user in all_users:
        # Note: In a real scenario, you would need to get the userId from the user management system
        user["userId"] = user["username"]  # Placeholder - adjust based on your user ID system

        success = remove_all_credits_from_user(user, admin_token)
        if success:
            successful_removals += 1
        else:
            failed_removals += 1

        # Small delay between requests to avoid overwhelming the server
        time.sleep(0.5)

    # Summary
    print(f"\n=== Credit Removal Summary ===")
    print(f"✅ Successful removals: {successful_removals}")
    print(f"❌ Failed removals: {failed_removals}")
    print(f"📄 Log file: {LOG_PATH}")

    # Final log entry
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(
            f"\n[{timestamp}] Credit removal completed - "
            f"Success: {successful_removals}, Failed: {failed_removals}\n"
        )

    if failed_removals > 0:
        print("\n⚠️  Some credit removals failed. Check the log file for details.")
        sys.exit(1)
    else:
        print("\n🎉 All credit removals completed successfully!")


if __name__ == "__main__":
    main()
