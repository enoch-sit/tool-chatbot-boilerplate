#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Quick Upload Test for Proxy Service

This script tests the corrected upload functionality in the proxy service.
"""

import requests
import json
import base64
from PIL import Image
import io

# Test configuration
API_BASE_URL = "http://localhost:8000"
CHATFLOW_ID = "2042ba88-d822-4503-a4b4-8fddd3cea18c"

# Test user credentials
TEST_USER = {
    "username": "User01",
    "email": "user01@aidcec.com",
    "password": "User01@aidcec"
}

def create_test_image():
    """Create a simple test image."""
    img = Image.new("RGB", (50, 50), color="blue")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()

def get_auth_token():
    """Get authentication token."""
    response = requests.post(f"{API_BASE_URL}/api/v1/chat/authenticate", json=TEST_USER)
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def test_upload():
    """Test image upload via proxy service."""
    print("🔍 Testing corrected upload functionality...")
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("❌ Failed to get auth token")
        return False
    
    # Create test image
    img_b64 = create_test_image()
    
    # Prepare request
    payload = {
        "chatflow_id": CHATFLOW_ID,
        "question": "What do you see in this image?",
        "uploads": [
            {
                "data": img_b64,  # Raw base64 (no prefix)
                "type": "file",
                "name": "test.png",
                "mime": "image/png"
            }
        ]
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Make request
    print("📤 Sending upload request...")
    response = requests.post(
        f"{API_BASE_URL}/api/v1/chat/predict/stream/store",
        json=payload,
        headers=headers,
        stream=True,
        timeout=30
    )
    
    if response.status_code == 200:
        print("✅ Upload request successful!")
        
        # Read a few chunks to verify streaming works
        chunk_count = 0
        for chunk in response.iter_content(chunk_size=None):
            if chunk:
                chunk_count += 1
                print(f"📦 Chunk {chunk_count}: {chunk.decode('utf-8', errors='ignore')[:100]}...")
                if chunk_count >= 3:  # Just read first few chunks
                    break
        
        print(f"✅ Successfully processed {chunk_count} chunks")
        return True
    else:
        print(f"❌ Upload failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Upload Fix")
    success = test_upload()
    if success:
        print("🎉 Upload fix is working!")
    else:
        print("💥 Upload fix needs more work")
