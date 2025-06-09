from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from bson import ObjectId
from beanie import Document

class Chatflow(Document):
    id: Optional[str] = Field(default=None, alias="_id")
    flowise_id: str = Field(..., description="Flowise chatflow ID")
    name: str = Field(..., description="Chatflow name")
    description: Optional[str] = Field(None, description="Chatflow description")
    deployed: bool = Field(default=False, description="Whether chatflow is deployed")
    is_public: bool = Field(default=False, description="Whether chatflow is public")
    category: Optional[str] = Field(None, description="Chatflow categories")
    type: str = Field(default="CHATFLOW", description="Flow type")
    api_key_id: Optional[str] = Field(None, description="Associated API key ID")
    
    # Configuration fields (stored as JSON strings in Flowise)
    flow_data: Optional[Dict[str, Any]] = Field(None, description="Flow configuration")
    chatbot_config: Optional[Dict[str, Any]] = Field(None, description="Chatbot config")
    api_config: Optional[Dict[str, Any]] = Field(None, description="API config")
    analytic_config: Optional[Dict[str, Any]] = Field(None, description="Analytics config")
    speech_to_text_config: Optional[Dict[str, Any]] = Field(None, description="Speech-to-text config")
    
    # Timestamps
    created_date: Optional[datetime] = Field(None, description="Flowise creation date")
    updated_date: Optional[datetime] = Field(None, description="Flowise update date")
    synced_at: datetime = Field(default_factory=datetime.utcnow, description="Last sync timestamp")
    
    # Sync status
        # Sync status
    sync_status: str = Field(default="active", description="Sync status: active, deleted, error")
    sync_error: Optional[str] = Field(None, description="Last sync error message")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
    
    class Settings:
        collection = "chatflows"

class ChatflowSyncResult(BaseModel):
    total_fetched: int
    created: int
    updated: int
    deleted: int
    errors: int
    error_details: List[str] = []
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)

# Keep existing UserChatflow for backward compatibility
class UserChatflow(Document):
    user_id: str = Field(..., index=True)  # Reference to User document id
    chatflow_id: str = Field(..., index=True)  # Reference to Chatflow document id
    is_active: bool = Field(default=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "user_chatflows"

    def __repr__(self):
        return f"<UserChatflow(user_id='{self.user_id}', chatflow_id='{self.chatflow_id}')>"
