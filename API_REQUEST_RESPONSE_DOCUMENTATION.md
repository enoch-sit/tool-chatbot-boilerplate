# Flowise Chatbot Boilerplate API Documentation

## Overview

This document provides comprehensive documentation for both the backend (flowise-proxy-service-py) and frontend (chatflow-ui) request/response formats in the Flowise Chatbot Boilerplate system.

## Architecture

The system consists of:
- **Backend**: FastAPI-based proxy service (`flowise-proxy-service-py`)
- **Frontend**: React/TypeScript UI (`chatflow-ui`)
- **External**: Flowise instance for AI chat processing

---

## Backend API (flowise-proxy-service-py)

### Authentication Endpoints

#### POST `/api/v1/chat/authenticate`

Authenticate user and receive JWT tokens.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "enduser",
    "permissions": ["chat", "file_upload"]
  },
  "message": "Login successful"
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "detail": "Invalid credentials"
}

// 500 Server Error
{
  "detail": "Authentication failed: <error_message>"
}
```

#### POST `/api/v1/chat/refresh`

Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

#### POST `/api/v1/chat/revoke`

Revoke refresh tokens (requires authentication).

**Request:**
```json
{
  "token_id": "optional_specific_token_id",
  "all_tokens": false
}
```

**Response:**
```json
{
  "message": "Token revoked successfully",
  "revoked_tokens": 1
}
```

---

### Chatflow Endpoints

#### GET `/api/v1/chatflows/my-chatflows`

Get chatflows accessible to the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": "chatflow_flowise_id",
    "name": "Customer Support Agent",
    "description": "AI agent for customer support",
    "category": "support",
    "type": "CHATFLOW",
    "deployed": true,
    "assigned_at": "2023-10-01T10:00:00Z"
  }
]
```

#### GET `/api/v1/chatflows/{chatflow_id}`

Get specific chatflow details (requires access permission).

**Response:**
```json
{
  "id": "chatflow_flowise_id",
  "name": "Customer Support Agent",
  "description": "AI agent for customer support",
  "category": "support",
  "type": "CHATFLOW",
  "deployed": true,
  "created": "2023-10-01T08:00:00Z",
  "updated": "2023-10-01T09:00:00Z"
}
```

---

### Chat Prediction Endpoints

#### POST `/api/v1/chat/predict/stream/store`

Send message with streaming response and store conversation history.

**Request:**
```json
{
  "question": "Hello, how can you help me?",
  "chatflow_id": "chatflow_flowise_id",
  "sessionId": "optional_session_uuid",
  "overrideConfig": {
    "sessionId": "session_uuid"
  },
  "history": [
    {
      "role": "user",
      "content": "Previous message"
    }
  ],
  "uploads": [
    {
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
      "type": "file",
      "name": "image.jpg",
      "mime": "image/jpeg"
    }
  ]
}
```

**Response (Stream):**

The endpoint returns Server-Sent Events (SSE) stream:

```
// Session ID event (first)
{"event":"session_id","data":"550e8400-e29b-41d4-a716-446655440000","chatflow_id":"chatflow_id","timestamp":"2023-10-01T10:00:00Z","status":"streaming_started"}

// File upload confirmation (if files uploaded)
{"event":"files_uploaded","data":{"file_count":1,"files":[{"file_id":"file_uuid","name":"image.jpg","size":102400,"type":"image/jpeg"}]},"timestamp":"2023-10-01T10:00:01Z"}

// Token events (streaming response)
{"event":"token","data":"Hello"}
{"event":"token","data":" there"}
{"event":"token","data":"!"}

// Metadata events
{"event":"usageMetadata","data":{"tokens":{"input":10,"output":25,"total":35}}}

// End event
{"event":"end","data":""}
```

#### POST `/api/v1/chat/predict/stream`

Raw streaming without storing conversation (lighter endpoint).

**Request:** Same as `/predict/stream/store`

**Response:** Raw stream chunks from Flowise

---

### Session Management Endpoints

#### GET `/api/v1/chat/sessions`

