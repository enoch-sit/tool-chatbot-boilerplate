# Accounting Service Features

## 1. Overview

The Accounting Service is responsible for managing user credits, tracking service usage, and handling streaming sessions within the platform. It ensures that users have sufficient credits for operations, records all billable events, and provides mechanisms for administrators to manage user credits and monitor system activity. All interactions with this service are secured using JWT authentication, relying on an external Authentication Service for token generation and initial user validation.

## 2. Core Features

The Accounting Service provides the following core functionalities:

### 2.1. Credit Management

Handles all aspects of user credit balances.

- **Get User Credit Balance**:
  - `GET /api/credits/balance`: Authenticated users can retrieve their own credit balance.
  - `GET /api/credits/balance/:userId`: Administrators and supervisors can retrieve the credit balance of a specific user.
- **Check Sufficient Credits**:
  - `POST /api/credits/check`: Allows services to verify if a user has enough credits for a requested operation before execution. Expects `requiredCredits` in the request body.
- **Calculate Credit Cost**:
  - `POST /api/credits/calculate`: Calculates the credit cost for an operation based on parameters like `modelId` and `tokens`.
- **Allocate Credits**:
  - `POST /api/credits/allocate`: Administrators and supervisors can allocate credits to users. Requires `userId`, `credits`, and optionally `expiryDays` and `notes`.

### 2.2. Streaming Session Management

Manages the lifecycle of streaming operations, which often involve pre-authorizing and then reconciling credits.

- **Initialize Session**:
  - `POST /api/streaming-sessions/initialize`: Initiates a new streaming session, pre-allocating estimated credits. Requires `sessionId`, `modelId`, and `estimatedTokens`.
- **Finalize Session**:
  - `POST /api/streaming-sessions/finalize`: Concludes a streaming session, reconciling actual token usage (`actualTokens`) against pre-allocated credits and processing refunds if necessary.
- **Abort Session**:
  - `POST /api/streaming-sessions/abort`: Aborts an ongoing streaming session, calculating charges for tokens generated before the abort (`tokensGenerated`) and processing refunds.
- **View Active/Recent Sessions**:
  - `GET /api/streaming-sessions/active`: Users can view their own active sessions.
  - `GET /api/streaming-sessions/active/:userId`: Administrators/supervisors can view active sessions for a specific user.
  - `GET /api/streaming-sessions/active/all`: Administrators can view all active sessions in the system.
  - `GET /api/streaming-sessions/recent`: Administrators/supervisors can view recently concluded or active sessions.
  - `GET /api/streaming-sessions/recent/:userId`: Administrators/supervisors can view recent sessions for a specific user.

### 2.3. Usage Tracking

Records service usage events and provides access to usage statistics.

- **Record Usage Event**:
  - `POST /api/usage/record`: Allows services to record a usage event, including the `service` name, `operation` performed, `credits` consumed, and optional `metadata`.
- **Get Usage Statistics**:
  - `GET /api/usage/stats`: Authenticated users can retrieve their own usage statistics, filterable by date.
  - `GET /api/usage/stats/:userId`: Administrators and supervisors can retrieve usage statistics for a specific user.
  - `GET /api/usage/system-stats`: Administrators can retrieve system-wide usage statistics.

## 3. Authentication

All API endpoints (except `/api/health`) in the Accounting Service are protected and require a valid JSON Web Token (JWT) passed in the `Authorization` header as a Bearer token.

```
Authorization: Bearer <access_token>
```

### 3.1. Interaction with External Authentication Service

- The Accounting Service **does not issue JWTs**. It relies on an external Authentication Service (as described in `ExternalAuthAPIEndpoint.md`) to authenticate users and generate access tokens.
- When a request arrives at the Accounting Service, the `jwt.middleware.ts` intercepts it.
- The middleware verifies the token using a shared secret (e.g., `process.env.JWT_ACCESS_SECRET`). This secret must be identical to the one used by the Authentication Service to sign the tokens.
- The JWT payload is expected to contain user information such as `sub` (subject, used as `userId`), `username`, `email`, and `role`.
- Upon successful verification, the user's information is extracted from the token and attached to the Express `req.user` object, making it available to the controllers.
- The middleware also handles user account synchronization by attempting to find or create a corresponding user record in the Accounting Service's local database (`UserAccount` model) based on the information from the JWT. This ensures that the Accounting Service has a local representation of the user for associating credits and usage.

### 3.2. Role-Based Access Control (RBAC)

- The `role` claim within the JWT is used to enforce role-based access.
- Specific endpoints require `admin` or `supervisor` roles, as detailed in `api.routes.ts` and enforced by `requireAdmin` and `requireSupervisor` middleware.

## 4. Key Workflow Example: API Request with JWT Authentication

This diagram illustrates a typical API request to a protected endpoint in the Accounting Service.

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant AuthExt as External Auth Service
    participant AccSvc as Accounting Service
    participant AccDB as Accounting DB

    Client->>AuthExt: Login Request (credentials)
    activate AuthExt
    AuthExt-->>Client: JWT Access Token
    deactivate AuthExt

    Client->>AccSvc: API Request (e.g., GET /api/credits/balance)
    note right of Client: Includes "Authorization: Bearer <token>" header
    activate AccSvc

    AccSvc->>AccSvc: JWT Middleware: Verify Token
    activate AccSvc #DarkSlateGray
    Note over AccSvc: Uses shared JWT_ACCESS_SECRET
    AccSvc-->>AccSvc: Token Validated, User Info Extracted (userId, role, etc.)
    deactivate AccSvc #DarkSlateGray

    AccSvc->>AccDB: Find/Create UserAccount (based on JWT info)
    activate AccDB
    AccDB-->>AccSvc: UserAccount record
    deactivate AccDB
    Note over AccSvc: req.user populated

    AccSvc->>AccSvc: Controller (e.g., CreditController.getUserBalance)
    activate AccSvc #LightCoral
    AccSvc->>AccDB: Query for credit balance (userId)
    activate AccDB
    AccDB-->>AccSvc: Credit Balance Data
    deactivate AccDB
    AccSvc-->>Client: API Response (e.g., 200 OK with balance)
    deactivate AccSvc #LightCoral
    deactivate AccSvc
```

This workflow demonstrates:

1. The client first obtains a JWT from the External Authentication Service.
2. The client includes this JWT in the `Authorization` header when making requests to the Accounting Service.
3. The Accounting Service's JWT middleware validates the token and extracts user details.
4. The service then processes the request, potentially interacting with its database, and returns a response.
