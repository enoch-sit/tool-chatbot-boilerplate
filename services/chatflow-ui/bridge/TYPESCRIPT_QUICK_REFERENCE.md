# 🔷 TypeScript Quick Reference: File Upload & Image Display

## 🎯 Essential Type Definitions

```typescript
// Core API Types
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

interface UploadResponse {
    file_id: string;
    message: string;
}

interface ChatHistory {
    history: ChatMessage[];
}

// Request Types
interface FileUploadRequest {
    file: File;
    session_id: string;
}

interface ChatMessageRequest {
    message: string;
    session_id: string;
    file_ids?: string[];
}
```

## 🔧 Service Class Implementation

```typescript
class ChatService {
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

    async sendMessage(request: ChatMessageRequest): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/v1/chat/predict-stream-store`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`Send message failed: ${response.statusText}`);
        }
    }

    async getChatHistory(sessionId: string): Promise<ChatHistory> {
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

## ⚛️ React TypeScript Hooks

### File Upload Hook
```typescript
import { useState, useCallback } from 'react';

interface UseFileUploadResult {
    uploadFile: (file: File, sessionId: string) => Promise<string>;
    uploading: boolean;
    error: string | null;
    progress: number;
}

export function useFileUpload(chatService: ChatService): UseFileUploadResult {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const uploadFile = useCallback(async (file: File, sessionId: string): Promise<string> => {
        setUploading(true);
        setError(null);
        setProgress(0);

        try {
            const response = await chatService.uploadFile(file, sessionId);
            setProgress(100);
            return response.file_id;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setUploading(false);
        }
    }, [chatService]);

    return { uploadFile, uploading, error, progress };
}
```

### Chat Hook
```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseChatResult {
    messages: ChatMessage[];
    sendMessage: (message: string, fileIds?: string[]) => Promise<void>;
    loading: boolean;
    error: string | null;
}

export function useChat(chatService: ChatService, sessionId: string): UseChatResult {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            const history = await chatService.getChatHistory(sessionId);
            setMessages(history.history);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load history');
        } finally {
            setLoading(false);
        }
    }, [chatService, sessionId]);

    const sendMessage = useCallback(async (message: string, fileIds?: string[]) => {
        try {
            setLoading(true);
            await chatService.sendMessage({ message, session_id: sessionId, file_ids: fileIds });
            await loadHistory();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [chatService, sessionId, loadHistory]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return { messages, sendMessage, loading, error };
}
```

## 🔷 Vue TypeScript Composables

### File Upload Composable
```typescript
import { ref, readonly } from 'vue';

export function useFileUpload(chatService: ChatService) {
    const uploading = ref(false);
    const error = ref<string | null>(null);
    const progress = ref(0);

    const uploadFile = async (file: File, sessionId: string): Promise<string> => {
        uploading.value = true;
        error.value = null;
        progress.value = 0;

        try {
            const response = await chatService.uploadFile(file, sessionId);
            progress.value = 100;
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
        error: readonly(error),
        progress: readonly(progress)
    };
}
```

### Chat Composable
```typescript
import { ref, readonly, onMounted } from 'vue';

export function useChat(chatService: ChatService, sessionId: string) {
    const messages = ref<ChatMessage[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const loadHistory = async () => {
        try {
            loading.value = true;
            const history = await chatService.getChatHistory(sessionId);
            messages.value = history.history;
            error.value = null;
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load history';
        } finally {
            loading.value = false;
        }
    };

    const sendMessage = async (message: string, fileIds?: string[]) => {
        try {
            loading.value = true;
            await chatService.sendMessage({ message, session_id: sessionId, file_ids: fileIds });
            await loadHistory();
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to send message';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    onMounted(loadHistory);

    return {
        messages: readonly(messages),
        loading: readonly(loading),
        error: readonly(error),
        sendMessage,
        loadHistory
    };
}
```

## 🛡️ Validation & Error Handling

### File Validation
```typescript
interface ValidationResult {
    valid: boolean;
    error?: string;
}

export const FILE_CONSTRAINTS = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain'
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
        return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

### Error Classes
```typescript
export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class ValidationError extends Error {
    constructor(
        message: string,
        public field: string,
        public value?: any
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class UploadError extends Error {
    constructor(
        message: string,
        public file: File,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'UploadError';
    }
}
```

## 🔍 Type Guards

```typescript
export function isChatMessage(obj: any): obj is ChatMessage {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.role === 'string' &&
        typeof obj.content === 'string' &&
        typeof obj.created_at === 'string'
    );
}

export function isFileUpload(obj: any): obj is FileUpload {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.file_id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.mime === 'string' &&
        typeof obj.size === 'number' &&
        typeof obj.is_image === 'boolean'
    );
}

export function hasUploads(message: ChatMessage): message is ChatMessage & { uploads: FileUpload[] } {
    return message.uploads !== undefined && message.uploads.length > 0;
}
```

## ⚛️ React Components

### File Upload Component
```typescript
import React, { useState, useRef } from 'react';

interface FileUploadProps {
    chatService: ChatService;
    sessionId: string;
    onFilesUploaded: (fileIds: string[]) => void;
    accept?: string;
    multiple?: boolean;
    maxFiles?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    chatService,
    sessionId,
    onFilesUploaded,
    accept = 'image/*,.pdf,.txt',
    multiple = true,
    maxFiles = 5
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const { uploadFile, uploading, error, progress } = useFileUpload(chatService);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        
        if (files.length > maxFiles) {
            alert(`Maximum ${maxFiles} files allowed`);
            return;
        }

        // Validate each file
        const validFiles: File[] = [];
        for (const file of files) {
            const validation = validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                alert(`${file.name}: ${validation.error}`);
            }
        }

        setSelectedFiles(validFiles);
    };

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
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    return (
        <div className="file-upload">
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileSelect}
                disabled={uploading}
            />
            
            {selectedFiles.length > 0 && (
                <div className="selected-files">
                    <h4>Selected Files:</h4>
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="file-item">
                            <span>{file.name}</span>
                            <span>({formatFileSize(file.size)})</span>
                        </div>
                    ))}
                    
                    <button onClick={handleUpload} disabled={uploading}>
                        {uploading ? `Uploading... ${progress}%` : 'Upload Files'}
                    </button>
                </div>
            )}
            
            {error && <div className="error">{error}</div>}
        </div>
    );
};
```

### Chat Message Component
```typescript
import React from 'react';

