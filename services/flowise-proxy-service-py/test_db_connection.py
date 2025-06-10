#!/usr/bin/env python3
"""
Quick test script to verify MongoDB connection
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_connection():
    try:
        print("Testing MongoDB connection...")
        client = AsyncIOMotorClient('mongodb://testuser:testpass@localhost:27020/flowise_proxy_test')
        
        # Test connection
        await client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        
        # Test database access
        db = client.flowise_proxy_test
        collections = await db.list_collection_names()
        print(f"✅ Database access successful! Collections: {collections}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
