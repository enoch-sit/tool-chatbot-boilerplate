# Chat Service API Documentation

This document provides a detailed overview of the API endpoints for the Chat Service.

## General Information

- **Base Path**: `/api`
- **Authentication**: Most routes are protected with JWT authentication. The `Authorization` header should contain the JWT token in the format `Bearer <token>`.
- **Role-Based Access Control**: Certain administrative routes require specific user roles (e.g., `admin`, `supervisor`).
- **Input Validation**: All routes that accept request bodies have input validation.

---

## API Endpoints

### Version

#### `GET /api/version`
Get the version number of the code.

---

### Chat Session Management

These endpoints handle the creation, retrieval, listing, and deletion of chat sessions for authenticated users.

#### `POST /api/chat/sessions`
Creates a new conversation session with specified parameters like title, description, and model preferences.

-   **Required auth**: JWT
-   **Validation**: Title length, model ID format
-   **Input**:
    ```json
    {
      "title": "string",               // Optional: Custom title for the chat (default: "New Chat")
      "initialMessage": "string",      // Optional: First user message to start the conversation
      "modelId": "string",             // Optional: AI model ID to use (default: from config)
      "source": "string"               // Optional: Client source identifier (web, mobile, etc.)
    }
    ```
-   **Output (201 Created)**:
    ```json
    {
      "sessionId": "string",           // Unique ID of the created chat session
      "title": "string",               // Title of the chat session
      "createdAt": "string"            // ISO timestamp of creation time
    }
    ```
-   **Errors**:
    -   `400 Bad Request`: Invalid input parameters
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `500 Internal Server Error`: Server-side error

#### `GET /api/chat/sessions/:sessionId`
Retrieves details of a specific chat session including metadata and messages if the user owns the session.

-   **Required auth**: JWT
-   **URL Params**:
    -   `sessionId`: string              // The unique identifier of the chat session
-   **Output (200 OK)**:
    ```json
    {
      "sessionId": "string",           // Unique ID of the chat session
      "title": "string",               // Title of the chat session
      "messages": [                  // Array of message objects
        {
          "role": "string",            // "system", "user", or "assistant"
          "content": "string",         // Message content
          "timestamp": "string"        // ISO timestamp when the message was sent
        }
      ],
      "modelId": "string",             // ID of the AI model used for this session
      "createdAt": "string",           // ISO timestamp of creation time
      "updatedAt": "string",           // ISO timestamp of last update
      "metadata": "object"             // Additional session metadata
    }
    ```
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have permission to access this session
    -   `404 Not Found`: Session not found
    -   `500 Internal Server Error`: Server-side error

#### `GET /api/chat/sessions`
Returns a paginated list of all chat sessions belonging to the authenticated user with sorting and filtering options.

-   **Required auth**: JWT
-   **Query Params**:
    -   `page`: number                   // Optional: Page number for pagination (default: 1)
    -   `limit`: number                  // Optional: Number of results per page (default: 20)
-   **Output (200 OK)**:
    ```json
    {
      "sessions": [                  // Array of session objects
        {
          "sessionId": "string",       // Unique ID of the chat session
          "title": "string",           // Title of the chat session
          "createdAt": "string",       // ISO timestamp of creation time
          "updatedAt": "string",       // ISO timestamp of last update
          "modelId": "string",         // ID of the AI model used
          "metadata": "object"         // Additional session metadata
        }
      ],
      "pagination": {
        "total": "number",             // Total number of sessions
        "pages": "number",             // Total number of pages
        "currentPage": "number",       // Current page number
        "perPage": "number"            // Number of results per page
      }
    }
    ```
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `500 Internal Server Error`: Server-side error

#### `DELETE /api/chat/sessions/:sessionId`
Permanently removes a chat session and all its messages if the user owns the session.

-   **Required auth**: JWT
-   **URL Params**:
    -   `sessionId`: string              // The unique identifier of the chat session to delete
-   **Output (200 OK)**:
    ```json
    {
      "message": "string",             // Success message
      "sessionId": "string"            // ID of the deleted session
    }
    ```
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have permission to delete this session
    -   `404 Not Found`: Session not found
    -   `500 Internal Server Error`: Server-side error

---

### Message Interaction Routes

These endpoints handle sending messages to and retrieving message history from specific chat sessions.

#### `POST /api/chat/sessions/:sessionId/messages`
Sends a user message to the specified chat session and receives an AI response using the configured model.

-   **Required auth**: JWT
-   **Validation**: Message content, parameters
-   **URL Params**:
    -   `sessionId`: string              // The unique identifier of the chat session
-   **Input**:
    ```json
    {
      "message": "string",             // Required: The user's message content
      "modelId": "string"              // Optional: Override the model for this message
    }
    ```
-   **Output (200 OK)**:
    ```json
    {
      "message": "string",             // Success message
      "sessionId": "string",           // ID of the updated session
      "aiResponse": "string"          // The AI's response to the user's message
    }
    ```
-   **Errors**:
    -   `400 Bad Request`: Invalid message parameters
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have permission to access this session
    -   `404 Not Found`: Session not found
    -   `500 Internal Server Error`: Server-side error