Get all chat sessions for the authenticated user.

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "chatflow_id": "chatflow_id",
      "topic": "Customer Support Inquiry",
      "created_at": "2023-10-01T10:00:00Z",
      "first_message": "Hello, I need help with..."
    }
  ],
  "count": 1
}
```

#### GET `/api/v1/chat/sessions/{session_id}/history`

Get chat history for a specific session.

**Response:**
```json
{
  "history": [
    {
      "id": "message_id",
      "role": "user",
      "content": "Hello, I need help",
      "created_at": "2023-10-01T10:00:00Z",
      "session_id": "session_uuid",
      "file_ids": ["file_uuid"],
      "has_files": true,
      "uploads": [
        {
          "file_id": "file_uuid",
          "name": "document.pdf",
          "mime": "application/pdf",
          "size": 102400,
          "type": "file",
          "url": "/api/v1/chat/files/file_uuid",
          "download_url": "/api/v1/chat/files/file_uuid?download=true",
          "is_image": false,
          "uploaded_at": "2023-10-01T10:00:00Z"
        }
      ]
    },
    {
      "id": "message_id_2",
      "role": "assistant",
      "content": "[{\"event\":\"token\",\"data\":\"I'd be happy to help you!\"}]",
      "created_at": "2023-10-01T10:00:05Z",
      "session_id": "session_uuid",
      "file_ids": [],
      "has_files": false,
      "uploads": []
    }
  ],
  "count": 2
}
```

#### DELETE `/api/v1/chat/sessions/{session_id}`

Delete a specific session and all its messages.

**Response:**
```json
{
  "message": "Session 550e8400-e29b-41d4-a716-446655440000 and its messages have been deleted.",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "messages_deleted": 15,
  "user_id": "user_id"
}
```

#### DELETE `/api/v1/chat/history`

Delete all chat history for the authenticated user.

**Response:**
```json
{
  "message": "All chat history has been deleted.",
  "sessions_deleted": 5,
  "messages_deleted": 50,
  "user_id": "user_id"
}
```

---

### File Management Endpoints

#### GET `/api/v1/chat/files/{file_id}`

Get a file by ID.

**Query Parameters:**
- `download` (boolean): Set to true for download, false for inline display

**Response:** Binary file content with appropriate headers

#### GET `/api/v1/chat/files/{file_id}/thumbnail`

Get thumbnail/preview of an image file.

**Query Parameters:**
- `size` (integer): Thumbnail size (default: 200px)

**Response:** Binary image content (JPEG/PNG)

#### GET `/api/v1/chat/files/session/{session_id}`

Get all files for a chat session.

**Response:**
```json
{
  "session_id": "session_uuid",
  "files": [
    {
      "file_id": "file_uuid",
      "original_name": "document.pdf",
      "mime_type": "application/pdf",
      "file_size": 102400,
      "upload_type": "file",
      "uploaded_at": "2023-10-01T10:00:00Z",
      "processed": true,
      "metadata": {"page_count": 5}
    }
  ]
}
```

#### DELETE `/api/v1/chat/files/{file_id}`

Delete a file.

**Response:**
```json
{
  "message": "File deleted successfully",
  "file_id": "file_uuid"
}
```

---

### Credits Endpoint

#### GET `/api/v1/chat/credits`

Get user's current credit balance.

**Response:**
```json
{
  "credits": 100
}
```

---

### Admin Endpoints

#### POST `/api/v1/admin/chatflows/sync`

Sync chatflows from Flowise (admin only).

**Response:**
```json
{
  "total_fetched": 10,
  "created": 3,
  "updated": 5,
  "deleted": 1,
  "errors": 1,
  "error_details": [
    {
      "error": "Invalid chatflow format",
      "chatflow_id": "invalid_id"
    }
  ]
}
```

#### GET `/api/v1/admin/chatflows/stats`

Get chatflow statistics.

**Response:**
```json
{
  "total": 20,
  "active": 18,
  "deleted": 1,
  "error": 1,
  "last_sync": "2023-10-01T10:00:00Z"
}
```

#### POST `/api/v1/admin/chatflows/{flowise_id}/users`

Add user to chatflow.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "email": "user@example.com",
  "status": "Assigned",
  "message": "User successfully assigned to the chatflow."
}
```

#### GET `/api/v1/admin/chatflows/{flowise_id}/users`

List users assigned to a chatflow.

**Response:**
```json
[
  {
    "username": "john_doe",
    "email": "john@example.com",
    "external_user_id": "ext_user_id",
    "assigned_at": "2023-10-01T10:00:00Z"
  }
]
```

---

## Frontend API Client (chatflow-ui)

### Authentication Service

**Login:**
```typescript
interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  user: User;
  role?: 'admin' | 'supervisor' | 'enduser' | 'user';
}

const login = async (credentials: LoginCredentials): Promise<LoginResponse>
```

**Token Refresh:**
```typescript
const refreshToken = async (token: string): Promise<LoginResponse>
```

### Chat Service

**Stream Chat with Storage:**
```typescript
interface FileUploadData {
  data: string; // Data URL format
  name: string;
  type: string; // MIME type
}

const streamChatAndStore = async (
  chatflow_id: string,
  session_id: string,
  question: string,
  onStreamEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void,
  files?: FileUploadData[]
): Promise<void>
```

**File Upload:**
```typescript
interface UploadResponse {
  file_id: string;
  message: string;
}

const uploadFile = async (file: File, sessionId: string): Promise<UploadResponse>
```

### Chatflows Service

**Get My Chatflows:**
```typescript
interface Chatflow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  deployed: boolean;
  is_public?: boolean;
  assigned_at?: string;
}

const getMyChatflows = async (): Promise<Chatflow[]>
```

### TypeScript Interfaces

#### Stream Events
```typescript
// Token event (streaming text)
interface TokenEvent {
  event: 'token';
  data: string;
}

// Session ID event (first event in stream)
interface SessionIdEvent {
  event: 'session_id';
  data: string;
}

// Content event (structured response)
interface ContentEvent {
  event: 'content';
  data: {
    content: string;
    timeMetadata?: {
      start: number;
      end: number;
      delta: number;
    };
    usageMetadata?: unknown;
    calledTools?: unknown[];
  };
}

// End event (stream completion)
interface EndEvent {
  event: 'end';
  data: string;
}

// Union of all stream events
type StreamEvent = TokenEvent | SessionIdEvent | ContentEvent | EndEvent | ...;
```

