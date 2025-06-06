import asyncio
from datetime import datetime, timedelta
from app.database import get_database
from app.services.flowise_service import FlowiseService
from app.services.chatflow_service import ChatflowService
from app.core.logging import logger
from app.config import settings

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
        Perform chatflow synchronization
        """
        try:
            logger.info("Starting scheduled chatflow sync")
            
            db = await get_database()
            flowise_service = FlowiseService()
            chatflow_service = ChatflowService(db, flowise_service)
            
            result = await chatflow_service.sync_chatflows_from_flowise()
            self.last_sync = datetime.utcnow()
            
            logger.info(
                f"Scheduled sync completed: {result.created} created, "
                f"{result.updated} updated, {result.deleted} deleted, "
                f"{result.errors} errors"
            )
            
        except Exception as e:
            logger.error(f"Scheduled chatflow sync failed: {str(e)}")

    def stop_periodic_sync(self):
        """
        Stop periodic synchronization
        """
        self.is_running = False
        logger.info("Stopping periodic chatflow sync task")

# Global instance
chatflow_sync_task = ChatflowSyncTask()
