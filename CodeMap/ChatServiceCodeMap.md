# Chat Service Code Map

## Overview

The Chat Service is a microservice that provides real-time AI chat capabilities using AWS Bedrock models. The service handles user chat sessions, streams model responses, and integrates with external authentication and accounting services.

## Architecture Components

### Core Components

```mermaid
graph TD
    subgraph "Server Entry Point"
        server[server.ts]
    end
    
    subgraph "Configuration"
        config[config.ts]
        db[db.ts]
    end
    
    subgraph "Routes"
        chatRoutes[chat.routes.ts]
        modelRoutes[model.routes.ts]
    end
    
    subgraph "Controllers"
        chatController[chat.controller.ts]
        modelController[model.controller.ts]
    end
    
    subgraph "Middleware"
        auth[auth.middleware.ts]
        validation[validation.middleware.ts]
        rateLimiter[rate-limit.middleware.ts]
        metrics[metrics.middleware.ts]
    end
    
    subgraph "Models"
        chatSession[chat-session.model.ts]
    end
    
    subgraph "Services"
        streaming[streaming.service.ts]
        observation[observation.service.ts]
        modelRecommendation[model-recommendation.service.ts]
        metricsService[metrics.service.ts]
    end
    
    subgraph "Utilities"
        logger[logger.ts]
    end
    
    server --> config
    server --> db
    server --> chatRoutes
    server --> modelRoutes
    server --> logger
    server --> observation
    
    chatRoutes --> chatController
    chatRoutes --> auth
    chatRoutes --> validation
    
    modelRoutes --> modelController
    modelRoutes --> auth
    modelRoutes --> validation
    
    chatController --> chatSession
    chatController --> streaming
    chatController --> observation
    chatController --> logger
    
    streaming --> config
    streaming --> logger
    
    modelController --> modelRecommendation
    modelController --> logger
    
    observation --> logger
    
    metricsService --> logger
    metrics --> metricsService
    
    chatController --> metricsService
```

### File Functions

| File | Description |
|------|-------------|
| **server.ts** | Entry point that initializes Express app, middleware, routes, and database connection |
| **config.ts** | Configuration settings loaded from environment variables |
| **db.ts** | MongoDB database connection management |
| **chat.routes.ts** | API routes for chat functionality (sessions, messages, streaming) |
| **model.routes.ts** | API routes for model selection and recommendations |
| **chat.controller.ts** | Chat business logic (session creation, message handling, streaming) |
| **model.controller.ts** | Model recommendation logic and available models |
| **auth.middleware.ts** | JWT authentication and role-based access control |
| **validation.middleware.ts** | Request validation using express-validator |
| **rate-limit.middleware.ts** | Rate limiting to prevent API abuse |
| **metrics.middleware.ts** | Request metrics collection middleware |
| **chat-session.model.ts** | MongoDB schema for chat sessions |
| **streaming.service.ts** | AWS Bedrock integration for AI model streaming |
| **observation.service.ts** | Allows supervisors to monitor active chat sessions |
| **model-recommendation.service.ts** | Provides model recommendations based on task & priority |
| **metrics.service.ts** | Prometheus metrics collection |
| **logger.ts** | Winston-based logging utility |

## Sequence Diagrams

### 1. Creating a Chat Session

```mermaid
sequenceDiagram
    participant Client
    participant Routes as chat.routes
    participant Controller as chat.controller
    participant Auth as auth.middleware
    participant Validation as validation.middleware
    participant Model as chat-session.model
    participant MongoDB
    
    Client->>Routes: POST /api/chat/sessions
    Routes->>Auth: authenticateJWT()
    Auth->>Auth: Verify JWT token
    Auth-->>Routes: User authenticated
    
    Routes->>Validation: validateCreateSession()
    Validation->>Validation: Validate request body
    Validation-->>Routes: Request validated
    
    Routes->>Controller: createChatSession()
    Controller->>Model: new ChatSession()
    Controller->>MongoDB: session.save()
    MongoDB-->>Controller: Session saved
    Controller-->>Client: 201 Created (sessionId)
```

### 2. Streaming Chat Response