#### Chat Messages
```typescript
interface Message {
  id?: string;
  session_id?: string;
  role?: 'user' | 'assistant' | 'system' | 'agent';
  sender: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  streamEvents?: StreamEvent[];
  liveEvents?: StreamEvent[];
  isStreaming?: boolean;
  uploads?: FileUpload[];
  timeMetadata?: {
    start: number;
    end: number;
    delta: number;
  };
}
```

#### Chat Sessions
```typescript
interface ChatSession {
  session_id: string;
  topic: string;
  created_at: string;
  chatflow_id: string;
  user_id?: string;
}
```

#### File Uploads
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
```

---

## Error Handling

### Backend Error Responses

**Standard Error Format:**
```json
{
  "detail": "Error message description"
}
```

**Common HTTP Status Codes:**
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (invalid/missing auth)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (duplicate resource)
- `422`: Unprocessable Entity (validation error)
- `500`: Internal Server Error

### Frontend Error Handling

**API Error Interface:**
```typescript
interface ApiError {
  message: string;
  status: number;
  details?: Record<string, any>;
}
```

**HTTP Client Configuration:**
- Automatic token refresh on 401 responses
- Request retry with new tokens
- Automatic logout on refresh failure
- Request/response interceptors for auth

---

## Authentication Flow

### Initial Login
1. Frontend sends credentials to `/api/v1/chat/authenticate`
2. Backend validates with external auth service
3. Backend returns JWT access and refresh tokens
4. Frontend stores tokens and user info
5. Frontend includes access token in all subsequent requests

### Token Refresh
1. Backend returns 401 on expired token
2. Frontend interceptor catches 401
3. Frontend calls `/api/v1/chat/refresh` with refresh token
4. Backend returns new tokens
5. Frontend retries original request with new tokens

### Request Authorization
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## File Upload Flow

### Frontend to Backend
1. User selects files in UI
2. Files converted to base64 data URLs
3. Files included in chat request as `uploads` array
4. Backend processes and stores files
5. Backend returns file metadata in response

### File Format in Requests
```typescript
{
  data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  type: "file",
  name: "image.jpg",
  mime: "image/jpeg"
}
```

### File Storage
- Files stored in MongoDB GridFS
- Metadata stored in separate collection
- Files linked to messages via `file_ids`
- Thumbnails generated for images
- Access control by user ownership

---

## Streaming Chat Flow

### Request Flow
1. Frontend calls `streamChatAndStore()`
2. Backend validates user access to chatflow
3. Backend checks and deducts user credits
4. Backend forwards request to Flowise
5. Backend streams response back to frontend
6. Backend stores conversation in database

### Stream Event Processing
1. `session_id` event (first) - establishes session
2. `files_uploaded` event (if files) - confirms file processing
3. `token` events (streaming) - AI response chunks
4. `metadata` events - usage stats, tools called
5. `end` event (last) - stream completion

### Frontend Stream Handling
```typescript
// Stream parser processes chunks
const streamParser = new StreamParser(onStreamEvent, onError);

// Each chunk is parsed for JSON events
streamParser.processChunk(chunk);

// Events trigger UI updates
onStreamEvent({
  event: 'token',
  data: 'Hello'
});
```

---

## Configuration

### Backend Environment Variables
```env
# Flowise Configuration
FLOWISE_API_URL=https://flowise-instance.com
FLOWISE_API_KEY=your_api_key

# JWT Configuration
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE_NAME=flowise_proxy

# External Services
EXTERNAL_AUTH_URL=http://auth-service:3000
ACCOUNTING_SERVICE_URL=http://accounting-service:3001
```

### Frontend Environment Variables
```env
VITE_FLOWISE_PROXY_API_URL=http://localhost:8000
VITE_API_TIMEOUT=120000
```

---

## Rate Limiting & Credits

### Credit System
- Each chatflow has an associated cost
- User credits are checked before processing
- Credits deducted on successful completion
- Failed requests may not deduct credits
- Credit balance available via `/api/v1/chat/credits`

### Request Timeouts
- Chat predictions: 180 seconds (3 minutes)
- File uploads: Standard HTTP timeout
- API requests: 120 seconds (frontend)
- Stream processing: No timeout (connection-based)

---

## Security Considerations

### Authentication
- JWT tokens with separate access/refresh secrets
- Token expiration: Access (15 min), Refresh (7 days)
- Automatic token refresh on client
- Secure token storage in client state

### Authorization
- User-specific chatflow access control
- File access limited to uploading user
- Admin endpoints require admin role
- Session isolation per user

### Data Privacy
- Files stored with user ownership
- Messages linked to specific users
- Session data isolated per user
- Automatic cleanup options available

---

This documentation covers the complete request/response formats for both backend and frontend components of the Flowise Chatbot Boilerplate system. The system provides robust authentication, streaming chat capabilities, file handling, and comprehensive session management.