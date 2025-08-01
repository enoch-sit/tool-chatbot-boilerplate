from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from typing import Dict
import io
from PIL import Image

from app.auth.middleware import authenticate_user
from app.services.file_storage_service import FileStorageService
from app.models.file_upload import FileUpload as FileUploadModel

router = APIRouter(prefix="/api/v1/chat", tags=["files"])

@router.get("/files/session/{session_id}")
async def get_session_files(
    session_id: str, current_user: Dict = Depends(authenticate_user)
):
    """Get all files for a chat session."""
    try:
        file_storage_service = FileStorageService()
        files = await file_storage_service.get_files_for_session(session_id)
        
        # Return file metadata (not the actual file content)
        return {
            "session_id": session_id,
            "files": [
                {
                    "file_id": file.file_id,
                    "original_name": file.original_name,
                    "mime_type": file.mime_type,
                    "file_size": file.file_size,
                    "upload_type": file.upload_type,
                    "uploaded_at": file.uploaded_at.isoformat(),
                    "processed": file.processed,
                    "metadata": file.metadata
                }
                for file in files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get files: {str(e)}")


@router.get("/files/{file_id}/thumbnail")
async def get_file_thumbnail(
    file_id: str, 
    current_user: Dict = Depends(authenticate_user),
    size: int = 200
):
    """Get a thumbnail/preview of an image file."""
    try:
        file_storage_service = FileStorageService()
        
        # Check if user has access to this file
        file_record = await FileUploadModel.find_one(
            FileUploadModel.file_id == file_id,
            FileUploadModel.user_id == current_user.get("user_id")
        )
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or access denied")
        
        # Only generate thumbnails for images
        if not file_record.mime_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File is not an image")
        
        # Get file data
        file_data = await file_storage_service.get_file(file_id)
        if not file_data:
            raise HTTPException(status_code=404, detail="File data not found")
        
        file_content, filename, mime_type = file_data
        
        # Generate thumbnail using PIL
        try:
            from PIL import Image
            
            image = Image.open(io.BytesIO(file_content))
            
            if image.mode not in ('RGB', 'RGBA'):
                if image.mode == 'P' and 'transparency' in image.info:
                    image = image.convert('RGBA')
                else:
                    image = image.convert('RGB')
            
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            
            thumbnail_buffer = io.BytesIO()
            
            if image.mode == 'RGBA' or (hasattr(image, 'info') and 'transparency' in image.info):
                image.save(thumbnail_buffer, format='PNG', optimize=True)
                output_mime_type = "image/png"
            else:
                image.save(thumbnail_buffer, format='JPEG', quality=85, optimize=True)
                output_mime_type = "image/jpeg"
            
            thumbnail_content = thumbnail_buffer.getvalue()
            
            from fastapi.responses import Response
            return Response(
                content=thumbnail_content,
                media_type=output_mime_type,
                headers={
                    "Content-Disposition": f"inline; filename=thumb_{filename}",
                    "Cache-Control": "public, max-age=86400"
                }
            )
            
        except Exception as e:
            from fastapi.responses import Response
            return Response(
                content=file_content,
                media_type=mime_type,
                headers={
                    "Content-Disposition": f"inline; filename={filename}",
                    "Cache-Control": "public, max-age=3600"
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get thumbnail: {str(e)}")


@router.get("/files/{file_id}")
async def get_file(
    file_id: str, 
    current_user: Dict = Depends(authenticate_user),
    download: bool = False
):
    """Get a file by file_id. Can be used for display (inline) or download."""
    try:
        file_storage_service = FileStorageService()
        
        file_record = await FileUploadModel.find_one(
            FileUploadModel.file_id == file_id,
            FileUploadModel.user_id == current_user.get("user_id")
        )
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or access denied")
        
        file_data = await file_storage_service.get_file(file_id)
        if not file_data:
            raise HTTPException(status_code=404, detail="File data not found")
        
        file_content, filename, mime_type = file_data
        
        if download:
            disposition = f"attachment; filename={filename}"
        else:
            disposition = f"inline; filename={filename}"
        
        from fastapi.responses import Response
        return Response(
            content=file_content,
            media_type=mime_type,
            headers={
                "Content-Disposition": disposition,
                "Cache-Control": "public, max-age=3600"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str, current_user: Dict = Depends(authenticate_user)
):
    """Delete a file by file_id."""
    try:
        file_storage_service = FileStorageService()
        
        file_record = await FileUploadModel.find_one(
            FileUploadModel.file_id == file_id,
            FileUploadModel.user_id == current_user.get("user_id")
        )
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or access denied")
        
        success = await file_storage_service.delete_file(file_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete file")
        
        return {"message": "File deleted successfully", "file_id": file_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.get("/files/message/{message_id}")
async def get_message_files(
    message_id: str, current_user: Dict = Depends(authenticate_user)
):
    """Get all files for a specific message."""
    try:
        file_storage_service = FileStorageService()
        files = await file_storage_service.get_files_for_message(message_id)
        
        user_files = [f for f in files if f.user_id == current_user.get("user_id")]
        
        return {
            "message_id": message_id,
            "files": [
                {
                    "file_id": file.file_id,
                    "original_name": file.original_name,
                    "mime_type": file.mime_type,
                    "file_size": file.file_size,
                    "upload_type": file.upload_type,
                    "uploaded_at": file.uploaded_at.isoformat(),
                    "processed": file.processed,
                    "metadata": file.metadata
                }
                for file in user_files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get message files: {str(e)}")
