# 🚀 Quick Reference: File Upload & Image Display API

## 📋 API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|---------|---------|---------------|
| `/api/v1/chat/upload` | POST | Upload files | ✅ JWT |
| `/api/v1/chat/predict-stream-store` | POST | Send message with files | ✅ JWT |
| `/api/v1/chat/sessions/{session_id}/history` | GET | Get chat history | ✅ JWT |
| `/api/v1/chat/files/{file_id}` | GET | View/download file | ✅ JWT |
| `/api/v1/chat/files/{file_id}/thumbnail` | GET | Get image thumbnail | ✅ JWT |

## 🔄 Basic Workflow

### 1. Upload File
```javascript
// FormData upload
const formData = new FormData();
formData.append('file', file);
formData.append('session_id', sessionId);

const response = await fetch('/api/v1/chat/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
});

const { file_id } = await response.json();
```

### 2. Send Message
```javascript
await fetch('/api/v1/chat/predict-stream-store', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        message: "Describe this image",
        session_id: sessionId,
        file_ids: [file_id]  // Array of uploaded file IDs
    })
});
```

### 3. Get History
```javascript
const response = await fetch(`/api/v1/chat/sessions/${sessionId}/history`, {
    headers: { 'Authorization': `Bearer ${token}` }
});

const { history } = await response.json();
```

## 📊 Response Format

### Chat History Response
```json
{
    "history": [
        {
            "id": "msg_123",
            "role": "user",
            "content": "Describe this image",
            "uploads": [
                {
                    "file_id": "file_456",
                    "name": "image.jpg",
                    "mime": "image/jpeg",
                    "size": 245760,
                    "is_image": true,
                    "url": "/api/v1/chat/files/file_456",
                    "download_url": "/api/v1/chat/files/file_456?download=true",
                    "thumbnail_url": "/api/v1/chat/files/file_456/thumbnail",
                    "thumbnail_small": "/api/v1/chat/files/file_456/thumbnail?size=100",
                    "thumbnail_medium": "/api/v1/chat/files/file_456/thumbnail?size=300"
                }
            ]
        }
    ]
}
```

## 🎨 HTML Templates

### Basic Chat UI
```html
<div id="chat-container">
    <div id="messages"></div>
    <div id="input-area">
        <input type="text" id="message-input" placeholder="Type message...">
        <input type="file" id="file-input" multiple accept="image/*,.pdf">
        <button onclick="sendMessage()">Send</button>
    </div>
</div>
```

### Image Display
```html
<!-- Thumbnail with click to expand -->
<img src="/api/v1/chat/files/FILE_ID/thumbnail" 
     onclick="window.open('/api/v1/chat/files/FILE_ID', '_blank')"
     style="max-width: 200px; cursor: pointer;">

<!-- Download link -->
<a href="/api/v1/chat/files/FILE_ID?download=true" download="filename.jpg">
    Download Image
</a>
```

## 🔧 JavaScript Helpers

### File Upload Function
```javascript
async function uploadFile(file, sessionId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    
    const response = await fetch('/api/v1/chat/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    return (await response.json()).file_id;
}
```

### Message Renderer
```javascript
function renderMessage(message) {
    const div = document.createElement('div');
    div.className = `message ${message.role}`;
    div.innerHTML = `
        <div class="content">${message.content}</div>
        ${message.uploads ? renderUploads(message.uploads) : ''}
    `;
    return div;
}

function renderUploads(uploads) {
    return uploads.map(upload => 
        upload.is_image 
            ? `<img src="${upload.thumbnail_url}" onclick="window.open('${upload.url}')" style="max-width:200px;cursor:pointer;">`
            : `<a href="${upload.download_url}" download="${upload.name}">📄 ${upload.name}</a>`
    ).join('');
}
```

### Complete Send Function
```javascript
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const message = messageInput.value.trim();
    
    if (!message && !fileInput.files.length) return;
    
    try {
        // Upload files
        const fileIds = [];
        for (let file of fileInput.files) {
            const fileId = await uploadFile(file, sessionId);
            fileIds.push(fileId);
        }
        
        // Send message
        await fetch('/api/v1/chat/predict-stream-store', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                session_id: sessionId,
                file_ids: fileIds
            })
        });
        
        // Clear inputs
        messageInput.value = '';
        fileInput.value = '';
        
        // Refresh chat
        await loadChatHistory();
        
    } catch (error) {
        console.error('Send failed:', error);
        alert('Failed to send message');
    }
}
```

