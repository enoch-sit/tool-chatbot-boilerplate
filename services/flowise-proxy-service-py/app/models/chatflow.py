from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator
from bson import ObjectId
from beanie import Document, PydanticObjectId
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT


class Chatflow(Document):
    id: Optional[PydanticObjectId] = Field(default=None, alias="_id")
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
    analytic_config: Optional[Dict[str, Any]] = Field(
        None, description="Analytics config"
    )
    speech_to_text_config: Optional[Dict[str, Any]] = Field(
        None, description="Speech-to-text config"
    )

    # Timestamps
    created_date: Optional[datetime] = Field(None, description="Flowise creation date")
    updated_date: Optional[datetime] = Field(None, description="Flowise update date")
    synced_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last sync timestamp"
    )
    # Sync status
    sync_status: str = Field(
        default="active", description="Sync status: active, deleted, error"
    )
    sync_error: Optional[str] = Field(None, description="Last sync error message")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        arbitrary_types_allowed = True

    class Settings:
        collection = "chatflows"
        indexes = [
            IndexModel(
                [("flowise_id", ASCENDING)], unique=True, name="flowise_id_unique"
            ),
            IndexModel([("sync_status", ASCENDING)], name="sync_status_index"),
            IndexModel([("synced_at", DESCENDING)], name="synced_at_index"),
            IndexModel([("deployed", ASCENDING)], name="deployed_index"),
            IndexModel([("is_public", ASCENDING)], name="is_public_index"),
            IndexModel([("name", TEXT)], name="name_text_index"),
        ]


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
    external_user_id: str = Field(
        ..., index=True
    )  # Reference to User's external_id (JWT sub)
    chatflow_id: str = Field(..., index=True)  # Reference to Chatflow document id
    is_active: bool = Field(default=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_by: Optional[str] = Field(
        None, description="Username of admin who assigned the user"
    )

    class Settings:
        collection = "user_chatflows"

    def __repr__(self):
        return f"<UserChatflow(external_user_id='{self.external_user_id}', chatflow_id='{self.chatflow_id}')>"
