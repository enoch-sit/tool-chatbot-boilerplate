# Chat Service Endpoints and Interfaces

## API Endpoints

| Method | Endpoint | Description | Access Level | Request Body | Response |
|--------|----------|-------------|--------------|--------------|----------|
| POST | `/api/chat/sessions` | Create a new chat session | Authenticated | `{ title?: string, initialMessage?: string, modelId?: string }` | `{ sessionId: string, title: string, createdAt: string }` |
| GET | `/api/chat/sessions/:sessionId` | Get chat session details | Authenticated | - | `{ sessionId: string, title: string, messages: array, modelId: string, createdAt: string, updatedAt: string, metadata: object }` |
| GET | `/api/chat/sessions` | List chat sessions for user | Authenticated | Query params: `page`, `limit` | `{ sessions: array, pagination: object }` |
| DELETE | `/api/chat/sessions/:sessionId` | Delete a chat session | Authenticated | - | `{ message: string, sessionId: string }` |
| POST | `/api/chat/sessions/:sessionId/messages` | Send a message (non-streaming) | Authenticated | `{ message: string, modelId?: string }` | `{ message: string, sessionId: string }` |
| GET | `/api/chat/sessions/:sessionId/messages` | Get messages for a session | Authenticated | - | `{ messages: array }` |
| POST | `/api/chat/sessions/:sessionId/stream` | Stream chat response | Authenticated | `{ message: string, modelId?: string }` | SSE Stream |
| POST | `/api/chat/sessions/:sessionId/update-stream` | Update chat with stream response | Authenticated | `{ completeResponse: string, streamingSessionId: string, tokensUsed: number }` | `{ message: string, sessionId: string, tokensUsed: number }` |
| GET | `/api/chat/sessions/:sessionId/observe` | Observe an active session | Admin/Supervisor | - | SSE Stream |
| GET | `/health` | Health check endpoint | Public | - | `{ status: string, service: string, version: string, timestamp: string }` |
| GET | `/api/models` | Get available models | Authenticated | - | `{ models: array }` |
| POST | `/api/models/recommend` | Get model recommendation | Authenticated | `{ task: string, priority: string }` | `{ recommendedModel: string, reason: string }` |
| GET | `/metrics` | Prometheus metrics endpoint | Internal | - | Metrics in Prometheus format |

## Interface Definitions

### Chat Session Interface

```typescript
interface IChatSession {
  _id: string;
  userId: string;
  title: string;
  messages: IMessage[];
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    streamingSessionId?: string;
    lastTokensUsed?: number;
    totalTokensUsed?: number;
    activeStreamingSession?: boolean;
    [key: string]: any;
  };
}
```

### Message Interface

```typescript
interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
```

### Streaming Session Interface

```typescript
interface IStreamingSession {
  sessionId: string;
  userId: string;
  modelId: string;
  estimatedCredits: number;
  allocatedCredits: number;
  usedCredits: number;
  status: 'active' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}
```

### Model Interface

```typescript
interface IModel {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  creditCost: number;
  maxTokens: number;
  available: boolean;
}
```

### SSE Event Types

| Event Type | Description | Data Format |
|------------|-------------|------------|
| `chunk` | Text chunk from model response | `{ text: string, tokens: number, totalTokens: number }` |
| `complete` | Streaming completed | `{ status: "complete", tokens: number, sessionId: string }` |
| `error` | Error during streaming | `{ error: string, code?: string }` |
| `model` | Model information | `{ model: string, fallbackApplied: boolean }` |
| `observer` | Observer-specific messages | `{ message: string }` |

### Request and Response Examples

#### Create Chat Session

Request:
```json
POST /api/chat/sessions
{
  "title": "Discussing AI Ethics",
  "initialMessage": "What are the key ethical considerations in AI development?",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"
}
```

Response:
```json
{
  "sessionId": "64a7b3e2c12d8f9e45678901",
  "title": "Discussing AI Ethics",
  "createdAt": "2025-05-02T15:23:45.678Z"
}
```

#### Stream Chat Response

Request:
```json
POST /api/chat/sessions/64a7b3e2c12d8f9e45678901/stream
{
  "message": "How do we ensure AI systems are fair and unbiased?",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"
}
```

Response (SSE Stream):
```
event: model
data: {"model":"anthropic.claude-3-sonnet-20240229-v1:0","fallbackApplied":false}

event: chunk
data: {"text":"Ensuring fairness and reducing bias in AI systems requires a comprehensive approach across the entire AI lifecycle. Here are key strategies:","tokens":24,"totalTokens":24}

event: chunk
data: {"text":"\n\n1. Diverse and representative training data: Ensure your datasets include a wide range of demographics and scenarios.","tokens":20,"totalTokens":44}

...additional chunks...

event: complete
data: {"status":"complete","tokens":356,"sessionId":"stream-1651512345-a1b2c3"}
```

#### Update Chat with Stream Response

Request:
```json
POST /api/chat/sessions/64a7b3e2c12d8f9e45678901/update-stream
{
  "completeResponse": "Ensuring fairness and reducing bias in AI systems requires a comprehensive approach across the entire AI lifecycle. Here are key strategies:\n\n1. Diverse and representative training data: Ensure your datasets include a wide range of demographics and scenarios.\n\n...[full response]...",
  "streamingSessionId": "stream-1651512345-a1b2c3",
  "tokensUsed": 356
}
```

Response:
```json
{
  "message": "Chat session updated successfully",
  "sessionId": "64a7b3e2c12d8f9e45678901",
  "tokensUsed": 356
}
```