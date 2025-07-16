#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Flowise Python SDK Direct Test

This script tests the Flowise Python SDK directly using the provided configuration.
It bypasses the proxy service and connects directly to the Flowise API to test
image upload functionality and chat streaming.

"""

import os
import sys
import json
import time
import base64
import uuid
from datetime import datetime
from colorama import init, Fore, Style
from PIL import Image
import io

# Import python-dotenv for environment variables
try:
    from dotenv import load_dotenv

    load_dotenv()
    print(f"{Fore.GREEN}✅ Environment variables loaded from .env")
except ImportError:
    print(
        f"{Fore.YELLOW}⚠️ python-dotenv not found. Install with: pip install python-dotenv"
    )
    print("Using hardcoded configuration as fallback...")

# Import Flowise SDK
try:
    from flowise import Flowise, PredictionData

    print(f"{Fore.GREEN}✅ Flowise SDK imported successfully")
except ImportError as e:
    print(
        f"{Fore.RED}❌ Flowise SDK not found. Please install it with: pip install flowise"
    )
    print(f"Error: {e}")
    sys.exit(1)

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Configuration - Load from environment variables with fallbacks
FLOWISE_API_URL = os.getenv("FLOWISE_API_URL", "")
FLOWISE_API_KEY = os.getenv("FLOWISE_API_KEY", "")

# Target chatflow ID that supports image uploads
TARGET_CHATFLOW_ID = os.getenv("TARGET_CHATFLOW_ID", "")

# Logging
LOG_FILE = "flowise_sdk_test.log"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, LOG_FILE)


def log_message(message):
    """Logs a message to both the console and the log file."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_message = f"[{timestamp}] {message}"
    print(formatted_message)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"{formatted_message}\n")


def create_test_image():
    """Create a simple test image and return it as base64 encoded string."""
    try:
        # Try to use PIL if available, otherwise create a simple test pattern
        try:
            from PIL import Image as PILImage
            import io

            # Create a simple 100x100 red image
            img = PILImage.new("RGB", (100, 100), color="red")

            # Add some text/pattern to make it more interesting
            try:
                from PIL import ImageDraw, ImageFont

                draw = ImageDraw.Draw(img)
                draw.text((10, 10), "TEST", fill="white")
                draw.rectangle([20, 30, 80, 70], outline="white", width=2)
            except ImportError:
                # Just use the solid color if ImageDraw is not available
                pass

            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode()

            log_message(f"{Fore.GREEN}✅ Created test image using PIL (100x100 PNG)")
            return img_str, "image/png", "test_image.png"

        except ImportError:
            # Fallback: create a minimal valid PNG in base64
            # This is a 1x1 transparent PNG
            minimal_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            log_message(f"{Fore.YELLOW}⚠️ PIL not available, using minimal 1x1 PNG")
            return minimal_png_b64, "image/png", "minimal_test.png"

    except Exception as e:
        log_message(f"{Fore.RED}❌ Error creating test image: {e}")
        return None, None, None


def test_flowise_connection():
    """Test basic connection to Flowise API."""
    log_message(f"\n--- Testing Flowise API Connection ---")
    log_message(f"API URL: {FLOWISE_API_URL}")
    log_message(f"API Key: {FLOWISE_API_KEY[:10]}...")

    try:
        # Initialize Flowise client
        flowise_client = Flowise(FLOWISE_API_URL, FLOWISE_API_KEY)
        log_message(f"{Fore.GREEN}✅ Flowise client initialized successfully")
        return flowise_client
    except Exception as e:
        log_message(f"{Fore.RED}❌ Failed to initialize Flowise client: {e}")
        return None