interface ChatMessageProps {
    message: ChatMessage;
    onImageClick?: (fileId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
    message, 
    onImageClick 
}) => {
    const handleImageClick = (fileId: string) => {
        if (onImageClick) {
            onImageClick(fileId);
        } else {
            // Default behavior - open in new tab
            window.open(`/api/v1/chat/files/${fileId}`, '_blank');
        }
    };

    return (
        <div className={`chat-message ${message.role}`}>
            <div className="message-content">{message.content}</div>
            
            {hasUploads(message) && (
                <div className="file-attachments">
                    {message.uploads.map((upload) => (
                        <div key={upload.file_id} className="file-item">
                            {upload.is_image ? (
                                <img
                                    src={upload.thumbnail_url}
                                    alt={upload.name}
                                    className="image-thumbnail"
                                    onClick={() => handleImageClick(upload.file_id)}
                                    style={{ cursor: 'pointer', maxWidth: '200px' }}
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
};
```

## 📱 Vue Components

### File Upload Vue Component
```vue
<template>
  <div class="file-upload">
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="handleFileSelect"
      :disabled="uploading"
    />
    
    <div v-if="selectedFiles.length > 0" class="selected-files">
      <h4>Selected Files:</h4>
      <div
        v-for="(file, index) in selectedFiles"
        :key="index"
        class="file-item"
      >
        <span>{{ file.name }}</span>
        <span>({{ formatFileSize(file.size) }})</span>
      </div>
      
      <button @click="handleUpload" :disabled="uploading">
        {{ uploading ? `Uploading... ${progress}%` : 'Upload Files' }}
      </button>
    </div>
    
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useFileUpload } from '../composables/useFileUpload';
import { ChatService } from '../services/ChatService';
import { validateFile, formatFileSize } from '../utils/validation';

interface Props {
  chatService: ChatService;
  sessionId: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
}

interface Emits {
  (event: 'files-uploaded', fileIds: string[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  accept: 'image/*,.pdf,.txt',
  multiple: true,
  maxFiles: 5
});

const emit = defineEmits<Emits>();

const fileInput = ref<HTMLInputElement>();
const selectedFiles = ref<File[]>([]);

const { uploadFile, uploading, error, progress } = useFileUpload(props.chatService);

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  
  if (files.length > props.maxFiles) {
    alert(`Maximum ${props.maxFiles} files allowed`);
    return;
  }

  const validFiles: File[] = [];
  for (const file of files) {
    const validation = validateFile(file);
    if (validation.valid) {
      validFiles.push(file);
    } else {
      alert(`${file.name}: ${validation.error}`);
    }
  }

  selectedFiles.value = validFiles;
};

const handleUpload = async () => {
  if (selectedFiles.value.length === 0) return;

  try {
    const fileIds: string[] = [];
    for (const file of selectedFiles.value) {
      const fileId = await uploadFile(file, props.sessionId);
      fileIds.push(fileId);
    }

    emit('files-uploaded', fileIds);
    selectedFiles.value = [];
    
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  } catch (err) {
    console.error('Upload failed:', err);
  }
};
</script>
```

## 🔗 Service Integration

### Complete Chat Service
```typescript
export class ChatService {
    private baseUrl: string;
    private token: string;

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error = new ApiError(
                response.statusText,
                response.status
            );
            
            try {
                const errorData = await response.json();
                error.details = errorData;
            } catch {
                // Response is not JSON
            }
            
            throw error;
        }

        return response.json();
    }

    async uploadFile(file: File, sessionId: string): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);

        const response = await fetch(`${this.baseUrl}/api/v1/chat/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: formData
        });

        return this.handleResponse<UploadResponse>(response);
    }

    async sendMessage(request: ChatMessageRequest): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/v1/chat/predict-stream-store`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        await this.handleResponse<void>(response);
    }

    async getChatHistory(sessionId: string): Promise<ChatHistory> {
        const response = await fetch(`${this.baseUrl}/api/v1/chat/sessions/${sessionId}/history`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        return this.handleResponse<ChatHistory>(response);
    }
}
```

## 🧪 Testing Utilities

### Mock Data Factories
```typescript
export function createMockChatMessage(overrides?: Partial<ChatMessage>): ChatMessage {
    return {
        id: 'test-message-id',
        role: 'user',
        content: 'Test message',
        created_at: new Date().toISOString(),
        uploads: [],
        ...overrides
    };
}

export function createMockFileUpload(overrides?: Partial<FileUpload>): FileUpload {
    return {
        file_id: 'test-file-id',
        name: 'test-image.jpg',
        mime: 'image/jpeg',
        size: 1024,
        is_image: true,
        url: '/api/v1/chat/files/test-file-id',
        download_url: '/api/v1/chat/files/test-file-id?download=true',
        thumbnail_url: '/api/v1/chat/files/test-file-id/thumbnail',
        thumbnail_small: '/api/v1/chat/files/test-file-id/thumbnail?size=100',
        thumbnail_medium: '/api/v1/chat/files/test-file-id/thumbnail?size=300',
        ...overrides
    };
}
```

### Jest Custom Matchers
```typescript
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidChatMessage(): R;
            toBeValidFileUpload(): R;
        }
    }
}

expect.extend({
    toBeValidChatMessage(received: any) {
        const pass = isChatMessage(received);
        return {
            message: () => `expected ${received} to be a valid ChatMessage`,
            pass
        };
    },
    
    toBeValidFileUpload(received: any) {
        const pass = isFileUpload(received);
        return {
            message: () => `expected ${received} to be a valid FileUpload`,
            pass
        };
    }
});
```

---

**💡 Pro Tips for TypeScript:**

1. **Use strict mode**: Enable `"strict": true` in `tsconfig.json`
2. **Leverage type guards**: Use `isChatMessage()` and `isFileUpload()` for runtime checks
3. **Handle errors properly**: Use custom error classes for better error handling
4. **Validate at boundaries**: Always validate data from external sources
5. **Use readonly for immutable data**: Mark arrays and objects as readonly where appropriate

📖 **For complete TypeScript documentation, see `TYPESCRIPT_INTEGRATION_GUIDE.md`**

---

## 🔍 Image Storage & Retrieval Analysis

### ✅ Findings Summary

**Question**: Can users get back images through `@router.get("/sessions/{session_id}/history")` if they were stored through `@router.post("/predict/stream/store")`?

**Answer**: **YES** - Images are fully stored and retrievable with rich metadata.

### 🗂️ How Image Storage Works

#### 1. **File Storage Process** (`/predict/stream/store`)
```typescript
// When a user sends a chat with image uploads
interface ChatRequest {
    question: string;
    session_id: string;
    chatflow_id: string;
    uploads?: FileUpload[];  // Images/files included here
}

// Backend stores files BEFORE streaming starts
// Files are saved to MongoDB GridFS with metadata
```

#### 2. **Database Schema**
```typescript
// FileUpload collection stores metadata
interface FileUploadRecord {
    file_id: string;           // GridFS ObjectId
    original_name: string;     // "screenshot.png"
    mime_type: string;         // "image/png"
    message_id: string;        // Links to ChatMessage
    session_id: string;        // Chat session
    user_id: string;           // File owner
    chatflow_id: string;       // Chatflow context
    file_size: number;         // Size in bytes
    upload_type: string;       // "file" or "url"
    processed: boolean;        // Processing status
    uploaded_at: Date;         // Timestamp
}

// ChatMessage stores file references
interface ChatMessageRecord {
    id: string;
    content: string;
    file_ids: string[];        // Array of file_id references
    has_files: boolean;        // Quick check flag
    role: 'user' | 'assistant';
    session_id: string;
    user_id: string;
    created_at: Date;
}
```

#### 3. **Image Retrieval Process** (`/sessions/{session_id}/history`)
```typescript
// Backend fetches ChatMessages for session
// For messages with has_files=true, it:
// 1. Queries FileUpload collection by file_ids
// 2. Builds rich file metadata for frontend
// 3. Includes URLs for display, download, and thumbnails

interface ChatHistoryResponse {
    history: ChatMessage[];
    count: number;
}

// Each ChatMessage.uploads contains:
interface FileUpload {
    file_id: string;
    name: string;              // Original filename
    mime: string;              // MIME type
    size: number;              // File size
    is_image: boolean;         // Auto-detected from MIME
    url: string;               // "/api/v1/chat/files/{file_id}"
    download_url: string;      // With ?download=true
    thumbnail_url: string;     // "/api/v1/chat/files/{file_id}/thumbnail"
    thumbnail_small: string;   // Thumbnail with size=100
    thumbnail_medium: string;  // Thumbnail with size=300
    uploaded_at: string;       // ISO timestamp
}
```

### 🔧 TypeScript Implementation

#### Complete Image Display Component
```typescript
interface ImageDisplayProps {
    message: ChatMessage;
    onImageClick?: (fileId: string) => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ message, onImageClick }) => {
    const handleImageClick = (fileId: string) => {
        if (onImageClick) {
            onImageClick(fileId);
        } else {
            // Default: open full-size image
            window.open(`/api/v1/chat/files/${fileId}`, '_blank');
        }
    };

    const renderUpload = (upload: FileUpload) => {
        if (upload.is_image) {
            return (
                <div className="image-container">
                    <img
                        src={upload.thumbnail_url}
                        alt={upload.name}
                        onClick={() => handleImageClick(upload.file_id)}
                        className="image-thumbnail"
                        loading="lazy"
                    />
                    <div className="image-info">
                        <span>{upload.name}</span>
                        <span>{formatFileSize(upload.size)}</span>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="file-container">
                    <a
                        href={upload.download_url}
                        download={upload.name}
                        className="file-download"
                    >
                        📄 {upload.name}
                    </a>
                    <div className="file-info">
                        {formatFileSize(upload.size)} • {upload.mime}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="chat-message">
            <div className="message-content">{message.content}</div>
            {message.uploads && message.uploads.length > 0 && (
                <div className="file-attachments">
                    {message.uploads.map(upload => (
                        <div key={upload.file_id} className="upload-item">
                            {renderUpload(upload)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
```

#### Image Modal Component
```typescript
const ImageModal: React.FC<{
    fileId: string;
    filename: string;
    onClose: () => void;
}> = ({ fileId, filename, onClose }) => {
    return (
        <div className="image-modal-overlay" onClick={onClose}>
            <div className="image-modal" onClick={e => e.stopPropagation()}>
                <img
                    src={`/api/v1/chat/files/${fileId}`}
                    alt={filename}
                    className="modal-image"
                />
                <div className="modal-controls">
                    <a
                        href={`/api/v1/chat/files/${fileId}?download=true`}
                        download={filename}
                        className="download-btn"
                    >
                        Download
                    </a>
                    <button onClick={onClose} className="close-btn">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
```

### 🔄 Complete Workflow Example

```typescript
// 1. User uploads image and sends message
const sendMessageWithImage = async (message: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('session_id', sessionId);
    
    // Upload file first
    const uploadResponse = await fetch('/api/v1/chat/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    const { file_id } = await uploadResponse.json();
    
    // Send message with file reference
    await fetch('/api/v1/chat/predict-stream-store', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: message,
            session_id: sessionId,
            chatflow_id: chatflowId,
            uploads: [{
                type: 'file',
                data: await fileToBase64(imageFile),
                mime: imageFile.type,
                name: imageFile.name
            }]
        })
    });
};

// 2. Later, retrieve chat history with images
const loadChatHistory = async (sessionId: string) => {
    const response = await fetch(`/api/v1/chat/sessions/${sessionId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const { history } = await response.json();
    
    // history contains full file metadata including image URLs
    return history;
};

// 3. Display images in UI
const ChatHistory: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    useEffect(() => {
        loadChatHistory(sessionId).then(setMessages);
    }, [sessionId]);
    
    return (
        <div className="chat-history">
            {messages.map(message => (
                <ImageDisplay key={message.id} message={message} />
            ))}
        </div>
    );
};
```

### 🎯 Key Benefits

1. **Full Image Persistence**: Images are stored in MongoDB GridFS and linked to messages
2. **Rich Metadata**: Full file information including sizes, types, and timestamps
3. **Multiple Display Options**: Thumbnails, full-size viewing, and download links
4. **Efficient Retrieval**: Single API call returns complete chat history with file metadata
5. **Security**: User-scoped access ensures users only see their own files
6. **Performance**: Thumbnail generation and caching for fast loading

### 📋 Available File Endpoints

```typescript
// Display image inline (respects browser caching)
GET /api/v1/chat/files/{file_id}

// Force download
GET /api/v1/chat/files/{file_id}?download=true

// Generate thumbnail (various sizes)
GET /api/v1/chat/files/{file_id}/thumbnail
GET /api/v1/chat/files/{file_id}/thumbnail?size=100
GET /api/v1/chat/files/{file_id}/thumbnail?size=300
```

**✅ Conclusion**: The system provides complete image storage and retrieval capabilities with rich metadata and multiple display options.

---

**💡 Pro Tips for TypeScript:**

1. **Use strict mode**: Enable `"strict": true` in `tsconfig.json`
2. **Leverage type guards**: Use `isChatMessage()` and `isFileUpload()` for runtime checks
3. **Handle errors properly**: Use custom error classes for better error handling
4. **Validate at boundaries**: Always validate data from external sources
5. **Use readonly for immutable data**: Mark arrays and objects as readonly where appropriate

📖 **For complete TypeScript documentation, see `TYPESCRIPT_INTEGRATION_GUIDE.md`**
