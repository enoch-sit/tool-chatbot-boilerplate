# Accounting Service Code Map

This document provides a comprehensive overview of the Accounting Service architecture, components, and workflows.

## Overview

The Accounting Service is responsible for managing user credit allocations, tracking usage, and monitoring streaming sessions. It provides API endpoints for credit management, usage tracking, and streaming session management.

## Key Components

- **User Management**: Keeps track of users and their roles
- **Credit Management**: Allocates, deducts, and refunds credits to users
- **Usage Tracking**: Records service usage for billing and analytics
- **Streaming Sessions**: Manages credit allocation for streaming LLM responses

## Directory Structure

```
accounting-service/
├── src/
│   ├── server.ts                    # Main application entry point
│   ├── config/
│   │   └── sequelize.ts             # Database configuration
│   ├── controllers/                 # API endpoint handlers
│   │   ├── credit.controller.ts     # Credit management endpoints
│   │   ├── streaming-session.controller.ts  # Streaming session endpoints
│   │   └── usage.controller.ts      # Usage tracking endpoints
│   ├── middleware/
│   │   └── jwt.middleware.ts        # Authentication middleware
│   ├── models/                      # Database models
│   │   ├── credit-allocation.model.ts
│   │   ├── streaming-session.model.ts
│   │   ├── usage-record.model.ts
│   │   └── user-account.model.ts
│   ├── routes/                      # API route definitions
│   │   ├── api.routes.ts            # Main API router
│   │   ├── credit.routes.ts         # Credit management routes
│   │   ├── streaming-session.routes.ts # Streaming session routes
│   │   └── usage.routes.ts          # Usage tracking routes
│   └── services/                    # Business logic
│       ├── credit.service.ts        # Credit management logic
│       ├── streaming-session.service.ts # Streaming session logic
│       ├── usage.service.ts         # Usage tracking logic
│       └── user-account.service.ts  # User account management logic
```

## Architecture Overview

### Class Diagram

```mermaid
classDiagram
    class Server {
        +express app
        +startServer()
    }
    
    class UserAccount {
        +userId: string
        +email: string
        +username: string
        +role: string
    }
    
    class CreditAllocation {
        +id: number
        +userId: string
        +totalCredits: number
        +remainingCredits: number
        +allocatedBy: string
        +expiresAt: Date
    }
    
    class StreamingSession {
        +id: number
        +sessionId: string
        +userId: string
        +modelId: string
        +estimatedCredits: number
        +allocatedCredits: number
        +usedCredits: number
        +status: string
    }
    
    class UsageRecord {
        +id: number
        +userId: string
        +timestamp: Date
        +service: string
        +operation: string
        +credits: number
        +metadata: object
    }
    
    class UserAccountService {
        +findOrCreateUser()
        +userExists()
    }
    
    class CreditService {
        +getUserBalance()
        +checkUserCredits()
        +allocateCredits()
        +deductCredits()
        +calculateCreditsForTokens()
    }
    
    class StreamingSessionService {
        +initializeSession()
        +finalizeSession()
        +abortSession()
        +getActiveSessions()
        +getAllActiveSessions()
    }
    
    class UsageService {
        +recordUsage()
        +getUserStats()
        +getSystemStats()
    }
    
    class JWTMiddleware {
        +authenticateJWT()
        +requireAdmin()
        +requireSupervisor()
    }
    
    UserAccount <-- CreditAllocation : has many
    UserAccount <-- StreamingSession : has many
    UserAccount <-- UsageRecord : has many
    
    UserAccountService --> UserAccount : manages
    CreditService --> CreditAllocation : manages
    StreamingSessionService --> StreamingSession : manages
    UsageService --> UsageRecord : manages
    
    StreamingSessionService --> CreditService : uses
    StreamingSessionService --> UsageService : uses
    
    Server --> JWTMiddleware : uses
```

## Key Workflows

### Credit Allocation Workflow

```mermaid
sequenceDiagram
    participant Client
    participant APIRouter as API Router
    participant JWTMiddleware as JWT Middleware
    participant CreditController
    participant CreditService
    participant UserAccountService
    participant DB as Database

    Client->>APIRouter: POST /api/credits/allocate
    APIRouter->>JWTMiddleware: authenticateJWT()
    JWTMiddleware->>JWTMiddleware: Verify token
    JWTMiddleware->>UserAccountService: findOrCreateUser()
    UserAccountService->>DB: Create or retrieve user
    UserAccountService-->>JWTMiddleware: User info
    JWTMiddleware->>JWTMiddleware: requireSupervisor()
    JWTMiddleware->>CreditController: allocateCredits()
    CreditController->>UserAccountService: findOrCreateUser()
    UserAccountService->>DB: Query user account
    UserAccountService-->>CreditController: User account
    CreditController->>CreditService: allocateCredits()
    CreditService->>DB: Create credit allocation
    CreditService-->>CreditController: Allocation result
    CreditController-->>Client: Allocation response
```

