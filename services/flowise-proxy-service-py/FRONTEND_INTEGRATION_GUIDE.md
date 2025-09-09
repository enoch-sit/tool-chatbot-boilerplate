# Frontend Integration Guide: File Upload and Image Display

This guide explains how to integrate file upload and image display functionality into your frontend application using the enhanced chat API.

## Table of Contents

1. [Authentication](#authentication)
2. [File Upload Process](#file-upload-process)
3. [Sending Chat Messages with Files](#sending-chat-messages-with-files)
4. [Retrieving Chat History with Files](#retrieving-chat-history-with-files)
5. [Displaying Images and Files](#displaying-images-and-files)
6. [Complete Examples](#complete-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## Authentication

All API calls require JWT authentication. Include the token in the Authorization header:

```javascript
const headers = {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
};
```

## File Upload Process

### Step 1: Upload File to Server

Files must be uploaded before sending a chat message. The upload endpoint returns a file ID that you'll use in the chat message.

#### API Endpoint
```
POST /api/v1/chat/upload
```

#### JavaScript Example
```javascript
async function uploadFile(file, sessionId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    
    try {
        const response = await fetch('/api/v1/chat/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`
                // Don't set Content-Type for FormData - browser will set it automatically
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.file_id;
    } catch (error) {
        console.error('File upload error:', error);
        throw error;
    }
}
```

#### HTML File Input
```html
<input type="file" id="fileInput" accept="image/*,application/pdf,.txt,.doc,.docx" multiple>
<button onclick="handleFileUpload()">Upload Files</button>
```

#### File Upload Handler
```javascript
async function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    const sessionId = getCurrentSessionId(); // Your session management
    
    const uploadedFiles = [];
    
    for (let file of files) {
        try {
            // Validate file size (e.g., 10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                continue;
            }
            
            // Upload file
            const fileId = await uploadFile(file, sessionId);
            uploadedFiles.push({
                file_id: fileId,
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            console.log(`Uploaded ${file.name} with ID: ${fileId}`);
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
        }
    }
    
    return uploadedFiles;
}
```

## Sending Chat Messages with Files

### Step 2: Send Chat Message with File IDs

After uploading files, include the file IDs in your chat message.

#### API Endpoint
```
POST /api/v1/chat/predict-stream-store
```

#### JavaScript Example
```javascript
async function sendChatMessage(message, fileIds = []) {
    const sessionId = getCurrentSessionId();
    
    const payload = {
        message: message,
        session_id: sessionId,
        file_ids: fileIds  // Array of file IDs from upload
    };
    
    try {
        const response = await fetch('/api/v1/chat/predict-stream-store', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Chat request failed: ${response.statusText}`);
        }
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (let line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data.trim() === '[DONE]') {
                        console.log('Stream completed');
                        return;
                    }
                    
                    try {
                        const jsonData = JSON.parse(data);
                        // Handle streaming response data
                        handleStreamingResponse(jsonData);
                    } catch (e) {
                        // Handle non-JSON data
                        console.log('Received:', data);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Chat message error:', error);
        throw error;
    }
}
```

#### Complete Upload and Send Flow
```javascript
async function uploadAndSendMessage() {
    const messageInput = document.getElementById('messageInput');
    const fileInput = document.getElementById('fileInput');
    
    try {
        // Step 1: Upload files if any
        let fileIds = [];
        if (fileInput.files.length > 0) {
            const uploadedFiles = await handleFileUpload();
            fileIds = uploadedFiles.map(f => f.file_id);
        }
        
        // Step 2: Send message with file IDs
        await sendChatMessage(messageInput.value, fileIds);
        
        // Step 3: Clear inputs
        messageInput.value = '';
        fileInput.value = '';
        
        // Step 4: Refresh chat history
        await loadChatHistory();
        
    } catch (error) {
        console.error('Error in upload and send:', error);
        alert('Failed to send message. Please try again.');
    }
}
```

## Retrieving Chat History with Files

### Step 3: Get Chat History with File Metadata

The enhanced chat history API returns file metadata including URLs for display.

#### API Endpoint
```
GET /api/v1/chat/sessions/{session_id}/history
```

#### JavaScript Example
```javascript
async function loadChatHistory(sessionId) {
    try {
        const response = await fetch(`/api/v1/chat/sessions/${sessionId}/history`, {
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load history: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.history;
    } catch (error) {
        console.error('Error loading chat history:', error);
        throw error;
    }
}
```

#### Response Format
```json
{
    "history": [
        {
            "id": "message_id_123",
            "role": "user",
            "content": "Can you analyze this image?",
            "created_at": "2025-07-17T10:30:00Z",
            "uploads": [
                {
                    "file_id": "6877691ec45ce76d3272e5ed",
                    "name": "screenshot.png",
                    "mime": "image/png",
                    "size": 245760,
                    "is_image": true,
                    "url": "/api/v1/chat/files/6877691ec45ce76d3272e5ed",
                    "download_url": "/api/v1/chat/files/6877691ec45ce76d3272e5ed?download=true",
                    "thumbnail_url": "/api/v1/chat/files/6877691ec45ce76d3272e5ed/thumbnail",
                    "thumbnail_small": "/api/v1/chat/files/6877691ec45ce76d3272e5ed/thumbnail?size=100",
                    "thumbnail_medium": "/api/v1/chat/files/6877691ec45ce76d3272e5ed/thumbnail?size=300"
                }
            ]
        },
        {
            "id": "message_id_124",
            "role": "assistant",
            "content": "I can see the image shows a screenshot of...",
            "created_at": "2025-07-17T10:30:15Z",
            "uploads": []
        }
    ]
}
```

## Displaying Images and Files

### Step 4: Render Chat Messages with Files

#### HTML Structure
```html
<div id="chatContainer"></div>
<div id="messageInput">
    <input type="text" id="messageText" placeholder="Type a message...">
    <input type="file" id="fileInput" multiple accept="image/*,application/pdf,.txt,.doc,.docx">
    <button onclick="uploadAndSendMessage()">Send</button>
</div>
```

#### CSS Styles
```css
.chat-message {
    margin-bottom: 20px;
    padding: 15px;
    border-radius: 8px;
}

.user-message {
    background-color: #e3f2fd;
    margin-left: 50px;
}

.assistant-message {
    background-color: #f5f5f5;
    margin-right: 50px;
}

.message-content {
    margin-bottom: 10px;
}

.file-attachments {
    margin-top: 10px;
}

.file-item {
    display: inline-block;
    margin-right: 10px;
    margin-bottom: 10px;
}

.image-thumbnail {
    max-width: 200px;
    max-height: 200px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid #ddd;
}

.image-thumbnail:hover {
    opacity: 0.8;
}

.file-download {
    display: inline-block;
    padding: 8px 12px;
    background-color: #2196f3;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 14px;
}

.file-download:hover {
    background-color: #1976d2;
}

.file-info {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
}
```

#### JavaScript Rendering
```javascript
function renderChatHistory(history) {
    const container = document.getElementById('chatContainer');
    container.innerHTML = '';
    
    history.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role}-message`;
        
        // Message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message.content;
        messageDiv.appendChild(contentDiv);
        
        // File attachments
        if (message.uploads && message.uploads.length > 0) {
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'file-attachments';
            
            message.uploads.forEach(upload => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file-item';
                
                if (upload.is_image) {
                    // Display image thumbnail
                    const img = document.createElement('img');
                    img.src = upload.thumbnail_url;
                    img.className = 'image-thumbnail';
                    img.alt = upload.name;
                    img.title = upload.name;
                    
                    // Click to view full image
                    img.onclick = () => openImageModal(upload);
                    
                    fileDiv.appendChild(img);
                    
                    // Image info
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'file-info';
                    infoDiv.textContent = `${upload.name} (${formatFileSize(upload.size)})`;
                    fileDiv.appendChild(infoDiv);
                    
                } else {
                    // Display file download link
                    const link = document.createElement('a');
                    link.href = upload.download_url;
                    link.className = 'file-download';
                    link.textContent = `📄 ${upload.name}`;
                    link.download = upload.name;
                    
                    fileDiv.appendChild(link);
                    
                    // File info
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'file-info';
                    infoDiv.textContent = `${formatFileSize(upload.size)} • ${upload.mime}`;
                    fileDiv.appendChild(infoDiv);
                }
                
                attachmentsDiv.appendChild(fileDiv);
            });
            
            messageDiv.appendChild(attachmentsDiv);
        }
        
        container.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function openImageModal(upload) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create image element
    const img = document.createElement('img');
    img.src = upload.url;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 8px;
    `;
    
    // Close modal on click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    // Add download button
    const downloadBtn = document.createElement('a');
    downloadBtn.href = upload.download_url;
    downloadBtn.download = upload.name;
    downloadBtn.textContent = 'Download';
    downloadBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: #2196f3;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 4px;
    `;
    
    modal.appendChild(img);
    modal.appendChild(downloadBtn);
    document.body.appendChild(modal);
}
```

## Complete Examples

### React Example

#### File Upload Component
```jsx
import React, { useState, useRef } from 'react';

const ChatComponent = () => {
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState([]);
    const [history, setHistory] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (selectedFiles) => {
        const sessionId = getCurrentSessionId();
        const uploadPromises = Array.from(selectedFiles).map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('session_id', sessionId);

            const response = await fetch('/api/v1/chat/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            return {
                file_id: result.file_id,
                name: file.name,
                size: file.size,
                type: file.type
            };
        });

        return await Promise.all(uploadPromises);
    };

    const sendMessage = async () => {
        if (!message.trim() && files.length === 0) return;

        setUploading(true);
        try {
            let fileIds = [];
            if (files.length > 0) {
                const uploadedFiles = await handleFileUpload(files);
                fileIds = uploadedFiles.map(f => f.file_id);
            }

            await sendChatMessage(message, fileIds);
            setMessage('');
            setFiles([]);
            fileInputRef.current.value = '';
            
            // Refresh history
            const newHistory = await loadChatHistory(getCurrentSessionId());
            setHistory(newHistory);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setUploading(false);
        }
    };

    const renderMessage = (msg) => (
        <div key={msg.id} className={`chat-message ${msg.role}-message`}>
            <div className="message-content">{msg.content}</div>
            {msg.uploads && msg.uploads.length > 0 && (
                <div className="file-attachments">
                    {msg.uploads.map(upload => (
                        <div key={upload.file_id} className="file-item">
                            {upload.is_image ? (
                                <img
                                    src={upload.thumbnail_url}
                                    alt={upload.name}
                                    className="image-thumbnail"
                                    onClick={() => window.open(upload.url, '_blank')}
                                />
                            ) : (
                                <a
                                    href={upload.download_url}
                                    download={upload.name}
                                    className="file-download"
                                >
                                    📄 {upload.name}
                                </a>
                            )}
                            <div className="file-info">
                                {upload.name} ({formatFileSize(upload.size)})
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="chat-container">
            <div className="chat-history">
                {history.map(renderMessage)}
            </div>
            
            <div className="chat-input">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                />
                
                <button onClick={sendMessage} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default ChatComponent;
```

### Vue.js Example

```vue
<template>
  <div class="chat-container">
    <div class="chat-history">
      <div
        v-for="message in history"
        :key="message.id"
        :class="`chat-message ${message.role}-message`"
      >
        <div class="message-content">{{ message.content }}</div>
        
        <div v-if="message.uploads && message.uploads.length > 0" class="file-attachments">
          <div v-for="upload in message.uploads" :key="upload.file_id" class="file-item">
            <img
              v-if="upload.is_image"
              :src="upload.thumbnail_url"
              :alt="upload.name"
              class="image-thumbnail"
              @click="openImage(upload)"
            />
            <a
              v-else
              :href="upload.download_url"
              :download="upload.name"
              class="file-download"
            >
              📄 {{ upload.name }}
            </a>
            <div class="file-info">
              {{ upload.name }} ({{ formatFileSize(upload.size) }})
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chat-input">
      <input
        v-model="message"
        type="text"
        placeholder="Type a message..."
        @keyup.enter="sendMessage"
      />
      
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.doc,.docx"
        @change="handleFileChange"
      />
      
      <button @click="sendMessage" :disabled="uploading">
        {{ uploading ? 'Uploading...' : 'Send' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatComponent',
  data() {
    return {
      message: '',
      files: [],
      history: [],
      uploading: false
    };
  },
  methods: {
    async handleFileChange(event) {
      this.files = Array.from(event.target.files);
    },
    
    async sendMessage() {
      if (!this.message.trim() && this.files.length === 0) return;
      
      this.uploading = true;
      try {
        let fileIds = [];
        if (this.files.length > 0) {
          fileIds = await this.uploadFiles();
        }
        
        await this.sendChatMessage(this.message, fileIds);
        this.message = '';
        this.files = [];
        this.$refs.fileInput.value = '';
        
        await this.loadHistory();
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        this.uploading = false;
      }
    },
    
    async uploadFiles() {
      const sessionId = this.getCurrentSessionId();
      const uploadPromises = this.files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        
        const response = await fetch('/api/v1/chat/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.jwtToken}`
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.file_id;
      });
      
      return await Promise.all(uploadPromises);
    },
    
    openImage(upload) {
      window.open(upload.url, '_blank');
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
};
</script>
```

## Error Handling

### Common Error Scenarios

#### File Upload Errors
```javascript
async function uploadFileWithErrorHandling(file, sessionId) {
    try {
        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size exceeds 10MB limit');
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('File type not supported');
        }
        
        const fileId = await uploadFile(file, sessionId);
        return fileId;
        
    } catch (error) {
        // Handle specific error types
        if (error.message.includes('413')) {
            throw new Error('File too large');
        } else if (error.message.includes('415')) {
            throw new Error('File type not supported');
        } else if (error.message.includes('401')) {
            throw new Error('Authentication required');
        } else if (error.message.includes('500')) {
            throw new Error('Server error. Please try again.');
        }
        
        throw error;
    }
}
```

#### Network Error Handling
```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                // Don't retry on client errors (4xx)
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`Client error: ${response.status}`);
                }
                
                // Retry on server errors (5xx)
                if (i === maxRetries - 1) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                continue;
            }
            
            return response;
            
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

## Best Practices

### 1. File Validation
```javascript
function validateFile(file) {
    // Size validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    // Type validation
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'File type not supported' };
    }
    
    return { valid: true };
}
```

### 2. Progress Tracking
```javascript
function uploadFileWithProgress(file, sessionId, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                onProgress(percentComplete);
            }
        };
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText);
                resolve(result.file_id);
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        
        xhr.open('POST', '/api/v1/chat/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${jwtToken}`);
        xhr.send(formData);
    });
}
```

### 3. Image Optimization
```javascript
function resizeImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}
```

### 4. Lazy Loading for Images
```javascript
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}
```

### 5. Caching Strategy
```javascript
class FileCache {
    constructor(maxSize = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    get(fileId) {
        if (this.cache.has(fileId)) {
            // Move to end (most recently used)
            const value = this.cache.get(fileId);
            this.cache.delete(fileId);
            this.cache.set(fileId, value);
            return value;
        }
        return null;
    }
    
    set(fileId, data) {
        if (this.cache.size >= this.maxSize) {
            // Remove least recently used
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(fileId, data);
    }
}

const fileCache = new FileCache();
```

## Security Considerations

### 1. File Type Validation
Always validate file types both on client and server side:

```javascript
function isValidFileType(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    return allowedTypes.includes(file.type);
}

function hasValidExtension(filename) {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return allowedExtensions.includes(extension);
}
```

### 2. Content Security Policy
Configure CSP headers to prevent XSS attacks:

```javascript
// Add to your HTML head
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    img-src 'self' data: blob:;
    connect-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
">
```

### 3. Token Management
```javascript
class TokenManager {
    constructor() {
        this.token = localStorage.getItem('jwt_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }
    
    async getValidToken() {
        if (!this.token) {
            throw new Error('No token available');
        }
        
        // Check if token is expired
        const payload = JSON.parse(atob(this.token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            await this.refreshAccessToken();
        }
        
        return this.token;
    }
    
    async refreshAccessToken() {
        const response = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: this.refreshToken })
        });
        
        if (!response.ok) {
            throw new Error('Token refresh failed');
        }
        
        const data = await response.json();
        this.token = data.access_token;
        localStorage.setItem('jwt_token', this.token);
    }
}
```

This comprehensive guide provides everything a frontend developer needs to integrate file upload and image display functionality with your chat API. The examples cover vanilla JavaScript, React, and Vue.js implementations with proper error handling, security considerations, and best practices.

## 🔷 TypeScript Support

For TypeScript developers, we also provide a complete TypeScript Integration Guide (`TYPESCRIPT_INTEGRATION_GUIDE.md`) that includes:

### Type Definitions
```typescript
interface FileUpload {
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

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    uploads?: FileUpload[];
}
```

### TypeScript Service Classes
```typescript
class ChatService {
    async uploadFile(file: File, sessionId: string): Promise<UploadResponse> {
        // Fully typed implementation
    }
    
    async getChatHistory(sessionId: string): Promise<{ history: ChatMessage[] }> {
        // Fully typed implementation
    }
}
```

### TypeScript React/Vue Examples
Complete implementations with:
- **Custom hooks** with proper typing
- **Error handling** with custom error classes
- **Type guards** and validation utilities
- **Store management** with Pinia/TypeScript
- **Testing utilities** with mock factories

📖 **See `TYPESCRIPT_INTEGRATION_GUIDE.md` for complete TypeScript documentation**
