#!/usr/bin/env python3
"""
Chat Messages Viewer - A Python script to view chat messages from MongoDB
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import json

# MongoDB Configuration
MONGODB_URL = "mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin"
DATABASE_NAME = "flowise_proxy_test"

async def view_chat_messages():
    """View chat messages from MongoDB"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    collection = db.chat_messages
    
    print("=" * 60)
    print("📊 CHAT MESSAGES OVERVIEW")
    print("=" * 60)
    
    # Basic stats
    total_messages = await collection.count_documents({})
    messages_with_metadata = await collection.count_documents({"metadata": {"$exists": True}})
    user_messages = await collection.count_documents({"role": "user"})
    assistant_messages = await collection.count_documents({"role": "assistant"})
    
    print(f"📈 Total Messages: {total_messages}")
    print(f"📈 Messages with Metadata: {messages_with_metadata}")
    print(f"👤 User Messages: {user_messages}")
    print(f"🤖 Assistant Messages: {assistant_messages}")
    print()
    
    # Recent messages
    print("=" * 60)
    print("📝 RECENT MESSAGES (Last 5)")
    print("=" * 60)
    
    async for message in collection.find().sort("created_at", -1).limit(5):
        print(f"🕐 {message['created_at']}")
        print(f"👤 Role: {message['role']}")
        print(f"📝 Content: {message['content'][:100]}...")
        print(f"🆔 Session: {message['session_id']}")
        print(f"📊 Metadata Events: {len(message.get('metadata', []))}")
        print("-" * 40)
    
    # Sessions overview
    print("\n" + "=" * 60)
    print("📊 SESSIONS OVERVIEW")
    print("=" * 60)
    
    pipeline = [
        {"$group": {
            "_id": "$session_id",
            "message_count": {"$sum": 1},
            "user_id": {"$first": "$user_id"},
            "chatflow_id": {"$first": "$chatflow_id"},
            "last_activity": {"$max": "$created_at"}
        }},
        {"$sort": {"last_activity": -1}},
        {"$limit": 10}
    ]
    
    async for session in collection.aggregate(pipeline):
        print(f"🆔 Session: {session['_id']}")
        print(f"💬 Messages: {session['message_count']}")
        print(f"👤 User: {session['user_id']}")
        print(f"🔄 Chatflow: {session['chatflow_id']}")
        print(f"🕐 Last Activity: {session['last_activity']}")
        print("-" * 40)
    
    # Metadata analysis
    print("\n" + "=" * 60)
    print("🔍 METADATA ANALYSIS")
    print("=" * 60)
    
    # Find unique event types
    pipeline = [
        {"$unwind": "$metadata"},
        {"$group": {
            "_id": "$metadata.event",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    print("📋 Event Types:")
    async for event in collection.aggregate(pipeline):
        print(f"  • {event['_id']}: {event['count']} events")
    
    client.close()

async def view_message_details(session_id=None, limit=3):
    """View detailed message content"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    collection = db.chat_messages
    
    query = {"role": "assistant", "metadata": {"$exists": True}}
    if session_id:
        query["session_id"] = session_id
    
    print("=" * 60)
    print("🔍 DETAILED MESSAGE CONTENT")
    print("=" * 60)
    
    async for message in collection.find(query).sort("created_at", -1).limit(limit):
        print(f"🆔 Message ID: {message['_id']}")
        print(f"🕐 Created: {message['created_at']}")
        print(f"👤 Role: {message['role']}")
        print(f"📝 Content: {message['content']}")
        print(f"📊 Metadata Events: {len(message.get('metadata', []))}")
        
        # Show metadata events
        if message.get('metadata'):
            print("📋 Metadata Events:")
            for i, event in enumerate(message['metadata'][:3]):  # Show first 3 events
                print(f"  {i+1}. Event: {event.get('event', 'unknown')}")
                if 'data' in event:
                    # Show key data fields
                    data = event['data']
                    if 'nodeId' in data:
                        print(f"     Node: {data['nodeId']}")
                    if 'nodeLabel' in data:
                        print(f"     Label: {data['nodeLabel']}")
                    if 'status' in data:
                        print(f"     Status: {data['status']}")
        
        print("=" * 60)
    
    client.close()

async def main():
    """Main function with menu"""
    while True:
        print("\n🔍 CHAT MESSAGES VIEWER")
        print("=" * 30)
        print("1. View messages overview")
        print("2. View detailed message content")
        print("3. View specific session (provide session_id)")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == "1":
            await view_chat_messages()
        elif choice == "2":
            await view_message_details()
        elif choice == "3":
            session_id = input("Enter session ID: ").strip()
            await view_message_details(session_id=session_id)
        elif choice == "4":
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please select 1-4.")

if __name__ == "__main__":
    asyncio.run(main())
