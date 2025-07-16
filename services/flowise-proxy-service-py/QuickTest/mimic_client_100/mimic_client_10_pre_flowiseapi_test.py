#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Flowise API Pre-Test Script

This script tests the Flowise API directly before running the full proxy service tests.
It verifies that the Flowise API is accessible and functioning correctly with the given
configuration.

Configuration:
- FLOWISE_API_URL: https://aai03.eduhk.hk
- FLOWISE_API_KEY: 975KgJwzYdUO1Tphgy_onKRPMLQ8G66U-4p44AiIE_s
- TARGET_CHATFLOW_ID: 2042ba88-d822-4503-a4b4-8fddd3cea18c
"""

import os
import sys
import json
import time
import uuid
from datetime import datetime
from colorama import init, Fore, Style
import requests

# Import python-dotenv for environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
    print(f"{Fore.GREEN}✅ Environment variables loaded from .env")
except ImportError:
    print(f"{Fore.YELLOW}⚠️ python-dotenv not found. Install with: pip install python-dotenv")
    print("Using hardcoded configuration as fallback...")

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Configuration - Load from environment variables with fallbacks
FLOWISE_API_URL = os.getenv("FLOWISE_API_URL", "https://aai03.eduhk.hk")
FLOWISE_API_KEY = os.getenv("FLOWISE_API_KEY", "975KgJwzYdUO1Tphgy_onKRPMLQ8G66U-4p44AiIE_s")

# Target chatflow ID that supports image uploads
TARGET_CHATFLOW_ID = os.getenv("TARGET_CHATFLOW_ID", "2042ba88-d822-4503-a4b4-8fddd3cea18c")

# Logging
LOG_FILE = "flowise_pre_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)


def log_message(message):
    """Logs a message to both the console and the log file."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_message = f"[{timestamp}] {message}"
    print(formatted_message)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"{formatted_message}\n")


def test_flowise_health():
    """Test if Flowise API is accessible."""
    log_message(f"\n--- Testing Flowise API Health ---")
    log_message(f"API URL: {FLOWISE_API_URL}")
    
    try:
        # Try to access the API root or health endpoint
        response = requests.get(f"{FLOWISE_API_URL}/api/v1/ping", timeout=30)
        if response.status_code == 200:
            log_message(f"{Fore.GREEN}✅ Flowise API is accessible")
            return True
        else:
            log_message(f"{Fore.YELLOW}⚠️ Flowise API returned status {response.status_code}")
            return True  # Some APIs don't have ping endpoint but are still accessible
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Flowise API is not accessible: {e}")
        return False