#### `GET /api/chat/sessions/:sessionId/messages`
Retrieves the message history from a specific chat session with pagination options.

-   **Required auth**: JWT
-   **URL Params**:
    -   `sessionId`: string              // The unique identifier of the chat session
-   **Output (200 OK)**:
    ```json
    {
      "messages": [                  // Array of message objects
        {
          "role": "string",            // "system", "user", or "assistant"
          "content": "string",         // Message content
          "timestamp": "string"        // ISO timestamp when the message was sent
        }
      ]
    }
    ```
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have permission to access this session
    -   `404 Not Found`: Session not found
    -   `500 Internal Server Error`: Server-side error

---

### Streaming Interaction Routes

These endpoints handle streaming responses from the AI model, which allows for incremental delivery of responses.

#### `POST /api/chat/sessions/:sessionId/stream`
Initiates a streaming response from the AI model for real-time interaction. Uses Server-Sent Events (SSE) to stream the response to the client.

-   **Required auth**: JWT
-   **Validation**: Message content, stream parameters
-   **URL Params**:
    -   `sessionId`: string              // The unique identifier of the chat session
-   **Input**:
    ```json
    {
      "message": "string",             // Required: The user's message content
      "modelId": "string"              // Optional: Override the model for this response
    }
    ```
-   **Output**:
    Server-Sent Events stream with the following event types:
    -   `chunk`: Contains a piece of the AI response
        `data: { "text": "string", "isDone": "boolean" }`
    -   `error`: Contains error information if streaming fails
        `data: { "error": "string", "message": "string" }`
    -   `done`: Indicates completion of the streaming response
        `data: { "message": "Stream complete", "tokensUsed": "number" }`
-   **Errors**:
    -   `400 Bad Request`: Invalid message parameters or active stream already exists
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `402 Payment Required`: Insufficient credits for streaming
    -   `403 Forbidden`: User does not have permission to access this session
    -   `404 Not Found`: Session not found
    -   `500 Internal Server Error`: Server-side error (also sent as SSE error event)

#### `POST /api/chat/sessions/:sessionId/update-stream`
Finalizes a streaming response by updating the session with the complete message once streaming is finished.

-   **Required auth**: JWT
-   **Validation**: Stream ID, message content
-   **URL Params**:
    -   `sessionId`: string              // The unique identifier of the chat session
-   **Input**:
    ```json
    {
      "completeResponse": "string",    // Required: The complete AI response text
      "streamingSessionId": "string",  // Required: ID of the streaming session
      "tokensUsed": "number"           // Required: Number of tokens consumed
    }
    ```
-   **Output (200 OK)**:
    ```json
    {
      "message": "string",             // Success message
      "sessionId": "string",           // ID of the updated session
      "tokensUsed": "number"           // Tokens used in this interaction
    }
    ```
-   **Errors**:
    -   `400 Bad Request`: Invalid parameters or streaming session ID mismatch
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have permission to access this session
    -   `404 Not Found`: Session not found
    -   `500 Internal Server Error`: Server-side error

---

### Monitoring and Supervision Routes

These endpoints provide administrative functionality for monitoring and managing user interactions.

#### `GET /api/chat/sessions/:sessionId/observe`
Allows supervisors and admins to monitor an active chat session in real-time for quality assurance purposes.

-   **Required auth**: JWT
-   **Required role**: `admin` or `supervisor`
-   **URL Params**:
    -   `sessionId`: string              // The unique identifier of the chat session to observe
-   **Output**:
    Server-Sent Events stream that mirrors all events from the original streaming session, with these additional event types:
    -   `observer`: Contains observer connection status
        `data: { "message": "string", "sessionId": "string", "observerId": "string", "timestamp": "string" }`
    -   `history-start`/`history-end`: Mark the beginning and end of historical data replay from the session
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have supervisor or admin role
    -   `404 Not Found`: No active streaming session found for observation. This error includes `"availableSessions": [string[]]` with active sessions.
    -   `500 Internal Server Error`: Server-side error (also sent as SSE error event)

#### `GET /api/chat/users/:userId/sessions`
Allows supervisors to view all chat sessions of a specific user for monitoring and support purposes.

-   **Required auth**: JWT
-   **Required role**: `admin` or `supervisor`
-   **URL Params**:
    -   `userId`: string                 // The ID of the user whose sessions to retrieve
-   **Query Params**:
    -   `page`: number                   // Optional: Page number for pagination (default: 1)
    -   `limit`: number                  // Optional: Number of results per page (default: 20)
-   **Output (200 OK)**:
    ```json
    {
      "userId": "string",              // ID of the user whose sessions are listed
      "sessions": [                  // Array of session objects
        {
          "sessionId": "string",       // Unique ID of the chat session
          "title": "string",           // Title of the chat session
          "createdAt": "string",       // ISO timestamp of creation time
          "updatedAt": "string",       // ISO timestamp of last update
          "modelId": "string",         // ID of the AI model used
          "metadata": "object"         // Additional session metadata
        }
      ],
      "pagination": {
        "total": "number",             // Total number of sessions
        "pages": "number",             // Total number of pages
        "currentPage": "number",       // Current page number
        "perPage": "number"            // Number of results per page
      }
    }
    ```
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have supervisor or admin role
    -   `500 Internal Server Error`: Server-side error

