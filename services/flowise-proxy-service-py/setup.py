import asyncio
import logging
from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.migrations.create_chatflow_indexes import create_chatflow_indexes
from app.services.flowise_service import FlowiseService
from app.services.chatflow_service import ChatflowService
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def setup_application():
    """
    Initialize the application:
    1. Connect to database
    2. Create necessary indexes
    3. Perform initial chatflow sync if enabled
    """
    # Connect to database
    logger.info("Connecting to database...")
    await connect_to_mongo()
    
    # Get database instance
    db = await get_database()
    
    # Create indexes for chatflows
    logger.info("Creating database indexes...")
    await create_chatflow_indexes(db)
    
    # Initial chatflow sync
    if settings.ENABLE_CHATFLOW_SYNC:
        logger.info("Performing initial chatflow synchronization...")
        flowise_service = FlowiseService()
        chatflow_service = ChatflowService(db, flowise_service)
        
        result = await chatflow_service.sync_chatflows_from_flowise()
        
        logger.info(
            f"Initial sync completed: {result.total_fetched} chatflows fetched, "
            f"{result.created} created, {result.updated} updated, "
            f"{result.deleted} deleted, {result.errors} errors"
        )
    
    # Cleanup
    await close_mongo_connection()
    logger.info("Setup completed successfully!")

if __name__ == "__main__":
    try:
        asyncio.run(setup_application())
    except Exception as e:
        logger.error(f"Setup failed: {e}")
        raise