## 🛡️ Security & Validation

### File Validation
```javascript
function validateFile(file) {
    // Size check (10MB)
    if (file.size > 10 * 1024 * 1024) {
        return { valid: false, error: 'File too large (max 10MB)' };
    }
    
    // Type check
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
        return { valid: false, error: 'File type not supported' };
    }
    
    return { valid: true };
}
```

### Error Handling
```javascript
async function apiCall(url, options) {
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Redirect to login
                window.location.href = '/login';
                return;
            }
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}
```

## 🎯 Common Use Cases

### 1. Image Analysis Chat
```javascript
// User uploads image and asks question
const imageFile = document.getElementById('image-input').files[0];
const fileId = await uploadFile(imageFile, sessionId);

await sendChatMessage("What's in this image?", [fileId]);
```

### 2. Document Upload
```javascript
// User uploads PDF and asks about content
const pdfFile = document.getElementById('pdf-input').files[0];
const fileId = await uploadFile(pdfFile, sessionId);

await sendChatMessage("Summarize this document", [fileId]);
```

### 3. Multiple Files
```javascript
// Upload multiple files at once
const files = Array.from(document.getElementById('multi-input').files);
const fileIds = await Promise.all(files.map(f => uploadFile(f, sessionId)));

await sendChatMessage("Analyze these files", fileIds);
```

### 4. Image Gallery
```javascript
// Display all images from chat history
function displayImageGallery(history) {
    const gallery = document.getElementById('gallery');
    
    history.forEach(msg => {
        if (msg.uploads) {
            msg.uploads.filter(u => u.is_image).forEach(image => {
                const img = document.createElement('img');
                img.src = image.thumbnail_url;
                img.onclick = () => window.open(image.url, '_blank');
                gallery.appendChild(img);
            });
        }
    });
}
```

## 📱 Mobile Considerations

### Camera Capture
```html
<!-- Mobile camera capture -->
<input type="file" accept="image/*" capture="environment">
<input type="file" accept="image/*" capture="user">
```

### Responsive Images
```css
.image-thumbnail {
    max-width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: cover;
}

@media (max-width: 768px) {
    .image-thumbnail {
        max-height: 150px;
    }
}
```

## 🔍 Debugging Tips

### Network Debugging
```javascript
// Log all API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('API Call:', args[0], args[1]);
    return originalFetch.apply(this, args)
        .then(response => {
            console.log('API Response:', response.status, response.url);
            return response;
        });
};
```

### File Upload Progress
```javascript
function uploadWithProgress(file, sessionId, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress((e.loaded / e.total) * 100);
            }
        };
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(JSON.parse(xhr.responseText).file_id);
            } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
            }
        };
        
        xhr.open('POST', '/api/v1/chat/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
        xhr.send(formData);
    });
}
```

## ⚡ Performance Tips

### Lazy Loading
```javascript
// Lazy load images when they come into view
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            observer.unobserve(img);
        }
    });
});

document.querySelectorAll('img[data-src]').forEach(img => {
    observer.observe(img);
});
```

### Image Compression
```javascript
function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}
```

---

## 📚 Framework Examples

### React Hook
```javascript
import { useState, useCallback } from 'react';

export function useFileUpload(sessionId) {
    const [uploading, setUploading] = useState(false);
    
    const uploadFile = useCallback(async (file) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('session_id', sessionId);
            
            const response = await fetch('/api/v1/chat/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            
            if (!response.ok) throw new Error('Upload failed');
            return (await response.json()).file_id;
        } finally {
            setUploading(false);
        }
    }, [sessionId]);
    
    return { uploadFile, uploading };
}
```

### Vue Composable
```javascript
import { ref } from 'vue';

export function useFileUpload(sessionId) {
    const uploading = ref(false);
    
    const uploadFile = async (file) => {
        uploading.value = true;
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('session_id', sessionId);
            
            const response = await fetch('/api/v1/chat/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            
            if (!response.ok) throw new Error('Upload failed');
            return (await response.json()).file_id;
        } finally {
            uploading.value = false;
        }
    };
    
    return { uploadFile, uploading };
}
```

