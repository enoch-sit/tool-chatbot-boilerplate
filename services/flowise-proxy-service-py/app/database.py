from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings
from app.models.user import User
from app.models.chatflow import Chatflow, UserChatflow
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: AsyncIOMotorClient = None
    database = None

database = DatabaseManager()

async def connect_to_mongo():
    """Create database connection"""
    try:
        database.client = AsyncIOMotorClient(settings.MONGODB_URL)
        database.database = database.client[settings.MONGODB_DATABASE_NAME]
        
        # Initialize beanie with the document models
        await init_beanie(
            database=database.database,
            document_models=[User, Chatflow, UserChatflow]
        )
        
        logger.info(f"Connected to MongoDB at {settings.MONGODB_URL}")
        logger.info(f"Using database: {settings.MONGODB_DATABASE_NAME}")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    try:
        if database.client:
            database.client.close()
            logger.info("Disconnected from MongoDB")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {e}")

async def get_database():
    """Get database instance"""
    return database.database
