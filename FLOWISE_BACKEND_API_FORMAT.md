# Flowise Backend API Request/Response Format Documentation

## Overview

This document details the request and response formats for direct communication with a Flowise instance. The flowise-proxy-service acts as an intermediary between clients and Flowise, so understanding the underlying Flowise API format is crucial.

---

## Flowise API Base Configuration

**Base URL Pattern:** `{FLOWISE_API_URL}/api/v1/`

**Authentication:** Bearer token (optional, depending on Flowise configuration)
```
Authorization: Bearer {FLOWISE_API_KEY}
```

**Content-Type:** `application/json`

---

## Chatflow Management

### List Chatflows

**Endpoint:** `GET /api/v1/chatflows`

**Request:**
```http
GET /api/v1/chatflows
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Response:**
```json
[
  {
    "id": "chatflow_uuid",
    "name": "Customer Support Agent",
    "description": "AI agent for customer support",
    "flowData": "{\"nodes\":[...],\"edges\":[...]}",
    "deployed": true,
    "isPublic": false,
    "category": "Customer Service",
    "type": "CHATFLOW",
    "apikeyid": "api_key_uuid",
    "chatbotConfig": "{\"welcomeMessage\":\"Hello!\"}",
    "apiConfig": "{\"rateLimit\":100}",
    "analytic": "{}",
    "speechToText": "{}",
    "createdDate": "2023-10-01T08:00:00.000Z",
    "updatedDate": "2023-10-01T09:00:00.000Z"
  }
]
```

### Get Specific Chatflow

**Endpoint:** `GET /api/v1/chatflows/{chatflow_id}`

**Request:**
```http
GET /api/v1/chatflows/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {api_key}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Support Agent",
  "description": "AI agent for customer support",
  "flowData": "{\"nodes\":[{\"id\":\"node1\",\"type\":\"llm\"}],\"edges\":[]}",
  "deployed": true,
  "isPublic": false,
  "category": "Customer Service",
  "type": "CHATFLOW",
  "apikeyid": "api_key_uuid",
  "chatbotConfig": "{\"welcomeMessage\":\"How can I help you today?\"}",
  "apiConfig": "{\"rateLimit\":100,\"timeout\":30000}",
  "analytic": "{}",
  "speechToText": "{}",
  "createdDate": "2023-10-01T08:00:00.000Z",
  "updatedDate": "2023-10-01T09:00:00.000Z"
}
```

### Get Chatflow Configuration

**Endpoint:** `GET /api/v1/chatflows/{chatflow_id}/config`

**Request:**
```http
GET /api/v1/chatflows/550e8400-e29b-41d4-a716-446655440000/config
Authorization: Bearer {api_key}
```

**Response:**
```json
{
  "chatbotConfig": {
    "welcomeMessage": "How can I help you today?",
    "backgroundColor": "#ffffff",
    "textColor": "#000000",
    "userMessageColor": "#3B82F6",
    "botMessageColor": "#E5E7EB"
  },
  "apiConfig": {
    "rateLimit": 100,
    "timeout": 30000,
    "maxTokens": 2000
  },
  "speechToText": {
    "enabled": false,
    "language": "en-US"
  }
}
```

---

## Chat Predictions

### Non-Streaming Prediction

**Endpoint:** `POST /api/v1/prediction/{chatflow_id}`

**Request:**
```json
{
  "question": "Hello, how can you help me?",
  "history": [
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant", 
      "content": "Previous response"
    }
  ],
  "overrideConfig": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "returnSourceDocuments": true,
    "temperature": 0.7
  },
  "uploads": [
    {
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
      "type": "file",
      "name": "image.jpg",
      "mime": "image/jpeg"
    }
  ]
}
```

**Response:**
```json
{
  "text": "Hello! I'm here to help you with any questions you might have. What would you like to know?",
  "sourceDocuments": [
    {
      "pageContent": "Relevant context from knowledge base",
      "metadata": {
        "source": "document.pdf",
        "page": 1
      }
    }
  ],
  "chatId": "chat_session_uuid",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "memoryType": "bufferWindowMemory"
}
```

### Streaming Prediction

**Endpoint:** `POST /api/v1/prediction/{chatflow_id}`

**Request:**
```json
{
  "question": "Explain machine learning",
  "streaming": true,
  "history": [],
  "overrideConfig": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response (Server-Sent Events):**

The streaming response uses Server-Sent Events format. Each chunk contains JSON events:

```
data: {"event":"start","data":""}

data: {"event":"token","data":"Machine"}

data: {"event":"token","data":" learning"}

data: {"event":"token","data":" is"}

data: {"event":"agentFlowEvent","data":{"flowId":"flow_123","status":"INPROGRESS"}}

data: {"event":"token","data":" a"}

data: {"event":"token","data":" subset"}

data: {"event":"usageMetadata","data":{"totalTokens":150,"promptTokens":50,"completionTokens":100}}

data: {"event":"sourceDocuments","data":[{"pageContent":"ML context","metadata":{"source":"ml_guide.pdf"}}]}

data: {"event":"end","data":""}

```

### Stream Event Types

#### Token Event
**Purpose:** Streaming text chunks
```json
{
  "event": "token",
  "data": "word or phrase chunk"
}
```

#### Agent Flow Event
**Purpose:** Agent execution status
```json
{
  "event": "agentFlowEvent", 
  "data": {
    "flowId": "flow_uuid",
    "status": "INPROGRESS|SUCCESS|ERROR",
    "nodeLabel": "LLM Node",
    "nodeId": "node_uuid"
  }
}
```

#### Next Agent Flow Event
**Purpose:** Multi-agent flow transitions
```json
{
  "event": "nextAgentFlow",
  "data": {
    "agentName": "Research Agent",
    "status": "starting|completed",
    "flowId": "next_flow_uuid"
  }
}
```

#### Agent Flow Executed Data Event
**Purpose:** Results from agent execution
```json
{
  "event": "agentFlowExecutedData",
  "data": {
    "result": "Agent execution result",
    "metadata": {
      "executionTime": 1500,
      "nodeType": "llm"
    }
  }
}
```

#### Called Tools Event
**Purpose:** Tool/function calling information
```json
{
  "event": "calledTools",
  "data": [
    {
      "toolName": "WebSearch",
      "input": "machine learning definition",
      "output": "Search results...",
      "executionTime": 800
    }
  ]
}
```

#### Usage Metadata Event
**Purpose:** Token consumption and costs
```json
{
  "event": "usageMetadata",
  "data": {
    "totalTokens": 250,
    "promptTokens": 100,
    "completionTokens": 150,
    "cost": 0.005,
    "model": "gpt-3.5-turbo"
  }
}
```

#### Source Documents Event
**Purpose:** Retrieved context documents (RAG)
```json
{
  "event": "sourceDocuments",
  "data": [
    {
      "pageContent": "Machine learning is a subset of AI...",
      "metadata": {
        "source": "ml_textbook.pdf",
        "page": 15,
        "score": 0.85,
        "chunk": 3
      }
    }
  ]
}
```

#### Start Event
**Purpose:** Stream initialization
```json
{
  "event": "start",
  "data": ""
}
```

#### End Event  
**Purpose:** Stream completion
```json
{
  "event": "end",
  "data": ""
}
```

---

## File Upload Format

### Upload Data Structure

Files in Flowise requests must be formatted as data URLs:

**Base64 File Format:**
```json
{
  "data": "data:{mime_type};base64,{base64_encoded_content}",
  "type": "file",
  "name": "filename.ext",
  "mime": "image/jpeg"
}
```

**URL Reference Format:**
```json
{
  "data": "https://example.com/image.jpg",
  "type": "url", 
  "name": "remote_image.jpg",
  "mime": "image/jpeg"
}
```

**Example with Multiple Files:**
```json
{
  "question": "Analyze these documents",
  "uploads": [
    {
      "data": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwov...",
      "type": "file",
      "name": "report.pdf",
      "mime": "application/pdf"
    },
    {
      "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHg...",
      "type": "file", 
      "name": "chart.png",
      "mime": "image/png"
    }
  ]
}
```

---

## Session Management

### Session Configuration

Sessions are managed through the `overrideConfig` parameter:

```json
{
  "overrideConfig": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "returnSourceDocuments": true,
    "temperature": 0.7,
    "maxTokens": 2000,
    "topP": 0.9,
    "systemMessage": "You are a helpful assistant"
  }
}
```

### Session Response Tracking

Flowise returns session information in responses:

```json
{
  "text": "Response text",
  "chatId": "internal_chat_id",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "memoryType": "bufferWindowMemory",
  "conversationId": "conversation_uuid"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message description",
  "statusCode": 400,
  "timestamp": "2023-10-01T10:00:00.000Z"
}
```

### Common Error Types

**400 Bad Request:**
```json
{
  "error": "Invalid chatflow configuration",
  "statusCode": 400,
  "details": {
    "field": "question",
    "issue": "Required field missing"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid API key",
  "statusCode": 401
}
```

**404 Not Found:**
```json
{
  "error": "Chatflow not found", 
  "statusCode": 404,
  "chatflowId": "invalid_uuid"
}
```

**429 Rate Limited:**
```json
{
  "error": "Rate limit exceeded",
  "statusCode": 429,
  "retryAfter": 60
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "statusCode": 500,
  "requestId": "req_uuid_for_tracking"
}
```

---

## Configuration Parameters

### Override Config Options

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sessionId` | string | Conversation session identifier | auto-generated |
| `temperature` | number | Response randomness (0-1) | 0.7 |
| `maxTokens` | number | Maximum response length | 2000 |
| `topP` | number | Nucleus sampling parameter | 0.9 |
| `topK` | number | Top-K sampling parameter | 50 |
| `repeatPenalty` | number | Repetition penalty | 1.0 |
| `systemMessage` | string | System instruction override | chatflow default |
| `returnSourceDocuments` | boolean | Include RAG sources | false |
| `streaming` | boolean | Enable streaming response | false |

### Chatbot Config Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `welcomeMessage` | string | Initial bot message |
| `backgroundColor` | string | Chat background color |
| `textColor` | string | Text color |
| `userMessageColor` | string | User message bubble color |
| `botMessageColor` | string | Bot message bubble color |
| `fontSize` | number | Font size in pixels |
| `chatWindow` | object | Chat window dimensions |

---

## Rate Limiting

### Rate Limit Headers

Flowise may return rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95  
X-RateLimit-Reset: 1696161600
Retry-After: 60
```

### Rate Limit Response

```json
{
  "error": "Rate limit exceeded",
  "statusCode": 429,
  "limit": 100,
  "remaining": 0,
  "resetTime": "2023-10-01T11:00:00.000Z",
  "retryAfter": 60
}
```

---

## Connection Patterns

### HTTP Client Configuration

**Timeout Settings:**
- Connection timeout: 10 seconds
- Read timeout: 120 seconds (non-streaming)
- Read timeout: No limit (streaming)

**Retry Logic:**
- Retry on 5xx errors
- Exponential backoff: 1s, 2s, 4s
- Max retries: 3

### Streaming Connection

**Content-Type:** `text/event-stream`
**Connection:** `keep-alive`
**Cache-Control:** `no-cache`

**Stream Processing:**
1. Establish SSE connection
2. Parse each `data:` line as JSON
3. Handle events by type
4. Maintain connection until `end` event
5. Process any remaining buffer on connection close

---

## Authentication Patterns

### API Key Authentication
```http
Authorization: Bearer flowise_api_key_here
```

### Public Chatflows
Some chatflows may not require authentication:
```http
# No Authorization header needed for public flows
```

### Custom Authentication
Some Flowise instances may use custom auth schemes:
```http
X-API-Key: custom_api_key
```

---

This documentation covers the core Flowise backend API patterns based on the proxy service implementation. The actual Flowise API may have additional endpoints and parameters depending on the version and configuration.