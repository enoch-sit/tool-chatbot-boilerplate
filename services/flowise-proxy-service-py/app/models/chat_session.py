from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime
import uuid

class ChatSession(Document):
    """Represents a single chat conversation session."""

    session_id: str = Field(..., index=True)
    user_id: str = Field(..., index=True)
    chatflow_id: str = Field(..., index=True)
    topic: Optional[str] = Field(None, index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: Optional[datetime] = None

    class Settings:
        name = "chat_sessions"

    def __repr__(self):
        return f"<ChatSession(session_id='{self.session_id}', user_id='{self.user_id}')>"
