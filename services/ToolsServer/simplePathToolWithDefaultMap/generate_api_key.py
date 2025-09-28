"""
Generate a secure API key for the Simple Path Tool API
"""

import secrets
import string


def generate_api_key(length=32):
    """Generate a secure random API key."""
    return secrets.token_urlsafe(length)


def generate_hex_key(length=32):
    """Generate a secure random hex API key."""
    return secrets.token_hex(length)


def generate_custom_key(prefix="sk_", length=32):
    """Generate a custom API key with prefix."""
    key = secrets.token_urlsafe(length)
    return f"{prefix}{key}"


if __name__ == "__main__":
    print("Simple Path Tool API - Key Generator")
    print("=" * 40)

    print(f"URL-safe key: {generate_api_key()}")
    print(f"Hex key:      {generate_hex_key()}")
    print(f"Custom key:   {generate_custom_key('spt_')}")

    print("\nTo use any of these keys:")
    print("1. Copy the key you prefer")
    print("2. Update the API_KEY in your .env file")
    print("3. Restart the server")
    print("\nExample .env file:")
    print(f"API_KEY={generate_api_key()}")
