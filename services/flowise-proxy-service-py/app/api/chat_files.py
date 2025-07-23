"""
Chat File Management Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from typing import Dict
from app.auth.middleware import authenticate_user
from app.services.file_storage_service import FileStorageService
from app.models.file_upload import FileUpload as FileUploadModel
import io
import traceback

router = APIRouter()


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
        
        # 🖼️ DEBUG: Print thumbnail source image bytes information
        print(f"🖼️ THUMBNAIL SOURCE DEBUG:")
        print(f"   📊 Original size: {len(file_content)} bytes")
        print(f"   📝 Original MIME: {mime_type}")
        print(f"   📄 Original filename: {filename}")
        print(f"   🎯 Requested thumbnail size: {size}px")
        print(f"   🔢 First 30 bytes (hex): {file_content[:30].hex()}")
        
        # Generate thumbnail using PIL
        try:
            from PIL import Image
            
            # Open the image - PIL can handle many formats (JPEG, PNG, GIF, BMP, TIFF, WebP, etc.)
            image = Image.open(io.BytesIO(file_content))
            
            # Convert to RGB if necessary (handles RGBA, P, L, etc.)
            if image.mode not in ('RGB', 'RGBA'):
                if image.mode == 'P' and 'transparency' in image.info:
                    # Handle palette images with transparency
                    image = image.convert('RGBA')
                else:
                    image = image.convert('RGB')
            
            # Create thumbnail while preserving aspect ratio
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            
            # Convert to bytes
            thumbnail_buffer = io.BytesIO()
            
            # Choose output format based on original format and transparency
            if image.mode == 'RGBA' or (hasattr(image, 'info') and 'transparency' in image.info):
                # Use PNG for images with transparency
                image.save(thumbnail_buffer, format='PNG', optimize=True)
                output_mime_type = "image/png"
            else:
                # Use JPEG for regular images (smaller file size)
                image.save(thumbnail_buffer, format='JPEG', quality=85, optimize=True)
                output_mime_type = "image/jpeg"
            
            thumbnail_content = thumbnail_buffer.getvalue()
            
            # 🖼️ DEBUG: Print thumbnail output bytes information
            print(f"🖼️ THUMBNAIL OUTPUT DEBUG:")
            print(f"   ✅ Generated successfully!")
            print(f"   📊 Thumbnail size: {len(thumbnail_content)} bytes")
            print(f"   📝 Thumbnail MIME: {output_mime_type}")
            print(f"   📐 Thumbnail dimensions: {image.size}")
            print(f"   🔢 First 30 bytes (hex): {thumbnail_content[:30].hex()}")
            print(f"   🎨 Format: {'PNG' if output_mime_type == 'image/png' else 'JPEG'}")
            
            return Response(
                content=thumbnail_content,
                media_type=output_mime_type,
                headers={
                    "Content-Disposition": f"inline; filename=thumb_{filename}",
                    "Cache-Control": "public, max-age=86400"  # Cache for 24 hours
                }
            )
            
        except Exception as e:
            # If thumbnail generation fails, return original image
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
        print(f"🔍 DEBUG: get_file called with file_id: {file_id}, user_id: {current_user.get('user_id')}")
        
        file_storage_service = FileStorageService()
        
        # Check if user has access to this file
        print(f"🔍 DEBUG: Checking file access for user {current_user.get('user_id')}")
        file_record = await FileUploadModel.find_one(
            FileUploadModel.file_id == file_id,
            FileUploadModel.user_id == current_user.get("user_id")
        )
        
        if not file_record:
            print(f"❌ DEBUG: File record not found for file_id: {file_id}")
            # Additional debug: check if file exists for any user
            any_file_record = await FileUploadModel.find_one(FileUploadModel.file_id == file_id)
            if any_file_record:
                print(f"❌ DEBUG: File exists but belongs to different user: {any_file_record.user_id}")
            else:
                print(f"❌ DEBUG: File doesn't exist at all in database")
                
            # Check GridFS directly
            try:
                from app.database import get_database
                db = await get_database()
                from motor.motor_asyncio import AsyncIOMotorGridFSBucket
                bucket = AsyncIOMotorGridFSBucket(db)
                from bson import ObjectId
                
                # Try to find file in GridFS
                if ObjectId.is_valid(file_id):
                    gridfs_file = await bucket.find({"_id": ObjectId(file_id)}).to_list(1)
                    if gridfs_file:
                        print(f"✅ DEBUG: File exists in GridFS: {gridfs_file[0]}")
                    else:
                        print(f"❌ DEBUG: File not found in GridFS")
                else:
                    print(f"❌ DEBUG: Invalid ObjectId format: {file_id}")
            except Exception as gridfs_error:
                print(f"❌ DEBUG: GridFS check error: {gridfs_error}")
                
            raise HTTPException(status_code=404, detail="File not found or access denied")
        
        print(f"✅ DEBUG: File record found: {file_record.original_name}")
        
        # Get file data
        print(f"🔍 DEBUG: Retrieving file data from storage service")
        file_data = await file_storage_service.get_file(file_id)
        if not file_data:
            print(f"❌ DEBUG: File data not found in storage service")
            raise HTTPException(status_code=404, detail="File data not found")
        
        file_content, filename, mime_type = file_data
        print(f"✅ DEBUG: File data retrieved successfully - size: {len(file_content)}, filename: {filename}, mime: {mime_type}")
        
        # 📁 DEBUG: Print comprehensive file bytes information
        print(f"📁 FILE BYTES DEBUG:")
        print(f"   📊 Size: {len(file_content)} bytes")
        print(f"   📝 MIME: {mime_type}")
        print(f"   📄 Filename: {filename}")
        print(f"   🔢 First 50 bytes (hex): {file_content[:50].hex()}")
        print(f"   🔤 First 20 bytes (repr): {repr(file_content[:20])}")
        
        if mime_type.startswith("image/"):
            print(f"🖼️ IMAGE-SPECIFIC DEBUG:")
            # Check if it's a valid image by looking at magic bytes
            magic_signatures = {
                b'\xff\xd8\xff': 'JPEG',
                b'\x89PNG\r\n\x1a\n': 'PNG',
                b'GIF87a': 'GIF87a',
                b'GIF89a': 'GIF89a',
                b'RIFF': 'WebP (maybe)',
                b'BM': 'BMP'
            }
            
            for signature, format_name in magic_signatures.items():
                if file_content.startswith(signature):
                    print(f"   ✅ Valid {format_name} image detected")
                    break
            else:
                print(f"   ⚠️  Unknown image format - may be corrupted")
        
        # Determine Content-Disposition header
        if download:
            disposition = f"attachment; filename={filename}"
        else:
            # For inline display (images, etc.)
            disposition = f"inline; filename={filename}"
        
        return Response(
            content=file_content,
            media_type=mime_type,
            headers={
                "Content-Disposition": disposition,
                "Cache-Control": "public, max-age=3600"  # Cache for 1 hour
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ DEBUG: Exception in get_file: {e}")
        print(f"❌ DEBUG: Exception type: {type(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get file: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str, current_user: Dict = Depends(authenticate_user)
):
    """Delete a file by file_id."""
    try:
        file_storage_service = FileStorageService()
        
        # Check if user has access to this file
        file_record = await FileUploadModel.find_one(
            FileUploadModel.file_id == file_id,
            FileUploadModel.user_id == current_user.get("user_id")
        )
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found or access denied")
        
        # Delete file
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
        
        # Filter by user access
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
