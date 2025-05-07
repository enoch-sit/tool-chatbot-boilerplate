# Chat Service Code Map

## Overview
This document provides an overview of the Chat Service codebase, detailing the purpose of each file in the `src` directory and illustrating the interactions between components using Mermaid diagrams.

## File Descriptions

### `src/server.ts`
- **Purpose**: Entry point of the Chat Service application. Sets up the Express server, middleware, and routes.

### `src/config/config.ts`
- **Purpose**: Centralized configuration file for environment variables and application settings.

### `src/config/db.ts`
- **Purpose**: Handles MongoDB connection setup, events, and graceful shutdown procedures.

### `src/controllers/chat.controller.ts`
- **Purpose**: Contains route handlers for chat-related operations, such as creating sessions, sending messages, and streaming responses.

### `src/controllers/model.controller.ts`
- **Purpose**: Handles requests related to model operations, such as fetching available models and recommending models based on user input.

### `src/services/streaming.service.ts`
- **Purpose**: Handles interactions with AWS Bedrock for streaming responses and manages streaming sessions with the accounting service.

### `src/services/observation.service.ts`
- **Purpose**: Manages stream observers for supervisors to monitor student conversations using a Singleton pattern.

### `src/services/model-recommendation.service.ts`
- **Purpose**: Provides functions for recommending LLM models based on tasks and priorities, and defines available models.

### `src/services/metrics.service.ts`
- **Purpose**: Sets up Prometheus metrics for monitoring service performance and usage.

### `src/models/chat-session.model.ts`
- **Purpose**: Defines the Mongoose schema and model for storing chat session data in MongoDB.

### `src/routes/chat.routes.ts`
- **Purpose**: Defines the API endpoints for chat-related operations and maps them to controller functions.

### `src/routes/model.routes.ts`
- **Purpose**: Defines the API endpoints for model-related operations and maps them to controller functions.

### `src/middleware/auth.middleware.ts`
- **Purpose**: Middleware for authenticating and authorizing API requests using JWT tokens.

### `src/middleware/validation.middleware.ts`
- **Purpose**: Provides validation chains for request parameters using express-validator.

### `src/middleware/rate-limit.middleware.ts`
- **Purpose**: Implements rate limiting functionality to prevent API abuse.

### `src/middleware/metrics.middleware.ts`
- **Purpose**: Middleware to track HTTP request durations and responses for Prometheus metrics.

### `src/utils/logger.ts`
- **Purpose**: Provides a centralized logging utility for the application using Winston.

## Component Interactions

### 1. System Overview
The following diagram provides a high-level overview of the Chat Service architecture:

```mermaid
graph TD
    User((User)) -->|Requests| Server[server.ts]
    Server -->|Routes to| ChatRoutes[chat.routes.ts]
    Server -->|Routes to| ModelRoutes[model.routes.ts]
    Server -->|Connects to| MongoDB[(MongoDB)]
    Server -->|Logs with| Logger[logger.ts]
    Server -->|Monitors with| Metrics[metrics.service.ts]
```

### 2. Request Flow
This diagram illustrates the typical flow of a request through the system:

```mermaid
sequenceDiagram
    participant Client as Client
    participant Server as server.ts
    participant Auth as auth.middleware.ts
    participant Validation as validation.middleware.ts
    participant RateLimit as rate-limit.middleware.ts
    participant Controller as Controller
    participant Service as Service
    participant DB as Database
    
    Client->>Server: Request
    Server->>Auth: Pass request
    Auth->>Validation: Validate request
    Validation->>RateLimit: Check rate limits
    RateLimit->>Controller: Route to controller
    Controller->>Service: Process request
    Service->>DB: Query/update data
    DB-->>Service: Return data
    Service-->>Controller: Return result
    Controller-->>Client: Send response
```

### 3. Chat Session Management
This diagram shows how chat sessions are created, managed, and streamed:

