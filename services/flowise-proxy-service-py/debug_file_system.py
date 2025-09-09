#!/usr/bin/env python3
"""
Debug script to test file system setup and database collections.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "app"))

async def debug_file_system():
    """Debug the file system setup."""
    print("🔍 DEBUG: Starting file system debug...")
    
    try:
        # Import after path setup
        from app.database import get_database
        from app.models.file_upload import FileUpload as FileUploadModel
        from app.models.chat_message import ChatMessage
        from motor.motor_asyncio import AsyncIOMotorGridFSBucket
        
        # Check database connection
        print("🔍 DEBUG: Testing database connection...")
        db = await get_database()
        print(f"✅ DEBUG: Database connected: {db}")
        print(f"✅ DEBUG: Database name: {db.name}")
        
        # List all collections
        print("🔍 DEBUG: Listing all collections...")
        collections = await db.list_collection_names()
        print(f"✅ DEBUG: Collections found: {collections}")
        
        # Check if file_uploads collection exists
        if "file_uploads" in collections:
            print("✅ DEBUG: file_uploads collection exists")
            
            # Count documents
            file_count = await db.file_uploads.count_documents({})
            print(f"✅ DEBUG: file_uploads documents count: {file_count}")
            
            # Show sample documents
            if file_count > 0:
                sample_files = await db.file_uploads.find({}).limit(5).to_list(5)
                print(f"✅ DEBUG: Sample file documents:")
                for i, file_doc in enumerate(sample_files):
                    print(f"  {i+1}. ID: {file_doc.get('_id')}, file_id: {file_doc.get('file_id')}, name: {file_doc.get('original_name')}")
        else:
            print("❌ DEBUG: file_uploads collection does not exist")
        
        # Check GridFS collections
        print("🔍 DEBUG: Checking GridFS collections...")
        gridfs_files = "fs.files" in collections
        gridfs_chunks = "fs.chunks" in collections
        
        if gridfs_files:
            print("✅ DEBUG: fs.files collection exists")
            files_count = await db["fs.files"].count_documents({})
            print(f"✅ DEBUG: fs.files documents count: {files_count}")
            
            if files_count > 0:
                sample_gridfs = await db["fs.files"].find({}).limit(3).to_list(3)
                print(f"✅ DEBUG: Sample GridFS files:")
                for i, file_doc in enumerate(sample_gridfs):
                    print(f"  {i+1}. ID: {file_doc.get('_id')}, filename: {file_doc.get('filename')}, length: {file_doc.get('length')}")
        else:
            print("❌ DEBUG: fs.files collection does not exist")
        
        if gridfs_chunks:
            print("✅ DEBUG: fs.chunks collection exists")
            chunks_count = await db["fs.chunks"].count_documents({})
            print(f"✅ DEBUG: fs.chunks documents count: {chunks_count}")
        else:
            print("❌ DEBUG: fs.chunks collection does not exist")
        
        # Test GridFS bucket
        print("🔍 DEBUG: Testing GridFS bucket...")
        try:
            bucket = AsyncIOMotorGridFSBucket(db)
            print(f"✅ DEBUG: GridFS bucket created: {bucket}")
        except Exception as e:
            print(f"❌ DEBUG: GridFS bucket creation failed: {e}")
        
        # Check chat_messages collection
        print("🔍 DEBUG: Checking chat_messages collection...")
        if "chat_messages" in collections:
            print("✅ DEBUG: chat_messages collection exists")
            messages_count = await db.chat_messages.count_documents({})
            print(f"✅ DEBUG: chat_messages documents count: {messages_count}")
        else:
            print("❌ DEBUG: chat_messages collection does not exist")
        
        # Test FileUpload model
        print("🔍 DEBUG: Testing FileUpload model...")
        try:
            # Try to query file uploads
            files = await FileUploadModel.find({}).limit(5).to_list(5)
            print(f"✅ DEBUG: FileUpload model works, found {len(files)} files")
            
            for i, file_model in enumerate(files):
                print(f"  {i+1}. file_id: {file_model.file_id}, name: {file_model.original_name}, user: {file_model.user_id}")
                
        except Exception as e:
            print(f"❌ DEBUG: FileUpload model error: {e}")
            import traceback
            traceback.print_exc()
        
        print("✅ DEBUG: File system debug completed")
        
    except Exception as e:
        print(f"❌ DEBUG: Critical error in file system debug: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_file_system())
