import asyncio
from datetime import datetime, timedelta
from app.database import get_database
from app.services.flowise_service import FlowiseService
from app.services.chatflow_service import ChatflowService
from app.services.external_auth_service import ExternalAuthService # Import the missing service
from app.core.logging import logger
from app.config import settings
import traceback

class ChatflowSyncTask:
    def __init__(self):
        self.is_running = False
        self.last_sync = None
        self.sync_interval = timedelta(hours=settings.CHATFLOW_SYNC_INTERVAL_HOURS)

    async def start_periodic_sync(self):
        """
        Start periodic chatflow synchronization
        """
        if self.is_running:
            logger.warning("Chatflow sync task is already running")
            return
        
        self.is_running = True
        logger.info("Starting periodic chatflow sync task")
        
        try:
            while self.is_running:
                await self.sync_chatflows()
                await asyncio.sleep(self.sync_interval.total_seconds())
        except Exception as e:
            logger.error(f"Periodic sync task failed: {str(e)}")
        finally:
            self.is_running = False

    async def sync_chatflows(self):
        """
        Synchronize chatflows from Flowise API to local database
        """
        logger.info("Starting scheduled chatflow sync")
        try:
            db = await get_database()
            # The correct way to check for a valid db object is to compare with None.
            if db is None:
                logger.error("Database connection not available for scheduled sync.")
                return
            
            flowise_service = FlowiseService()
            external_auth_service = ExternalAuthService() # Instantiate the service
            # Provide all three required arguments to the constructor
            chatflow_service = ChatflowService(db, flowise_service, external_auth_service)
            
            result = await chatflow_service.sync_chatflows_from_flowise()
            logger.info(f"Scheduled chatflow sync completed: {result.created} added, {result.updated} updated, {result.deleted} deleted.")
        except Exception as e:
            logger.error(f"Scheduled chatflow sync failed: {e}")
            logger.error(traceback.format_exc())

    def stop_periodic_sync(self):
        """
        Stop periodic synchronization
        """
        self.is_running = False
        logger.info("Stopping periodic chatflow sync task")

# Global instance
chatflow_sync_task = ChatflowSyncTask()