```mermaid
sequenceDiagram
    participant Client
    participant Routes as chat.routes
    participant Controller as chat.controller
    participant MongoDB
    participant StreamingService as streaming.service
    participant AccountingAPI
    participant BedrockAPI as AWS Bedrock
    participant ObservationManager as observation.service
    
    Client->>Routes: POST /api/chat/sessions/:sessionId/stream
    Routes->>Controller: streamChatResponse()
    Controller->>MongoDB: Find chat session
    MongoDB-->>Controller: Session data
    
    Controller->>StreamingService: initializeStreamingSession()
    StreamingService->>AccountingAPI: Initialize streaming session
    AccountingAPI-->>StreamingService: Session approved
    StreamingService-->>Controller: Stream session ID
    
    Controller->>MongoDB: Update session with user message
    MongoDB-->>Controller: Session updated
    
    Controller->>StreamingService: streamResponse()
    StreamingService->>BedrockAPI: InvokeModelWithResponseStream
    Controller->>ObservationManager: registerStream()
    
    loop For each chunk
        BedrockAPI-->>StreamingService: Chunk data
        StreamingService-->>Client: Server-Sent Event
        ObservationManager-->>Observers: Broadcast chunk to observers
    end
    
    StreamingService->>AccountingAPI: Finalize streaming session
    StreamingService-->>Controller: Stream complete
    Controller->>MongoDB: Update session with complete response
    MongoDB-->>Controller: Session updated
```

### 3. Model Recommendation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Routes as model.routes
    participant Controller as model.controller
    participant Auth as auth.middleware
    participant RecommendationService as model-recommendation.service
    
    Client->>Routes: POST /api/models/recommend
    Routes->>Auth: authenticateJWT()
    Auth-->>Routes: User authenticated
    
    Routes->>Controller: getModelRecommendation()
    Controller->>RecommendationService: recommendModel(task, priority)
    RecommendationService->>RecommendationService: Select model based on criteria
    RecommendationService-->>Controller: Recommendation with reason
    
    Controller->>RecommendationService: getAvailableModels(userRole)
    RecommendationService-->>Controller: Available models for user
    
    Controller-->>Client: 200 OK (recommendation)
```

### 4. Supervisor Observation Flow

```mermaid
sequenceDiagram
    participant Supervisor
    participant Routes as chat.routes
    participant Controller as chat.controller
    participant Auth as auth.middleware
    participant RoleCheck as auth.middleware
    participant ObservationManager as observation.service
    participant ActiveStream
    
    Supervisor->>Routes: GET /api/chat/sessions/:sessionId/observe
    Routes->>Auth: authenticateJWT()
    Auth-->>Routes: User authenticated
    
    Routes->>RoleCheck: checkRole(['admin', 'supervisor'])
    RoleCheck-->>Routes: Role verified
    
    Routes->>Controller: observeSession()
    Controller->>ObservationManager: isStreamActive(sessionId)
    ObservationManager-->>Controller: Stream status
    
    Controller->>ObservationManager: addObserver(sessionId, callback)
    ObservationManager->>ObservationManager: Register observer
    
    loop Until disconnect
        ActiveStream->>ObservationManager: Stream data
        ObservationManager->>Supervisor: Forward SSE events
    end
    
    Supervisor->>Controller: Client disconnect
    Controller->>ObservationManager: Unsubscribe observer
```

## Data Flow

```mermaid
graph LR
    Client[Client] --> |Requests| API[API Routes]
    API --> |Authentication| Auth[Auth Middleware]
    API --> |Validation| Validation[Validation Middleware]
    API --> |Rate Limiting| RateLimiter[Rate Limiter]
    API --> |Controllers| BusinessLogic[Business Logic]
    
    BusinessLogic --> |Query/Update| Database[(MongoDB)]
    BusinessLogic --> |Streaming| BedrockAPI[AWS Bedrock]
    BusinessLogic --> |Credit Check| AccountingAPI[Accounting Service]
    
    BedrockAPI --> |Stream Response| Client
    BusinessLogic --> |Metrics| Prometheus[Prometheus Metrics]
    Client --> |Monitoring| Supervisors[Supervisors]
```

## External Service Integration

```mermaid
graph TB
    subgraph "Chat Service"
        API[API Layer]
        Business[Business Logic]
        Auth[Auth Middleware]
    end
    
    subgraph "External Services"
        AccountingService[Accounting Service]
        AuthService[Auth Service]
        AWS[AWS Bedrock]
    end
    
    API --> Business
    Business --> AWS
    Auth --> AuthService
    Business --> AccountingService
    
    AccountingService -->|Credit Management| Business
    AuthService -->|User Verification| Auth
    AWS -->|AI Model Responses| Business
```