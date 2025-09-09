# Test Flows Documentation

This document outlines the various test flows within the system, illustrated with Mermaid sequence diagrams.

## 1. User Authentication Flow

**Description:** This flow covers the process of a user authenticating with the system, typically involving credential validation and token issuance.

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant AuthService as Authentication Service
    participant AccountingService as Accounting Service

    User->>ChatService: POST /api/auth/login (username, password)
    ChatService->>AuthService: Validate Credentials (username, password)
    AuthService-->>ChatService: Credentials Valid / Invalid (user details, if valid)
    alt Credentials Valid
        ChatService->>AccountingService: Get User Roles/Permissions (userId)
        AccountingService-->>ChatService: Roles/Permissions
        ChatService->>ChatService: Generate JWT Token (with user details, roles)
        ChatService-->>User: 200 OK (JWT Token, user info)
    else Credentials Invalid
        ChatService-->>User: 401 Unauthorized (Error)
    end
```

**Relevant Files and Functions:**
*   **`ChatService`** (if it proxies authentication as per diagram):
    *   `src/server.ts`: Routes `/api/auth` (hypothetical).
    *   `src/controllers/auth.controller.ts` (hypothetical): `login()` method.
        *   Makes an external call to `Authentication Service`.
        *   Calls `AccountingService` for roles/permissions.
    *   `src/services/auth.service.ts` (hypothetical): For JWT generation if done by ChatService.
*   **`Authentication Service`** (External):
    *   Handles user credential validation (e.g., `/auth/login` endpoint).
*   **`AccountingService`** (when called by ChatService for roles):
    *   `src/server.ts`: Routes `/api/users` or a specific role endpoint.
    *   `src/controllers/user.controller.ts` (hypothetical): `getUserRoles()` or `getUserPermissions()`.
    *   `src/services/user.service.ts` (hypothetical): Logic for fetching user roles.
*   **Note:** `test_chat_service.py` authenticates directly with `AUTH_SERVICE_URL`. If `ChatService` doesn't proxy login, the user client gets the token from `AuthService` and then uses it with `ChatService`.

## 2. Chat Session Management Flow

**Description:** This flow encompasses operations related to managing chat sessions, including creation, listing, retrieving details, and deletion.

### 2.1. Create Chat Session

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant Database as Chat DB

    User->>ChatService: POST /api/sessions (userId, modelId)
    ChatService->>ChatService: Validate request (e.g., modelId exists)
    ChatService->>Database: Create new session record (userId, modelId, status: active)
    Database-->>ChatService: Session created (sessionId)
    ChatService-->>User: 201 Created (sessionId, sessionDetails)
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Routes `/api/chat/sessions`.
    *   `src/controllers/chat/session.controller.ts`: `createSession()` // 20250523_test_flow
    *   Database interaction for creating session record (e.g., via a model like `src/models/session.model.ts` - hypothetical).

### 2.2. List Chat Sessions

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant Database as Chat DB

    User->>ChatService: GET /api/sessions (userId)
    ChatService->>Database: Fetch sessions for user (userId)
    Database-->>ChatService: List of sessions
    ChatService-->>User: 200 OK (List of sessions)
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Routes `/api/chat/sessions`.
    *   `src/controllers/chat/session.controller.ts`: `listSessions()` // 20250523_test_flow
    *   Database interaction for fetching sessions.

### 2.3. Get Session Details

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant Database as Chat DB

    User->>ChatService: GET /api/sessions/{sessionId}
    ChatService->>Database: Fetch session details (sessionId)
    Database-->>ChatService: Session details
    ChatService-->>User: 200 OK (Session details)
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Routes `/api/chat/sessions/{sessionId}`.
    *   `src/controllers/chat/session.controller.ts`: `getSession()` // 20250523_test_flow
    *   Database interaction for fetching session details.

### 2.4. Delete Chat Session

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant Database as Chat DB

    User->>ChatService: DELETE /api/sessions/{sessionId}
    ChatService->>Database: Mark session as deleted/remove (sessionId)
    Database-->>ChatService: Session deleted
    ChatService-->>User: 200 OK (Success message)
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Routes `/api/chat/sessions/{sessionId}`.
    *   `src/controllers/chat/session.controller.ts`: `deleteSession()` // 20250523_test_flow
    *   Database interaction for deleting/marking session.

## 3. Non-Streaming Message Flow

**Description:** This flow details the process of sending a message and receiving a complete, non-streamed response from an LLM.

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant LLMService as LLM Service
    participant AccountingService as Accounting Service
    participant Database as Chat DB

    User->>ChatService: POST /api/sessions/{sessionId}/messages (prompt)
    ChatService->>AccountingService: Pre-authorize/Check Credits (userId, modelId, messageType: non-stream)
    AccountingService-->>ChatService: Credits OK / Insufficient Credits
    alt Credits OK
        ChatService->>LLMService: Process message (prompt, modelId, history)
        LLMService-->>ChatService: LLM Response (full text)
        ChatService->>Database: Store user message and LLM response (sessionId, prompt, response)
        ChatService->>AccountingService: Finalize/Deduct Credits (userId, modelId, usage_details)
        AccountingService-->>ChatService: Deduction Confirmed
        ChatService-->>User: 200 OK (LLM Response)
    else Insufficient Credits
        ChatService-->>User: 402 Payment Required (Error: Insufficient Credits)
    end
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Routes `/api/chat/sessions/{sessionId}/messages`.
    *   `src/controllers/chat/message.controller.ts`: `sendMessage()` // 20250523_test_flow
    *   `src/services/credit.service.ts`:
        *   `checkUserCredits()` // 20250523_test_flow (calls AccountingService)
        *   `calculateRequiredCredits()` // 20250523_test_flow (calls AccountingService)
        *   `recordChatUsage()` // 20250523_test_flow (calls AccountingService)
    *   `src/services/llm.service.ts` (hypothetical) or direct SDK usage: For `Process message` to `LLMService`.
    *   Database interaction: To store messages (e.g., `src/models/message.model.ts` - hypothetical).
*   **`AccountingService`**:
    *   `src/server.ts`: Routes `/api/credits/check`, `/api/credits/calculate`, `/api/usage/record`.
    *   `src/controllers/credit.controller.ts`:
        *   `checkCredits()` // 20250523_test_flow
        *   `calculateCredits()` // 20250523_test_flow
    *   `src/services/credit.service.ts`:
        *   `checkUserCredits()` // 20250523_test_flow
        *   `calculateCreditsForTokens()` // 20250523_test_flow
    *   `src/controllers/usage.controller.ts`: `recordUsage()` // 20250523_test_flow
    *   `src/services/usage.service.ts`: `recordUsage()` // 20250523_test_flow
*   **`LLMService`**: External service.

## 4. Streaming Chat Response Flow

**Description:** This flow illustrates how a user receives a chat response streamed in chunks from the LLM.

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant LLMService as LLM Service
    participant AccountingService as Accounting Service
    participant Database as Chat DB

    User->>ChatService: POST /api/sessions/{sessionId}/messages/stream :prompt
    ChatService->>AccountingService: Pre-authorize/Check Credits :userId, modelId, messageType: stream
    AccountingService-->>ChatService: Credits OK / Insufficient Credits
    alt Credits OK
        ChatService->>LLMService: Process message stream :prompt, modelId, history
        activate LLMService
        LLMService-->>ChatService: Stream Chunk 1
        ChatService-->>User: SSE: data: Chunk 1
        LLMService-->>ChatService: Stream Chunk 2
        ChatService-->>User: SSE: data: Chunk 2
        
        LLMService-->>ChatService: Stream End
        deactivate LLMService
        ChatService-->>User: SSE: event: end
        ChatService->>Database: Store user message and aggregated LLM response :sessionId, prompt, full_response
        ChatService->>AccountingService: Finalize/Deduct Credits :userId, modelId, usage_details_stream
        AccountingService-->>ChatService: Deduction Confirmed
    else Insufficient Credits
        ChatService-->>User: 402 Payment Required :Error: Insufficient Credits
    end
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Routes `/api/chat/sessions/{sessionId}/stream` (Note: `test_chat_service.py` uses `/stream`, diagram `/messages/stream`).
    *   `src/controllers/chat/message.controller.ts`: `streamChatResponse()` (or similar method for streaming) // 20250523_test_flow
    *   `src/services/credit.service.ts`: (Same as Non-Streaming Flow for credit checks and recording)
        *   `checkUserCredits()` // 20250523_test_flow
        *   `calculateRequiredCredits()` // 20250523_test_flow
        *   `recordChatUsage()` // 20250523_test_flow
    *   `src/services/streaming.service.ts`: // 20250523_test_flow
        *   `initializeStreamingSession()`
        *   `streamResponse()`
        *   `extractTextFromChunk()`
    *   `src/controllers/chat/session.controller.ts` or `message.controller.ts`: Handles `POST /update-stream` (from `test_chat_service.py`) for storing aggregated response.
    *   Database interaction: To store aggregated response.
*   **`AccountingService`**: (Same as Non-Streaming Flow)
*   **`LLMService`**: External service (supports streaming).

## 5. Model Recommendation Flow

**Description:** This flow describes how the system recommends suitable LLM models to the user, possibly based on context or user preferences.

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant ModelConfig as Model Configuration/Logic

    User->>ChatService: GET /api/models/recommend (context, preferences)
    ChatService->>ModelConfig: Get available/recommended models (based on context)
    ModelConfig-->>ChatService: List of recommended models
    ChatService-->>User: 200 OK (List of models)
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Routes `/api/models/recommend`.
    *   `src/controllers/model.controller.ts`: `getModelRecommendation()` // 20250523_test_flow
    *   `src/services/model-recommendation.service.ts`: `recommendModel()` // 20250523_test_flow, `getAvailableModels()` // 20250523_test_flow

## 6. Supervisor Observation Flow

**Description:** This flow allows a supervisor to observe an active chat session between a user and the LLM in real-time.

```mermaid
sequenceDiagram
    participant Supervisor
    participant User
    participant ChatService as Chat Service
    participant LLMService as LLM Service

    User->>ChatService: Interacting in a session (e.g., streaming messages)
    ChatService->>LLMService: (User's prompt)
    LLMService-->>ChatService: (Stream Chunk for User)
    ChatService-->>User: (Stream Chunk for User)

    Supervisor->>ChatService: POST /api/sessions/{sessionId}/observe (supervisorId)
    ChatService->>ChatService: Validate supervisor role and session active
    ChatService-->>Supervisor: 200 OK (Observation started, stream connection)

    Note over ChatService: When new chunks arrive for the user
    LLMService-->>ChatService: (Stream Chunk for User)
    ChatService-->>User: (Stream Chunk for User)
    ChatService-->>Supervisor: (Same Stream Chunk for Supervisor)

    User->>ChatService: (Sends another message)
    ChatService->>LLMService: (User's new prompt)
    LLMService-->>ChatService: (New Stream Chunk for User)
    ChatService-->>User: (New Stream Chunk for User)
    ChatService-->>Supervisor: (New Stream Chunk for Supervisor)

    Supervisor->>ChatService: POST /api/sessions/{sessionId}/stop-observe
    ChatService-->>Supervisor: 200 OK (Observation stopped)
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   User Interaction: (Covered by Flow 3 or 4, e.g., `message.controller.ts`, `streaming.service.ts`)
    *   `src/server.ts`: Routes `/api/chat/sessions/{sessionId}/observe` and `/stop-observe`.
    *   `src/controllers/chat/supervisor.controller.ts`:
        *   `observeSession()` // 20250523_test_flow
        *   `stopObserveSession()` (hypothetical, for `/stop-observe`)
    *   `src/services/observation.service.ts` (`ObservationManager`): // 20250523_test_flow
        *   `addObserver()`
        *   `registerStream()` (called by message streaming flow)
        *   Handles distributing stream chunks to supervisor.
*   **`LLMService`**: External service.

## 7. Insufficient Credits Flow

**Description:** This flow details how the system handles a situation where a user attempts an action but lacks sufficient credits.

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant AccountingService as Accounting Service

    User->>ChatService: Request for credit-consuming action (e.g., send message)
    ChatService->>AccountingService: Check/Deduct Credits (userId, actionCost)
    AccountingService-->>ChatService: Error: Insufficient Credits
    ChatService-->>User: 402 Payment Required (Error message: "Insufficient credits")
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/controllers/chat/message.controller.ts`: In `sendMessage()` or `streamChatResponse()`, handles the error from `credit.service.ts`.
    *   `src/services/credit.service.ts`: `checkUserCredits()` returns false or error. // 20250523_test_flow
*   **`AccountingService`**:
    *   `src/controllers/credit.controller.ts`: `checkCredits()` method returns insufficient credits. // 20250523_test_flow
    *   `src/services/credit.service.ts`: `checkUserCredits()` logic determines insufficiency. // 20250523_test_flow

## 8. Admin Credit Allocation Flow

**Description:** This flow shows an administrator allocating credits to a user.

```mermaid
sequenceDiagram
    participant AdminUser as Admin
    participant AccountingService as Accounting Service
    participant Database as Accounting DB

    AdminUser->>AccountingService: POST /api/credits/allocate (targetUserId, amount, adminToken)
    AccountingService->>AccountingService: Validate Admin privileges
    AccountingService->>Database: Add/Update credits for targetUserId
    Database-->>AccountingService: Credits updated successfully
    AccountingService-->>AdminUser: 200 OK (Success message, new balance)
```

**Relevant Files and Functions:**
*   **`AccountingService`**:
    *   `src/server.ts`: Routes `/api/credits/allocate`.
    *   `src/controllers/credit.controller.ts`: `allocateCredits()` // 20250523_test_flow
    *   `src/services/credit.service.ts`: `allocateCredits()` // 20250523_test_flow
    *   Database interaction: To update user credits (e.g., `src/models/user.model.ts` or `credit.model.ts`).

## 9. End-to-End Test Flow

**Description:** A comprehensive flow that integrates multiple system components, simulating a realistic user journey. (Adapted from `comprehensiveTesting.md`)

```mermaid
sequenceDiagram
    participant Admin
    participant User
    participant ChatService
    participant AccountingService
    participant LLMService
    participant Supervisor

    Admin->>AccountingService: POST /api/credits/allocate (for User1)
    AccountingService-->>Admin: 200 OK (Credits allocated)

    User->>ChatService: POST /api/auth/login (User1 credentials)
    ChatService-->>User: 200 OK (JWT Token for User1)

    User->>ChatService: POST /api/sessions (using User1 token)
    ChatService-->>User: 201 Created (sessionId)

    User->>ChatService: POST /api/sessions/{sessionId}/messages/stream (prompt1)
    ChatService->>AccountingService: Check Credits (User1)
    AccountingService-->>ChatService: Credits OK
    ChatService->>LLMService: Process stream (prompt1)
    LLMService-->>ChatService: Stream Chunk 1.1
    ChatService-->>User: SSE: data: Chunk 1.1
    LLMService-->>ChatService: Stream Chunk 1.2
    ChatService-->>User: SSE: data: Chunk 1.2
    LLMService-->>ChatService: Stream End
    ChatService-->>User: SSE: event: end
    ChatService->>AccountingService: Finalize Credits (User1, usage1)

    User->>ChatService: POST /api/sessions/{sessionId}/messages/stream (prompt2)
    ChatService->>AccountingService: Check Credits (User1)
    AccountingService-->>ChatService: Credits OK
    ChatService->>LLMService: Process stream (prompt2)
    LLMService-->>ChatService: Stream Chunk 2.1
    ChatService-->>User: SSE: data: Chunk 2.1
    LLMService-->>ChatService: Stream End
    ChatService-->>User: SSE: event: end
    ChatService->>AccountingService: Finalize Credits (User1, usage2)

    Supervisor->>ChatService: POST /api/sessions/{sessionId}/observe (using Supervisor token)
    ChatService-->>Supervisor: 200 OK (Observation started)

    User->>ChatService: POST /api/sessions/{sessionId}/messages/stream (prompt3)
    ChatService->>LLMService: Process stream (prompt3)
    LLMService-->>ChatService: Stream Chunk 3.1
    ChatService-->>User: SSE: data: Chunk 3.1
    ChatService-->>Supervisor: SSE: data: Chunk 3.1 (Observed)
    LLMService-->>ChatService: Stream End
    ChatService-->>User: SSE: event: end
    ChatService-->>Supervisor: SSE: event: end (Observed)
    ChatService->>AccountingService: Finalize Credits (User1, usage3)

    User->>AccountingService: GET /api/usage/stats (User1 token)
    AccountingService-->>User: 200 OK (Usage statistics for User1)
```

**Relevant Files and Functions (Highlights):**
*   **Admin Allocates Credits (`AccountingService`)**:
    *   `src/controllers/credit.controller.ts`: `allocateCredits()` // 20250523_test_flow
    *   `src/services/credit.service.ts`: `allocateCredits()` // 20250523_test_flow
*   **User Login (`AuthService`)**: External.
*   **User Creates Session (`ChatService`)**:
    *   `src/controllers/chat/session.controller.ts`: `createSession()` // 20250523_test_flow
*   **User Sends Streaming Message (`ChatService`, `AccountingService`, `LLMService`)**:
    *   `ChatService`:
        *   `src/controllers/chat/message.controller.ts`: `streamChatResponse()` // 20250523_test_flow
        *   `src/services/credit.service.ts`: `checkUserCredits()`, `calculateRequiredCredits()`, `recordChatUsage()` // 20250523_test_flow
        *   `src/services/streaming.service.ts` // 20250523_test_flow
    *   `AccountingService`:
        *   `src/controllers/credit.controller.ts`: `checkCredits()`, `calculateCredits()` // 20250523_test_flow
        *   `src/controllers/usage.controller.ts`: `recordUsage()` // 20250523_test_flow
*   **Supervisor Observes Session (`ChatService`)**:
    *   `src/controllers/chat/supervisor.controller.ts`: `observeSession()` // 20250523_test_flow
    *   `src/services/observation.service.ts` // 20250523_test_flow
*   **User Gets Usage Stats (`AccountingService`)**:
    *   Endpoint: `/api/statistics/usage` (from `test_chat_service.py`)
    *   `src/controllers/usage.controller.ts`: `getUserStats()` // 20250523_test_flow
    *   `src/services/usage.service.ts`: `getUserStats()` // 20250523_test_flow

## 10. Rate Limiting Flow

**Description:** This flow demonstrates how the system enforces rate limits on user requests to prevent abuse.

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant RateLimiter as Rate Limiting Middleware/Service

    User->>ChatService: API Request (e.g., /api/sessions/{sessionId}/messages)
    ChatService->>RateLimiter: Check request against rate limits (userId or IP)
    alt Rate Limit Not Exceeded
        RateLimiter-->>ChatService: Allow request
        ChatService->>ChatService: Process request as usual
        ChatService-->>User: Normal Response (e.g., 200 OK, 201 Created)
    else Rate Limit Exceeded
        RateLimiter-->>ChatService: Deny request
        ChatService-->>User: 429 Too Many Requests (Error message)
    end
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/server.ts`: Applies rate limiting middleware.
    *   `src/middleware/rateLimiter.middleware.ts` (hypothetical): Contains the rate limiting logic (e.g., using `express-rate-limit`).

## 11. Invalid Model ID Flow

**Description:** This flow shows system behavior when a user requests a model that is not available or invalid.

```mermaid
sequenceDiagram
    participant User
    participant ChatService as Chat Service
    participant ModelConfig as Model Configuration/Logic

    User->>ChatService: Request involving a modelId (e.g., create session, send message)
    ChatService->>ModelConfig: Validate modelId
    alt Model ID Valid
        ModelConfig-->>ChatService: Model OK
        ChatService->>ChatService: Proceed with action
        ChatService-->>User: Normal Response
    else Model ID Invalid
        ModelConfig-->>ChatService: Error: Invalid Model ID
        ChatService-->>User: 400 Bad Request (Error: "Invalid or unsupported model ID")
    end
```

**Relevant Files and Functions:**
*   **`ChatService`**:
    *   `src/controllers/chat/session.controller.ts`: In `createSession()`, validates `modelId`.
    *   `src/controllers/chat/message.controller.ts`: In `sendMessage()` or `streamChatResponse()`, validates `modelId`.
    *   `src/services/model-recommendation.service.ts`: `getAvailableModels()` could be used for validation. // 20250523_test_flow

## 12. Service Authentication Failure Flow

**Description:** This flow outlines how the system handles authentication failures when one internal service tries to communicate with another.

```mermaid
sequenceDiagram
    participant InitiatingService as Service A (e.g., Chat Service)
    participant TargetService as Service B (e.g., Accounting Service / LLM Service)

    InitiatingService->>TargetService: API Request with Auth Token/Key
    TargetService->>TargetService: Validate Auth Token/Key
    alt Authentication Successful
        TargetService-->>InitiatingService: 2xx Success Response
        InitiatingService->>InitiatingService: Process successful response
    else Authentication Failed
        TargetService-->>InitiatingService: 401 Unauthorized / 403 Forbidden
        InitiatingService->>InitiatingService: Log error, handle failure (e.g., retry, return error to user)
        Note over InitiatingService: May trigger alert to admins
    end
```

**Relevant Files and Functions:**
*   **`InitiatingService`** (e.g., `ChatService` calling `AccountingService`):
    *   The service making the call, e.g., `chat-service/src/services/credit.service.ts` // 20250523_test_flow, would handle HTTP errors like 401/403 from the `TargetService`.
*   **`TargetService`** (e.g., `AccountingService`):
    *   `src/server.ts`: Applies authentication middleware.
    *   `src/middleware/auth.middleware.ts` (hypothetical): Validates incoming tokens/keys for inter-service communication.