def test_simple_chat(flowise_client, chatflow_id):
    """Test simple chat without image upload."""
    log_message(f"\n--- Testing Simple Chat ---")
    log_message(f"Chatflow ID: {chatflow_id}")

    try:
        # Create session ID
        session_id = str(uuid.uuid4())
        log_message(f"Generated session ID: {session_id}")

        # Simple question
        question = "Hello, can you introduce yourself?"
        log_message(f"Question: {question}")

        # Create prediction data
        prediction_data = PredictionData(
            chatflowId=chatflow_id,
            question=question,
            streaming=True,
            overrideConfig={"sessionId": session_id},
        )

        # Make prediction
        log_message(f"{Fore.CYAN}🚀 Starting prediction...")
        completion = flowise_client.create_prediction(prediction_data)

        # Collect response
        full_response = ""
        chunk_count = 0

        for chunk in completion:
            chunk_count += 1
            chunk_str = ""
            if isinstance(chunk, bytes):
                chunk_str = chunk.decode("utf-8", errors="ignore")
            else:
                chunk_str = str(chunk)

            # Try to parse as JSON to extract token data
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

        log_message(f"{Fore.GREEN}✅ Simple chat completed")
        log_message(f"Chunks received: {chunk_count}")
        log_message(f"Response length: {len(full_response)} characters")
        log_message(f"Response preview: {full_response[:200]}...")

        return True, session_id, full_response

    except Exception as e:
        log_message(f"{Fore.RED}❌ Simple chat failed: {e}")
        import traceback

        traceback.print_exc()
        return False, None, None


def test_image_upload_chat(flowise_client, chatflow_id, session_id=None):
    """Test chat with image upload."""
    log_message(f"\n--- Testing Image Upload Chat ---")

    # Create test image
    image_data = create_test_image()
    if not image_data[0]:
        log_message(f"{Fore.RED}❌ Failed to create test image")
        return False, None, None

    img_b64, mime_type, filename = image_data
    log_message(f"Image created: {filename} ({mime_type})")

    try:
        # Use existing session ID or create new one
        if not session_id:
            session_id = str(uuid.uuid4())
            log_message(f"Generated new session ID: {session_id}")
        else:
            log_message(f"Using existing session ID: {session_id}")

        # Question about the image
        question = "Can you describe what you see in this image?"
        log_message(f"Question: {question}")

        # Prepare uploads for Flowise
        uploads = [
            {
                "data": f"data:{mime_type};base64,{img_b64}",
                "type": "file",
                "name": filename,
                "mime": mime_type,
            }
        ]

        # Create prediction data with image upload
        prediction_data = PredictionData(
            chatflowId=chatflow_id,
            question=question,
            streaming=True,
            overrideConfig={"sessionId": session_id},
            uploads=uploads,
        )

        # Make prediction
        log_message(f"{Fore.CYAN}🚀 Starting prediction with image upload...")
        completion = flowise_client.create_prediction(prediction_data)

        # Collect response
        full_response = ""
        chunk_count = 0

        for chunk in completion:
            chunk_count += 1
            chunk_str = ""
            if isinstance(chunk, bytes):
                chunk_str = chunk.decode("utf-8", errors="ignore")
            else:
                chunk_str = str(chunk)

            # Try to parse as JSON to extract token data
            try:
                chunk_data = json.loads(chunk_str)
                if chunk_data.get("event") == "token":
                    full_response += chunk_data.get("data", "")
                elif chunk_data.get("event") == "end":
                    log_message(f"{Fore.CYAN}🏁 Stream ended")
                elif chunk_data.get("event") == "error":
                    log_message(f"{Fore.RED}⚠️ Stream error: {chunk_data.get('data')}")
                elif chunk_data.get("event") == "file_upload":
                    file_info = chunk_data.get("data", {})
                    log_message(f"{Fore.BLUE}📎 File upload event: {file_info}")
            except json.JSONDecodeError:
                # If not JSON, treat as raw text
                full_response += chunk_str

        log_message(f"{Fore.GREEN}✅ Image upload chat completed")
        log_message(f"Chunks received: {chunk_count}")
        log_message(f"Response length: {len(full_response)} characters")
        log_message(f"Response preview: {full_response[:200]}...")

        return True, session_id, full_response

    except Exception as e:
        log_message(f"{Fore.RED}❌ Image upload chat failed: {e}")
        import traceback

        traceback.print_exc()
        return False, None, None


