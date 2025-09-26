# Flowise Frontend Request/Response Format Documentation

## Overview

This document details the frontend request and response patterns for the Flowise chatbot UI client. The frontend communicates with both the flowise-proxy-service and directly with Flowise in some cases, handling authentication, streaming chat, file uploads, and session management.

---

## Frontend Architecture

**Technology Stack:**
- React with TypeScript
- Axios for HTTP requests
- Server-Sent Events for streaming
- Zustand for state management

**API Client Configuration:**
- Base URL: `VITE_FLOWISE_PROXY_API_URL` (default: http://localhost:8000)
- Timeout: `VITE_API_TIMEOUT` (default: 120000ms)
- Auto token refresh on 401 responses

---

## Authentication Flow

### Login Request

**Frontend Function:** `login(credentials)`

**Request Format:**
```typescript
interface LoginCredentials {
  username: string;
  password: string;
}

// Example usage
const credentials: LoginCredentials = {
  username: "john_doe",
  password: "secure_password"
};
```

**HTTP Request:**
```http
POST /api/v1/chat/authenticate
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password"  
}
```

**Response Handling:**
```typescript
interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  user: User;
  role?: 'admin' | 'supervisor' | 'enduser' | 'user';
}

interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}
```

### Token Refresh

**Frontend Function:** `refreshToken(token)`

**Implementation:**
```typescript
const refreshToken = async (token: string): Promise<LoginResponse> => {
  const response = await fetch('/api/v1/chat/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: token }),
  });
  return response.json();
};
```

**Automatic Refresh Logic:**
```typescript
// In axios interceptor
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  
  try {
    await useAuthStore.getState().refreshToken();
    const tokens = useAuthStore.getState().tokens;
    
    if (tokens?.accessToken) {
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    
    return apiClient(originalRequest);
  } catch (refreshError) {
    useAuthStore.getState().logout();
    return Promise.reject(refreshError);
  }
}
```

---

## Chatflow Management

### Get Available Chatflows

**Frontend Function:** `getMyChatflows()`

**Request:**
```typescript
const getMyChatflows = async (): Promise<Chatflow[]> => {
  const response = await apiClient.get('/api/v1/chatflows/my-chatflows');
  return response.data;
};
```

**Response Type:**
```typescript
interface Chatflow {
  id: string;              // Flowise chatflow ID
  name: string;            // Display name
  description?: string;    // Optional description
  category?: string;       // Chatflow category
  deployed: boolean;       // Deployment status
  is_public?: boolean;     // Public accessibility
  assigned_at?: string;    // User assignment date
}
```

**Example Response:**
```typescript
[
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Customer Support Agent",
    description: "AI-powered customer service assistant",
    category: "support",
    deployed: true,
    is_public: false,
    assigned_at: "2023-10-01T10:00:00Z"
  }
]
```

---

## Chat Streaming

### Stream Chat with Storage

**Frontend Function:** `streamChatAndStore()`

**Function Signature:**
```typescript
const streamChatAndStore = async (
  chatflow_id: string,
  session_id: string,
  question: string,
  onStreamEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void,
  files?: FileUploadData[]
): Promise<void>
```

**Request Format:**
```typescript
interface ChatRequest {
  chatflow_id: string;
  sessionId: string;      // Can be empty string for new sessions
  question: string;
  uploads?: FileUpload[];
  overrideConfig?: Record<string, any>;
  history?: ChatHistoryItem[];
}

// Example request body
const requestBody = {
  chatflow_id: "550e8400-e29b-41d4-a716-446655440000",
  sessionId: "session-uuid-or-empty-string",
  question: "How can I reset my password?",
  uploads: [
    {
      data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
      type: "file",
      name: "screenshot.jpg",
      mime: "image/jpeg"
    }
  ]
};
```

**HTTP Request:**
```http
POST /api/v1/chat/predict/stream/store
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "chatflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "",
  "question": "How can I reset my password?"
}
```

### Stream Event Processing

**Stream Event Types:**
```typescript
// Session ID Event (first event)
interface SessionIdEvent {
  event: 'session_id';
  data: string;
  chatflow_id: string;
  timestamp: string;
  status: 'streaming_started';
}

// File Upload Event
interface FilesUploadedEvent {
  event: 'files_uploaded';
  data: {
    file_count: number;
    files: Array<{
      file_id: string;
      name: string;
      size: number;
      type: string;
    }>;
  };
  timestamp: string;
}

// Token Event (streaming text)
interface TokenEvent {
  event: 'token';
  data: string;
}

// Content Event (structured response)
interface ContentEvent {
  event: 'content';
  data: {
    content: string;
    timeMetadata?: {
      start: number;
      end: number;
      delta: number;
    };
    usageMetadata?: any;
    calledTools?: any[];
  };
}

// End Event (stream completion)
interface EndEvent {
  event: 'end';
  data: string;
}

// Union type for all events
type StreamEvent = SessionIdEvent | FilesUploadedEvent | TokenEvent | ContentEvent | EndEvent;
```

**Stream Parser Implementation:**
```typescript
class StreamParser {
  constructor(
    private onStreamEvent: (event: StreamEvent) => void,
    private onError: (error: Error) => void
  ) {}

  processChunk(chunk: string): void {
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line);
          this.onStreamEvent(event);
        } catch (error) {
          // Handle malformed JSON
          this.onError(new Error(`Failed to parse stream chunk: ${line}`));
        }
      }
    }
  }
}
```

**Usage Example:**
```typescript
// Stream handler
const handleStreamEvent = (event: StreamEvent) => {
  switch (event.event) {
    case 'session_id':
      setCurrentSessionId(event.data);
      break;
      
    case 'files_uploaded':
      setUploadedFiles(event.data.files);
      break;
      
    case 'token':
      appendToCurrentMessage(event.data);
      break;
      
    case 'content':
      setFinalContent(event.data.content);
      setTimeMetadata(event.data.timeMetadata);
      break;
      
    case 'end':
      setIsStreaming(false);
      break;
  }
};

// Error handler
const handleStreamError = (error: Error) => {
  console.error('Stream error:', error);
  setIsStreaming(false);
  setError(error.message);
};

// Start streaming
await streamChatAndStore(
  chatflowId,
  sessionId,
  userMessage,
  handleStreamEvent,
  handleStreamError,
  selectedFiles
);
```

---

## File Handling

### File Upload Data Format

**Frontend File Processing:**
```typescript
interface FileUploadData {
  data: string;    // Data URL format: data:mime/type;base64,content
  name: string;    // Original filename
  type: string;    // MIME type
}

// File to data URL conversion
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Example usage
const processFiles = async (files: File[]): Promise<FileUploadData[]> => {
  const uploadData: FileUploadData[] = [];
  
  for (const file of files) {
    const dataURL = await fileToDataURL(file);
    uploadData.push({
      data: dataURL,
      name: file.name,
      type: file.type
    });
  }
  
  return uploadData;
};
```

### File Upload Request

**Direct Upload Function:**
```typescript
const uploadFile = async (file: File, sessionId: string): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const response = await fetch('/api/v1/chat/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData,
  });

  return response.json();
};
```

**Upload Response Type:**
```typescript
interface UploadResponse {
  file_id: string;
  message: string;
}
```

---

## Session Management

### Session List Request

**Frontend Function:**
```typescript
const getUserSessions = async (): Promise<SessionListResponse> => {
  const response = await apiClient.get('/api/v1/chat/sessions');
  return response.data;
};
```

**Response Type:**
```typescript
interface SessionListResponse {
  sessions: SessionSummary[];
  count: number;
}

interface SessionSummary {
  session_id: string;
  topic: string;
  created_at: string;
  chatflow_id: string;
  first_message?: string;
}
```

### Chat History Request

**Frontend Function:**
```typescript
const getChatHistory = async (sessionId: string): Promise<ChatHistoryResponse> => {
  const response = await apiClient.get(`/api/v1/chat/sessions/${sessionId}/history`);
  return response.data;
};
```

**Response Type:**
```typescript
interface ChatHistoryResponse {
  history: ChatMessage[];
  count: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  session_id: string;
  file_ids: string[];
  has_files: boolean;
  uploads: FileUpload[];
}
```

---

## Message State Management

### Message Interface

**Complete Message Type:**
```typescript
interface Message {
  id?: string;
  session_id?: string;
  role?: 'user' | 'assistant' | 'system' | 'agent';
  sender: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  streamEvents?: StreamEvent[];      // Stored events from history
  liveEvents?: StreamEvent[];       // Real-time streaming events
  isStreaming?: boolean;            // Currently streaming flag
  uploads?: FileUpload[];           // Attached files
  timeMetadata?: {
    start: number;
    end: number;
    delta: number;
  };
}
```

### State Updates During Streaming

**Streaming State Management:**
```typescript
// Message state during streaming
const [messages, setMessages] = useState<Message[]>([]);
const [currentStreamingMessage, setCurrentStreamingMessage] = useState<Message | null>(null);
const [isStreaming, setIsStreaming] = useState(false);

// Handle streaming events
const handleStreamEvent = (event: StreamEvent) => {
  switch (event.event) {
    case 'session_id':
      // Initialize new streaming message
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        session_id: event.data,
        role: 'assistant',
        sender: 'bot',
        content: '',
        isStreaming: true,
        liveEvents: [event],
        streamEvents: [],
        uploads: []
      };
      setCurrentStreamingMessage(newMessage);
      setIsStreaming(true);
      break;
      
    case 'token':
      // Append token to current message
      setCurrentStreamingMessage(prev => {
        if (!prev) return null;
        return {
          ...prev,
          content: prev.content + event.data,
          liveEvents: [...(prev.liveEvents || []), event]
        };
      });
      break;
      
    case 'end':
      // Finalize streaming message
      if (currentStreamingMessage) {
        const finalMessage = {
          ...currentStreamingMessage,
          isStreaming: false,
          streamEvents: currentStreamingMessage.liveEvents,
          liveEvents: []
        };
        setMessages(prev => [...prev, finalMessage]);
        setCurrentStreamingMessage(null);
      }
      setIsStreaming(false);
      break;
  }
};
```

---

## Error Handling

### Error Response Format

**Standard Error Interface:**
```typescript
interface ApiError {
  message: string;
  status: number;
  details?: Record<string, any>;
}
```

### Error Handling Patterns

**HTTP Error Handling:**
```typescript
// In API client
try {
  const response = await apiClient.post('/api/endpoint', data);
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    const apiError: ApiError = {
      message: error.response?.data?.detail || error.message,
      status: error.response?.status || 500,
      details: error.response?.data
    };
    throw apiError;
  }
  throw error;
}
```

**Stream Error Handling:**
```typescript
// Stream error handler
const handleStreamError = (error: Error) => {
  console.error('Stream error:', error);
  
  // Update UI to show error state
  setIsStreaming(false);
  setError(error.message);
  
  // Optionally retry or show user options
  if (error.message.includes('Authentication')) {
    // Redirect to login
    logout();
  }
};
```

**Connection Error Recovery:**
```typescript
// Retry logic for failed connections
const retryStream = async (attempts = 3): Promise<void> => {
  for (let i = 0; i < attempts; i++) {
    try {
      await streamChatAndStore(
        chatflowId,
        sessionId,
        question,
        handleStreamEvent,
        handleStreamError,
        files
      );
      return; // Success, exit retry loop
    } catch (error) {
      if (i === attempts - 1) throw error; // Last attempt failed
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

---

## Configuration and Environment

### Environment Variables

**Frontend Configuration:**
```typescript
// vite.config.ts or .env
interface Config {
  VITE_FLOWISE_PROXY_API_URL: string;  // Backend API URL
  VITE_API_TIMEOUT: number;            // Request timeout (ms)
  VITE_ENABLE_FILE_UPLOAD: boolean;    // File upload feature flag
  VITE_MAX_FILE_SIZE: number;          // Max file size (bytes)
  VITE_SUPPORTED_FILE_TYPES: string;   // Comma-separated MIME types
}
```

### API Client Configuration

**Axios Configuration:**
```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_FLOWISE_PROXY_API_URL || 'http://localhost:8000',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 120000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Stream Configuration

**Server-Sent Events Setup:**
```typescript
// Stream connection configuration
const streamConfig = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  },
  body: JSON.stringify(requestData)
};
```

---

## Performance Considerations

### Debouncing and Throttling

**Input Debouncing:**
```typescript
import { debounce } from 'lodash';

const debouncedSend = debounce(async (message: string) => {
  await streamChatAndStore(
    chatflowId,
    sessionId,
    message,
    handleStreamEvent,
    handleStreamError
  );
}, 300);
```

### Memory Management

**Large File Handling:**
```typescript
// Chunk large files for processing
const processLargeFile = async (file: File): Promise<FileUploadData> => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_SIZE / 1024 / 1024}MB`);
  }
  
  return {
    data: await fileToDataURL(file),
    name: file.name,
    type: file.type
  };
};
```

**Stream Buffer Management:**
```typescript
// Manage streaming message buffer
const MAX_STREAM_BUFFER = 1000; // Max events to keep in memory

const manageStreamBuffer = (events: StreamEvent[]): StreamEvent[] => {
  if (events.length > MAX_STREAM_BUFFER) {
    // Keep only recent events and important metadata
    const recentEvents = events.slice(-MAX_STREAM_BUFFER);
    return recentEvents;
  }
  return events;
};
```

---

This documentation covers the comprehensive frontend request/response patterns for the Flowise chatbot UI, including TypeScript interfaces, state management, streaming handling, and error recovery patterns.