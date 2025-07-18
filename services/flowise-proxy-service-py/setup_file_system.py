#!/usr/bin/env python3
"""
Setup script to ensure the file system is properly configured.
This script will run all necessary migrations and setup steps.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "app"))

async def setup_file_system():
    """Setup the complete file system including database migrations."""
    print("🚀 DEBUG: Starting file system setup...")
    
    try:
        # 1. Connect to database
        print("🔍 DEBUG: Connecting to database...")
        from app.database import connect_to_mongo, get_database
        await connect_to_mongo()
        db = await get_database()
        
        if db is None:
            print("❌ DEBUG: Database connection failed")
            return False
        
        print(f"✅ DEBUG: Connected to database: {db.name}")
        
        # 2. Check current state
        print("🔍 DEBUG: Checking current database state...")
        collections = await db.list_collection_names()
        print(f"✅ DEBUG: Found collections: {collections}")
        
        # 3. Run file upload migration if needed
        if 'file_uploads' not in collections:
            print("🔄 DEBUG: Running file upload migration...")
            try:
                from migrations.add_file_upload_support import migrate_add_file_upload_support
                await migrate_add_file_upload_support()
                print("✅ DEBUG: File upload migration completed")
            except Exception as e:
                print(f"❌ DEBUG: File upload migration failed: {e}")
                # Try manual setup
                print("🔄 DEBUG: Attempting manual file system setup...")
                await manual_file_system_setup()
        else:
            print("✅ DEBUG: file_uploads collection already exists")
        
        # 4. Check and fix chat_messages collection
        await ensure_chat_messages_have_file_fields()
        
        # 5. Create indexes
        await create_indexes()
        
        # 6. Test file system functionality
        await test_file_system()
        
        print("✅ DEBUG: File system setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ DEBUG: File system setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def manual_file_system_setup():
    """Manually set up the file system if migrations fail."""
    print("🔄 DEBUG: Manual file system setup...")
    
    try:
        from app.database import get_database
        db = await get_database()
        
        # Create file_uploads collection with initial document
        print("🔄 DEBUG: Creating file_uploads collection...")
        await db.create_collection("file_uploads")
        
        # Ensure GridFS collections exist
        print("🔄 DEBUG: Ensuring GridFS collections exist...")
        from motor.motor_asyncio import AsyncIOMotorGridFSBucket
        bucket = AsyncIOMotorGridFSBucket(db)
        
        # This will create the collections if they don't exist
        # by uploading a dummy file and then deleting it
        import io
        dummy_data = b"dummy"
        file_id = await bucket.upload_from_stream(
            "dummy.txt",
            io.BytesIO(dummy_data),
            metadata={"setup": True}
        )
        await bucket.delete(file_id)
        
        print("✅ DEBUG: Manual setup completed")
        
    except Exception as e:
        print(f"❌ DEBUG: Manual setup failed: {e}")
        import traceback
        traceback.print_exc()

async def ensure_chat_messages_have_file_fields():
    """Ensure chat_messages collection has file-related fields."""
    print("🔍 DEBUG: Checking chat_messages file fields...")
    
    try:
        from app.database import get_database
        db = await get_database()
        
        # Check if chat_messages collection exists
        collections = await db.list_collection_names()
        if 'chat_messages' not in collections:
            print("ℹ️ DEBUG: chat_messages collection doesn't exist yet")
            return
        
        # Check if documents have file fields
        sample_doc = await db['chat_messages'].find_one()
        if not sample_doc:
            print("ℹ️ DEBUG: No chat_messages documents exist yet")
            return
        
        fields_to_add = {}
        if 'has_files' not in sample_doc:
            fields_to_add['has_files'] = False
        if 'file_ids' not in sample_doc:
            fields_to_add['file_ids'] = []
        
        if fields_to_add:
            print(f"🔄 DEBUG: Adding missing fields to chat_messages: {fields_to_add}")
            result = await db['chat_messages'].update_many(
                {},
                {"$set": fields_to_add}
            )
            print(f"✅ DEBUG: Updated {result.modified_count} chat_messages documents")
        else:
            print("✅ DEBUG: chat_messages already has required file fields")
            
    except Exception as e:
        print(f"❌ DEBUG: Error updating chat_messages: {e}")
        import traceback
        traceback.print_exc()

async def create_indexes():
    """Create necessary database indexes."""
    print("🔍 DEBUG: Creating database indexes...")
    
    try:
        from app.models.file_upload import FileUpload as FileUploadModel
        from app.models.chat_message import ChatMessage
        
        # Create indexes for FileUpload
        print("🔄 DEBUG: Creating FileUpload indexes...")
        await FileUploadModel.create_indexes()
        
        # Create indexes for ChatMessage
        print("🔄 DEBUG: Creating ChatMessage indexes...")
        await ChatMessage.create_indexes()
        
        print("✅ DEBUG: Database indexes created successfully")
        
    except Exception as e:
        print(f"❌ DEBUG: Error creating indexes: {e}")
        import traceback
        traceback.print_exc()

async def test_file_system():
    """Test the file system functionality."""
    print("🔍 DEBUG: Testing file system functionality...")
    
    try:
        from app.services.file_storage_service import FileStorageService
        import base64
        
        # Create test data
        test_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        service = FileStorageService()
        
        # Test file storage
        file_record = await service.store_file(
            file_data=test_data,
            filename="setup_test.png",
            mime_type="image/png",
            user_id="setup_test_user",
            session_id="setup_test_session",
            chatflow_id="setup_test_chatflow",
            message_id="setup_test_message"
        )
        
        if file_record:
            print(f"✅ DEBUG: Test file stored successfully: {file_record.file_id}")
            
            # Test retrieval
            file_data = await service.get_file(file_record.file_id)
            if file_data:
                retrieved_bytes, filename, mime_type = file_data
                print(f"✅ DEBUG: Test file retrieved successfully: {filename}")
                
                # Clean up test file
                await service.delete_file(file_record.file_id)
                print("✅ DEBUG: Test file cleaned up")
                
                return True
            else:
                print("❌ DEBUG: Test file retrieval failed")
                return False
        else:
            print("❌ DEBUG: Test file storage failed")
            return False
            
    except Exception as e:
        print(f"❌ DEBUG: File system test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting file system setup...")
    success = asyncio.run(setup_file_system())
    if success:
        print("✅ File system setup completed successfully!")
    else:
        print("❌ File system setup failed!")
        sys.exit(1)
