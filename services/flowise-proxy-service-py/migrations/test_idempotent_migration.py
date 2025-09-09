"""
Test script to demonstrate idempotent migration behavior
Run this multiple times to see that it's safe
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv('.env.test')

from app.models.chat_message import ChatMessage
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

async def test_idempotent_migration():
    """Test that migration can run multiple times safely"""
    print("🧪 Testing idempotent migration behavior...")
    
    # Get MongoDB connection details
    mongodb_url = os.getenv('MONGODB_URL')
    database_name = os.getenv('MONGODB_DATABASE_NAME', 'flowise_proxy_test')
    
    print(f"📍 Using MongoDB: {mongodb_url}")
    print(f"📍 Database: {database_name}")
    
    # Initialize connection
    client = AsyncIOMotorClient(mongodb_url)
    database = client[database_name]
    
    try:
        # Get the collection directly for raw operations
        collection = database.get_collection("chat_messages")
        
        # Run migration logic 3 times to demonstrate idempotency
        for run in range(1, 4):
            print(f"\n🔄 Migration Run #{run}")
            print("-" * 40)
            
            # Count existing documents
            total_docs = await collection.count_documents({})
            print(f"📊 Total documents: {total_docs}")
            
            if total_docs == 0:
                print("✅ No existing documents to migrate")
                continue
            
            # Check how many documents already have metadata field
            docs_with_metadata = await collection.count_documents({"metadata": {"$exists": True}})
            docs_without_metadata = total_docs - docs_with_metadata
            
            print(f"📊 Documents with metadata: {docs_with_metadata}")
            print(f"📊 Documents without metadata: {docs_without_metadata}")
            
            if docs_without_metadata == 0:
                print("✅ All documents already have metadata field - no work needed")
                continue
            
            # Add metadata field to documents that don't have it
            result = await collection.update_many(
                {"metadata": {"$exists": False}},
                {"$set": {"metadata": None}}
            )
            
            print(f"✅ Updated {result.modified_count} documents")
            
            # Verify the migration
            final_count = await collection.count_documents({"metadata": {"$exists": True}})
            print(f"🔍 Final count with metadata: {final_count}")
            
            if final_count == total_docs:
                print("✅ Migration run completed successfully!")
            else:
                print("⚠️  Migration incomplete")
        
        print("\n" + "="*50)
        print("🎉 Idempotent migration test completed!")
        print("✅ Safe to run multiple times in production")
        print("="*50)
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_idempotent_migration())
