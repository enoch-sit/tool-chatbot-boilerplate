#!/usr/bin/env python3
"""
Admin User Synchronization Script

This script authenticates as an admin user and triggers the user synchronization 
endpoint to sync users from the external authentication service.

Usage:
    python adminSyncUser.py

Author: GitHub Copilot
Date: June 6, 2025
"""

import asyncio
import aiohttp
import json
import sys
import os
from datetime import datetime
from typing import Dict, Optional

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Admin credentials
ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}

# Service configuration
BASE_URL = "http://localhost:8000"
EXTERNAL_AUTH_URL = "http://localhost:3000"

class AdminSyncClient:
    """Client for admin user synchronization operations"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip('/')
        self.session: Optional[aiohttp.ClientSession] = None
        self.access_token: Optional[str] = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def authenticate(self, username: str, password: str) -> Dict:
        """
        Authenticate with the admin credentials
        
        Args:
            username: Admin username
            password: Admin password
            
        Returns:
            Dict containing authentication response
            
        Raises:
            Exception: If authentication fails
        """
        auth_url = f"{self.base_url}/chat/authenticate"
        
        payload = {
            "username": username,
            "password": password
        }
        
        print(f"🔑 Authenticating admin user: {username}")
        
        try:
            async with self.session.post(
                auth_url, 
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    auth_data = await response.json()
                    self.access_token = auth_data.get("access_token")
                    
                    print(f"✅ Authentication successful")
                    print(f"   User: {auth_data.get('user', {}).get('username', 'Unknown')}")
                    print(f"   Role: {auth_data.get('user', {}).get('role', 'Unknown')}")
                    
                    return auth_data
                else:
                    error_text = await response.text()
                    print(f"❌ Authentication failed: {response.status}")
                    print(f"   Error: {error_text}")
                    raise Exception(f"Authentication failed with status {response.status}: {error_text}")
                    
        except aiohttp.ClientError as e:
            print(f"❌ Network error during authentication: {e}")
            raise Exception(f"Network error: {e}")
    
    async def sync_users(self) -> Dict:
        """
        Trigger user synchronization with external auth service
        
        Returns:
            Dict containing sync results
            
        Raises:
            Exception: If sync fails or user is not authenticated
        """
        if not self.access_token:
            raise Exception("Not authenticated. Please call authenticate() first.")
        
        sync_url = f"{self.base_url}/api/admin/users/sync"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        print(f"🔄 Initiating user synchronization...")
        
        try:
            async with self.session.post(
                sync_url,
                headers=headers
            ) as response:
                
                if response.status == 200:
                    sync_data = await response.json()
                    
                    print(f"✅ User synchronization completed successfully")
                    self._print_sync_results(sync_data)
                    
                    return sync_data
                    
                elif response.status == 403:
                    print(f"❌ Access denied: Admin role required")
                    raise Exception("Access denied: Admin role required")
                    
                elif response.status == 502:
                    print(f"❌ External auth service unavailable")
                    raise Exception("External auth service unavailable")
                    
                else:
                    error_text = await response.text()
                    print(f"❌ Sync failed: {response.status}")
                    print(f"   Error: {error_text}")
                    raise Exception(f"Sync failed with status {response.status}: {error_text}")
                    
        except aiohttp.ClientError as e:
            print(f"❌ Network error during sync: {e}")
            raise Exception(f"Network error: {e}")
    
    def _print_sync_results(self, sync_data: Dict):
        """
        Print formatted sync results
        
        Args:
            sync_data: Sync response data
        """
        stats = sync_data.get("statistics", {})
        
        print("\n📊 Synchronization Results:")
        print("=" * 50)
        print(f"   Timestamp: {sync_data.get('timestamp', 'Unknown')}")
        print(f"   Status: {sync_data.get('status', 'Unknown')}")
        print(f"   Message: {sync_data.get('message', 'No message')}")
        print()
        print("📈 Statistics:")
        print(f"   External Users: {stats.get('total_external_users', 0)}")
        print(f"   Local Users: {stats.get('total_local_users', 0)}")
        print(f"   Created: {stats.get('created_users', 0)} users")
        print(f"   Updated: {stats.get('updated_users', 0)} users")
        print(f"   Deactivated: {stats.get('deactivated_users', 0)} users")
        
        errors = stats.get('errors', [])
        if errors:
            print(f"\n⚠️  Errors ({len(errors)}):")
            for i, error in enumerate(errors, 1):
                print(f"   {i}. {error}")
        else:
            print(f"\n✅ No errors encountered")
        
        print("=" * 50)

async def check_service_health():
    """Check if the service is running and healthy"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/health") as response:
                if response.status == 200:
                    print(f"✅ Service is healthy at {BASE_URL}")
                    return True
                else:
                    print(f"⚠️  Service health check failed: {response.status}")
                    return False
    except aiohttp.ClientError as e:
        print(f"❌ Cannot connect to service at {BASE_URL}")
        print(f"   Error: {e}")
        print(f"   Make sure the service is running with: docker-compose up -d")
        return False

async def main():
    """Main execution function"""
    print("🚀 Admin User Synchronization Script")
    print("=" * 50)
    print(f"   Target Service: {BASE_URL}")
    print(f"   External Auth: {EXTERNAL_AUTH_URL}")
    print(f"   Admin User: {ADMIN_USER['username']}")
    print("=" * 50)
    
    # Check service health first
    if not await check_service_health():
        print("\n❌ Cannot proceed - service is not available")
        print("💡 Try starting the service with: docker-compose up -d")
        return 1
    
    try:
        async with AdminSyncClient() as client:
            # Step 1: Authenticate as admin
            auth_result = await client.authenticate(
                ADMIN_USER["username"],
                ADMIN_USER["password"]
            )
            
            # Verify admin role
            user_role = auth_result.get("user", {}).get("role", "")
            if user_role.lower() != "admin":
                print(f"❌ User role '{user_role}' is not 'Admin'")
                print("   Only admin users can perform user synchronization")
                return 1
            
            # Step 2: Trigger user synchronization
            sync_result = await client.sync_users()
            
            print("\n🎉 User synchronization completed successfully!")
            return 0
            
    except Exception as e:
        print(f"\n❌ Script failed: {e}")
        return 1

if __name__ == "__main__":
    """Entry point for script execution"""
    try:
        # Run the async main function
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Script interrupted by user")
        sys.exit(130)
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)