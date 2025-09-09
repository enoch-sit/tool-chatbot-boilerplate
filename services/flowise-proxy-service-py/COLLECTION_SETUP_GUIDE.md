# 🗄️ File System Collections Setup Guide

This guide explains how to prepare MongoDB collections for the file system in flowise-proxy-service-py and integrate the setup into server startup.

## 📋 Table of Contents

1. [Collection Setup Service](#collection-setup-service)
2. [Startup Integration](#startup-integration)
3. [Advanced Collection Initialization](#advanced-collection-initialization)
4. [Migration Integration](#migration-integration)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring and Health Checks](#monitoring-and-health-checks)

## 📚 Collection Setup Service

### Core Collection Initializer

```python
# app/services/collection_setup_service.py
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
import pymongo

from app.database import get_database
from app.models.file_upload import FileUpload
from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.user import User
from app.models.chatflow import Chatflow, UserChatflow
from app.models.refresh_token import RefreshToken

logger = logging.getLogger(__name__)


class CollectionSetupService:
    """Service for setting up and maintaining database collections."""
    
    def __init__(self):
        self.setup_completed = False
        self.setup_timestamp = None
        self.collections_status: Dict[str, bool] = {}
        
    async def setup_all_collections(self, force_recreate: bool = False) -> Dict[str, Any]:
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
            "success": False
        }
        
        try:
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
            
            # 5. Run initial data setup if needed
            logger.info("📊 Running initial data setup...")
            await self._setup_initial_data(db, setup_report)
            
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
        force_recreate: bool = False
    ):
        """Setup primary application collections."""
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
                        await db.create_collection(collection_name, **collection_options)
                    else:
                        await db.create_collection(collection_name)
                    
                    setup_report["collections"][collection_name] = "created"
                else:
                    logger.info(f"✅ Collection already exists: {collection_name}")
                    setup_report["collections"][collection_name] = "exists"
                    
                # Verify collection
                collection_info = await db[collection_name].options()
                logger.debug(f"Collection {collection_name} options: {collection_info}")
                
                self.collections_status[collection_name] = True
                
            except Exception as e:
                error_msg = f"Failed to setup collection {collection_name}: {str(e)}"
                logger.error(error_msg)
                setup_report["errors"].append(error_msg)
                self.collections_status[collection_name] = False
                
                if config["required"]:
                    raise

    async def _setup_gridfs_collections(self, db: AsyncIOMotorDatabase, setup_report: Dict[str, Any]):
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
                        "purpose": "collection_initialization"
                    }
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

    async def _create_gridfs_indexes(self, db: AsyncIOMotorDatabase, setup_report: Dict[str, Any]):
        """Create optimized indexes for GridFS collections."""
        try:
            # Indexes for fs.files collection
            files_collection = db["fs.files"]
            
            # Index for filename lookups
            await files_collection.create_index([("filename", pymongo.ASCENDING)])
            
            # Index for metadata queries
            await files_collection.create_index([("metadata.user_id", pymongo.ASCENDING)])
            await files_collection.create_index([("metadata.session_id", pymongo.ASCENDING)])
            await files_collection.create_index([("metadata.message_id", pymongo.ASCENDING)])
            
            # Index for file size and upload date
            await files_collection.create_index([
                ("uploadDate", pymongo.DESCENDING),
                ("length", pymongo.ASCENDING)
            ])
            
            # Indexes for fs.chunks collection
            chunks_collection = db["fs.chunks"]
            
            # Default GridFS chunk index (usually exists automatically)
            await chunks_collection.create_index([
                ("files_id", pymongo.ASCENDING),
                ("n", pymongo.ASCENDING)
            ], unique=True)
            
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
                # Enable sharding-friendly design
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["session_id", "user_id", "role", "content"],
                        "properties": {
                            "role": {
                                "bsonType": "string",
                                "enum": ["user", "assistant", "system"]
                            },
                            "has_files": {"bsonType": "bool"},
                            "file_ids": {"bsonType": "array"}
                        }
                    }
                }
            },
            "file_uploads": {
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["file_id", "original_name", "mime_type", "session_id", "user_id"],
                        "properties": {
                            "file_id": {"bsonType": "string"},
                            "file_size": {"bsonType": "int", "minimum": 0},
                            "processed": {"bsonType": "bool"}
                        }
                    }
                }
            },
            "chat_sessions": {
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["session_id", "user_id"],
                        "properties": {
                            "has_files": {"bsonType": "bool"}
                        }
                    }
                }
            }
        }
        
        return options_map.get(collection_name)

    async def _create_all_indexes(self, setup_report: Dict[str, Any]):
        """Create all necessary indexes for optimal performance."""
        models_to_index = [
            User, Chatflow, UserChatflow, RefreshToken,
            ChatSession, ChatMessage, FileUpload
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

    async def _validate_collections_setup(self, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """Validate that all collections are properly set up."""
        validation_report = {
            "collections_count": 0,
            "required_collections": [],
            "missing_collections": [],
            "indexes_validated": {},
            "gridfs_status": {},
            "validation_passed": False
        }
        
        try:
            # Check all collections exist
            existing_collections = set(await db.list_collection_names())
            validation_report["collections_count"] = len(existing_collections)
            
            required_collections = [
                "users", "chatflows", "user_chatflows", "refresh_tokens",
                "chat_sessions", "chat_messages", "file_uploads",
                "fs.files", "fs.chunks"
            ]
            
            validation_report["required_collections"] = required_collections
            
            for collection_name in required_collections:
                if collection_name not in existing_collections:
                    validation_report["missing_collections"].append(collection_name)
            
            # Validate GridFS
            if "fs.files" in existing_collections and "fs.chunks" in existing_collections:
                validation_report["gridfs_status"]["collections"] = "present"
                
                # Test GridFS functionality
                bucket = AsyncIOMotorGridFSBucket(db)
                test_data = b"validation_test"
                import io
                
                file_id = await bucket.upload_from_stream(
                    "validation_test.txt",
                    io.BytesIO(test_data),
                    metadata={"validation": True}
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
            
            # Validate indexes for each model
            for model in [FileUpload, ChatMessage, ChatSession]:
                try:
                    collection = db[model.Settings.name]
                    indexes = await collection.list_indexes().to_list(None)
                    validation_report["indexes_validated"][model.__name__] = len(indexes)
                except Exception as e:
                    validation_report["indexes_validated"][model.__name__] = f"error: {str(e)}"
            
            # Overall validation
            validation_report["validation_passed"] = (
                len(validation_report["missing_collections"]) == 0 and
                validation_report["gridfs_status"].get("functionality") == "working"
            )
            
            return validation_report
            
        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            validation_report["validation_error"] = str(e)
            return validation_report

    async def _setup_initial_data(self, db: AsyncIOMotorDatabase, setup_report: Dict[str, Any]):
        """Setup any required initial data."""
        try:
            logger.info("📊 Setting up initial data...")
            
            # Add any initial data setup here
            # For example, default chatflows, admin users, etc.
            
            setup_report["initial_data"] = "completed"
            logger.info("✅ Initial data setup completed")
            
        except Exception as e:
            error_msg = f"Initial data setup failed: {str(e)}"
            logger.warning(error_msg)
            setup_report["initial_data"] = f"error: {str(e)}"

    async def health_check(self) -> Dict[str, Any]:
        """Perform a health check on all collections."""
        health_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "setup_completed": self.setup_completed,
            "setup_timestamp": self.setup_timestamp.isoformat() if self.setup_timestamp else None,
            "collections_status": self.collections_status.copy(),
            "database_status": {},
            "gridfs_status": {},
            "overall_health": "unknown"
        }
        
        try:
            db = await get_database()
            
            # Check database connection
            await db.command("ping")
            health_report["database_status"]["connection"] = "healthy"
            
            # Check collections
            existing_collections = set(await db.list_collection_names())
            health_report["database_status"]["collections_count"] = len(existing_collections)
            
            # Check GridFS
            if "fs.files" in existing_collections and "fs.chunks" in existing_collections:
                bucket = AsyncIOMotorGridFSBucket(db)
                files_count = await db["fs.files"].count_documents({})
                health_report["gridfs_status"] = {
                    "collections_present": True,
                    "files_count": files_count,
                    "status": "healthy"
                }
            else:
                health_report["gridfs_status"] = {
                    "collections_present": False,
                    "status": "missing"
                }
            
            # Overall health assessment
            if (self.setup_completed and 
                health_report["database_status"]["connection"] == "healthy" and
                health_report["gridfs_status"]["status"] == "healthy"):
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
            "setup_timestamp": self.setup_timestamp.isoformat() if self.setup_timestamp else None,
            "collections_status": self.collections_status.copy()
        }


# Global instance
collection_setup_service = CollectionSetupService()
```

## 🚀 Startup Integration

### Enhanced Main Application with Collection Setup

```python
# app/main.py (enhanced version)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api import chatflows, chat, admin
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection

# Import all models for Beanie discovery
from app.models.user import User
from app.models.chatflow import Chatflow, UserChatflow
from app.models.refresh_token import RefreshToken
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.file_upload import FileUpload

# Import services
from app.services.collection_setup_service import collection_setup_service
from app.tasks.chatflow_sync import chatflow_sync_task

from app.core.logging import logger as app_logger
import logging
import asyncio
from contextlib import asynccontextmanager
import os
import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(name)s - PID:%(process)d - %(message)s'
)
module_logger = logging.getLogger(__name__)
PID = os.getpid()

module_logger.info(f"🚀 Starting application initialization (PID: {PID})")


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Enhanced lifespan handler with collection setup."""
    module_logger.info(f"🌟 LIFESPAN: Startup sequence initiated (PID:{PID})")
    
    startup_report = {
        "started_at": datetime.datetime.utcnow().isoformat(),
        "pid": PID,
        "stages": {},
        "errors": [],
        "success": False
    }
    
    try:
        # Stage 1: Database Connection
        module_logger.info(f"📡 STAGE 1: Connecting to MongoDB (PID:{PID})")
        startup_report["stages"]["database_connection"] = {"started_at": datetime.datetime.utcnow().isoformat()}
        
        try:
            await connect_to_mongo()
            startup_report["stages"]["database_connection"]["status"] = "success"
            startup_report["stages"]["database_connection"]["completed_at"] = datetime.datetime.utcnow().isoformat()
            module_logger.info(f"✅ STAGE 1: MongoDB connected and Beanie initialized (PID:{PID})")
        except Exception as e:
            error_msg = f"Database connection failed: {str(e)}"
            module_logger.error(f"❌ STAGE 1: {error_msg} (PID:{PID})")
            startup_report["stages"]["database_connection"]["status"] = "failed"
            startup_report["stages"]["database_connection"]["error"] = error_msg
            startup_report["errors"].append(error_msg)
            raise

        # Stage 2: Collection Setup
        module_logger.info(f"🗄️ STAGE 2: Setting up collections (PID:{PID})")
        startup_report["stages"]["collection_setup"] = {"started_at": datetime.datetime.utcnow().isoformat()}
        
        try:
            # Check if collections need setup
            force_setup = getattr(settings, 'FORCE_COLLECTION_SETUP', False)
            
            if force_setup:
                module_logger.info(f"🔄 FORCE_COLLECTION_SETUP enabled, forcing collection recreation (PID:{PID})")
            
            collection_report = await collection_setup_service.setup_all_collections(
                force_recreate=force_setup
            )
            
            startup_report["stages"]["collection_setup"]["status"] = "success"
            startup_report["stages"]["collection_setup"]["report"] = collection_report
            startup_report["stages"]["collection_setup"]["completed_at"] = datetime.datetime.utcnow().isoformat()
            
            module_logger.info(f"✅ STAGE 2: Collection setup completed (PID:{PID})")
            
        except Exception as e:
            error_msg = f"Collection setup failed: {str(e)}"
            module_logger.error(f"❌ STAGE 2: {error_msg} (PID:{PID})")
            startup_report["stages"]["collection_setup"]["status"] = "failed"
            startup_report["stages"]["collection_setup"]["error"] = error_msg
            startup_report["errors"].append(error_msg)
            
            # Decide whether to continue or fail
            if getattr(settings, 'FAIL_ON_COLLECTION_SETUP_ERROR', True):
                raise
            else:
                module_logger.warning(f"⚠️ Continuing despite collection setup failure (PID:{PID})")

        # Stage 3: Health Check
        module_logger.info(f"🏥 STAGE 3: Running health check (PID:{PID})")
        startup_report["stages"]["health_check"] = {"started_at": datetime.datetime.utcnow().isoformat()}
        
        try:
            health_report = await collection_setup_service.health_check()
            startup_report["stages"]["health_check"]["status"] = "success"
            startup_report["stages"]["health_check"]["report"] = health_report
            startup_report["stages"]["health_check"]["completed_at"] = datetime.datetime.utcnow().isoformat()
            
            if health_report["overall_health"] == "healthy":
                module_logger.info(f"✅ STAGE 3: System health check passed (PID:{PID})")
            else:
                module_logger.warning(f"⚠️ STAGE 3: System health check warnings (PID:{PID})")
                
        except Exception as e:
            error_msg = f"Health check failed: {str(e)}"
            module_logger.error(f"❌ STAGE 3: {error_msg} (PID:{PID})")
            startup_report["stages"]["health_check"]["status"] = "failed"
            startup_report["stages"]["health_check"]["error"] = error_msg

        # Stage 4: Start Periodic Tasks
        module_logger.info(f"⏰ STAGE 4: Starting periodic tasks (PID:{PID})")
        startup_report["stages"]["periodic_tasks"] = {"started_at": datetime.datetime.utcnow().isoformat()}
        
        sync_task_instance = None
        try:
            if hasattr(settings, 'ENABLE_CHATFLOW_SYNC') and settings.ENABLE_CHATFLOW_SYNC:
                module_logger.info(f"🔄 Starting periodic chatflow sync (PID:{PID})")
                sync_task_instance = asyncio.create_task(chatflow_sync_task.start_periodic_sync())
                startup_report["stages"]["periodic_tasks"]["chatflow_sync"] = "started"
            else:
                module_logger.info(f"⏸️ Periodic chatflow sync disabled (PID:{PID})")
                startup_report["stages"]["periodic_tasks"]["chatflow_sync"] = "disabled"
            
            startup_report["stages"]["periodic_tasks"]["status"] = "success"
            startup_report["stages"]["periodic_tasks"]["completed_at"] = datetime.datetime.utcnow().isoformat()
            
        except Exception as e:
            error_msg = f"Periodic tasks setup failed: {str(e)}"
            module_logger.error(f"❌ STAGE 4: {error_msg} (PID:{PID})")
            startup_report["stages"]["periodic_tasks"]["status"] = "failed"
            startup_report["stages"]["periodic_tasks"]["error"] = error_msg

        # Write startup report
        try:
            with open("startup_report.json", "w") as f:
                import json
                startup_report["success"] = True
                startup_report["completed_at"] = datetime.datetime.utcnow().isoformat()
                json.dump(startup_report, f, indent=2, default=str)
            
            with open("lifespan_startup.txt", "a") as f:
                f.write(f"✅ Lifespan startup completed by PID {PID} at {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S,%f')[:-3]}\n")
            
            module_logger.info(f"📊 Startup report written (PID:{PID})")
        except Exception as e:
            module_logger.error(f"Failed to write startup report: {str(e)}")

        module_logger.info(f"🎉 STARTUP COMPLETED SUCCESSFULLY (PID:{PID})")
        
        try:
            yield  # Application runs here
        finally:
            # Shutdown sequence
            module_logger.info(f"🛑 LIFESPAN: Shutdown sequence initiated (PID:{PID})")
            
            # Stop periodic tasks
            if sync_task_instance and hasattr(settings, 'ENABLE_CHATFLOW_SYNC') and settings.ENABLE_CHATFLOW_SYNC:
                module_logger.info(f"⏹️ Stopping periodic chatflow sync (PID:{PID})")
                chatflow_sync_task.stop_periodic_sync()
                
                try:
                    await asyncio.wait_for(sync_task_instance, timeout=5.0)
                    module_logger.info(f"✅ Periodic tasks stopped gracefully (PID:{PID})")
                except asyncio.TimeoutError:
                    module_logger.warning(f"⏰ Timeout stopping periodic tasks (PID:{PID})")
                except Exception as e:
                    module_logger.error(f"❌ Error stopping periodic tasks: {str(e)}")
            
            # Close database connection
            try:
                module_logger.info(f"📡 Disconnecting from MongoDB (PID:{PID})")
                await close_mongo_connection()
                
                with open("lifespan_shutdown.txt", "a") as f:
                    f.write(f"✅ Lifespan shutdown completed by PID {PID} at {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S,%f')[:-3]}\n")
                
                module_logger.info(f"✅ MongoDB disconnected (PID:{PID})")
            except Exception as e:
                module_logger.error(f"❌ Error during shutdown: {str(e)}")

    except Exception as e:
        startup_report["success"] = False
        startup_report["failed_at"] = datetime.datetime.utcnow().isoformat()
        startup_report["errors"].append(str(e))
        
        # Write failure report
        try:
            with open("startup_failure_report.json", "w") as f:
                import json
                json.dump(startup_report, f, indent=2, default=str)
        except:
            pass
        
        module_logger.error(f"💥 STARTUP FAILED: {str(e)} (PID:{PID})")
        raise


# Create FastAPI application with enhanced lifespan
app = FastAPI(
    title="Flowise Proxy Service",
    description="Enhanced proxy service with file system support",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chatflows.router, prefix="/api/v1", tags=["chatflows"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])

# Add health check endpoints
@app.get("/health")
async def health_check():
    """System health check."""
    try:
        health_report = await collection_setup_service.health_check()
        return {
            "status": "healthy" if health_report["overall_health"] == "healthy" else "unhealthy",
            "timestamp": health_report["timestamp"],
            "details": health_report
        }
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "error": str(e)
        }

@app.get("/setup-status")
async def get_setup_status():
    """Get collection setup status."""
    try:
        return await collection_setup_service.get_setup_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

module_logger.info(f"🏁 Application configuration completed (PID: {PID})")
```

## ⚙️ Advanced Collection Initialization

### Environment Configuration

```python
# app/config.py (additions)
from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # ... existing settings ...
    
    # Collection setup settings
    FORCE_COLLECTION_SETUP: bool = False
    FAIL_ON_COLLECTION_SETUP_ERROR: bool = True
    ENABLE_COLLECTION_VALIDATION: bool = True
    COLLECTION_SETUP_TIMEOUT: int = 300  # 5 minutes
    
    # GridFS settings
    GRIDFS_CHUNK_SIZE: int = 261120  # 255KB chunks
    GRIDFS_BUCKET_NAME: str = "fs"
    
    # Index optimization settings
    ENABLE_BACKGROUND_INDEX_CREATION: bool = True
    INDEX_CREATION_TIMEOUT: int = 120  # 2 minutes
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### Docker Integration

```bash
# docker-compose.yml (additions)
version: '3.8'

services:
  flowise-proxy:
    # ... existing configuration ...
    environment:
      # ... existing environment variables ...
      - FORCE_COLLECTION_SETUP=false
      - FAIL_ON_COLLECTION_SETUP_ERROR=true
      - ENABLE_COLLECTION_VALIDATION=true
      - COLLECTION_SETUP_TIMEOUT=300
      - GRIDFS_CHUNK_SIZE=261120
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Standalone Collection Setup Script

```python
# setup_collections_standalone.py
#!/usr/bin/env python3
"""
Standalone script to setup collections independently of server startup.
Useful for deployment automation and troubleshooting.
"""
import asyncio
import sys
import json
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

async def main():
    """Run collection setup independently."""
    print("🚀 Starting standalone collection setup...")
    
    try:
        from app.database import connect_to_mongo, close_mongo_connection
        from app.services.collection_setup_service import collection_setup_service
        
        # Connect to database
        print("📡 Connecting to database...")
        await connect_to_mongo()
        print("✅ Database connected")
        
        # Run setup
        print("🗄️ Setting up collections...")
        force_recreate = "--force" in sys.argv
        
        setup_report = await collection_setup_service.setup_all_collections(
            force_recreate=force_recreate
        )
        
        # Write detailed report
        with open("standalone_setup_report.json", "w") as f:
            json.dump(setup_report, f, indent=2, default=str)
        
        if setup_report["success"]:
            print("🎉 Collection setup completed successfully!")
            print(f"📊 Report saved to: standalone_setup_report.json")
            
            # Run health check
            print("🏥 Running health check...")
            health_report = await collection_setup_service.health_check()
            
            if health_report["overall_health"] == "healthy":
                print("✅ System health check passed!")
            else:
                print("⚠️ System health check warnings - check report for details")
            
            return 0
        else:
            print("❌ Collection setup failed!")
            print("📊 Check standalone_setup_report.json for details")
            return 1
            
    except Exception as e:
        print(f"💥 Setup failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
        
    finally:
        try:
            await close_mongo_connection()
            print("📡 Database connection closed")
        except:
            pass

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

## 🔄 Migration Integration

### Enhanced Migration Runner

```python
# migrations/run_migrations_with_collections.py
#!/usr/bin/env python3
"""
Enhanced migration runner that includes collection setup.
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

async def run_migrations_with_collections():
    """Run all migrations and ensure collections are properly set up."""
    print("🚀 Starting comprehensive migration and collection setup...")
    
    migration_report = {
        "started_at": datetime.utcnow().isoformat(),
        "migrations": [],
        "collection_setup": {},
        "success": False,
        "errors": []
    }
    
    try:
        # 1. Connect to database
        print("📡 Connecting to database...")
        from app.database import connect_to_mongo, close_mongo_connection
        await connect_to_mongo()
        print("✅ Database connected")
        
        # 2. Run existing migrations
        print("🔄 Running existing migrations...")
        try:
            from migrations.add_file_upload_support import migrate_add_file_upload_support
            from migrations.add_image_rendering_support import migrate_add_image_rendering_support
            from migrations.add_metadata_to_chat_messages import migrate_add_metadata_to_chat_messages
            
            migrations = [
                ("add_file_upload_support", migrate_add_file_upload_support),
                ("add_image_rendering_support", migrate_add_image_rendering_support),
                ("add_metadata_to_chat_messages", migrate_add_metadata_to_chat_messages),
            ]
            
            for migration_name, migration_func in migrations:
                try:
                    print(f"🔧 Running migration: {migration_name}")
                    await migration_func()
                    migration_report["migrations"].append({
                        "name": migration_name,
                        "status": "success",
                        "completed_at": datetime.utcnow().isoformat()
                    })
                    print(f"✅ Migration completed: {migration_name}")
                except Exception as e:
                    error_msg = f"Migration {migration_name} failed: {str(e)}"
                    print(f"❌ {error_msg}")
                    migration_report["migrations"].append({
                        "name": migration_name,
                        "status": "failed",
                        "error": error_msg,
                        "failed_at": datetime.utcnow().isoformat()
                    })
                    migration_report["errors"].append(error_msg)
                    
        except ImportError as e:
            print(f"⚠️ Some migrations not available: {str(e)}")
        
        # 3. Run collection setup
        print("🗄️ Running collection setup...")
        from app.services.collection_setup_service import collection_setup_service
        
        collection_report = await collection_setup_service.setup_all_collections()
        migration_report["collection_setup"] = collection_report
        
        if collection_report["success"]:
            print("✅ Collection setup completed")
        else:
            print("❌ Collection setup failed")
            migration_report["errors"].extend(collection_report["errors"])
        
        # 4. Final validation
        print("🔍 Running final validation...")
        health_report = await collection_setup_service.health_check()
        migration_report["final_health_check"] = health_report
        
        # Determine overall success
        migration_report["success"] = (
            collection_report["success"] and
            health_report["overall_health"] == "healthy" and
            len([m for m in migration_report["migrations"] if m["status"] == "failed"]) == 0
        )
        
        migration_report["completed_at"] = datetime.utcnow().isoformat()
        
        # Write report
        with open("migration_and_collection_report.json", "w") as f:
            import json
            json.dump(migration_report, f, indent=2, default=str)
        
        if migration_report["success"]:
            print("🎉 All migrations and collection setup completed successfully!")
            return True
        else:
            print("❌ Some operations failed - check report for details")
            return False
            
    except Exception as e:
        error_msg = f"Migration process failed: {str(e)}"
        print(f"💥 {error_msg}")
        migration_report["errors"].append(error_msg)
        migration_report["success"] = False
        migration_report["failed_at"] = datetime.utcnow().isoformat()
        
        # Write failure report
        with open("migration_failure_report.json", "w") as f:
            import json
            json.dump(migration_report, f, indent=2, default=str)
        
        return False
        
    finally:
        try:
            await close_mongo_connection()
            print("📡 Database connection closed")
        except:
            pass

if __name__ == "__main__":
    success = asyncio.run(run_migrations_with_collections())
    sys.exit(0 if success else 1)
```

## 📊 Performance Optimization

### Batch Operations Service

```python
# app/services/batch_operations_service.py
import asyncio
from typing import List, Dict, Any
from datetime import datetime
import logging

from app.database import get_database
from app.models.file_upload import FileUpload
from app.models.chat_message import ChatMessage

logger = logging.getLogger(__name__)


class BatchOperationsService:
    """Service for optimized batch operations on collections."""
    
    def __init__(self):
        self.batch_size = 1000
        
    async def optimize_collections(self) -> Dict[str, Any]:
        """Run optimization operations on all collections."""
        optimization_report = {
            "started_at": datetime.utcnow().isoformat(),
            "operations": {},
            "performance_metrics": {},
            "errors": []
        }
        
        try:
            db = await get_database()
            
            # 1. Analyze collection sizes
            logger.info("📊 Analyzing collection sizes...")
            collections_stats = await self._get_collections_stats(db)
            optimization_report["collections_stats"] = collections_stats
            
            # 2. Rebuild indexes
            logger.info("🔧 Rebuilding indexes...")
            index_report = await self._rebuild_indexes(db)
            optimization_report["operations"]["index_rebuild"] = index_report
            
            # 3. Clean up orphaned files
            logger.info("🧹 Cleaning up orphaned files...")
            cleanup_report = await self._cleanup_orphaned_files(db)
            optimization_report["operations"]["orphan_cleanup"] = cleanup_report
            
            # 4. Compress GridFS collections
            logger.info("🗜️ Optimizing GridFS...")
            gridfs_report = await self._optimize_gridfs(db)
            optimization_report["operations"]["gridfs_optimization"] = gridfs_report
            
            optimization_report["completed_at"] = datetime.utcnow().isoformat()
            optimization_report["success"] = True
            
            return optimization_report
            
        except Exception as e:
            error_msg = f"Collection optimization failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            optimization_report["errors"].append(error_msg)
            optimization_report["success"] = False
            return optimization_report

    async def _get_collections_stats(self, db) -> Dict[str, Any]:
        """Get detailed statistics for all collections."""
        stats = {}
        
        collections = ["file_uploads", "chat_messages", "chat_sessions", "fs.files", "fs.chunks"]
        
        for collection_name in collections:
            try:
                collection = db[collection_name]
                
                # Get collection stats
                stats_result = await db.command("collStats", collection_name)
                
                stats[collection_name] = {
                    "count": stats_result.get("count", 0),
                    "size": stats_result.get("size", 0),
                    "storageSize": stats_result.get("storageSize", 0),
                    "avgObjSize": stats_result.get("avgObjSize", 0),
                    "indexCount": stats_result.get("nindexes", 0),
                    "totalIndexSize": stats_result.get("totalIndexSize", 0)
                }
                
            except Exception as e:
                stats[collection_name] = {"error": str(e)}
        
        return stats

    async def _rebuild_indexes(self, db) -> Dict[str, Any]:
        """Rebuild indexes for better performance."""
        index_report = {"rebuilt": [], "errors": []}
        
        models = [FileUpload, ChatMessage]
        
        for model in models:
            try:
                collection_name = model.Settings.name
                logger.info(f"🔧 Rebuilding indexes for {collection_name}")
                
                # Drop existing indexes (except _id)
                collection = db[collection_name]
                indexes = await collection.list_indexes().to_list(None)
                
                for index in indexes:
                    if index["name"] != "_id_":
                        await collection.drop_index(index["name"])
                
                # Recreate indexes
                await model.create_indexes()
                
                index_report["rebuilt"].append(collection_name)
                
            except Exception as e:
                error_msg = f"Failed to rebuild indexes for {model.__name__}: {str(e)}"
                logger.error(error_msg)
                index_report["errors"].append(error_msg)
        
        return index_report

    async def _cleanup_orphaned_files(self, db) -> Dict[str, Any]:
        """Clean up orphaned files in GridFS."""
        cleanup_report = {
            "orphaned_files_removed": 0,
            "space_reclaimed": 0,
            "errors": []
        }
        
        try:
            # Find files in GridFS that don't have corresponding FileUpload records
            files_collection = db["fs.files"]
            
            # Get all file IDs from GridFS
            gridfs_files = await files_collection.find({}, {"_id": 1}).to_list(None)
            gridfs_file_ids = {str(f["_id"]) for f in gridfs_files}
            
            # Get all file IDs from FileUpload collection
            file_upload_ids = set()
            async for file_upload in FileUpload.find_all():
                file_upload_ids.add(file_upload.file_id)
            
            # Find orphaned files
            orphaned_files = gridfs_file_ids - file_upload_ids
            
            if orphaned_files:
                logger.info(f"🗑️ Found {len(orphaned_files)} orphaned files")
                
                from motor.motor_asyncio import AsyncIOMotorGridFSBucket
                bucket = AsyncIOMotorGridFSBucket(db)
                
                for file_id in orphaned_files:
                    try:
                        # Get file info before deletion
                        file_info = await files_collection.find_one({"_id": file_id})
                        if file_info:
                            cleanup_report["space_reclaimed"] += file_info.get("length", 0)
                        
                        # Delete the file
                        await bucket.delete(file_id)
                        cleanup_report["orphaned_files_removed"] += 1
                        
                    except Exception as e:
                        cleanup_report["errors"].append(f"Failed to delete {file_id}: {str(e)}")
            
        except Exception as e:
            cleanup_report["errors"].append(f"Orphan cleanup failed: {str(e)}")
        
        return cleanup_report

    async def _optimize_gridfs(self, db) -> Dict[str, Any]:
        """Optimize GridFS collections."""
        gridfs_report = {"operations": [], "errors": []}
        
        try:
            # Compact GridFS collections
            for collection_name in ["fs.files", "fs.chunks"]:
                try:
                    await db.command("compact", collection_name)
                    gridfs_report["operations"].append(f"Compacted {collection_name}")
                except Exception as e:
                    gridfs_report["errors"].append(f"Failed to compact {collection_name}: {str(e)}")
            
        except Exception as e:
            gridfs_report["errors"].append(f"GridFS optimization failed: {str(e)}")
        
        return gridfs_report


# Global instance
batch_operations_service = BatchOperationsService()
```

## 🚨 Monitoring and Health Checks

### Enhanced Health Check API

```python
# app/api/system.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any
import asyncio
from datetime import datetime

from app.services.collection_setup_service import collection_setup_service
from app.services.batch_operations_service import batch_operations_service

router = APIRouter()


@router.get("/system/health")
async def comprehensive_health_check() -> Dict[str, Any]:
    """Comprehensive system health check."""
    try:
        health_report = await collection_setup_service.health_check()
        
        # Add additional system metrics
        health_report["system_metrics"] = {
            "timestamp": datetime.utcnow().isoformat(),
            "uptime": "calculated_elsewhere",  # Calculate actual uptime
            "memory_usage": "calculated_elsewhere",  # Add memory monitoring
            "cpu_usage": "calculated_elsewhere"  # Add CPU monitoring
        }
        
        return health_report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/system/collections/status")
async def get_collections_status() -> Dict[str, Any]:
    """Get detailed status of all collections."""
    try:
        from app.database import get_database
        db = await get_database()
        
        # Get collection statistics
        stats = await batch_operations_service._get_collections_stats(db)
        
        # Get setup status
        setup_status = await collection_setup_service.get_setup_status()
        
        return {
            "setup_status": setup_status,
            "collection_stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get collections status: {str(e)}")


@router.post("/system/collections/setup")
async def trigger_collection_setup(
    background_tasks: BackgroundTasks,
    force_recreate: bool = False
) -> Dict[str, str]:
    """Trigger collection setup manually."""
    try:
        # Run setup in background
        background_tasks.add_task(
            collection_setup_service.setup_all_collections,
            force_recreate=force_recreate
        )
        
        return {
            "status": "setup_triggered",
            "message": "Collection setup started in background",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger setup: {str(e)}")


@router.post("/system/collections/optimize")
async def trigger_optimization(background_tasks: BackgroundTasks) -> Dict[str, str]:
    """Trigger collection optimization."""
    try:
        # Run optimization in background
        background_tasks.add_task(batch_operations_service.optimize_collections)
        
        return {
            "status": "optimization_triggered",
            "message": "Collection optimization started in background",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger optimization: {str(e)}")
```

## 🏁 Summary

The collection setup system provides:

1. **✅ Automatic Setup**: Collections are prepared during server startup
2. **🔧 Comprehensive Configuration**: All required collections, indexes, and GridFS
3. **🚨 Health Monitoring**: Continuous monitoring and validation
4. **🔄 Migration Integration**: Seamless integration with existing migrations
5. **⚡ Performance Optimization**: Batch operations and optimization tools
6. **🛠️ Standalone Tools**: Independent setup and troubleshooting scripts

To enable this in your server startup, the collection setup will run automatically in the enhanced lifespan handler, ensuring your file system is properly prepared before the application begins serving requests.
