from beanie import Document, Indexed
from pydantic import Field
from typing import Literal, Optional, List, Dict, Any
from datetime import datetime
import pymongo


class ChatMessage(Document):
    """Represents a single message within a chat session."""
    chatflow_id: str = Field(..., index=True)
    session_id: str = Field(..., index=True)
    user_id: str = Field(..., index=True)
    role: str = Field(...)
    content: str = Field(...)
    metadata: Optional[List[Dict[str, Any]]] = Field(default=None, description="Non-token events and metadata")
    file_ids: Optional[List[str]] = Field(default=None, description="List of associated file IDs")
    has_files: bool = Field(default=False, index=True, description="Whether message has attached files")
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