### Streaming Session Initialization Workflow

```mermaid
sequenceDiagram
    participant Client
    participant APIRouter as API Router
    participant JWTMiddleware as JWT Middleware
    participant SessionController as Streaming Session Controller
    participant SessionService as Streaming Session Service
    participant CreditService
    participant UsageService
    participant DB as Database

    Client->>APIRouter: POST /api/streaming-sessions/initialize
    APIRouter->>JWTMiddleware: authenticateJWT()
    JWTMiddleware-->>SessionController: User info
    SessionController->>SessionService: initializeSession()
    SessionService->>CreditService: calculateCreditsForTokens()
    CreditService-->>SessionService: Required credits
    SessionService->>CreditService: checkUserCredits()
    CreditService->>DB: Query credit allocations
    CreditService-->>SessionService: Has sufficient credits?
    
    alt Sufficient credits
        SessionService->>CreditService: deductCredits()
        CreditService->>DB: Update credit allocations
        CreditService-->>SessionService: Deduction successful
        SessionService->>DB: Create streaming session
        SessionService-->>SessionController: Session initialized
        SessionController-->>Client: Session details
    else Insufficient credits
        SessionService-->>SessionController: Error: Insufficient credits
        SessionController-->>Client: 402 Payment Required
    end
```

### Streaming Session Finalization Workflow

```mermaid
sequenceDiagram
    participant Client
    participant APIRouter as API Router
    participant JWTMiddleware as JWT Middleware
    participant SessionController as Streaming Session Controller
    participant SessionService as Streaming Session Service
    participant CreditService
    participant UsageService
    participant DB as Database

    Client->>APIRouter: POST /api/streaming-sessions/finalize
    APIRouter->>JWTMiddleware: authenticateJWT()
    JWTMiddleware-->>SessionController: User info
    SessionController->>SessionService: finalizeSession()
    SessionService->>DB: Query session
    DB-->>SessionService: Session details
    SessionService->>CreditService: calculateCreditsForTokens()
    CreditService-->>SessionService: Actual credits used
    SessionService->>DB: Update session
    SessionService->>UsageService: recordUsage()
    UsageService->>DB: Create usage record
    
    alt Refund needed
        SessionService->>CreditService: allocateCredits() (refund)
        CreditService->>DB: Create refund allocation
    end
    
    SessionService-->>SessionController: Finalization result
    SessionController-->>Client: Session details
```

### Usage Stats Retrieval Workflow

```mermaid
sequenceDiagram
    participant Client
    participant APIRouter as API Router
    participant JWTMiddleware as JWT Middleware
    participant UsageController
    participant UsageService
    participant DB as Database

    Client->>APIRouter: GET /api/usage/stats
    APIRouter->>JWTMiddleware: authenticateJWT()
    JWTMiddleware-->>UsageController: User info
    UsageController->>UsageService: getUserStats()
    UsageService->>DB: Query usage records
    DB-->>UsageService: Usage data
    UsageService->>UsageService: Calculate statistics
    UsageService-->>UsageController: Usage statistics
    UsageController-->>Client: Usage data
```

## API Endpoints

### Credit Management
- `GET /api/credits/balance` - Get current user's credit balance
- `POST /api/credits/check` - Check if user has sufficient credits
- `POST /api/credits/calculate` - Calculate required credits for an operation
- `POST /api/credits/allocate` - Allocate credits to a user (admin/supervisor)
- `GET /api/credits/balance/:userId` - Get a user's credit balance (admin/supervisor)

### Streaming Sessions
- `POST /api/streaming-sessions/initialize` - Initialize a streaming session
- `POST /api/streaming-sessions/finalize` - Finalize a streaming session
- `POST /api/streaming-sessions/abort` - Abort a streaming session
- `GET /api/streaming-sessions/active` - Get active sessions for current user
- `GET /api/streaming-sessions/active/all` - Get all active sessions (admin)

### Usage Tracking
- `POST /api/usage/record` - Record a usage event
- `GET /api/usage/stats` - Get current user's usage statistics
- `GET /api/usage/stats/:userId` - Get user's usage stats (admin/supervisor)
- `GET /api/usage/system-stats` - Get system-wide usage statistics (admin)

## Database Models

### UserAccount
Stores user information synchronized from the Authentication service.

### CreditAllocation
Tracks credit allocations to users, including remaining credits and expiration.

### StreamingSession
Manages active and completed streaming sessions, tracking credit allocation and usage.

### UsageRecord
Records all service usage for billing and analytics purposes.