import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.chatflow import Chatflow, ChatflowSyncResult
from app.services.flowise_service import FlowiseService
from app.core.logging import logger

class ChatflowService:
    def __init__(self, db: AsyncIOMotorDatabase, flowise_service: FlowiseService):
        self.db = db
        self.flowise_service = flowise_service
        self.collection = db.chatflows

    async def sync_chatflows_from_flowise(self) -> ChatflowSyncResult:
        """
        Synchronize chatflows from Flowise API to local database
        """
        result = ChatflowSyncResult(
            total_fetched=0,
            created=0,
            updated=0,
            deleted=0,
            errors=0
        )
        
        try:
            # Fetch chatflows from Flowise
            flowise_chatflows = await self.flowise_service.list_chatflows()
            result.total_fetched = len(flowise_chatflows)
            
            # Get existing chatflows from database
            existing_chatflows = await self.collection.find({}).to_list(None)
            existing_ids = {cf["flowise_id"] for cf in existing_chatflows}
            
            # Track current Flowise IDs
            current_flowise_ids = set()
            
            # Process each chatflow from Flowise
            for flowise_cf in flowise_chatflows:
                try:
                    flowise_id = flowise_cf["id"]
                    current_flowise_ids.add(flowise_id)
                    
                    # Convert Flowise chatflow to our model
                    chatflow_data = await self._convert_flowise_chatflow(flowise_cf)
                    
                    # Check if chatflow exists
                    if flowise_id in existing_ids:
                        # Update existing chatflow
                        await self.collection.update_one(
                            {"flowise_id": flowise_id},
                            {"$set": chatflow_data}
                        )
                        result.updated += 1
                        logger.info(f"Updated chatflow: {chatflow_data['name']} ({flowise_id})")
                    else:
                        # Create new chatflow
                        await self.collection.insert_one(chatflow_data)
                        result.created += 1
                        logger.info(f"Created chatflow: {chatflow_data['name']} ({flowise_id})")
                        
                except Exception as e:
                    result.errors += 1
                    error_msg = f"Error processing chatflow {flowise_cf.get('id', 'unknown')}: {str(e)}"
                    result.error_details.append(error_msg)
                    logger.error(error_msg)
            
            # Mark deleted chatflows
            deleted_ids = existing_ids - current_flowise_ids
            if deleted_ids:
                await self.collection.update_many(
                    {"flowise_id": {"$in": list(deleted_ids)}},
                    {"$set": {
                        "sync_status": "deleted",
                        "synced_at": datetime.utcnow()
                    }}
                )
                result.deleted = len(deleted_ids)
                logger.info(f"Marked {len(deleted_ids)} chatflows as deleted")
            
        except Exception as e:
            result.errors += 1
            error_msg = f"Failed to sync chatflows: {str(e)}"
            result.error_details.append(error_msg)
            logger.error(error_msg)
        
        return result

    async def _convert_flowise_chatflow(self, flowise_cf: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Flowise chatflow format to our database format
        """
        # Parse JSON strings to objects
        def safe_json_parse(json_str: str) -> Optional[Dict[str, Any]]:
            if not json_str or json_str == "{}":
                return None
            try:
                return json.loads(json_str)
            except (json.JSONDecodeError, TypeError):
                return None

        # Parse ISO timestamps
        def parse_timestamp(timestamp_str: str) -> Optional[datetime]:
            if not timestamp_str:
                return None
            try:
                return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                return None

        return {
            "flowise_id": flowise_cf["id"],
            "name": flowise_cf.get("name", ""),
            "description": flowise_cf.get("description", ""),
            "deployed": flowise_cf.get("deployed", False),
            "is_public": flowise_cf.get("isPublic", False),
            "category": flowise_cf.get("category"),
            "type": flowise_cf.get("type", "CHATFLOW"),
            "api_key_id": flowise_cf.get("apikeyid"),
            
            # Parse configuration JSON strings
            "flow_data": safe_json_parse(flowise_cf.get("flowData")),
            "chatbot_config": safe_json_parse(flowise_cf.get("chatbotConfig")),
            "api_config": safe_json_parse(flowise_cf.get("apiConfig")),
            "analytic_config": safe_json_parse(flowise_cf.get("analytic")),
            "speech_to_text_config": safe_json_parse(flowise_cf.get("speechToText")),
            
            # Parse timestamps
            "created_date": parse_timestamp(flowise_cf.get("createdDate")),
            "updated_date": parse_timestamp(flowise_cf.get("updatedDate")),
            "synced_at": datetime.utcnow(),
            "sync_status": "active",
            "sync_error": None
        }

    async def get_chatflow_by_flowise_id(self, flowise_id: str) -> Optional[Chatflow]:
        """
        Get chatflow by Flowise ID
        """
        chatflow_data = await self.collection.find_one({"flowise_id": flowise_id})
        if chatflow_data:
            return Chatflow(**chatflow_data)
        return None

    async def list_chatflows(self, include_deleted: bool = False) -> List[Chatflow]:
        """
        List all chatflows from database
        """
        filter_query = {} if include_deleted else {"sync_status": {"$ne": "deleted"}}
        chatflows_data = await self.collection.find(filter_query).to_list(None)
        return [Chatflow(**cf) for cf in chatflows_data]

    async def get_chatflow_stats(self) -> Dict[str, Any]:
        """
        Get chatflow statistics
        """
        pipeline = [
            {
                "$group": {
                    "_id": "$sync_status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        stats_cursor = self.collection.aggregate(pipeline)
        stats_list = await stats_cursor.to_list(None)
        
        stats = {item["_id"]: item["count"] for item in stats_list}
        
        return {
            "total": sum(stats.values()),
            "active": stats.get("active", 0),
            "deleted": stats.get("deleted", 0),
            "error": stats.get("error", 0),
            "last_sync": await self._get_last_sync_time()
        }

    async def _get_last_sync_time(self) -> Optional[datetime]:
        """
        Get the timestamp of the last successful sync
        """
        result = await self.collection.find_one(
            {}, 
            sort=[("synced_at", -1)],
            projection={"synced_at": 1}
        )
        return result.get("synced_at") if result else None
