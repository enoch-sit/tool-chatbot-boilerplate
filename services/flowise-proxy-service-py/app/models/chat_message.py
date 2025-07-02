from beanie import Document, Indexed
from pydantic import Field
from typing import Literal
from datetime import datetime
import pymongo


class ChatMessage(Document):
    """Represents a single message within a chat session."""
    chatflow_id: str = Field(..., index=True)
    session_id: str = Field(..., index=True)
    user_id: str = Field(..., index=True)
    role: str = Field(...)
    content: str = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    class Settings:
        name = "chat_messages"
        indexes = [
            [
                ("chatflow_id", pymongo.ASCENDING),
                ("session_id", pymongo.ASCENDING),
                ("role", pymongo.ASCENDING),
                ("created_at", pymongo.ASCENDING),
            ],
        ]