## 🔷 TypeScript Examples

### Type Definitions
```typescript
// types/api.ts
export interface FileUpload {
    file_id: string;
    name: string;
    mime: string;
    size: number;
    is_image: boolean;
    url: string;
    download_url: string;
    thumbnail_url: string;
    thumbnail_small: string;
    thumbnail_medium: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    uploads?: FileUpload[];
}

export interface UploadResponse {
    file_id: string;
    message: string;
}
```

### TypeScript Service Class
```typescript
// services/ChatService.ts
export class ChatService {
    constructor(private baseUrl: string, private token: string) {}

    async uploadFile(file: File, sessionId: string): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);

        const response = await fetch(`${this.baseUrl}/api/v1/chat/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return response.json();
    }

    async getChatHistory(sessionId: string): Promise<{ history: ChatMessage[] }> {
        const response = await fetch(`${this.baseUrl}/api/v1/chat/sessions/${sessionId}/history`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        if (!response.ok) {
            throw new Error(`Failed to load history: ${response.statusText}`);
        }

        return response.json();
    }
}
```

### TypeScript React Hook
```typescript
// hooks/useFileUpload.ts
import { useState, useCallback } from 'react';
import { ChatService } from '../services/ChatService';

interface UseFileUploadResult {
    uploadFile: (file: File, sessionId: string) => Promise<string>;
    uploading: boolean;
    error: string | null;
}

export function useFileUpload(chatService: ChatService): UseFileUploadResult {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = useCallback(async (file: File, sessionId: string): Promise<string> => {
        setUploading(true);
        setError(null);

        try {
            const response = await chatService.uploadFile(file, sessionId);
            return response.file_id;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setUploading(false);
        }
    }, [chatService]);

    return { uploadFile, uploading, error };
}
```

### TypeScript Vue Composable
```typescript
// composables/useFileUpload.ts
import { ref, readonly } from 'vue';
import { ChatService } from '../services/ChatService';

export function useFileUpload(chatService: ChatService) {
    const uploading = ref(false);
    const error = ref<string | null>(null);

    const uploadFile = async (file: File, sessionId: string): Promise<string> => {
        uploading.value = true;
        error.value = null;

        try {
            const response = await chatService.uploadFile(file, sessionId);
            return response.file_id;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            error.value = errorMessage;
            throw new Error(errorMessage);
        } finally {
            uploading.value = false;
        }
    };

    return {
        uploadFile,
        uploading: readonly(uploading),
        error: readonly(error)
    };
}
```

### TypeScript React Component
```typescript
// components/FileUpload.tsx
import React, { useState } from 'react';
import { ChatService } from '../services/ChatService';
import { useFileUpload } from '../hooks/useFileUpload';

interface FileUploadProps {
    chatService: ChatService;
    sessionId: string;
    onFilesUploaded: (fileIds: string[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
    chatService, 
    sessionId, 
    onFilesUploaded 
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const { uploadFile, uploading, error } = useFileUpload(chatService);

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        try {
            const fileIds: string[] = [];
            for (const file of selectedFiles) {
                const fileId = await uploadFile(file, sessionId);
                fileIds.push(fileId);
            }
            onFilesUploaded(fileIds);
            setSelectedFiles([]);
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    return (
        <div>
            <input
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                disabled={uploading}
            />
            <button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            {error && <div className="error">{error}</div>}
        </div>
    );
};
```

### File Validation with TypeScript
```typescript
// utils/validation.ts
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export const FILE_CONSTRAINTS = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'application/pdf'
    ] as const
} as const;

export function validateFile(file: File): ValidationResult {
    if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
        return { 
            valid: false, 
            error: `File size exceeds ${formatFileSize(FILE_CONSTRAINTS.MAX_SIZE)} limit` 
        };
    }

    if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type as any)) {
        return { 
            valid: false, 
            error: 'File type not supported' 
        };
    }

    return { valid: true };
}

function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
```

---

**💡 Remember**: Always validate files on both client and server side, handle errors gracefully, and provide user feedback during uploads!