def test_follow_up_chat(flowise_client, chatflow_id, session_id):
    """Test follow-up chat in the same session."""
    log_message(f"\n--- Testing Follow-up Chat ---")
    log_message(f"Using session ID: {session_id}")

    try:
        # Follow-up question
        question = "What color was the image I just sent?"
        log_message(f"Question: {question}")

        # Create prediction data
        prediction_data = PredictionData(
            chatflowId=chatflow_id,
            question=question,
            streaming=True,
            overrideConfig={"sessionId": session_id},
        )

        # Make prediction
        log_message(f"{Fore.CYAN}🚀 Starting follow-up prediction...")
        completion = flowise_client.create_prediction(prediction_data)

        # Collect response
        full_response = ""
        chunk_count = 0

        for chunk in completion:
            chunk_count += 1
            chunk_str = ""
            if isinstance(chunk, bytes):
                chunk_str = chunk.decode("utf-8", errors="ignore")
            else:
                chunk_str = str(chunk)

            # Try to parse as JSON to extract token data
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

        log_message(f"{Fore.GREEN}✅ Follow-up chat completed")
        log_message(f"Chunks received: {chunk_count}")
        log_message(f"Response length: {len(full_response)} characters")
        log_message(f"Response preview: {full_response[:200]}...")

        # Check if response mentions color
        if "red" in full_response.lower() or "color" in full_response.lower():
            log_message(
                f"{Fore.GREEN}✅ Follow-up response seems to reference the image context"
            )
        else:
            log_message(
                f"{Fore.YELLOW}⚠️ Follow-up response may not reference the image context"
            )

        return True, full_response

    except Exception as e:
        log_message(f"{Fore.RED}❌ Follow-up chat failed: {e}")
        import traceback

        traceback.print_exc()
        return False, None


def main():
    """Main execution flow for Flowise SDK testing."""
    log_message(f"\n{Style.BRIGHT}🚀 Starting Flowise SDK Test 🚀")
    log_message(f"Configuration:")
    log_message(f"  - API URL: {FLOWISE_API_URL}")
    log_message(f"  - API Key: {FLOWISE_API_KEY[:10]}...")
    log_message(f"  - Target Chatflow: {TARGET_CHATFLOW_ID}")

    # Test 1: Connection
    flowise_client = test_flowise_connection()
    if not flowise_client:
        log_message(f"{Fore.RED}❌ Connection test failed. Exiting.")
        sys.exit(1)

    # Test 2: Simple Chat
    simple_success, session_id, simple_response = test_simple_chat(
        flowise_client, TARGET_CHATFLOW_ID
    )
    if not simple_success:
        log_message(f"{Fore.RED}❌ Simple chat test failed. Exiting.")
        sys.exit(1)

    # Wait a moment
    time.sleep(2)

    # Test 3: Image Upload Chat
    image_success, session_id, image_response = test_image_upload_chat(
        flowise_client, TARGET_CHATFLOW_ID, session_id
    )
    if not image_success:
        log_message(
            f"{Fore.RED}❌ Image upload test failed. Continuing with follow-up test..."
        )

    # Wait a moment
    time.sleep(2)

    # Test 4: Follow-up Chat
    if session_id:
        follow_up_success, follow_up_response = test_follow_up_chat(
            flowise_client, TARGET_CHATFLOW_ID, session_id
        )
        if not follow_up_success:
            log_message(f"{Fore.RED}❌ Follow-up chat test failed.")

    # Summary
    log_message(f"\n{Style.BRIGHT}📊 Test Summary 📊")
    log_message(
        f"  - Connection: {Fore.GREEN}✅ PASSED"
        if flowise_client
        else f"  - Connection: {Fore.RED}❌ FAILED"
    )
    log_message(
        f"  - Simple Chat: {Fore.GREEN}✅ PASSED"
        if simple_success
        else f"  - Simple Chat: {Fore.RED}❌ FAILED"
    )
    log_message(
        f"  - Image Upload: {Fore.GREEN}✅ PASSED"
        if image_success
        else f"  - Image Upload: {Fore.RED}❌ FAILED"
    )
    log_message(
        f"  - Follow-up: {Fore.GREEN}✅ PASSED"
        if "follow_up_success" in locals() and follow_up_success
        else f"  - Follow-up: {Fore.RED}❌ FAILED"
    )

    log_message(f"\n{Style.BRIGHT}✨ Flowise SDK Test Complete ✨")
    log_message(f"📝 Full logs at: {LOG_PATH}")
    log_message(f"🎯 Target chatflow: {TARGET_CHATFLOW_ID}")
    log_message(f"🔗 Session ID: {session_id}")


if __name__ == "__main__":
    # Clear log file for a fresh run
    with open(LOG_PATH, "w") as f:
        f.write("")
    main()
