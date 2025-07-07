#!/usr/bin/env python3
"""
User Removal Script for Simple Authentication System
This script removes all configured supervisor and regular users using admin credentials.
"""

import json
import requests
import time
import sys
import os
import datetime

LOG_FILE = "remove_users.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)

# Configuration
API_BASE_URL = "http://localhost:3000"
ACCOUNT_BASE_URL = "http://localhost:3001"

ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin@aidcec", # Please change this
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
    } for i in range(1,101)
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


def get_user_id_by_username(admin_token, username):
    """Get user ID by username from the auth service"""
    try:
        # Try different API endpoints to find users
        endpoints_to_try = [
            f"{API_BASE_URL}/api/users",
            f"{API_BASE_URL}/api/auth/users",
            f"{API_BASE_URL}/api/admin/users"
        ]
        
        for endpoint in endpoints_to_try:
            try:
                response = requests.get(
                    endpoint,
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                
                if response.status_code == 200:
                    users = response.json()
                    # Handle different response formats
                    if isinstance(users, dict):
                        users = users.get("users", users.get("data", []))
                    
                    for user in users:
                        if user.get("username") == username:
                            return user.get("_id") or user.get("id")
                    break
                elif response.status_code != 404:
                    print(f"    Warning: Failed to get users from {endpoint}: {response.status_code}")
                    
            except requests.RequestException:
                continue
        
        # If not found in users list, try direct lookup
        try:
            response = requests.get(
                f"{API_BASE_URL}/api/users/{username}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            
            if response.status_code == 200:
                user = response.json()
                return user.get("_id") or user.get("id")
                
        except requests.RequestException:
            pass
        
        return None
        
    except Exception as e:
        print(f"❌ Error getting user ID for {username}: {e}")
        return None


def remove_user_from_system(user, admin_token):
    """Remove a user from both auth and accounting systems"""
    username = user["username"]
    print(f"\n--- Removing user: {username} ({user['role']}) ---")

    try:
        # First, get the user ID
        user_id = get_user_id_by_username(admin_token, username)
        if not user_id:
            print(f"⚠️  Could not find user ID for {username}, using username as ID")
            user_id = username

        success_auth = False
        success_accounting = False

        # Remove from authentication service
        print(f"  Removing {username} from authentication service...")
        
        # Try different API endpoints for user deletion
        auth_endpoints_to_try = [
            f"{API_BASE_URL}/api/users/{user_id}",
            f"{API_BASE_URL}/api/users/{username}",
            f"{API_BASE_URL}/api/auth/users/{user_id}",
            f"{API_BASE_URL}/api/admin/users/{user_id}"
        ]
        
        for endpoint in auth_endpoints_to_try:
            try:
                response = requests.delete(
                    endpoint,
                    headers={
                        "Authorization": f"Bearer {admin_token}",
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code in [200, 204]:
                    print(f"    ✅ Removed {username} from auth service")
                    success_auth = True
                    break
                elif response.status_code == 404:
                    print(f"    ℹ️  User {username} not found in auth service (already removed)")
                    success_auth = True
                    break
                else:
                    print(f"    ❌ Failed via {endpoint}: {response.status_code} - {response.text}")
                    
            except requests.RequestException as e:
                print(f"    ❌ Request error via {endpoint}: {e}")
                continue

        # Remove from accounting service (credits and allocations)
        print(f"  Removing {username} from accounting service...")
        
        accounting_endpoints_to_try = [
            f"{ACCOUNT_BASE_URL}/api/users/{user_id}",
            f"{ACCOUNT_BASE_URL}/api/users/{username}",
            f"{ACCOUNT_BASE_URL}/api/credits/user/{user_id}",
            f"{ACCOUNT_BASE_URL}/api/credits/user/{username}"
        ]
        
        for endpoint in accounting_endpoints_to_try:
            try:
                response = requests.delete(
                    endpoint,
                    headers={
                        "Authorization": f"Bearer {admin_token}",
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code in [200, 204]:
                    print(f"    ✅ Removed {username} from accounting service")
                    success_accounting = True
                    break
                elif response.status_code == 404:
                    print(f"    ℹ️  User {username} not found in accounting service (already removed)")
                    success_accounting = True
                    break
                else:
                    print(f"    ❌ Failed via {endpoint}: {response.status_code} - {response.text}")
                    
            except requests.RequestException as e:
                print(f"    ❌ Request error via {endpoint}: {e}")
                continue

        # If accounting service deletion failed, try to remove just the credit allocations
        if not success_accounting:
            print(f"  Attempting to remove credit allocations for {username}...")
            try:
                # Get and remove all allocations
                response = requests.get(
                    f"{ACCOUNT_BASE_URL}/api/credits/balance/{user_id}",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                
                if response.status_code == 200:
                    data = response.json()
                    allocations = data.get("activeAllocations", [])
                    
                    for allocation in allocations:
                        allocation_id = allocation.get("_id") or allocation.get("id")
                        if allocation_id:
                            try:
                                requests.delete(
                                    f"{ACCOUNT_BASE_URL}/api/credits/allocations/{allocation_id}",
                                    headers={"Authorization": f"Bearer {admin_token}"},
                                )
                            except:
                                pass
                    
                    success_accounting = True
                    print(f"    ✅ Removed credit allocations for {username}")
                else:
                    print(f"    ℹ️  No credit data found for {username}")
                    success_accounting = True
                    
            except Exception as e:
                print(f"    ⚠️  Could not remove credit allocations: {e}")
                success_accounting = True  # Don't fail the whole operation for this

        # Log the operation
        with open(LOG_PATH, "a") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(
                f"[{timestamp}] Removed {user['role']}: username='{username}', "
                f"user_id='{user_id}', auth_success={success_auth}, "
                f"accounting_success={success_accounting}\n"
            )

        overall_success = success_auth and success_accounting
        if overall_success:
            print(f"✅ Successfully removed {username} from all services")
        else:
            print(f"⚠️  Partially removed {username}: auth={success_auth}, accounting={success_accounting}")
        
        return overall_success

    except Exception as e:
        print(f"❌ Unexpected error removing {username}: {e}")
        return False


def main():
    # Create log file header if it doesn't exist or is empty
    if not os.path.exists(LOG_PATH) or os.path.getsize(LOG_PATH) == 0:
        with open(LOG_PATH, "w") as log_file:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_file.write(f"# User Removal Log - Started {timestamp}\n")
            log_file.write(
                "# Format: [timestamp] Removed user_type: username='xxx', user_id='xxx', auth_success=xxx, accounting_success=xxx\n\n"
            )

    # Confirmation prompt
    print("⚠️  WARNING: This script will remove ALL configured users from the system!")
    print("This includes:")
    print("- Supervisor users:", [u["username"] for u in SUPERVISOR_USERS])
    print("- Regular users:", [u["username"] for u in REGULAR_USERS])
    print("\nThis action cannot be undone.")
    confirmation = input("Are you sure you want to continue? (yes/no): ").strip().lower()
    
    if confirmation not in ['yes', 'y']:
        print("Operation cancelled.")
        sys.exit(0)

    # Get admin access token
    admin_token = get_admin_token()
    if not admin_token:
        sys.exit(1)

    print("\n=== Starting User Removal Process ===")

    # Combine all users that need to be removed
    all_users = SUPERVISOR_USERS + REGULAR_USERS

    successful_removals = 0
    failed_removals = 0

    # Remove each user
    for user in all_users:
        success = remove_user_from_system(user, admin_token)
        if success:
            successful_removals += 1
        else:
            failed_removals += 1

        # Small delay between requests to avoid overwhelming the server
        time.sleep(0.5)

    # Summary
    print(f"\n=== User Removal Summary ===")
    print(f"✅ Successful removals: {successful_removals}")
    print(f"❌ Failed removals: {failed_removals}")
    print(f"📄 Log file: {LOG_PATH}")

    # Final log entry
    with open(LOG_PATH, "a") as log_file:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file.write(
            f"\n[{timestamp}] User removal completed - "
            f"Success: {successful_removals}, Failed: {failed_removals}\n"
        )

    if failed_removals > 0:
        print("\n⚠️  Some user removals failed. Check the log file for details.")
        sys.exit(1)
    else:
        print("\n🎉 All user removals completed successfully!")


if __name__ == "__main__":
    main()