#### `GET /api/chat/users/:userId/sessions/:sessionId`
Allows supervisors to access a specific chat session of any user.

-   **Required auth**: JWT
-   **Required role**: `admin` or `supervisor`
-   **URL Params**:
    -   `userId`: string                 // The ID of the user who owns the session
    -   `sessionId`: string              // The unique identifier of the chat session
-   **Output (200 OK)**:
    ```json
    {
      "sessionId": "string",           // Unique ID of the chat session
      "userId": "string",              // ID of the user who owns the session
      "title": "string",               // Title of the chat session
      "messages": [                  // Array of message objects
        {
          "role": "string",            // "system", "user", or "assistant"
          "content": "string",         // Message content
          "timestamp": "string"        // ISO timestamp when message was sent
        }
      ],
      "modelId": "string",             // ID of the AI model used for this session
      "createdAt": "string",           // ISO timestamp of creation time
      "updatedAt": "string",           // ISO timestamp of last update
      "metadata": "object"             // Additional session metadata
    }
    ```
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have supervisor or admin role
    -   `404 Not Found`: Session not found
    -   `500 Internal Server Error`: Server-side error

#### `GET /api/chat/users/search`
Allows supervisors to search for users by username, email, or ID and view their associated chat sessions.

-   **Required auth**: JWT
-   **Required role**: `admin` or `supervisor`
-   **Query Params**:
    -   `query`: string                  // Required: Search term to match against users
    -   `page`: number                   // Optional: Page number for pagination (default: 1)
    -   `limit`: number                  // Optional: Number of results per page (default: 20)
-   **Output (200 OK)**:
    ```json
    {
      "users": [                     // Array of user objects
        {
          "_id": "string",             // User ID
          "sessionCount": "number"     // Number of chat sessions for this user
        }
      ],
      "pagination": {
        "total": "number",             // Total number of users found
        "pages": "number",             // Total number of pages
        "currentPage": "number",       // Current page number
        "perPage": "number"            // Number of results per page
      }
    }
    ```
-   **Errors**:
    -   `400 Bad Request`: Missing search query
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `403 Forbidden`: User does not have supervisor or admin role
    -   `500 Internal Server Error`: Server-side error

---

### Model Information Routes

These endpoints provide information about available AI models and recommend models based on specific use cases.

#### `GET /api/models`
Returns a list of all available LLM models with their capabilities, limitations, pricing, and performance characteristics.

-   **Required auth**: JWT
-   **Output (200 OK)**:
    ```json
    {
      "models": [                    // Array of model objects
        {
          "id": "string",              // Model identifier
          "name": "string",            // Human-readable model name
          "description": "string",     // Description of model capabilities
          "capabilities": ["string"],  // List of model capabilities (e.g., "reasoning", "code")
          "creditCost": "number",      // Cost in platform credits per 1K tokens
          "maxTokens": "number",       // Maximum context window size
          "available": "boolean"       // Whether the model is currently available
        }
      ]
    }
    ```
-   **Errors**:
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `500 Internal Server Error`: Server-side error

#### `POST /api/models/recommend`
Recommends an appropriate model based on the user's specified task type and priority (speed, quality, or cost).

-   **Required auth**: JWT
-   **Validation**: Task type, priority values
-   **Input**:
    ```json
    {
      "task": "string",                // Optional: "general", "code", "creative", or "long-document"
      "priority": "string"             // Optional: "speed", "quality", or "cost"
    }
    ```
-   **Output (200 OK)**:
    ```json
    {
      "recommendedModel": "string",    // ID of the recommended model
      "reason": "string",              // Explanation for the recommendation
      "modelDetails": {              // Details of the recommended model
        "id": "string",                // Model identifier
        "name": "string",              // Human-readable model name
        "description": "string",       // Description of model capabilities
        "capabilities": ["string"],    // List of model capabilities
        "creditCost": "number",        // Cost in platform credits per 1K tokens
        "maxTokens": "number",         // Maximum context window size
        "available": "boolean"         // Whether the model is currently available
      }
    }
    ```
-   **Errors**:
    -   `400 Bad Request`: Invalid task or priority values
    -   `401 Unauthorized`: Missing or invalid authentication token
    -   `500 Internal Server Error`: Server-side error

---

### Health and Monitoring

#### `GET /api/health`
Returns the operational status of the Chat Service. This is the only endpoint that doesn't require authentication and is typically used by monitoring systems.

-   **Output (200 OK)**:
    ```json
    {
      "status": "string",              // "ok" if service is healthy
      "service": "string",             // Service identifier ("chat-service")
      "version": "string",             // Service version
      "timestamp": "string"            // ISO timestamp of the health check
    }
    ```
-   **Errors**:
    -   `500 Internal Server Error`: If service is unhealthy
