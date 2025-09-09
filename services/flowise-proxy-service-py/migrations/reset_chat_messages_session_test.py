import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load test environment variables
load_dotenv('.env.test')

from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

async def reset_chat_messages():
    """Drop and recreate chat_messages collection for development"""
    print("🔄 Resetting chat_messages collection...")
    
    # Get MongoDB URL directly from environment
    mongodb_url = os.getenv('MONGODB_URL')
    database_name = os.getenv('MONGODB_DATABASE_NAME', 'flowise_proxy_test')
    
    print(f"📍 Using MongoDB: {mongodb_url}")
    
    # Initialize connection
    client = AsyncIOMotorClient(mongodb_url)
    database = client[database_name]
    
    await init_beanie(database=database, document_models=[ChatMessage])
    
    # Drop the collection
    await ChatMessage.get_motor_collection().drop()
    print("✅ Dropped chat_messages collection")
    print("✅ New indexes will be created automatically on next insert")


    await init_beanie(database=database, document_models=[ChatSession])
    
    # Drop the collection
    await ChatSession.get_motor_collection().drop()
    print("✅ Dropped Chat_Session collection")
    print("✅ New indexes will be created automatically on next insert")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reset_chat_messages())