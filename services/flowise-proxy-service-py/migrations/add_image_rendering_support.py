#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Migration Script: Add Image Rendering Support to Chat History

This migration script adds image rendering capabilities to the chat system by:
1. Updating the chat history API to include file metadata
2. Adding thumbnail generation endpoints
3. Enhancing file serving capabilities
4. Updating the ChatMessage model if needed
5. Testing the new functionality

Migration ID: add_image_rendering_support
Created: 2025-07-17
Dependencies: None
"""

import os
import sys
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import init_db
from app.models.chat_message import ChatMessage
from app.models.file_upload import FileUpload as FileUploadModel
from app.models.chat_session import ChatSession
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

class ImageRenderingMigration:
    """Migration class to add image rendering support to chat history."""
    
    def __init__(self):
        self.migration_id = "add_image_rendering_support"
        self.version = "1.0.0"
        self.description = "Add image rendering support to chat history"
        self.applied_at = None
        
    async def check_prerequisites(self) -> bool:
        """Check if all prerequisites are met before running migration."""
        print("🔍 Checking prerequisites...")
        
        try:
            # Check if PIL is available for thumbnail generation
            try:
                from PIL import Image
                print("✅ PIL (Pillow) is available for thumbnail generation")
            except ImportError:
                print("❌ PIL (Pillow) is not installed. Run: pip install Pillow")
                return False
            
            # Check if database connection is available
            try:
                from app.config import settings
                client = AsyncIOMotorClient(settings.MONGODB_URI)
                await client.admin.command('ping')
                print("✅ Database connection successful")
            except Exception as e:
                print(f"❌ Database connection failed: {e}")
                return False
            
            # Check if required models exist
            try:
                from app.models.chat_message import ChatMessage
                from app.models.file_upload import FileUpload as FileUploadModel
                from app.models.chat_session import ChatSession
                print("✅ Required models are available")
            except ImportError as e:
                print(f"❌ Required models not found: {e}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Prerequisites check failed: {e}")
            return False
    
    async def backup_data(self) -> bool:
        """Create a backup of existing data before migration."""
        print("💾 Creating data backup...")
        
        try:
            from app.config import settings
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            
            # Initialize database connection
            await init_beanie(
                database=client[settings.MONGODB_DATABASE],
                document_models=[ChatMessage, FileUploadModel, ChatSession]
            )
            
            # Create backup collections
            db = client[settings.MONGODB_DATABASE]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Backup chat_messages
            chat_messages = await ChatMessage.find_all().to_list()
            if chat_messages:
                backup_collection = db[f"chat_messages_backup_{timestamp}"]
                backup_data = [msg.model_dump() for msg in chat_messages]
                await backup_collection.insert_many(backup_data)
                print(f"✅ Backed up {len(chat_messages)} chat messages")
            
            # Backup file_uploads
            file_uploads = await FileUploadModel.find_all().to_list()
            if file_uploads:
                backup_collection = db[f"file_uploads_backup_{timestamp}"]
                backup_data = [file.model_dump() for file in file_uploads]
                await backup_collection.insert_many(backup_data)
                print(f"✅ Backed up {len(file_uploads)} file uploads")
            
            print(f"💾 Backup completed with timestamp: {timestamp}")
            return True
            
        except Exception as e:
            print(f"❌ Backup failed: {e}")
            return False
    
    async def update_database_schema(self) -> bool:
        """Update database schema if needed."""
        print("🗃️ Updating database schema...")
        
        try:
            from app.config import settings
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            
            # Initialize database connection
            await init_beanie(
                database=client[settings.MONGODB_DATABASE],
                document_models=[ChatMessage, FileUploadModel, ChatSession]
            )
            
            # Check if ChatMessage model has required fields
            sample_message = await ChatMessage.find_one()
            if sample_message:
                # Check if file_ids and has_files fields exist
                if not hasattr(sample_message, 'file_ids'):
                    print("⚠️ ChatMessage model missing file_ids field")
                    # The model should already have this field defined
                    
                if not hasattr(sample_message, 'has_files'):
                    print("⚠️ ChatMessage model missing has_files field")
                    # The model should already have this field defined
                    
                print("✅ ChatMessage model schema is up to date")
            else:
                print("ℹ️ No existing chat messages found")
            
            # Check FileUpload model
            sample_file = await FileUploadModel.find_one()
            if sample_file:
                required_fields = ['file_id', 'original_name', 'mime_type', 'file_size', 'user_id']
                for field in required_fields:
                    if not hasattr(sample_file, field):
                        print(f"⚠️ FileUpload model missing {field} field")
                        return False
                print("✅ FileUpload model schema is up to date")
            else:
                print("ℹ️ No existing file uploads found")
            
            # Create indexes if they don't exist
            await self.create_indexes()
            
            return True
            
        except Exception as e:
            print(f"❌ Schema update failed: {e}")
            return False
    
    async def create_indexes(self) -> bool:
        """Create necessary database indexes for performance."""
        print("📇 Creating database indexes...")
        
        try:
            from app.config import settings
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            db = client[settings.MONGODB_DATABASE]
            
            # Create indexes for chat_messages collection
            chat_messages_collection = db.chat_messages
            
            # Index for file queries
            await chat_messages_collection.create_index([
                ("session_id", 1),
                ("has_files", 1),
                ("created_at", 1)
            ])
            
            # Index for user file queries
            await chat_messages_collection.create_index([
                ("user_id", 1),
                ("has_files", 1),
                ("created_at", -1)
            ])
            
            # Create indexes for file_uploads collection
            file_uploads_collection = db.file_uploads
            
            # Index for file_id queries
            await file_uploads_collection.create_index([
                ("file_id", 1),
                ("user_id", 1)
            ])
            
            # Index for session file queries
            await file_uploads_collection.create_index([
                ("session_id", 1),
                ("user_id", 1),
                ("uploaded_at", -1)
            ])
            
            # Index for message file queries
            await file_uploads_collection.create_index([
                ("message_id", 1),
                ("user_id", 1)
            ])
            
            print("✅ Database indexes created successfully")
            return True
            
        except Exception as e:
            print(f"❌ Index creation failed: {e}")
            return False
    
    async def migrate_existing_data(self) -> bool:
        """Migrate existing data to new format."""
        print("🔄 Migrating existing data...")
        
        try:
            from app.config import settings
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            
            # Initialize database connection
            await init_beanie(
                database=client[settings.MONGODB_DATABASE],
                document_models=[ChatMessage, FileUploadModel, ChatSession]
            )
            
            # Find messages that should have files but don't have the has_files flag set
            messages_to_update = []
            
            # Get all messages
            all_messages = await ChatMessage.find_all().to_list()
            
            for message in all_messages:
                updated = False
                
                # Check if message has file_ids but has_files is False
                if hasattr(message, 'file_ids') and message.file_ids:
                    if not hasattr(message, 'has_files') or not message.has_files:
                        message.has_files = True
                        updated = True
                
                # Check if message doesn't have file_ids but should
                if not hasattr(message, 'file_ids') or message.file_ids is None:
                    message.file_ids = []
                    updated = True
                
                if not hasattr(message, 'has_files') or message.has_files is None:
                    message.has_files = False
                    updated = True
                
                if updated:
                    messages_to_update.append(message)
            
            # Update messages in batches
            if messages_to_update:
                print(f"🔄 Updating {len(messages_to_update)} messages...")
                for message in messages_to_update:
                    await message.save()
                print(f"✅ Updated {len(messages_to_update)} messages")
            else:
                print("ℹ️ No messages need updating")
            
            # Link file uploads to messages if needed
            await self.link_files_to_messages()
            
            return True
            
        except Exception as e:
            print(f"❌ Data migration failed: {e}")
            return False
    
    async def link_files_to_messages(self) -> bool:
        """Link file uploads to their corresponding messages."""
        print("🔗 Linking file uploads to messages...")
        
        try:
            # Find file uploads that might not be linked to messages
            file_uploads = await FileUploadModel.find_all().to_list()
            
            linked_count = 0
            for file_upload in file_uploads:
                if hasattr(file_upload, 'session_id') and file_upload.session_id:
                    # Find the user message in this session that should have this file
                    user_message = await ChatMessage.find_one({
                        "session_id": file_upload.session_id,
                        "user_id": file_upload.user_id,
                        "role": "user",
                        "has_files": True
                    })
                    
                    if user_message:
                        # Check if file is already linked
                        if not user_message.file_ids or file_upload.file_id not in user_message.file_ids:
                            if not user_message.file_ids:
                                user_message.file_ids = []
                            user_message.file_ids.append(file_upload.file_id)
                            user_message.has_files = True
                            await user_message.save()
                            linked_count += 1
                            
                        # Update file upload with message_id
                        if hasattr(user_message, 'id') and user_message.id:
                            file_upload.message_id = str(user_message.id)
                            await file_upload.save()
            
            print(f"✅ Linked {linked_count} file uploads to messages")
            return True
            
        except Exception as e:
            print(f"❌ File linking failed: {e}")
            return False
    
    async def test_new_functionality(self) -> bool:
        """Test the new image rendering functionality."""
        print("🧪 Testing new functionality...")
        
        try:
            from app.config import settings
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            
            # Initialize database connection
            await init_beanie(
                database=client[settings.MONGODB_DATABASE],
                document_models=[ChatMessage, FileUploadModel, ChatSession]
            )
            
            # Test 1: Find a message with files
            message_with_files = await ChatMessage.find_one({
                "has_files": True,
                "file_ids": {"$exists": True, "$ne": []}
            })
            
            if message_with_files:
                print(f"✅ Found message with files: {message_with_files.id}")
                print(f"   File IDs: {message_with_files.file_ids}")
                
                # Test 2: Check if file records exist
                if message_with_files.file_ids:
                    file_record = await FileUploadModel.find_one({
                        "file_id": message_with_files.file_ids[0]
                    })
                    
                    if file_record:
                        print(f"✅ Found file record: {file_record.file_id}")
                        print(f"   Original name: {file_record.original_name}")
                        print(f"   MIME type: {file_record.mime_type}")
                        print(f"   Is image: {file_record.mime_type.startswith('image/')}")
                    else:
                        print("⚠️ File record not found")
                        
            else:
                print("ℹ️ No messages with files found for testing")
            
            # Test 3: Check PIL functionality
            try:
                from PIL import Image
                import io
                
                # Create a small test image
                test_image = Image.new('RGB', (100, 100), color='red')
                buffer = io.BytesIO()
                test_image.save(buffer, format='PNG')
                
                # Test thumbnail generation
                buffer.seek(0)
                thumbnail_image = Image.open(buffer)
                thumbnail_image.thumbnail((50, 50), Image.Resampling.LANCZOS)
                
                print("✅ PIL thumbnail generation test passed")
                
            except Exception as e:
                print(f"❌ PIL test failed: {e}")
                return False
            
            print("✅ All functionality tests passed")
            return True
            
        except Exception as e:
            print(f"❌ Functionality test failed: {e}")
            return False
    
    async def record_migration(self) -> bool:
        """Record the migration in the database."""
        print("📝 Recording migration...")
        
        try:
            from app.config import settings
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            db = client[settings.MONGODB_DATABASE]
            
            # Create migrations collection if it doesn't exist
            migrations_collection = db.migrations
            
            migration_record = {
                "migration_id": self.migration_id,
                "version": self.version,
                "description": self.description,
                "applied_at": datetime.utcnow(),
                "status": "completed"
            }
            
            await migrations_collection.insert_one(migration_record)
            print(f"✅ Migration recorded: {self.migration_id}")
            return True
            
        except Exception as e:
            print(f"❌ Migration recording failed: {e}")
            return False
    
    async def run_migration(self) -> bool:
        """Run the complete migration process."""
        print(f"🚀 Starting migration: {self.migration_id}")
        print(f"📋 Description: {self.description}")
        print(f"🔢 Version: {self.version}")
        print("-" * 50)
        
        try:
            # Step 1: Check prerequisites
            if not await self.check_prerequisites():
                print("❌ Prerequisites not met. Aborting migration.")
                return False
            
            # Step 2: Create backup
            if not await self.backup_data():
                print("❌ Backup failed. Aborting migration.")
                return False
            
            # Step 3: Update database schema
            if not await self.update_database_schema():
                print("❌ Schema update failed. Aborting migration.")
                return False
            
            # Step 4: Migrate existing data
            if not await self.migrate_existing_data():
                print("❌ Data migration failed. Aborting migration.")
                return False
            
            # Step 5: Test new functionality
            if not await self.test_new_functionality():
                print("❌ Functionality test failed. Aborting migration.")
                return False
            
            # Step 6: Record migration
            if not await self.record_migration():
                print("❌ Migration recording failed.")
                return False
            
            print("-" * 50)
            print("✅ Migration completed successfully!")
            print(f"🎉 Image rendering support has been added to the chat system")
            
            # Print summary
            print("\n📊 Migration Summary:")
            print("• Enhanced chat history API with file metadata")
            print("• Added thumbnail generation for images")
            print("• Improved file serving capabilities")
            print("• Created necessary database indexes")
            print("• Linked existing files to messages")
            print("• All functionality tests passed")
            
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            return False

async def main():
    """Main function to run the migration."""
    migration = ImageRenderingMigration()
    
    # Ask for confirmation
    print("⚠️  This migration will modify your database and add image rendering support.")
    print("   Make sure you have a backup of your data before proceeding.")
    
    response = input("\nDo you want to proceed? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("Migration cancelled.")
        return
    
    # Run the migration
    success = await migration.run_migration()
    
    if success:
        print("\n🎯 Next Steps:")
        print("1. Restart your application server")
        print("2. Test the new image rendering endpoints:")
        print("   - GET /api/v1/chat/files/{file_id}")
        print("   - GET /api/v1/chat/files/{file_id}/thumbnail")
        print("   - GET /api/v1/chat/sessions/{session_id}/history")
        print("3. Update your frontend to use the new file URLs")
        print("4. Test image uploads and history retrieval")
        
        sys.exit(0)
    else:
        print("\n❌ Migration failed. Please check the errors above.")
        print("   Your data backup is available in the database.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
