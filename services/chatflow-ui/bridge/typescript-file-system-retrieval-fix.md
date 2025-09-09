# TypeScript File System Retrieval Fix

## Problem Description

The TypeScript/JavaScript frontend was unable to retrieve uploaded images from the file system, resulting in **404 Not Found** errors when attempting to display or download files.

### Error Symptoms
```
INFO:     127.0.0.1:64415 - "OPTIONS /api/v1/files/687a076c6384b20d4e8326f8 HTTP/1.1" 200 OK
INFO:     127.0.0.1:64415 - "GET /api/v1/files/687a076c6384b20d4e8326f8 HTTP/1.1" 404 Not Found
```

### Root Cause
The frontend was using incorrect API endpoints for file retrieval:

```typescript
// ❌ INCORRECT - This endpoint doesn't exist
const imageUrl = `/api/v1/files/${file_id}`;
```

## Solution

### Correct API Endpoints

The file system endpoints are located under the **chat router**, not as standalone file endpoints:

```typescript
// ✅ CORRECT - Use these endpoints
const baseUrl = '/api/v1/chat/files';

// Main file endpoints
GET /api/v1/chat/files/{file_id}                    // View/display file
GET /api/v1/chat/files/{file_id}?download=true      // Force download
GET /api/v1/chat/files/{file_id}/thumbnail           // Get thumbnail
GET /api/v1/chat/files/{file_id}/thumbnail?size=100  // Small thumbnail (100px)
GET /api/v1/chat/files/{file_id}/thumbnail?size=300  // Medium thumbnail (300px)

// Session and message file endpoints
GET /api/v1/chat/files/session/{session_id}         // List all files in session
GET /api/v1/chat/files/message/{message_id}         // List all files in message
```

### TypeScript Implementation

#### 1. File URL Helper Functions

```typescript
// File URL utilities
export const FileUrlUtils = {
  /**
   * Get the main file URL for display/viewing
   */
  getFileUrl: (fileId: string): string => {
    return `/api/v1/chat/files/${fileId}`;
  },

  /**
   * Get the download URL (forces download)
   */
  getDownloadUrl: (fileId: string): string => {
    return `/api/v1/chat/files/${fileId}?download=true`;
  },

  /**
   * Get thumbnail URL with optional size
   */
  getThumbnailUrl: (fileId: string, size?: number): string => {
    const baseUrl = `/api/v1/chat/files/${fileId}/thumbnail`;
    return size ? `${baseUrl}?size=${size}` : baseUrl;
  },

  /**
   * Get all files for a session
   */
  getSessionFilesUrl: (sessionId: string): string => {
    return `/api/v1/chat/files/session/${sessionId}`;
  },

  /**
   * Get all files for a message
   */
  getMessageFilesUrl: (messageId: string): string => {
    return `/api/v1/chat/files/message/${messageId}`;
  }
};
```

#### 2. File Retrieval with Authentication

```typescript
// File retrieval with proper authentication
export const FileService = {
  /**
   * Fetch file with authentication
   */
  async fetchFile(fileId: string, token: string): Promise<Blob> {
    const response = await fetch(FileUrlUtils.getFileUrl(fileId), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    return response.blob();
  },

  /**
   * Download file
   */
  async downloadFile(fileId: string, filename: string, token: string): Promise<void> {
    const response = await fetch(FileUrlUtils.getDownloadUrl(fileId), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get session files
   */
  async getSessionFiles(sessionId: string, token: string): Promise<FileInfo[]> {
    const response = await fetch(FileUrlUtils.getSessionFilesUrl(sessionId), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch session files: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
};
```

#### 3. React Component Example

```typescript
import React from 'react';
import { FileUrlUtils, FileService } from './FileService';

interface FileDisplayProps {
  fileId: string;
  filename: string;
  mimeType: string;
  token: string;
}

const FileDisplay: React.FC<FileDisplayProps> = ({ fileId, filename, mimeType, token }) => {
  const handleDownload = async () => {
    try {
      await FileService.downloadFile(fileId, filename, token);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Display image files
  if (mimeType.startsWith('image/')) {
    return (
      <div className="file-display">
        <img 
          src={FileUrlUtils.getFileUrl(fileId)} 
          alt={filename}
          style={{ maxWidth: '100%', height: 'auto' }}
          onError={(e) => {
            // Fallback to thumbnail if main image fails
            e.currentTarget.src = FileUrlUtils.getThumbnailUrl(fileId, 300);
          }}
        />
        <div className="file-actions">
          <button onClick={handleDownload}>Download {filename}</button>
        </div>
      </div>
    );
  }

  // Display other file types
  return (
    <div className="file-display">
      <div className="file-info">
        <span>{filename}</span>
        <span>({mimeType})</span>
      </div>
      <div className="file-actions">
        <a 
          href={FileUrlUtils.getFileUrl(fileId)} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          View
        </a>
        <button onClick={handleDownload}>Download</button>
      </div>
    </div>
  );
};

export default FileDisplay;
```