```mermaid
sequenceDiagram
    participant Client as Client
    participant ChatController as chat.controller.ts
    participant ChatSession as chat-session.model.ts
    participant StreamingService as streaming.service.ts
    participant ObservationManager as observation.service.ts
    participant Bedrock as AWS Bedrock
    participant Accounting as Accounting Service
    participant MongoDB as MongoDB
    
    Client->>ChatController: Create session/Send message
    ChatController->>ChatSession: Create/Update session
    ChatSession->>MongoDB: Save session data
    Client->>ChatController: Request stream
    ChatController->>StreamingService: Initialize stream
    StreamingService->>Accounting: Register streaming session
    Accounting-->>StreamingService: Session approved
    StreamingService->>Bedrock: Request completion
    StreamingService->>ObservationManager: Register stream
    Bedrock-->>StreamingService: Stream chunks
    StreamingService-->>Client: Forward chunks
    StreamingService-->>ObservationManager: Forward chunks
    StreamingService-->>ChatController: Complete response
    ChatController->>ChatSession: Update with response
    ChatSession->>MongoDB: Save complete response
```

### 4. Model Management Flow
This diagram shows the model recommendation and selection flow:

```mermaid
sequenceDiagram
    participant Client as Client
    participant ModelController as model.controller.ts
    participant RecommendationService as model-recommendation.service.ts
    participant ChatController as chat.controller.ts
    
    Client->>ModelController: Get available models
    ModelController->>RecommendationService: Request models
    RecommendationService-->>ModelController: Return model list
    ModelController-->>Client: Return available models
    
    Client->>ModelController: Request recommendation
    Note over Client,ModelController: Provides task & priority
    ModelController->>RecommendationService: Get recommendation
    RecommendationService-->>ModelController: Return recommended model
    ModelController-->>Client: Return recommendation
    
    Client->>ChatController: Select model for chat
    ChatController->>RecommendationService: Validate model selection
    ChatController->>ChatController: Apply selected model
```

### 5. Streaming and Observation
This diagram illustrates the streaming and observation mechanism:

```mermaid
sequenceDiagram
    participant Client as Client
    participant Supervisor as Supervisor
    participant ChatController as chat.controller.ts
    participant StreamingService as streaming.service.ts
    participant ObservationManager as observation.service.ts
    participant Bedrock as AWS Bedrock
    
    Client->>ChatController: Request stream
    ChatController->>StreamingService: Initialize stream
    StreamingService->>Bedrock: Request completion
    StreamingService->>ObservationManager: Register stream
    
    Bedrock-->>StreamingService: Stream text chunks
    StreamingService-->>Client: Forward chunks (SSE)
    StreamingService-->>ObservationManager: Forward chunks
    
    Supervisor->>ChatController: Observe session
    ChatController->>ObservationManager: Add observer
    ObservationManager-->>Supervisor: Stream chunks (SSE)
    
    Note over StreamingService,ObservationManager: Real-time monitoring
    
    Bedrock-->>StreamingService: Stream complete
    StreamingService-->>Client: Send completion event
    StreamingService-->>ObservationManager: End stream
    ObservationManager-->>Supervisor: End stream
```

### 6. Metrics and Logging
This diagram shows the metrics collection and logging system:

```mermaid
sequenceDiagram
    participant Server as server.ts
    participant MetricsMiddleware as metrics.middleware.ts
    participant MetricsService as metrics.service.ts
    participant Components as Controllers/Services
    participant Logger as logger.ts
    participant Prometheus as Prometheus
    
    Server->>MetricsMiddleware: Request passes through
    MetricsMiddleware->>MetricsService: Record request start
    Components->>Logger: Log operations
    MetricsMiddleware->>MetricsService: Record request end
    MetricsService->>MetricsService: Update metrics
    Prometheus->>MetricsService: Scrape /metrics endpoint
    MetricsService-->>Prometheus: Return metrics data
```

## Summary
This document provides a high-level overview of the Chat Service codebase, detailing the purpose of each file and illustrating the flow of interactions between components. The Mermaid diagrams help visualize the relationships and dependencies within the system from different perspectives.
