"""
Migration: Add File Upload Support
Adds file upload models and updates chat messages to support file references.
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import connect_to_mongo, close_mongo_connection
from app.models.file_upload import FileUpload
from app.models.chat_message import ChatMessage


async def migrate_add_file_upload_support():
    """Add file upload support to the database"""
    print("🚀 Starting file upload support migration...")
    
    try:
        # Connect to MongoDB
        await connect_to_mongo()
        print("✅ Connected to MongoDB")
        
        # Create indexes for FileUpload collection
        print("🔧 Creating indexes for file_uploads collection...")
        await FileUpload.create_indexes()
        print("✅ FileUpload indexes created")
        
        # Update existing ChatMessage documents to include new fields
        print("🔧 Updating existing ChatMessage documents...")
        
        # Add has_files field to existing messages (default to False)
        result = await ChatMessage.find_all().update_many(
            {"$set": {"has_files": False}}
        )
        print(f"✅ Updated {result.modified_count} ChatMessage documents with has_files field")
        
        # Create indexes for ChatMessage collection (if not exists)
        print("🔧 Creating/updating indexes for chat_messages collection...")
        await ChatMessage.create_indexes()
        print("✅ ChatMessage indexes updated")
        
        print("🎉 File upload support migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    
    finally:
        await close_mongo_connection()


async def rollback_file_upload_support():
    """Rollback file upload support migration"""
    print("🔄 Rolling back file upload support migration...")
    
    try:
        # Connect to MongoDB
        await connect_to_mongo()
        print("✅ Connected to MongoDB")
        
        # Remove file_uploads collection
        print("🗑️  Removing file_uploads collection...")
        db = await FileUpload.get_database()
        await db.drop_collection("file_uploads")
        print("✅ file_uploads collection removed")
        
        # Remove new fields from ChatMessage documents
        print("🔧 Removing new fields from ChatMessage documents...")
        result = await ChatMessage.find_all().update_many(
            {"$unset": {"has_files": "", "file_ids": ""}}
        )
        print(f"✅ Updated {result.modified_count} ChatMessage documents")
        
        print("🎉 File upload support rollback completed successfully!")
        
    except Exception as e:
        print(f"❌ Rollback failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='File upload support migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()
    
    if args.rollback:
        asyncio.run(rollback_file_upload_support())
    else:
        asyncio.run(migrate_add_file_upload_support())
