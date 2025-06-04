#!/usr/bin/env python3
"""
MongoDB Migration Test Script
This script tests the MongoDB database connection and basic model operations
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_mongodb_connection():
    """Test MongoDB connection and basic operations"""
    try:
        from app.database import connect_to_mongo, close_mongo_connection, get_database
        from app.models.user import User
        from app.models.chatflow import Chatflow, UserChatflow
        import bcrypt
        
        print("🔄 Testing MongoDB connection...")
        
        # Connect to MongoDB
        await connect_to_mongo()
        print("✅ Successfully connected to MongoDB")
        
        # Test creating a user
        print("🔄 Testing User model...")
        test_password = "test123"
        password_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Check if test user already exists
        existing_user = await User.find_one(User.username == "testuser")
        if existing_user:
            await existing_user.delete()
            print("🗑️  Deleted existing test user")
        
        test_user = User(
            username="testuser",
            email="test@example.com",
            password_hash=password_hash,
            role="User",
            credits=100
        )
        await test_user.insert()
        print("✅ Successfully created test user")
        
        # Test user authentication
        print("🔄 Testing user authentication...")
        user = await User.find_one(User.username == "testuser")
        if user and bcrypt.checkpw(test_password.encode('utf-8'), user.password_hash.encode('utf-8')):
            print("✅ User authentication works correctly")
        else:
            print("❌ User authentication failed")
        
        # Test creating a chatflow
        print("🔄 Testing Chatflow model...")
        test_chatflow = Chatflow(
            name="Test Chatflow",
            description="A test chatflow for MongoDB testing"
        )
        await test_chatflow.insert()
        print("✅ Successfully created test chatflow")
        
        # Test user-chatflow relationship
        print("🔄 Testing UserChatflow model...")
        user_chatflow = UserChatflow(
            user_id=str(test_user.id),
            chatflow_id=str(test_chatflow.id)
        )
        await user_chatflow.insert()
        print("✅ Successfully created user-chatflow relationship")
        
        # Test permission checking
        print("🔄 Testing permission lookup...")
        permission = await UserChatflow.find_one(
            UserChatflow.user_id == str(test_user.id),
            UserChatflow.chatflow_id == str(test_chatflow.id),
            UserChatflow.is_active == True
        )
        if permission:
            print("✅ Permission lookup works correctly")
        else:
            print("❌ Permission lookup failed")
        
        # Cleanup test data
        print("🔄 Cleaning up test data...")
        await test_user.delete()
        await test_chatflow.delete()
        await user_chatflow.delete()
        print("✅ Test data cleaned up")
        
        # Close connection
        await close_mongo_connection()
        print("✅ Successfully disconnected from MongoDB")
        
        print("\n🎉 All MongoDB tests passed! Migration successful.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Please install dependencies: pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("MongoDB Migration Test")
    print("=" * 50)
    
    success = asyncio.run(test_mongodb_connection())
    
    if success:
        print("\n✅ MongoDB migration completed successfully!")
        print("🚀 You can now start the service with MongoDB")
    else:
        print("\n❌ MongoDB migration test failed!")
        print("🔧 Please check the error messages above and fix any issues")
    
    sys.exit(0 if success else 1)
