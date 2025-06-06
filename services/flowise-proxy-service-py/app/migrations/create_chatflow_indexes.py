from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.logging import logger

async def create_chatflow_indexes(db: AsyncIOMotorDatabase):
    """
    Create indexes for the chatflows collection
    """
    chatflows_collection = db.chatflows
    
    # Create indexes
    indexes = [
        # Unique index on flowise_id
        ("flowise_id", 1),
        # Index on sync_status for filtering
        ("sync_status", 1),
        # Index on synced_at for sorting
        ("synced_at", -1),
        # Index on deployed status
        ("deployed", 1),
        # Index on is_public status
        ("is_public", 1),
        # Text index for searching by name
        ("name", "text"),
    ]
    
    for index_spec in indexes:
        try:
            if isinstance(index_spec, tuple) and len(index_spec) == 2:
                field, direction = index_spec
                if direction == "text":
                    await chatflows_collection.create_index([(field, direction)])
                else:
                    await chatflows_collection.create_index([(field, direction)])
            
            logger.info(f"Created index: {index_spec}")
        except Exception as e:
            logger.warning(f"Failed to create index {index_spec}: {str(e)}")
    
    # Create unique index on flowise_id
    try:
        await chatflows_collection.create_index(
            [("flowise_id", 1)], 
            unique=True,
            name="flowise_id_unique"
        )
        logger.info("Created unique index on flowise_id")
    except Exception as e:
        logger.warning(f"Failed to create unique index on flowise_id: {str(e)}")

if __name__ == "__main__":
    import asyncio
    from app.database import connect_to_mongo, get_database
    
    async def main():
        # Connect to MongoDB first
        await connect_to_mongo()
        db = await get_database()
        await create_chatflow_indexes(db)
        logger.info("Chatflow indexes created successfully")
    
    asyncio.run(main())
