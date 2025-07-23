"""
Chat Session Management Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from app.auth.middleware import authenticate_user
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.file_upload import FileUpload as FileUploadModel
from .chat_schemas import (
    ChatHistoryResponse, 
    SessionListResponse, 
    SessionSummary, 
    DeleteChatHistoryResponse,
    DeleteSessionResponse
)
import traceback

router = APIRouter()


@router.get("/sessions/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str, current_user: Dict = Depends(authenticate_user)
):
    """Get chat history for a specific session"""
    user_id = current_user.get("user_id")

    # 1. Verify the session exists and belongs to the user
    session = await ChatSession.find_one(
        ChatSession.session_id == session_id, ChatSession.user_id == user_id
    )
    if not session:
        raise HTTPException(
            status_code=404, detail="Chat session not found or access denied"
        )

    # 2. Fetch message history for the session
    messages = (
        await ChatMessage.find(ChatMessage.session_id == session_id)
        .sort(ChatMessage.created_at)
        .to_list()
    )

    # 3. Format the response with file metadata
    history_list = []
    for msg in messages:
        message_data = {
            "id": str(msg.id),
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at,
            "session_id": session_id,
            "file_ids": msg.file_ids,
            "has_files": msg.has_files,
            "uploads": []  # Enhanced file information for rendering
        }
        
        # If message has files, fetch file metadata for rendering
        if msg.has_files and msg.file_ids:
            try:
                print(f"🔍 DEBUG: Looking for files with IDs: {msg.file_ids} for user: {user_id}")
                
                # ✅ FIX: Use proper Beanie query syntax with field filters
                file_records = await FileUploadModel.find(
                    {"file_id": {"$in": msg.file_ids}, "user_id": user_id}
                ).to_list()
                
                print(f"🔍 DEBUG: Found {len(file_records)} file records")
                
                for file_record in file_records:
                    print(f"🔍 DEBUG: Processing file: {file_record.file_id}, name: {file_record.original_name}")
                    
                    file_info = {
                        "file_id": file_record.file_id,
                        "name": file_record.original_name,
                        "mime": file_record.mime_type,
                        "size": file_record.file_size,
                        "type": file_record.upload_type,
                        "url": f"/api/v1/chat/files/{file_record.file_id}",  # For display
                        "download_url": f"/api/v1/chat/files/{file_record.file_id}?download=true",  # For download
                        "is_image": file_record.mime_type.startswith("image/"),
                        "uploaded_at": file_record.uploaded_at.isoformat()
                    }
                    
                    # Add thumbnail URL for images
                    if file_record.mime_type.startswith("image/"):
                        file_info["thumbnail_url"] = f"/api/v1/chat/files/{file_record.file_id}/thumbnail"
                        file_info["thumbnail_small"] = f"/api/v1/chat/files/{file_record.file_id}/thumbnail?size=100"
                        file_info["thumbnail_medium"] = f"/api/v1/chat/files/{file_record.file_id}/thumbnail?size=300"
                    
                    message_data["uploads"].append(file_info)
                    print(f"🔍 DEBUG: Added file info to message: {file_info}")
                    
            except Exception as e:
                print(f"❌ ERROR: Error fetching file metadata: {e}")
                print(f"❌ ERROR: Exception type: {type(e)}")
                traceback.print_exc()
                # Continue without file metadata if there's an error
        
        history_list.append(message_data)

    return {"history": history_list, "count": len(history_list)}


@router.get("/sessions", response_model=SessionListResponse)
async def get_all_user_sessions(current_user: Dict = Depends(authenticate_user)):
    """
    Retrieves a summary of all chat sessions for the current user
    """
    user_id = current_user.get("user_id")

    # Find all sessions for the current user, sorted by creation date.
    sessions = (
        await ChatSession.find(ChatSession.user_id == user_id)
        .sort(-ChatSession.created_at)
        .to_list()
    )

    # The response model `SessionListResponse` expects a list of `SessionSummary` objects.
    # We need to map the fields from the `ChatSession` documents to `SessionSummary` objects.
    session_summaries = [
        SessionSummary(
            session_id=session.session_id,
            chatflow_id=session.chatflow_id,
            topic=session.topic,
            created_at=session.created_at,
            first_message=None,  # Explicitly set to None as it's no longer fetched
        )
        for session in sessions
    ]

    return {"sessions": session_summaries, "count": len(session_summaries)}


@router.delete("/history", response_model=DeleteChatHistoryResponse)
async def delete_user_chat_history(current_user: Dict = Depends(authenticate_user)):
    """
    Delete all chat history (sessions and messages) for the authenticated user.
    This is irreversible and will remove all conversation data.
    """
    user_id = current_user.get("user_id")
    
    try:
        # Count sessions and messages before deletion for the response
        sessions_count = await ChatSession.find(ChatSession.user_id == user_id).count()
        messages_count = await ChatMessage.find(ChatMessage.user_id == user_id).count()
        
        # Delete all chat messages for the user
        delete_messages_result = await ChatMessage.find(ChatMessage.user_id == user_id).delete()
        
        # Delete all chat sessions for the user
        delete_sessions_result = await ChatSession.find(ChatSession.user_id == user_id).delete()
        
        return {
            "message": "Chat history deleted successfully",
            "sessions_deleted": sessions_count,
            "messages_deleted": messages_count,
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete chat history: {str(e)}"
        )


@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(
    session_id: str, current_user: Dict = Depends(authenticate_user)
):
    """
    Delete a specific chat session and all its messages for the authenticated user.
    This is irreversible and will remove all conversation data for this session.
    """
    user_id = current_user.get("user_id")
    
    try:
        # 1. Verify the session exists and belongs to the user
        session = await ChatSession.find_one(
            ChatSession.session_id == session_id, ChatSession.user_id == user_id
        )
        if not session:
            raise HTTPException(
                status_code=404, detail="Chat session not found or access denied"
            )
        
        # 2. Count messages before deletion for the response
        messages_count = await ChatMessage.find(
            ChatMessage.session_id == session_id, ChatMessage.user_id == user_id
        ).count()
        
        # 3. Delete all messages for this session
        await ChatMessage.find(
            ChatMessage.session_id == session_id, ChatMessage.user_id == user_id
        ).delete()
        
        # 4. Delete the session
        await session.delete()
        
        return {
            "message": "Session deleted successfully",
            "session_id": session_id,
            "messages_deleted": messages_count,
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete session: {str(e)}"
        )
