#!/usr/bin/env python3
"""
Collection Setup Service for Flowise Proxy Service
This service handles the initialization and setup of MongoDB collections
for file system support during server startup.
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
import pymongo

logger = logging.getLogger(__name__)


class CollectionSetupService:
    """Service for setting up and maintaining database collections."""

    def __init__(self):
        self.setup_completed = False
        self.setup_timestamp = None
        self.collections_status: Dict[str, bool] = {}

    async def setup_all_collections(
        self, force_recreate: bool = False
    ) -> Dict[str, Any]:
        """
        Setup all collections required for the file system.

        Args:
            force_recreate: Whether to recreate existing collections

        Returns:
            Setup status report
        """
        logger.info("🚀 Starting complete collection setup...")
        setup_report = {
            "started_at": datetime.utcnow().isoformat(),
            "collections": {},
            "indexes": {},
            "gridfs": {},
            "errors": [],
            "success": False,
        }

        try:
            # Import here to avoid circular imports
            from app.database import get_database

            db = await get_database()

            # 1. Setup primary collections
            logger.info("📋 Setting up primary collections...")
            await self._setup_primary_collections(db, setup_report, force_recreate)

            # 2. Setup GridFS collections
            logger.info("🗂️ Setting up GridFS collections...")
            await self._setup_gridfs_collections(db, setup_report)

            # 3. Create indexes
            logger.info("🔍 Creating database indexes...")
            await self._create_all_indexes(setup_report)

            # 4. Validate setup
            logger.info("✅ Validating setup...")
            validation_result = await self._validate_collections_setup(db)
            setup_report["validation"] = validation_result

            self.setup_completed = True
            self.setup_timestamp = datetime.utcnow()
            setup_report["success"] = True
            setup_report["completed_at"] = self.setup_timestamp.isoformat()

            logger.info("🎉 Collection setup completed successfully!")
            return setup_report

        except Exception as e:
            error_msg = f"Collection setup failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            setup_report["errors"].append(error_msg)
            setup_report["success"] = False
            setup_report["failed_at"] = datetime.utcnow().isoformat()
            raise

    async def _setup_primary_collections(
        self,
        db: AsyncIOMotorDatabase,
        setup_report: Dict[str, Any],
        force_recreate: bool = False,
    ):
        """Setup primary application collections."""
        # Import models here to avoid circular imports
        from app.models.user import User
        from app.models.chatflow import Chatflow, UserChatflow
        from app.models.refresh_token import RefreshToken
        from app.models.chat_session import ChatSession
        from app.models.chat_message import ChatMessage
        from app.models.file_upload import FileUpload

        collections_config = {
            "users": {"model": User, "required": True},
            "chatflows": {"model": Chatflow, "required": True},
            "user_chatflows": {"model": UserChatflow, "required": True},
            "refresh_tokens": {"model": RefreshToken, "required": True},
            "chat_sessions": {"model": ChatSession, "required": True},
            "chat_messages": {"model": ChatMessage, "required": True},
            "file_uploads": {"model": FileUpload, "required": True},
        }

        existing_collections = set(await db.list_collection_names())

        for collection_name, config in collections_config.items():
            try:
                logger.info(f"🔧 Setting up collection: {collection_name}")

                collection_exists = collection_name in existing_collections

                if force_recreate and collection_exists:
                    logger.warning(f"🗑️ Dropping existing collection: {collection_name}")
                    await db.drop_collection(collection_name)
                    collection_exists = False

                if not collection_exists:
                    logger.info(f"📝 Creating new collection: {collection_name}")

                    # Create collection with options
                    collection_options = self._get_collection_options(collection_name)
                    if collection_options:
                        await db.create_collection(
                            collection_name, **collection_options
                        )
                    else:
                        await db.create_collection(collection_name)

                    setup_report["collections"][collection_name] = "created"
                else:
                    logger.info(f"✅ Collection already exists: {collection_name}")
                    setup_report["collections"][collection_name] = "exists"

                self.collections_status[collection_name] = True

            except Exception as e:
                error_msg = f"Failed to setup collection {collection_name}: {str(e)}"
                logger.error(error_msg)
                setup_report["errors"].append(error_msg)
                self.collections_status[collection_name] = False

                if config["required"]:
                    raise

    async def _setup_gridfs_collections(
        self, db: AsyncIOMotorDatabase, setup_report: Dict[str, Any]
    ):
        """Setup GridFS collections for file storage."""
        try:
            logger.info("🗂️ Initializing GridFS bucket...")

            # Create GridFS bucket
            bucket = AsyncIOMotorGridFSBucket(db)

            # Check if GridFS collections exist
            existing_collections = set(await db.list_collection_names())
            gridfs_files_exists = "fs.files" in existing_collections
            gridfs_chunks_exists = "fs.chunks" in existing_collections

            if not (gridfs_files_exists and gridfs_chunks_exists):
                logger.info("📁 Creating GridFS collections...")

                # Upload a dummy file to create collections
                dummy_data = b"dummy_file_for_collection_creation"
                import io

                file_id = await bucket.upload_from_stream(
                    "setup_dummy.txt",
                    io.BytesIO(dummy_data),
                    metadata={
                        "setup": True,
                        "created_at": datetime.utcnow(),
                        "purpose": "collection_initialization",
                    },
                )

                # Delete the dummy file
                await bucket.delete(file_id)

                setup_report["gridfs"]["fs.files"] = "created"
                setup_report["gridfs"]["fs.chunks"] = "created"
                logger.info("✅ GridFS collections created successfully")
            else:
                setup_report["gridfs"]["fs.files"] = "exists"
                setup_report["gridfs"]["fs.chunks"] = "exists"
                logger.info("✅ GridFS collections already exist")

            # Create GridFS indexes
            await self._create_gridfs_indexes(db, setup_report)

        except Exception as e:
            error_msg = f"GridFS setup failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            setup_report["errors"].append(error_msg)
            raise

    async def _create_gridfs_indexes(
        self, db: AsyncIOMotorDatabase, setup_report: Dict[str, Any]
    ):
        """Create optimized indexes for GridFS collections."""
        try:
            # Indexes for fs.files collection
            files_collection = db["fs.files"]

            # Index for filename lookups
            await files_collection.create_index([("filename", pymongo.ASCENDING)])

            # Index for metadata queries
            await files_collection.create_index(
                [("metadata.user_id", pymongo.ASCENDING)]
            )
            await files_collection.create_index(
                [("metadata.session_id", pymongo.ASCENDING)]
            )
            await files_collection.create_index(
                [("metadata.message_id", pymongo.ASCENDING)]
            )

            # Index for file size and upload date
            await files_collection.create_index(
                [("uploadDate", pymongo.DESCENDING), ("length", pymongo.ASCENDING)]
            )

            # Indexes for fs.chunks collection
            chunks_collection = db["fs.chunks"]

            # Default GridFS chunk index (usually exists automatically)
            await chunks_collection.create_index(
                [("files_id", pymongo.ASCENDING), ("n", pymongo.ASCENDING)], unique=True
            )

            setup_report["indexes"]["gridfs"] = "created"
            logger.info("✅ GridFS indexes created successfully")

        except Exception as e:
            # GridFS indexes might already exist, log but don't fail
            logger.warning(f"GridFS index creation warning: {str(e)}")
            setup_report["indexes"]["gridfs"] = f"warning: {str(e)}"

    def _get_collection_options(self, collection_name: str) -> Optional[Dict[str, Any]]:
        """Get collection-specific creation options."""
        options_map = {
            "chat_messages": {
                # Enable validation for chat messages
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["session_id", "user_id", "role", "content"],
                        "properties": {
                            "role": {
                                "bsonType": "string",
                                "enum": ["user", "assistant", "system"],
                            },
                            "has_files": {"bsonType": "bool"},
                            "file_ids": {"bsonType": "array"},
                        },
                    }
                }
            },
            "file_uploads": {
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": [
                            "file_id",
                            "original_name",
                            "mime_type",
                            "session_id",
                            "user_id",
                        ],
                        "properties": {
                            "file_id": {"bsonType": "string"},
                            "file_size": {"bsonType": "int", "minimum": 0},
                            "processed": {"bsonType": "bool"},
                        },
                    }
                }
            },
            "chat_sessions": {
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["session_id", "user_id"],
                        "properties": {"has_files": {"bsonType": "bool"}},
                    }
                }
            },
        }

        return options_map.get(collection_name)

    async def _create_all_indexes(self, setup_report: Dict[str, Any]):
        """Create all necessary indexes for optimal performance."""
        # Import models here to avoid circular imports
        from app.models.user import User
        from app.models.chatflow import Chatflow, UserChatflow
        from app.models.refresh_token import RefreshToken
        from app.models.chat_session import ChatSession
        from app.models.chat_message import ChatMessage
        from app.models.file_upload import FileUpload

        models_to_index = [
            User,
            Chatflow,
            UserChatflow,
            RefreshToken,
            ChatSession,
            ChatMessage,
            FileUpload,
        ]

        for model in models_to_index:
            try:
                logger.info(f"🔍 Creating indexes for {model.__name__}...")
                await model.create_indexes()
                setup_report["indexes"][model.__name__] = "created"
                logger.info(f"✅ Indexes created for {model.__name__}")

            except Exception as e:
                error_msg = f"Failed to create indexes for {model.__name__}: {str(e)}"
                logger.warning(error_msg)
                setup_report["indexes"][model.__name__] = f"error: {str(e)}"

    async def _validate_collections_setup(
        self, db: AsyncIOMotorDatabase
    ) -> Dict[str, Any]:
        """Validate that all collections are properly set up."""
        validation_report = {
            "collections_count": 0,
            "required_collections": [],
            "missing_collections": [],
            "indexes_validated": {},
            "gridfs_status": {},
            "validation_passed": False,
        }

        try:
            # Check all collections exist
            existing_collections = set(await db.list_collection_names())
            validation_report["collections_count"] = len(existing_collections)

            required_collections = [
                "users",
                "chatflows",
                "user_chatflows",
                "refresh_tokens",
                "chat_sessions",
                "chat_messages",
                "file_uploads",
                "fs.files",
                "fs.chunks",
            ]

            validation_report["required_collections"] = required_collections

            for collection_name in required_collections:
                if collection_name not in existing_collections:
                    validation_report["missing_collections"].append(collection_name)

            # Validate GridFS
            if (
                "fs.files" in existing_collections
                and "fs.chunks" in existing_collections
            ):
                validation_report["gridfs_status"]["collections"] = "present"

                # Test GridFS functionality
                bucket = AsyncIOMotorGridFSBucket(db)
                test_data = b"validation_test"
                import io

                file_id = await bucket.upload_from_stream(
                    "validation_test.txt",
                    io.BytesIO(test_data),
                    metadata={"validation": True},
                )

                # Read it back
                download_stream = await bucket.open_download_stream(file_id)
                content = await download_stream.read()

                # Clean up
                await bucket.delete(file_id)

                if content == test_data:
                    validation_report["gridfs_status"]["functionality"] = "working"
                else:
                    validation_report["gridfs_status"]["functionality"] = "failed"
            else:
                validation_report["gridfs_status"]["collections"] = "missing"

            # Overall validation
            validation_report["validation_passed"] = (
                len(validation_report["missing_collections"]) == 0
                and validation_report["gridfs_status"].get("functionality") == "working"
            )

            return validation_report

        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            validation_report["validation_error"] = str(e)
            return validation_report

    async def health_check(self) -> Dict[str, Any]:
        """Perform a health check on all collections."""
        health_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "setup_completed": self.setup_completed,
            "setup_timestamp": (
                self.setup_timestamp.isoformat() if self.setup_timestamp else None
            ),
            "collections_status": self.collections_status.copy(),
            "database_status": {},
            "gridfs_status": {},
            "overall_health": "unknown",
        }

        try:
            from app.database import get_database

            db = await get_database()

            # Check database connection
            await db.command("ping")
            health_report["database_status"]["connection"] = "healthy"

            # Check collections
            existing_collections = set(await db.list_collection_names())
            health_report["database_status"]["collections_count"] = len(
                existing_collections
            )

            # Check GridFS
            if (
                "fs.files" in existing_collections
                and "fs.chunks" in existing_collections
            ):
                bucket = AsyncIOMotorGridFSBucket(db)
                files_count = await db["fs.files"].count_documents({})
                health_report["gridfs_status"] = {
                    "collections_present": True,
                    "files_count": files_count,
                    "status": "healthy",
                }
            else:
                health_report["gridfs_status"] = {
                    "collections_present": False,
                    "status": "missing",
                }

            # Overall health assessment
            if (
                self.setup_completed
                and health_report["database_status"]["connection"] == "healthy"
                and health_report["gridfs_status"]["status"] == "healthy"
            ):
                health_report["overall_health"] = "healthy"
            else:
                health_report["overall_health"] = "unhealthy"

            return health_report

        except Exception as e:
            health_report["database_status"]["connection"] = f"error: {str(e)}"
            health_report["overall_health"] = "error"
            logger.error(f"Health check failed: {str(e)}")
            return health_report

    async def get_setup_status(self) -> Dict[str, Any]:
        """Get the current setup status."""
        return {
            "setup_completed": self.setup_completed,
            "setup_timestamp": (
                self.setup_timestamp.isoformat() if self.setup_timestamp else None
            ),
            "collections_status": self.collections_status.copy(),
        }


# Global instance
collection_setup_service = CollectionSetupService()


# Convenience function for standalone usage
async def setup_collections_for_file_system(force_recreate: bool = False) -> bool:
    """
    Convenience function to setup collections for file system.

    Args:
        force_recreate: Whether to recreate existing collections

    Returns:
        True if setup was successful, False otherwise
    """
    try:
        logger.info("🚀 Setting up collections for file system...")

        # Connect to database if not already connected
        from app.database import connect_to_mongo

        await connect_to_mongo()

        # Run collection setup
        setup_report = await collection_setup_service.setup_all_collections(
            force_recreate
        )

        if setup_report["success"]:
            logger.info("✅ File system collections setup completed successfully!")
            return True
        else:
            logger.error("❌ File system collections setup failed!")
            logger.error(f"Errors: {setup_report['errors']}")
            return False

    except Exception as e:
        logger.error(f"💥 Failed to setup file system collections: {str(e)}")
        return False


if __name__ == "__main__":
    # Standalone execution for testing
    import sys
    import os
    from pathlib import Path

    # Add app directory to path
    sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

    async def main():
        """Run collection setup standalone."""
        force_recreate = "--force" in sys.argv
        success = await setup_collections_for_file_system(force_recreate)
        return 0 if success else 1

    exit_code = asyncio.run(main())
    sys.exit(exit_code)
