#!/usr/bin/env python3
import requests
import json
import os
import datetime
import sys
import urllib

API_BASE_URL = "http://localhost:3001"
AUTH_BASE_URL = "http://localhost:3000"

ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin@aidcec",
}

SUPERVISOR_EMAIL = "supervisor1@example.com"
TARGET_CREDITS = 4000


def get_admin_token():
    """Log in as admin and get the access token"""
    response = requests.post(
        f"{AUTH_BASE_URL}/api/auth/login",
        json={
            "username": ADMIN_USER["username"],
            "password": ADMIN_USER["password"],
        },
    )
    if response.status_code == 200:
        data = response.json()
        token = data.get("accessToken") or data.get("token", {}).get("accessToken")
        if not token:
            # Try to find any key that might contain the token
            for key, value in data.items():
                if isinstance(value, str) and len(value) > 40:
                    token = value
                    break
        return token
    else:
        print("Failed to log in as admin:", response.text)
        return None


def get_user_by_email(email, admin_token):
    encoded_email = urllib.parse.quote(email, safe="")
    url = f"{AUTH_BASE_URL}/api/admin/users/by-email/{encoded_email}"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        user = response.json().get("user")
        return user
    else:
        print("Failed to get user by email:", response.text)
        return None


def set_user_credits(user_id, credits, admin_token):
    url = f"{API_BASE_URL}/api/credits/set"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "userId": user_id,
        "credits": credits,
        "notes": f"Set by admin to {credits} credits",
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        print(f"✅ Successfully set credits for user {user_id} to {credits}")
        print("Response:", response.json())
    else:
        print(f"❌ Failed to set credits: {response.status_code} - {response.text}")


def main():
    admin_token = get_admin_token()
    if not admin_token:
        sys.exit(1)
    user = get_user_by_email(SUPERVISOR_EMAIL, admin_token)
    if not user:
        print("Supervisor user not found.")
        sys.exit(1)
    set_user_credits(user["_id"], TARGET_CREDITS, admin_token)


if __name__ == "__main__":
    main()
