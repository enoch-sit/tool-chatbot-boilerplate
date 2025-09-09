#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test Script: Image Rendering Functionality

This script tests the image rendering functionality after deployment.
It performs comprehensive tests to ensure everything is working correctly.

Usage:
    python test_image_rendering.py [--base-url http://localhost:8000]
"""

import os
import sys
import requests
import json
import argparse
import base64
from datetime import datetime

class ImageRenderingTester:
    """Test image rendering functionality."""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.admin_token = None
        self.user_token = None
        
    def log(self, message, level="INFO"):
        """Log a message with timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        symbols = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌"
        }
        symbol = symbols.get(level, "ℹ️")
        print(f"[{timestamp}] {symbol} {message}")
    
    def authenticate(self):
        """Authenticate admin and user."""
        self.log("Authenticating users...")
        
        # Admin authentication
        admin_data = {
            "username": "admin",
            "password": "admin@admin@aidcec"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/chat/authenticate",
                json=admin_data
            )
            
            if response.status_code == 200:
                self.admin_token = response.json().get("access_token")
                self.log("Admin authentication successful", "SUCCESS")
            else:
                self.log(f"Admin authentication failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Admin authentication error: {e}", "ERROR")
            return False
        
        # User authentication
        user_data = {
            "username": "User01",
            "password": "User01@aidcec"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/chat/authenticate",
                json=user_data
            )
            
            if response.status_code == 200:
                self.user_token = response.json().get("access_token")
                self.log("User authentication successful", "SUCCESS")
            else:
                self.log(f"User authentication failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"User authentication error: {e}", "ERROR")
            return False
        
        return True
    
    def test_basic_endpoints(self):
        """Test basic API endpoints."""
        self.log("Testing basic API endpoints...")
        
        # Test credits endpoint
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            response = requests.get(f"{self.base_url}/api/v1/chat/credits", headers=headers)
            
            if response.status_code == 200:
                self.log("Credits endpoint working", "SUCCESS")
            else:
                self.log(f"Credits endpoint failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Credits endpoint error: {e}", "ERROR")
            return False
        
        # Test sessions endpoint
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            response = requests.get(f"{self.base_url}/api/v1/chat/sessions", headers=headers)
            
            if response.status_code == 200:
                self.log("Sessions endpoint working", "SUCCESS")
            else:
                self.log(f"Sessions endpoint failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Sessions endpoint error: {e}", "ERROR")
            return False
        
        return True
    
    def create_test_image(self):
        """Create a test image for upload."""
        try:
            from PIL import Image
            import io
            
            # Create a simple test image
            img = Image.new('RGB', (100, 100), color='blue')
            
            # Add some text
            try:
                from PIL import ImageDraw
                draw = ImageDraw.Draw(img)
                draw.text((10, 10), "TEST", fill='white')
                draw.rectangle([20, 30, 80, 70], outline='white', width=2)
            except ImportError:
                pass
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_data = base64.b64encode(buffer.getvalue()).decode()
            
            return img_data, "image/png", "test_image.png"
            
        except ImportError:
            self.log("PIL not available, using minimal test image", "WARNING")
            # Minimal 1x1 PNG
            minimal_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            return minimal_png, "image/png", "minimal_test.png"
        except Exception as e:
            self.log(f"Test image creation failed: {e}", "ERROR")
            return None, None, None
    
    def test_image_upload(self):
        """Test image upload functionality."""
        self.log("Testing image upload...")
        
        # Create test image
        img_data, mime_type, filename = self.create_test_image()
        if not img_data:
            return False, None
        
        # Prepare upload data
        upload_data = {
            "chatflow_id": "2042ba88-d822-4503-a4b4-8fddd3cea18c",
            "question": "Can you describe this test image?",
            "uploads": [
                {
                    "data": img_data,
                    "type": "file",
                    "name": filename,
                    "mime": mime_type
                }
            ]
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            response = requests.post(
                f"{self.base_url}/api/v1/chat/predict/stream/store",
                json=upload_data,
                headers=headers,
                stream=True
            )
            
            if response.status_code == 200:
                session_id = None
                file_ids = []
                
                # Parse streaming response
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            if data.get('event') == 'session_id':
                                session_id = data.get('data')
                            elif data.get('event') == 'files_uploaded':
                                files = data.get('data', {}).get('files', [])
                                file_ids = [f['file_id'] for f in files]
                        except json.JSONDecodeError:
                            pass
                
                if session_id:
                    self.log(f"Image upload successful, session: {session_id}", "SUCCESS")
                    return True, session_id
                else:
                    self.log("Image upload failed: no session ID", "ERROR")
                    return False, None
                    
            else:
                self.log(f"Image upload failed: {response.status_code}", "ERROR")
                return False, None
                
        except Exception as e:
            self.log(f"Image upload error: {e}", "ERROR")
            return False, None
    
    def test_chat_history(self, session_id):
        """Test chat history with file metadata."""
        self.log("Testing chat history retrieval...")
        
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            response = requests.get(
                f"{self.base_url}/api/v1/chat/sessions/{session_id}/history",
                headers=headers
            )
            
            if response.status_code == 200:
                history_data = response.json()
                history = history_data.get('history', [])
                
                self.log(f"Chat history retrieved: {len(history)} messages", "SUCCESS")
                
                # Check for file metadata
                files_found = False
                for message in history:
                    if message.get('uploads'):
                        files_found = True
                        uploads = message['uploads']
                        self.log(f"Found {len(uploads)} file uploads in history", "SUCCESS")
                        
                        for upload in uploads:
                            self.log(f"  - File: {upload.get('name')} ({upload.get('mime')})")
                            self.log(f"    URL: {upload.get('url')}")
                            self.log(f"    Thumbnail: {upload.get('thumbnail_url')}")
                            self.log(f"    Is Image: {upload.get('is_image')}")
                
                if not files_found:
                    self.log("No file uploads found in history", "WARNING")
                    return False
                
                return True
                
            else:
                self.log(f"Chat history failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Chat history error: {e}", "ERROR")
            return False
    
    def test_file_endpoints(self, session_id):
        """Test file-related endpoints."""
        self.log("Testing file endpoints...")
        
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            # Get session files
            response = requests.get(
                f"{self.base_url}/api/v1/chat/files/session/{session_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                files_data = response.json()
                files = files_data.get('files', [])
                
                if files:
                    self.log(f"Session files retrieved: {len(files)} files", "SUCCESS")
                    
                    # Test individual file access
                    for file_info in files:
                        file_id = file_info['file_id']
                        
                        # Test file download
                        file_response = requests.get(
                            f"{self.base_url}/api/v1/chat/files/{file_id}",
                            headers=headers
                        )
                        
                        if file_response.status_code == 200:
                            self.log(f"File access successful: {file_id}", "SUCCESS")
                        else:
                            self.log(f"File access failed: {file_id}", "ERROR")
                            return False
                        
                        # Test thumbnail (if it's an image)
                        if file_info.get('mime_type', '').startswith('image/'):
                            thumb_response = requests.get(
                                f"{self.base_url}/api/v1/chat/files/{file_id}/thumbnail",
                                headers=headers
                            )
                            
                            if thumb_response.status_code == 200:
                                self.log(f"Thumbnail generation successful: {file_id}", "SUCCESS")
                            else:
                                self.log(f"Thumbnail generation failed: {file_id}", "ERROR")
                                return False
                    
                    return True
                else:
                    self.log("No files found in session", "WARNING")
                    return False
                    
            else:
                self.log(f"Session files failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"File endpoints error: {e}", "ERROR")
            return False
    
    def run_tests(self):
        """Run all tests."""
        self.log("Starting image rendering functionality tests...")
        
        tests = [
            ("Authentication", self.authenticate),
            ("Basic Endpoints", self.test_basic_endpoints),
        ]
        
        # Run basic tests first
        for test_name, test_func in tests:
            self.log(f"Running test: {test_name}")
            if not test_func():
                self.log(f"Test failed: {test_name}", "ERROR")
                return False
        
        # Run image-specific tests
        self.log("Running image functionality tests...")
        
        # Test image upload
        upload_success, session_id = self.test_image_upload()
        if not upload_success:
            self.log("Image upload test failed", "ERROR")
            return False
        
        # Test chat history
        if not self.test_chat_history(session_id):
            self.log("Chat history test failed", "ERROR")
            return False
        
        # Test file endpoints
        if not self.test_file_endpoints(session_id):
            self.log("File endpoints test failed", "ERROR")
            return False
        
        self.log("All tests passed successfully! 🎉", "SUCCESS")
        return True

def main():
    """Main function to run tests."""
    parser = argparse.ArgumentParser(description="Test image rendering functionality")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Base URL of the server")
    
    args = parser.parse_args()
    
    tester = ImageRenderingTester(args.base_url)
    
    print("🧪 Image Rendering Functionality Test")
    print(f"Server: {args.base_url}")
    print("-" * 50)
    
    success = tester.run_tests()
    
    if success:
        print("\n✅ All tests passed! Image rendering is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the output above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
