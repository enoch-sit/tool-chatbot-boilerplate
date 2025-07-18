#!/usr/bin/env python3
"""
Test script to verify the complete file upload and retrieval flow.
This includes checking database migrations and system setup.
"""
import asyncio
import os
import sys
import base64
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "app"))

async def check_database_setup():
    """Check if database is properly set up with required collections and indexes."""
    print("🔍 DEBUG: Checking database setup...")
    
    try:
        from app.database import get_database
        db = await get_database()
        
        if not db:
            print("❌ DEBUG: Database connection failed")
            return False
            
        print(f"✅ DEBUG: Database connected: {db}")
        print(f"✅ DEBUG: Database name: {db.name}")
        
        # Check collections
        print("🔍 DEBUG: Listing all collections...")
        collections = await db.list_collection_names()
        print(f"✅ DEBUG: Collections found: {collections}")
        
        # Check if required collections exist
        required_collections = ['chat_messages', 'file_uploads']
        for collection in required_collections:
            if collection in collections:
                print(f"✅ DEBUG: {collection} collection exists")
                count = await db[collection].count_documents({})
                print(f"✅ DEBUG: {collection} documents count: {count}")
            else:
                print(f"❌ DEBUG: {collection} collection missing")
                
        # Check GridFS collections
        print("🔍 DEBUG: Checking GridFS collections...")
        gridfs_collections = ['fs.files', 'fs.chunks']
        for collection in gridfs_collections:
            if collection in collections:
                print(f"✅ DEBUG: {collection} collection exists")
                count = await db[collection].count_documents({})
                print(f"✅ DEBUG: {collection} documents count: {count}")
            else:
                print(f"❌ DEBUG: {collection} collection does not exist")
                
        # Test GridFS bucket
        print("🔍 DEBUG: Testing GridFS bucket...")
        from motor.motor_asyncio import AsyncIOMotorGridFSBucket
        bucket = AsyncIOMotorGridFSBucket(db)
        print(f"✅ DEBUG: GridFS bucket created: {bucket}")
        
        # Check if ChatMessage model has required fields
        print("🔍 DEBUG: Checking chat_messages collection...")
        if 'chat_messages' in collections:
            print(f"✅ DEBUG: chat_messages collection exists")
            count = await db['chat_messages'].count_documents({})
            print(f"✅ DEBUG: chat_messages documents count: {count}")
            
            # Check for required fields in a sample document
            sample_doc = await db['chat_messages'].find_one()
            if sample_doc:
                required_fields = ['has_files', 'file_ids']
                for field in required_fields:
                    if field in sample_doc:
                        print(f"✅ DEBUG: chat_messages has {field} field")
                    else:
                        print(f"❌ DEBUG: chat_messages missing {field} field - migration needed")
        
        # Test FileUpload model
        print("🔍 DEBUG: Testing FileUpload model...")
        from app.models.file_upload import FileUpload as FileUploadModel
        files = await FileUploadModel.find_all().to_list()
        print(f"✅ DEBUG: FileUpload model works, found {len(files)} files")
        
        return True
        
    except Exception as e:
        print(f"❌ DEBUG: Database setup check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def run_migrations():
    """Run database migrations if needed."""
    print("🔍 DEBUG: Checking if migrations are needed...")
    
    try:
        # Check if file upload migration is needed
        from app.database import get_database
        db = await get_database()
        
        collections = await db.list_collection_names()
        
        # Check if file_uploads collection exists
        if 'file_uploads' not in collections:
            print("❌ DEBUG: file_uploads collection missing - running migration...")
            from migrations.add_file_upload_support import migrate_add_file_upload_support
            await migrate_add_file_upload_support()
            print("✅ DEBUG: File upload migration completed")
        
        # Check if chat_messages has file support fields
        if 'chat_messages' in collections:
            sample_doc = await db['chat_messages'].find_one()
            if sample_doc and ('has_files' not in sample_doc or 'file_ids' not in sample_doc):
                print("❌ DEBUG: chat_messages missing file fields - updating...")
                # Add missing fields to existing documents
                result = await db['chat_messages'].update_many(
                    {},
                    {
                        "$set": {
                            "has_files": {"$ifNull": ["$has_files", False]},
                            "file_ids": {"$ifNull": ["$file_ids", []]}
                        }
                    }
                )
                print(f"✅ DEBUG: Updated {result.modified_count} chat_messages documents")
        
        return True
        
    except Exception as e:
        print(f"❌ DEBUG: Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_file_flow():
    """Test the complete file upload and retrieval flow."""
    print("🔍 DEBUG: Starting file flow test...")
    
    try:
        # First check database setup
        if not await check_database_setup():
            print("❌ DEBUG: Database setup check failed - attempting migrations...")
            if not await run_migrations():
                print("❌ DEBUG: Migration failed - exiting")
                return False
            
            # Re-check setup after migration
            if not await check_database_setup():
                print("❌ DEBUG: Database still not properly set up after migration")
                return False
        
        print("✅ DEBUG: Database setup verified")
        
        from app.services.file_storage_service import FileStorageService
        
        # Create a test image (simple 1x1 pixel PNG)
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        print(f"✅ DEBUG: Created test image data, size: {len(test_image_data)} bytes")
        
        # Initialize file storage service
        service = FileStorageService()
        print("✅ DEBUG: Created FileStorageService")
        
        # Test file storage
        print("🔄 DEBUG: Testing file storage...")
        file_record = await service.store_file(
            file_data=test_image_data,
            filename="test_image.png",
            mime_type="image/png",
            user_id="test_user",
            session_id="test_session",
            chatflow_id="test_chatflow",
            message_id="test_message"
        )
        
        if file_record:
            print(f"✅ DEBUG: File stored successfully!")
            print(f"   File ID: {file_record.file_id}")
            print(f"   Original name: {file_record.original_name}")
            print(f"   MIME type: {file_record.mime_type}")
            print(f"   File size: {file_record.file_size}")
            print(f"   User ID: {file_record.user_id}")
            print(f"   Session ID: {file_record.session_id}")
            print(f"   Message ID: {file_record.message_id}")
            
            # Verify file exists in database
            print("🔍 DEBUG: Verifying file exists in database...")
            from app.models.file_upload import FileUpload as FileUploadModel
            db_file = await FileUploadModel.find_one(FileUploadModel.file_id == file_record.file_id)
            if db_file:
                print(f"✅ DEBUG: File found in database: {db_file.original_name}")
            else:
                print(f"❌ DEBUG: File not found in database!")
                
            # Verify file exists in GridFS
            print("🔍 DEBUG: Verifying file exists in GridFS...")
            from app.database import get_database
            from motor.motor_asyncio import AsyncIOMotorGridFSBucket
            from bson import ObjectId
            
            db = await get_database()
            bucket = AsyncIOMotorGridFSBucket(db)
            
            try:
                if ObjectId.is_valid(file_record.file_id):
                    gridfs_file = await bucket.find({"_id": ObjectId(file_record.file_id)}).to_list(1)
                    if gridfs_file:
                        print(f"✅ DEBUG: File found in GridFS: {gridfs_file[0]['filename']}")
                    else:
                        print(f"❌ DEBUG: File not found in GridFS!")
                else:
                    print(f"❌ DEBUG: Invalid ObjectId: {file_record.file_id}")
            except Exception as gridfs_error:
                print(f"❌ DEBUG: GridFS check error: {gridfs_error}")
            
            # Test file retrieval
            print("🔄 DEBUG: Testing file retrieval...")
            file_data = await service.get_file(file_record.file_id)
            
            if file_data:
                retrieved_bytes, filename, mime_type = file_data
                print(f"✅ DEBUG: File retrieved successfully!")
                print(f"   Retrieved size: {len(retrieved_bytes)} bytes")
                print(f"   Retrieved filename: {filename}")
                print(f"   Retrieved MIME type: {mime_type}")
                
                # Verify data integrity
                if retrieved_bytes == test_image_data:
                    print("✅ DEBUG: Data integrity verified!")
                else:
                    print("❌ DEBUG: Data integrity failed!")
                    print(f"   Original size: {len(test_image_data)}")
                    print(f"   Retrieved size: {len(retrieved_bytes)}")
                    
                return True
                    
            else:
                print("❌ DEBUG: File retrieval failed!")
                return False
                
        else:
            print("❌ DEBUG: File storage failed!")
            return False
            
    except Exception as e:
        print(f"❌ DEBUG: Critical error in file flow test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 DEBUG: File system debug completed")
    success = asyncio.run(test_file_flow())
    if success:
        print("✅ DEBUG: File flow test completed successfully!")
    else:
        print("❌ DEBUG: File flow test failed!")
        sys.exit(1)