#### 4. Chat Message Integration

```typescript
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  file_ids?: string[];
  has_files?: boolean;
  uploads?: Array<{
    name: string;
    mime: string;
    file_id?: string;
  }>;
}

const ChatMessageComponent: React.FC<{ message: ChatMessage; token: string }> = ({ message, token }) => {
  return (
    <div className="chat-message">
      <div className="message-content">{message.content}</div>
      
      {/* Display uploaded files */}
      {message.has_files && message.file_ids && (
        <div className="message-files">
          {message.file_ids.map(fileId => (
            <FileDisplay 
              key={fileId}
              fileId={fileId}
              filename="Uploaded file"
              mimeType="image/png"
              token={token}
            />
          ))}
        </div>
      )}
      
      {/* Display files from uploads array */}
      {message.uploads && message.uploads.length > 0 && (
        <div className="message-uploads">
          {message.uploads.map((upload, index) => (
            upload.file_id && (
              <FileDisplay 
                key={upload.file_id}
                fileId={upload.file_id}
                filename={upload.name}
                mimeType={upload.mime}
                token={token}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};
```

### Before and After Comparison

#### Before (Not Working)
```typescript
// ❌ These endpoints return 404
const imageUrl = `/api/v1/files/${fileId}`;
const downloadUrl = `/api/v1/files/${fileId}/download`;
const thumbnailUrl = `/api/v1/files/${fileId}/thumbnail`;
```

#### After (Working)
```typescript
// ✅ These endpoints work correctly
const imageUrl = `/api/v1/chat/files/${fileId}`;
const downloadUrl = `/api/v1/chat/files/${fileId}?download=true`;
const thumbnailUrl = `/api/v1/chat/files/${fileId}/thumbnail`;
```

## File System Architecture

### Backend Structure
```
app/api/chat.py
├── GET /files/{file_id}                    # Main file endpoint
├── GET /files/{file_id}?download=true      # Download with query param
├── GET /files/{file_id}/thumbnail          # Thumbnail generation
├── GET /files/session/{session_id}         # Session files
├── GET /files/message/{message_id}         # Message files
└── DELETE /files/{file_id}                 # File deletion
```

### Database Integration
- **GridFS**: Files stored in MongoDB GridFS (`fs.files`, `fs.chunks`)
- **File Metadata**: Stored in `file_uploads` collection
- **Chat Integration**: File IDs linked to chat messages via `file_ids` array

### Authentication
All file endpoints require Bearer token authentication:
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## Testing and Validation

### Manual Testing
1. Upload an image through the chat interface
2. Check that `file_ids` appear in chat history
3. Use the correct endpoints to retrieve files
4. Verify thumbnails are generated correctly

### Automated Testing
The investigation script `mimic_client_12_enhanced_image_investigation.py` validates:
- ✅ File upload functionality
- ✅ File retrieval through all endpoints
- ✅ Thumbnail generation
- ✅ Session file listing
- ✅ Authentication requirements

## Common Issues and Solutions

### Issue: 404 Not Found
```
GET /api/v1/files/687a076c6384b20d4e8326f8 HTTP/1.1" 404 Not Found
```
**Solution**: Use `/api/v1/chat/files/` prefix instead of `/api/v1/files/`

### Issue: Missing Authentication
```
GET /api/v1/chat/files/687a076c6384b20d4e8326f8 HTTP/1.1" 401 Unauthorized
```
**Solution**: Include `Authorization: Bearer {token}` header

### Issue: File Not Found
```
GET /api/v1/chat/files/invalid-id HTTP/1.1" 404 Not Found
```
**Solution**: Verify file ID exists in chat history `file_ids` array

### Issue: CORS Errors
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
**Solution**: Ensure backend CORS settings include file endpoints

## Performance Considerations

1. **Thumbnails**: Use thumbnail endpoints for preview images to save bandwidth
2. **Caching**: Implement client-side caching for frequently accessed files
3. **Lazy Loading**: Load images only when they come into view
4. **Error Handling**: Implement fallback mechanisms for failed image loads

## Security Notes

1. **Authentication**: All file access requires valid JWT tokens
2. **Authorization**: Files are scoped to user sessions
3. **File Validation**: Server validates file types and sizes
4. **GridFS**: Files are stored securely in MongoDB

## Migration Guide

### For Existing TypeScript Code
1. Replace `/api/v1/files/` with `/api/v1/chat/files/`
2. Add authentication headers to all file requests
3. Update download URLs to use query parameters
4. Test thumbnail functionality

### For New Development
1. Use the provided `FileUrlUtils` and `FileService`
2. Implement proper error handling
3. Add loading states for file operations
4. Consider progressive enhancement for image display

---

**Created**: July 18, 2025  
**Status**: ✅ Validated and Working  
**Related Files**: 
- `mimic_client_12_enhanced_image_investigation.py` (Testing script)
- `app/api/chat.py` (Backend endpoints)
- `setup_file_system.py` (Database setup)
