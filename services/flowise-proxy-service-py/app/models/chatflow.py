from beanie import Document
from pydantic import Field
from typing import Optional, List
from datetime import datetime

class Chatflow(Document):
    name: str = Field(...)
    description: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)
    cost_per_request: int = Field(default=1)  # Credits per request
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        collection = "chatflows"
        
    def __repr__(self):
        return f"<Chatflow(id='{self.id}', name='{self.name}', active={self.is_active})>"

class UserChatflow(Document):
    user_id: str = Field(..., index=True)  # Reference to User document id
    chatflow_id: str = Field(..., index=True)  # Reference to Chatflow document id
    is_active: bool = Field(default=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "user_chatflows"
        indexes = [
            [("user_id", 1), ("chatflow_id", 1)],  # Compound index for efficient queries
        ]

    def __repr__(self):
        return f"<UserChatflow(user_id='{self.user_id}', chatflow_id='{self.chatflow_id}')>"
