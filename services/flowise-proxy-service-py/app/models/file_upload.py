from beanie import Document
from pydantic import Field
from typing import Optional, Dict, Any
from datetime import datetime
import pymongo


class FileUpload(Document):
    """Represents an uploaded file associated with a chat message."""
    
    # File identifiers
    file_id: str = Field(..., unique=True, index=True, description="GridFS file ID")
    original_name: str = Field(..., description="Original filename")
    mime_type: str = Field(..., description="MIME type")
    
    # Associations
    message_id: str = Field(..., index=True, description="Associated ChatMessage ID")
    session_id: str = Field(..., index=True, description="Chat session ID")
    user_id: str = Field(..., index=True, description="User who uploaded the file")
    chatflow_id: str = Field(..., index=True, description="Chatflow ID")
    
    # File metadata
    file_size: int = Field(..., description="File size in bytes")
    upload_type: str = Field(..., description="'file' or 'url'")
    file_hash: Optional[str] = Field(default=None, description="SHA256 hash for deduplication")
    
    # Processing status
    processed: bool = Field(default=False, description="Whether file has been processed")
    processing_error: Optional[str] = Field(default=None, description="Processing error if any")
    
    # Timestamps
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    processed_at: Optional[datetime] = Field(default=None)
    
    # Additional metadata
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional file metadata")
    
    class Settings:
        name = "file_uploads"
        indexes = [
            [
                ("session_id", pymongo.ASCENDING),
                ("uploaded_at", pymongo.ASCENDING),
            ],
            [
                ("user_id", pymongo.ASCENDING),
                ("chatflow_id", pymongo.ASCENDING),
            ],
            [
                ("file_hash", pymongo.ASCENDING),
            ],
        ]
