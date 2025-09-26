#!/usr/bin/env python3
"""
Test script to check which Flowise URL works from your server
Run this on your server to determine the correct FLOWISE_API_URL
"""

import requests
import json
from urllib.parse import urljoin

def test_flowise_connection(base_url, test_name):
    print(f"\n🧪 Testing {test_name}: {base_url}")
    print("-" * 50)
    
    try:
        # Test 1: Basic connection
        health_url = urljoin(base_url, "/")
        print(f"Testing basic connection: {health_url}")
        
        response = requests.get(health_url, timeout=10)
        print(f"✅ Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Response received (length: {len(response.text)} chars)")
            
            # Test 2: Check if it's actually Flowise
            if "flowise" in response.text.lower() or "chatflow" in response.text.lower():
                print("✅ Confirmed: This appears to be a Flowise instance")
            else:
                print("⚠️  Warning: Response doesn't look like Flowise")
            
            # Test 3: Try API endpoint
            try:
                api_url = urljoin(base_url, "/api/v1/chatflows")
                api_response = requests.get(api_url, timeout=10)
                if api_response.status_code == 200:
                    print(f"✅ API endpoint works: {api_url}")
                    return True
                else:
                    print(f"❌ API endpoint failed: {api_url} (Status: {api_response.status_code})")
            except Exception as e:
                print(f"❌ API endpoint error: {e}")
                
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Cannot reach this URL")
    except requests.exceptions.Timeout:
        print("❌ Timeout Error: Connection timed out")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def main():
    print("🔍 Flowise Connection Test")
    print("=" * 60)
    print("This script will test both possible Flowise URLs to determine")
    print("which one your proxy should use in the .env file")
    
    # Test both URLs
    localhost_works = test_flowise_connection("http://localhost:3000", "Localhost (Internal)")
    external_works = test_flowise_connection("https://project-1-13.eduhk.hk", "External (HTTPS)")
    
    print("\n" + "=" * 60)
    print("📋 RESULTS & RECOMMENDATIONS")
    print("=" * 60)
    
    if localhost_works and external_works:
        print("✅ Both URLs work!")
        print("🎯 RECOMMENDATION: Use http://localhost:3000")
        print("   Reason: Localhost is faster and more secure for internal communication")
        print()
        print("📝 Update your .env file:")
        print("   FLOWISE_API_URL=http://localhost:3000")
        
    elif localhost_works:
        print("✅ Only localhost works")
        print("🎯 RECOMMENDATION: Use http://localhost:3000")
        print("   This is the correct choice for same-server deployment")
        print()
        print("📝 Update your .env file:")
        print("   FLOWISE_API_URL=http://localhost:3000")
        
    elif external_works:
        print("✅ Only external URL works")
        print("🎯 RECOMMENDATION: Use https://project-1-13.eduhk.hk")
        print("   Your proxy must be on a different server than Flowise")
        print()
        print("📝 Update your .env file:")
        print("   FLOWISE_API_URL=https://project-1-13.eduhk.hk")
        
    else:
        print("❌ Neither URL works!")
        print("🔍 TROUBLESHOOTING:")
        print("   1. Make sure Flowise is actually running")
        print("   2. Check firewall settings")
        print("   3. Verify the URLs are correct")
        print("   4. Try running this script directly on your server")
    
    print("\n🚀 Next Steps:")
    print("1. Update your backend/.env file with the recommended URL")
    print("2. Restart your proxy services")
    print("3. Test the proxy at https://project-1-13.eduhk.hk/projectproxy/")

if __name__ == "__main__":
    main()