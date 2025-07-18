# 📁 Best Practices for File Storage in `/predict/stream/store`

## 🎯 Overview

The `/predict/stream/store` endpoint handles file uploads during chat streaming. Here's the **comprehensive guide** for the best implementation approach.

## 🏗️ Architecture Components

### 1. **FileStorageService**
- **Purpose**: Handles file storage using MongoDB GridFS
- **Features**: Validation, deduplication, metadata management
- **Location**: `app/services/file_storage_service.py`

### 2. **FileUploadModel**
- **Purpose**: Database model for file metadata
- **Features**: Tracks file associations, processing status
- **Location**: `app/models/file_upload.py`

### 3. **ChatMessage Integration**
- **Purpose**: Links files to messages
- **Features**: File IDs, has_files flag, metadata storage

## 🚀 Best Practice Implementation

### ✅ **1. Process Files BEFORE Streaming**

```python
# ✅ BEST PRACTICE: Store files before streaming starts
stored_files = []
if chat_request.uploads:
    try:
        stored_files = await file_storage_service.process_upload_list(
            uploads=[upload.model_dump() for upload in chat_request.uploads],
            user_id=user_id,
            session_id=session_id,
            chatflow_id=chatflow_id,
            message_id="temp_user_message"  # Updated later
        )
        
        # Yield file upload confirmation
        if stored_files:
            file_upload_event = json.dumps({
                "event": "files_uploaded",
                "data": {
                    "file_count": len(stored_files),
                    "files": [{"file_id": f.file_id, "name": f.original_name} for f in stored_files]
                }
            })
            yield file_upload_event
            
    except Exception as e:
        # Yield error event
        error_event = json.dumps({
            "event": "file_upload_error",
            "data": {"error": str(e)}
        })
        yield error_event
```

### ✅ **2. Proper File-Message Linking**

```python
# ✅ BEST PRACTICE: Save message first, then link files
await user_message.insert()

# Update file records with actual message ID
if stored_files:
    for file in stored_files:
        file.message_id = str(user_message.id)
        await file.save()
    
    # Update message with file references
    user_message.file_ids = [file.file_id for file in stored_files]
    user_message.has_files = True
    await user_message.save()
```

### ✅ **3. Dual Upload Format Support**

```python
# ✅ BEST PRACTICE: Handle both file and URL uploads
uploads = []
for upload in chat_request.uploads:
    upload_dict = upload.model_dump()
    if upload_dict["type"] == "file":
        # Prefix base64 data for Flowise compatibility
        upload_dict["data"] = f"data:{upload_dict['mime']};base64,{upload_dict['data']}"
    # For "url", keep as-is (type="url", data=URL)
    uploads.append(upload_dict)
```

### ✅ **4. Stream Event Notifications**

```python
# ✅ BEST PRACTICE: Notify client about file processing stages
yield json.dumps({
    "event": "files_uploaded",
    "data": {"file_count": len(stored_files), "files": [...]},
    "timestamp": datetime.utcnow().isoformat()
})

yield json.dumps({
    "event": "file_upload_error", 
    "data": {"error": str(e)},
    "timestamp": datetime.utcnow().isoformat()
})
```

## 📊 File Storage Features

### 🔐 **Security Features**
- **File Validation**: MIME type, size limits
- **Content Verification**: Magic number detection
- **User Association**: Files linked to specific users
- **Access Control**: Through authentication middleware

### 🔄 **Performance Features**
- **Deduplication**: SHA256 hash-based deduplication
- **GridFS Storage**: Efficient large file handling
- **Async Processing**: Non-blocking file operations
- **Error Handling**: Graceful failure recovery

### 📈 **Monitoring Features**
- **Processing Status**: Track file processing state
- **Metadata Storage**: Rich file metadata
- **Upload Tracking**: Timestamps and associations
- **Error Logging**: Comprehensive error tracking

## 🔧 Configuration Options

### File Size Limits
```python
# In FileStorageService
self.max_file_size = 10 * 1024 * 1024  # 10MB default
```

### Allowed MIME Types
```python
self.allowed_mime_types = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}
```

## 📋 Database Schema

### FileUpload Collection
```python
{
    "file_id": "GridFS_ObjectId",
    "original_name": "document.pdf",
    "mime_type": "application/pdf",
    "message_id": "user_message_id",
    "session_id": "chat_session_id",
    "user_id": "user_id",
    "chatflow_id": "chatflow_id",
    "file_size": 1024576,
    "upload_type": "file",
    "file_hash": "sha256_hash",
    "processed": true,
    "uploaded_at": "2025-01-01T00:00:00Z",
    "metadata": {...}
}
```

### ChatMessage with Files
```python
{
    "id": "message_id",
    "content": "Here's the document you requested",
    "file_ids": ["file_id_1", "file_id_2"],
    "has_files": true,
    "role": "user",
    "session_id": "session_id",
    "user_id": "user_id",
    "chatflow_id": "chatflow_id"
}
```

## 🚦 Error Handling Strategy

### 1. **Validation Errors**
```python
try:
    is_valid, error_msg = file_storage_service.validate_file(file_data, mime_type, filename)
    if not is_valid:
        raise ValueError(error_msg)
except ValueError as e:
    # Return validation error to client
    yield json.dumps({"event": "file_validation_error", "data": {"error": str(e)}})
```

### 2. **Storage Errors**
```python
try:
    stored_files = await file_storage_service.process_upload_list(...)
except Exception as e:
    # Log error and continue processing
    print(f"File storage error: {e}")
    # Don't fail the entire request
    continue
```

### 3. **Linking Errors**
```python
try:
    # Link files to message
    user_message.file_ids = [file.file_id for file in stored_files]
    await user_message.save()
except Exception as e:
    # Log error but don't fail the request
    print(f"File linking error: {e}")
```

## 📊 Monitoring and Metrics

### Key Metrics to Track
- **Upload Success Rate**: `successful_uploads / total_uploads`
- **File Processing Time**: Time from upload to storage
- **Storage Efficiency**: Deduplication rate
- **Error Rates**: By error type and user

### Logging Strategy
```python
# Log file operations
print(f"Processing {len(uploads)} uploads for user {user_id}")
print(f"Successfully stored {len(stored_files)} files")
print(f"Linked {len(stored_files)} files to message {message_id}")
```

## 🔍 Testing Strategy

### Unit Tests
- File validation logic
- Deduplication functionality
- Error handling scenarios
- MIME type detection

### Integration Tests
- End-to-end file upload flow
- Message-file association
- GridFS storage operations
- Error recovery scenarios

### Load Tests
- Concurrent file uploads
- Large file handling
- Memory usage under load
- Database performance

## 📝 Migration Considerations

### Database Migrations
```python
# Add file upload support
await FileUpload.create_indexes()
await ChatMessage.find_all().update_many({"$set": {"has_files": False}})
```

### Backward Compatibility
- Existing messages without files continue to work
- New `has_files` field defaults to `False`
- File IDs are optional arrays

## 🎯 Best Practices Summary

1. **✅ Process files BEFORE streaming** - Ensures files are available immediately
2. **✅ Use proper error handling** - Don't fail entire request on file errors
3. **✅ Implement deduplication** - Save storage space and improve performance
4. **✅ Validate all inputs** - Security and data integrity
5. **✅ Use async operations** - Better performance and scalability
6. **✅ Provide client feedback** - Stream events for file processing status
7. **✅ Link files to messages** - Maintain data relationships
8. **✅ Monitor and log** - Track performance and errors
9. **✅ Test thoroughly** - Cover all error scenarios
10. **✅ Plan for scale** - Consider storage limits and performance