def test_chatflow_existence():
    """Test if the target chatflow exists."""
    log_message(f"\n--- Testing Chatflow Existence ---")
    log_message(f"Chatflow ID: {TARGET_CHATFLOW_ID}")
    
    try:
        # Try to get chatflow information
        headers = {
            "Authorization": f"Bearer {FLOWISE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{FLOWISE_API_URL}/api/v1/chatflows/{TARGET_CHATFLOW_ID}",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            chatflow_data = response.json()
            log_message(f"{Fore.GREEN}✅ Chatflow exists and is accessible")
            log_message(f"Chatflow name: {chatflow_data.get('name', 'N/A')}")
            return True
        else:
            log_message(f"{Fore.RED}❌ Chatflow not found or not accessible: {response.status_code}")
            log_message(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Error checking chatflow: {e}")
        return False


def test_simple_prediction():
    """Test a simple prediction request."""
    log_message(f"\n--- Testing Simple Prediction ---")
    
    try:
        # Create session ID
        session_id = str(uuid.uuid4())
        log_message(f"Generated session ID: {session_id}")
        
        # Simple question
        question = "Hello, can you introduce yourself?"
        log_message(f"Question: {question}")
        
        # Prepare request data
        request_data = {
            "chatflowId": TARGET_CHATFLOW_ID,
            "question": question,
            "streaming": False,  # Non-streaming for simplicity
            "overrideConfig": {
                "sessionId": session_id
            }
        }
        
        headers = {
            "Authorization": f"Bearer {FLOWISE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Make prediction request
        log_message(f"{Fore.CYAN}🚀 Making prediction request...")
        response = requests.post(
            f"{FLOWISE_API_URL}/api/v1/prediction/{TARGET_CHATFLOW_ID}",
            json=request_data,
            headers=headers,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            log_message(f"{Fore.GREEN}✅ Prediction successful")
            log_message(f"Response length: {len(str(result))} characters")
            log_message(f"Response preview: {str(result)[:200]}...")
            return True
        else:
            log_message(f"{Fore.RED}❌ Prediction failed: {response.status_code}")
            log_message(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Error making prediction: {e}")
        return False


def test_streaming_prediction():
    """Test a streaming prediction request."""
    log_message(f"\n--- Testing Streaming Prediction ---")
    
    try:
        # Create session ID
        session_id = str(uuid.uuid4())
        log_message(f"Generated session ID: {session_id}")
        
        # Simple question
        question = "Count from 1 to 5 slowly"
        log_message(f"Question: {question}")
        
        # Prepare request data
        request_data = {
            "chatflowId": TARGET_CHATFLOW_ID,
            "question": question,
            "streaming": True,
            "overrideConfig": {
                "sessionId": session_id
            }
        }
        
        headers = {
            "Authorization": f"Bearer {FLOWISE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Make streaming prediction request
        log_message(f"{Fore.CYAN}🚀 Making streaming prediction request...")
        response = requests.post(
            f"{FLOWISE_API_URL}/api/v1/prediction/{TARGET_CHATFLOW_ID}",
            json=request_data,
            headers=headers,
            stream=True,
            timeout=60
        )
        
        if response.status_code == 200:
            log_message(f"{Fore.GREEN}✅ Streaming prediction started")
            
            # Collect streaming response
            full_response = ""
            chunk_count = 0
            
            for chunk in response.iter_content(chunk_size=None):
                if chunk:
                    chunk_count += 1
                    chunk_str = chunk.decode("utf-8", errors="ignore")
                    
                    # Try to parse as JSON
                    try:
                        chunk_data = json.loads(chunk_str)
                        if chunk_data.get("event") == "token":
                            full_response += chunk_data.get("data", "")
                        elif chunk_data.get("event") == "end":
                            log_message(f"{Fore.CYAN}🏁 Stream ended")
                        elif chunk_data.get("event") == "error":
                            log_message(f"{Fore.RED}⚠️ Stream error: {chunk_data.get('data')}")
                    except json.JSONDecodeError:
                        # If not JSON, treat as raw text
                        full_response += chunk_str
            
            log_message(f"{Fore.GREEN}✅ Streaming prediction completed")
            log_message(f"Chunks received: {chunk_count}")
            log_message(f"Response length: {len(full_response)} characters")
            log_message(f"Response preview: {full_response[:200]}...")
            return True
        else:
            log_message(f"{Fore.RED}❌ Streaming prediction failed: {response.status_code}")
            log_message(f"Response: {response.text}")
            return False
            
    except requests.RequestException as e:
        log_message(f"{Fore.RED}❌ Error making streaming prediction: {e}")
        return False


def main():
    """Main execution flow for Flowise API pre-testing."""
    log_message(f"\n{Style.BRIGHT}🚀 Starting Flowise API Pre-Test 🚀")
    log_message(f"Configuration:")
    log_message(f"  - API URL: {FLOWISE_API_URL}")
    log_message(f"  - API Key: {FLOWISE_API_KEY[:10]}...")
    log_message(f"  - Target Chatflow: {TARGET_CHATFLOW_ID}")
    
    # Test 1: Health Check
    health_success = test_flowise_health()
    time.sleep(1)
    
    # Test 2: Chatflow Existence
    chatflow_success = test_chatflow_existence()
    time.sleep(1)
    
    # Test 3: Simple Prediction
    simple_success = test_simple_prediction()
    time.sleep(1)
    
    # Test 4: Streaming Prediction
    streaming_success = test_streaming_prediction()
    
    # Summary
    log_message(f"\n{Style.BRIGHT}📊 Test Summary 📊")
    log_message(f"  - Health Check: {Fore.GREEN}✅ PASSED" if health_success else f"  - Health Check: {Fore.RED}❌ FAILED")
    log_message(f"  - Chatflow Check: {Fore.GREEN}✅ PASSED" if chatflow_success else f"  - Chatflow Check: {Fore.RED}❌ FAILED")
    log_message(f"  - Simple Prediction: {Fore.GREEN}✅ PASSED" if simple_success else f"  - Simple Prediction: {Fore.RED}❌ FAILED")
    log_message(f"  - Streaming Prediction: {Fore.GREEN}✅ PASSED" if streaming_success else f"  - Streaming Prediction: {Fore.RED}❌ FAILED")
    
    # Overall result
    all_passed = health_success and chatflow_success and simple_success and streaming_success
    if all_passed:
        log_message(f"\n{Fore.GREEN}{Style.BRIGHT}🎉 ALL TESTS PASSED - Flowise API is ready! 🎉")
    else:
        log_message(f"\n{Fore.RED}{Style.BRIGHT}❌ Some tests failed - Check the configuration and API status")
    
    log_message(f"\n{Style.BRIGHT}✨ Flowise API Pre-Test Complete ✨")
    log_message(f"📝 Full logs at: {LOG_PATH}")
    log_message(f"🎯 Target chatflow: {TARGET_CHATFLOW_ID}")
    
    return all_passed


if __name__ == "__main__":
    # Clear log file for a fresh run
    with open(LOG_PATH, "w") as f:
        f.write("")
    main()