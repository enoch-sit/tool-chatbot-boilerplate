"""
Migration: Add metadata field to ChatMessage documents
Date: 2025-07-15
Description: Adds optional metadata field to existing ChatMessage documents for storing non-token events
"""

import asyncio
import sys
import os
from dotenv import load_dotenv
from datetime import datetime

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

from app.models.chat_message import ChatMessage
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import pymongo

async def migrate_add_metadata_field():
    """
    Migration to add metadata field to existing ChatMessage documents.
    This is a safe migration since the field is optional.
    """
    print("🔄 Starting migration: Add metadata field to ChatMessage...")
    
    # Get MongoDB connection details
    mongodb_url = os.getenv('MONGODB_URL')
    database_name = os.getenv('MONGODB_DATABASE_NAME', 'flowise_proxy')
    
    print(f"📍 Using MongoDB: {mongodb_url}")
    print(f"📍 Database: {database_name}")
    
    # Initialize connection
    client = AsyncIOMotorClient(mongodb_url)
    database = client[database_name]
    
    try:
        # Initialize Beanie with the updated ChatMessage model
        await init_beanie(database=database, document_models=[ChatMessage])
        
        # Get the collection directly for raw operations
        collection = database.get_collection("chat_messages")
        
        # Count existing documents
        total_docs = await collection.count_documents({})
        print(f"📊 Found {total_docs} existing ChatMessage documents")
        
        if total_docs == 0:
            print("✅ No existing documents to migrate")
            return
        
        # Check how many documents already have metadata field
        docs_with_metadata = await collection.count_documents({"metadata": {"$exists": True}})
        docs_without_metadata = total_docs - docs_with_metadata
        
        print(f"📊 Documents with metadata field: {docs_with_metadata}")
        print(f"📊 Documents without metadata field: {docs_without_metadata}")
        
        if docs_without_metadata == 0:
            print("✅ All documents already have metadata field")
            return
        
        # Add metadata field to documents that don't have it
        # Using $set with $exists: false condition
        result = await collection.update_many(
            {"metadata": {"$exists": False}},
            {"$set": {"metadata": None}}
        )
        
        print(f"✅ Updated {result.modified_count} documents with metadata field")
        
        # Verify the migration
        final_count = await collection.count_documents({"metadata": {"$exists": True}})
        print(f"🔍 Verification: {final_count} documents now have metadata field")
        
        if final_count == total_docs:
            print("✅ Migration completed successfully!")
        else:
            print("⚠️  Migration incomplete. Some documents may not have been updated.")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        client.close()

async def rollback_metadata_field():
    """
    Rollback migration - removes metadata field from ChatMessage documents.
    Use with caution in production!
    """
    print("🔄 Starting rollback: Remove metadata field from ChatMessage...")
    
    # Get MongoDB connection details
    mongodb_url = os.getenv('MONGODB_URL')
    database_name = os.getenv('MONGODB_DATABASE_NAME', 'flowise_proxy')
    
    print(f"📍 Using MongoDB: {mongodb_url}")
    print(f"📍 Database: {database_name}")
    
    # Initialize connection
    client = AsyncIOMotorClient(mongodb_url)
    database = client[database_name]
    
    try:
        # Get the collection directly for raw operations
        collection = database.get_collection("chat_messages")
        
        # Count documents with metadata field
        docs_with_metadata = await collection.count_documents({"metadata": {"$exists": True}})
        print(f"📊 Found {docs_with_metadata} documents with metadata field")
        
        if docs_with_metadata == 0:
            print("✅ No documents have metadata field to remove")
            return
        
        # Remove metadata field
        result = await collection.update_many(
            {"metadata": {"$exists": True}},
            {"$unset": {"metadata": ""}}
        )
        
        print(f"✅ Removed metadata field from {result.modified_count} documents")
        
        # Verify the rollback
        remaining_count = await collection.count_documents({"metadata": {"$exists": True}})
        print(f"🔍 Verification: {remaining_count} documents still have metadata field")
        
        if remaining_count == 0:
            print("✅ Rollback completed successfully!")
        else:
            print("⚠️  Rollback incomplete. Some documents may still have metadata field.")
            
    except Exception as e:
        print(f"❌ Rollback failed: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='ChatMessage metadata field migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()
    
    if args.rollback:
        print("⚠️  WARNING: This will remove the metadata field from all ChatMessage documents!")
        confirm = input("Are you sure you want to proceed? (yes/no): ")
        if confirm.lower() == 'yes':
            asyncio.run(rollback_metadata_field())
        else:
            print("❌ Rollback cancelled")
    else:
        asyncio.run(migrate_add_metadata_field())
