#!/usr/bin/env python3
"""
Test script to check if migrations need to be run for file upload support.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "app"))

async def check_migrations():
    """Check if migrations need to be run."""
    print("🔍 DEBUG: Checking migration status...")
    
    try:
        from app.database import get_database
        
        # Check database connection
        db = await get_database()
        print(f"✅ DEBUG: Database connected: {db.name}")
        
        # Check if migration tracking collection exists
        collections = await db.list_collection_names()
        print(f"✅ DEBUG: All collections: {collections}")
        
        # Check for file upload support collections
        required_collections = ["file_uploads"]
        missing_collections = []
        
        for collection in required_collections:
            if collection not in collections:
                missing_collections.append(collection)
                print(f"❌ DEBUG: Missing collection: {collection}")
            else:
                print(f"✅ DEBUG: Found collection: {collection}")
        
        # Check GridFS collections
        gridfs_collections = ["fs.files", "fs.chunks"]
        missing_gridfs = []
        
        for collection in gridfs_collections:
            if collection not in collections:
                missing_gridfs.append(collection)
                print(f"❌ DEBUG: Missing GridFS collection: {collection}")
            else:
                print(f"✅ DEBUG: Found GridFS collection: {collection}")
        
        # Check if migration is needed
        needs_migration = len(missing_collections) > 0 or len(missing_gridfs) > 0
        
        if needs_migration:
            print("❌ DEBUG: MIGRATION NEEDED!")
            print(f"   Missing collections: {missing_collections}")
            print(f"   Missing GridFS collections: {missing_gridfs}")
            
            # Try to run the migration
            print("🔄 DEBUG: Attempting to run file upload migration...")
            try:
                # Import and run migration
                from migrations.add_file_upload_support import migrate_file_upload_support
                await migrate_file_upload_support()
                print("✅ DEBUG: Migration completed successfully")
                
            except Exception as migration_error:
                print(f"❌ DEBUG: Migration failed: {migration_error}")
                import traceback
                traceback.print_exc()
                
                # Try to create collections manually
                print("🔄 DEBUG: Attempting to create collections manually...")
                try:
                    # Create file_uploads collection
                    await db.create_collection("file_uploads")
                    print("✅ DEBUG: Created file_uploads collection")
                    
                    # Create indexes
                    await db.file_uploads.create_index([("file_id", 1)], unique=True)
                    await db.file_uploads.create_index([("user_id", 1)])
                    await db.file_uploads.create_index([("session_id", 1)])
                    await db.file_uploads.create_index([("file_hash", 1)])
                    print("✅ DEBUG: Created indexes for file_uploads")
                    
                except Exception as create_error:
                    print(f"❌ DEBUG: Failed to create collections manually: {create_error}")
        else:
            print("✅ DEBUG: No migration needed, all collections exist")
        
        # Final verification
        print("🔍 DEBUG: Final verification...")
        updated_collections = await db.list_collection_names()
        print(f"✅ DEBUG: Final collections: {updated_collections}")
        
    except Exception as e:
        print(f"❌ DEBUG: Critical error in migration check: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_migrations())
