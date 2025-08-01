"""
Pydantic models and request/response schemas for the chat API.
"""
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime


class FileUpload(BaseModel):
    data: str  # Base64 encoded file or URL
    type: str  # "file" or "url"
    name: str  # Filename
    mime: str  # MIME type like "image/jpeg"


class ChatRequest(BaseModel):
    question: str
    chatflow_id: str
    overrideConfig: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None
    # The client can provide a session ID to maintain conversation context
    sessionId: Optional[str] = None
    uploads: Optional[List[FileUpload]] = None  # New field for uploads


class AuthRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RevokeTokenRequest(BaseModel):
    token_id: Optional[str] = None
    all_tokens: Optional[bool] = False


class MyAssignedChatflowsResponse(BaseModel):
    assigned_chatflow_ids: List[str]
    count: int


class CreateSessionRequest(BaseModel):
    chatflow_id: str
    topic: Optional[str] = None


class SessionResponse(BaseModel):
    session_id: str
    chatflow_id: str
    user_id: str
    topic: Optional[str]
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    history: List[Dict[str, Any]]
    count: int


class SessionSummary(BaseModel):
    session_id: str
    chatflow_id: str
    topic: Optional[str]
    created_at: datetime
    first_message: Optional[str] = None


class SessionListResponse(BaseModel):
    sessions: List[SessionSummary]
    count: int


class DeleteChatHistoryResponse(BaseModel):
    message: str
    sessions_deleted: int
    messages_deleted: int
    user_id: str


class DeleteSessionResponse(BaseModel):
    message: str
    session_id: str
    messages_deleted: int
    user_id: str
