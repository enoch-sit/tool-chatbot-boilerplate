# Accounting Service API Documentation

## Base Path: `/api`

## Authentication
- Most endpoints require JWT authentication. The JWT is expected in the `Authorization` header as a Bearer token.
- Specific roles (e.g., `admin`, `supervisor`) are required for certain endpoints, enforced by middleware.

---

## Public Endpoints

### 1. Health Check
- **Endpoint:** `GET /api/health`
- **Description:** Returns basic service status information. This is a public endpoint and does not require authentication.
- **Request:** None
- **Response (200 OK):**
  ```json
  {
    "status": "string",
    "service": "string",
    "version": "string",
    "timestamp": "string"
  }
  ```
- **Controller Function Snippet (from `api.routes.ts`):**
  ```typescript
  // src/routes/api.routes.ts
  // ...existing code...
  router.get('/health', (_, res) => {
    res.status(200).json({ 
      status: 'ok',
      service: 'accounting-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    });
  });
  // ...existing code...
  ```

---

## Credit Management Endpoints
Handled by `CreditController`. Base path: `/api/credits`

### 1. Get Current User's Credit Balance
- **Endpoint:** `GET /api/credits/balance`
- **Description:** Returns the authenticated user's current credit balance and active allocations.
- **Authentication:** JWT required.
- **Request:** None
- **Response (200 OK):**
  ```json
  {
    "totalCredits": "number",
    "activeAllocations": "Array" // Array of objects with { id, credits, expiresAt, allocatedAt }
  }
  ```
- **Error Responses:**
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `credit.controller.ts`):**
  ```typescript
  // src/controllers/credit.controller.ts
  // ...existing code...
  async getUserBalance(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const balanceInfo = await CreditService.getUserBalance(req.user.userId);
      return res.status(200).json(balanceInfo);
    } catch (error) {
      console.error('Error getting user balance:', error);
      return res.status(500).json({ message: 'Failed to retrieve credit balance' });
    }
  }
  // ...existing code...
  ```

### 2. Check if User Has Sufficient Credits
- **Endpoint:** `POST /api/credits/check`
- **Description:** Verifies if the authenticated user has enough credits for an operation.
- **Authentication:** JWT required.
- **Request Body:**
  ```json
  {
    "requiredCredits": "number" // Amount of credits needed for the operation
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "sufficient": "boolean",
    "credits": "number", // Optional: current total credits if sufficient
    "requiredCredits": "number" // Optional: credits that were checked
  }
  ```
  or if insufficient:
  ```json
  {
    "sufficient": false,
    "message": "Insufficient credits"
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If `requiredCredits` field is missing/invalid.
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If check fails.
- **Controller Function Snippet (from `credit.controller.ts`):**
  ```typescript
  // src/controllers/credit.controller.ts
  // ...existing code...
  async checkCredits(req: Request, res: Response) {
    logger.debug(`[CreditController.checkCredits] Received request. User: ${req.user?.userId}, Body: ${JSON.stringify(req.body)}`);
    // ... existing logging and comments ...
    try {
      if (!req.user?.userId) {
        logger.warn('[CreditController.checkCredits] User not authenticated.');
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { 
        requiredCredits // Changed from 'credits' to 'requiredCredits' to match API doc
      } = req.body;
      
      // ... existing logging ...

      // Validation for requiredCredits
      if (typeof requiredCredits !== 'number' || requiredCredits < 0) { // Allow 0 credits check
        logger.warn(`[CreditController.checkCredits] Invalid requiredCredits: ${requiredCredits}`);
        return res.status(400).json({ message: 'Valid requiredCredits amount required' });
      }

      logger.debug(`[CreditController.checkCredits] Calling CreditService.checkUserCredits with userId: ${req.user.userId}, requiredCredits: ${requiredCredits}`);
      const sufficient = await CreditService.checkUserCredits(req.user.userId, requiredCredits);
      logger.debug(`[CreditController.checkCredits] CreditService.checkUserCredits returned: ${sufficient}`);
      
      if (sufficient) {
        // ... existing code ...
        return res.status(200).json({ 
          sufficient: true,
          credits: balanceInfo.totalCredits, // current balance
          requiredCredits
        });
      } else {
        // ... existing code ...
        return res.status(200).json({ 
          sufficient: false, 
          message: "Insufficient credits",
          requiredCredits // Optionally return what was required
        });
      }
    } catch (error: any) {
      // ... existing code ...
    }
  }
  // ...existing code...
  ```

### 3. Calculate Credits for a Specific Operation
- **Endpoint:** `POST /api/credits/calculate`
- **Description:** Calculates the credit cost for a specific operation, typically based on AI model and token count.
- **Authentication:** JWT required.
- **Request Body:**
  ```json
  {
    "modelId": "string",
    "tokens": "number"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "credits": "number"
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If required fields are missing/invalid.
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If calculation fails.
- **Controller Function Snippet (from `credit.controller.ts`):**
  ```typescript
  // src/controllers/credit.controller.ts
  // ...existing code...
  async calculateCredits(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { modelId, tokens } = req.body;
      console.log(`[CreditController.calculateCredits] Received request: user=${req.user.userId}, modelId=${modelId}, tokens=${tokens}`);
      
      if (!modelId || typeof tokens !== 'number' || tokens < 0) {
        console.warn(`[CreditController.calculateCredits] Invalid request body: modelId=${modelId}, tokens=${tokens}`);
        return res.status(400).json({ message: 'Valid modelId and tokens required' });
      }
      
      const credits = await CreditService.calculateCreditsForTokens(modelId, tokens);
      console.log(`[CreditController.calculateCredits] Calculated credits: ${credits} for modelId=${modelId}, tokens=${tokens}`);
      
      if (typeof credits !== 'number' || isNaN(credits)) {
        console.error(`[CreditController.calculateCredits] CreditService.calculateCreditsForTokens returned invalid value: ${credits}. Responding with 500.`);
        return res.status(500).json({ message: 'Failed to calculate credits due to internal error' });
      }

      return res.status(200).json({ credits });
    } catch (error: any) {
      console.error('[CreditController.calculateCredits] Error calculating credits:', error.message);
      return res.status(500).json({ message: 'Failed to calculate credits' });
    }
  }
  // ...existing code...
  ```

### 4. Get a User's Credit Balance (Admin/Supervisors Only)
- **Endpoint:** `GET /api/credits/balance/:userId`
- **Description:** Returns a specific user's credit balance.
- **Authentication:** JWT required.
- **Authorization:** `admin` or `supervisor` role required.
- **Path Parameters:**
    - `userId`: string - ID of the user to check.
- **Response (200 OK):**
  ```json
  {
    "totalCredits": "number",
    "activeAllocations": "Array"
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If `userId` is missing.
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks permission.
    - 404 Not Found: If target user doesn't exist.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `credit.controller.ts`):**
  ```typescript
  // src/controllers/credit.controller.ts
  // ...existing code...
  async getUserBalanceByAdmin(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const userExists = await UserAccountService.userExists(userId);
      if (!userExists) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const balanceInfo = await CreditService.getUserBalance(userId);
      return res.status(200).json(balanceInfo);
    } catch (error) {
      console.error('Error getting user balance by admin:', error);
      return res.status(500).json({ message: 'Failed to retrieve credit balance' });
    }
  }
  // ...existing code...
  ```

### 5. Allocate Credits to a User (Admin/Supervisors Only)
- **Endpoint:** `POST /api/credits/allocate`
- **Description:** Allocates credits to a specific user.
- **Authentication:** JWT required.
- **Authorization:** `admin` or `supervisor` role required.
- **Request Body:**
  ```json
  {
    "userId": "string",         // ID of the user to receive credits
    "credits": "number",        // Amount of credits to allocate
    "expiryDays": "number",     // Optional: Days until credits expire (default: 30)
    "notes": "string"           // Optional: Notes about the allocation
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "string",             // ID of the credit allocation record
    "userId": "string",
    "totalCredits": "number",   // Credits allocated in this transaction
    "remainingCredits": "number",// Remaining credits in this allocation (same as totalCredits initially)
    "expiresAt": "string"       // ISO date string of when the allocation expires
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If required fields are missing/invalid.
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks permission.
    - 404 Not Found: If target user for allocation doesn't exist (behavior may vary based on implementation, might create user).
    - 500 Server Error: If allocation fails.
- **Controller Function Snippet (from `credit.controller.ts`):**
  ```typescript
  // src/controllers/credit.controller.ts
  // ...existing code...
  async allocateCredits(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const { userId, credits, expiryDays, notes } = req.body;
      
      if (!userId || typeof credits !== 'number' || credits <= 0) {
        return res.status(400).json({ message: 'Valid userId and credits required' });
      }
      
      // ... logic to find or create user (targetUserAccount, actualUserIdForAllocation) ...
      // This part involves resolving userId which might be a username or UUID.

      const actualUserIdForAllocation = targetUserAccount ? targetUserAccount.userId : userId; // Simplified for snippet
      // ... ensure user account exists ...

      try {
        const allocation = await CreditService.allocateCredits({
          userId: actualUserIdForAllocation,
          credits,
          allocatedBy: req.user.userId, // Admin/supervisor performing allocation
          expiryDays,
          notes
        });
        
        console.log(`Credit allocation successful: ${JSON.stringify(allocation)}`);
        
        return res.status(201).json({
          id: allocation.id,
          userId: allocation.userId,
          totalCredits: allocation.totalCredits,
          remainingCredits: allocation.remainingCredits,
          expiresAt: allocation.expiresAt
        });
      } catch (creditError) {
        // ... error handling ...
      }
    } catch (error) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

---

## Streaming Session Endpoints
Handled by `StreamingSessionController`. Base path: `/api/streaming-sessions`

### 1. Initialize a Streaming Session
- **Endpoint:** `POST /api/streaming-sessions/initialize`
- **Description:** Creates a new streaming session and pre-allocates estimated credits.
- **Authentication:** JWT required.
- **Request Body:**
  ```json
  {
    "sessionId": "string",        // Unique identifier for the session
    "modelId": "string",          // ID of the AI model being used
    "estimatedTokens": "number"   // Estimated token usage for pre-allocation
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "sessionId": "string",
    "allocatedCredits": "number", // Credits pre-allocated for this session
    "status": "string"            // Status of the session (e.g., "initialized")
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If required fields are missing/invalid.
    - 401 Unauthorized: If no user authenticated.
    - 402 Payment Required: If user has insufficient credits for estimation.
    - 500 Server Error: If initialization fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async initializeSession(req: Request, res: Response) {
    try {
      const { sessionId, modelId, estimatedTokens } = req.body;
      
      if (!sessionId || !modelId || typeof estimatedTokens !== 'number' || estimatedTokens <= 0) { // Validate estimatedTokens
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const session = await StreamingSessionService.initializeSession({
        sessionId,
        userId: req.user.userId,
        modelId,
        estimatedTokens
      });
      
      return res.status(201).json({
        sessionId: session.sessionId,
        allocatedCredits: session.allocatedCredits,
        status: session.status
      });
    } catch (error: unknown) {
      // ... error handling, including for insufficient credits ...
    }
  }
  // ...existing code...
  ```

### 2. Finalize a Streaming Session
- **Endpoint:** `POST /api/streaming-sessions/finalize`
- **Description:** Completes a streaming session, reconciles actual credit usage, and processes refunds if necessary.
- **Authentication:** JWT required.
- **Request Body:**
  ```json
  {
    "sessionId": "string",        // ID of the session to finalize
    "actualTokens": "number",     // Actual tokens used in the session
    "success": "boolean"          // Optional (default true): Whether the session was successful
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "sessionId": "string",
    "actualCredits": "number",    // Actual credits consumed
    "refund": "number"            // Credits refunded (if pre-allocation was higher)
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If required fields are missing/invalid.
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If finalization fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async finalizeSession(req: Request, res: Response) {
    try {
      const { sessionId, actualTokens, success = true } = req.body;
      
      if (!sessionId || typeof actualTokens !== 'number' || actualTokens < 0) {
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const result = await StreamingSessionService.finalizeSession({
        sessionId,
        userId: req.user.userId,
        actualTokens,
        success
      });
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 3. Abort a Streaming Session
- **Endpoint:** `POST /api/streaming-sessions/abort`
- **Description:** Aborts an active streaming session and handles partial credit charges/refunds.
- **Authentication:** JWT required.
- **Request Body:**
  ```json
  {
    "sessionId": "string",        // ID of the session to abort
    "tokensGenerated": "number"   // Optional (default 0): Tokens generated before abort
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "sessionId": "string",
    "partialCredits": "number",   // Credits charged for partial usage
    "refund": "number"            // Credits refunded from pre-allocation
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If `sessionId` is missing or `tokensGenerated` is invalid.
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If abort fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async abortSession(req: Request, res: Response) {
    try {
      const { sessionId, tokensGenerated = 0 } = req.body;
      
      if (!sessionId || typeof tokensGenerated !== 'number' || tokensGenerated < 0) {
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const result = await StreamingSessionService.abortSession({
        sessionId,
        userId: req.user.userId,
        tokensGenerated
      });
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 4. Get Active Sessions for Current User
- **Endpoint:** `GET /api/streaming-sessions/active`
- **Description:** Returns all active streaming sessions for the authenticated user.
- **Authentication:** JWT required.
- **Request:** None
- **Response (200 OK):** `Array` of active session objects.
- **Error Responses:**
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async getActiveSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const sessions = await StreamingSessionService.getActiveSessions(req.user.userId);
      
      return res.status(200).json(sessions);
    } catch (error: unknown) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 5. Get Active Sessions for a Specific User (Admin/Supervisors Only)
- **Endpoint:** `GET /api/streaming-sessions/active/:userId`
- **Description:** Returns active streaming sessions for a specific user.
- **Authentication:** JWT required.
- **Authorization:** `admin` or `supervisor` role required.
- **Path Parameters:**
    - `userId`: string - ID of the user to check.
- **Response (200 OK):** `Array` of active session objects for the specified user.
- **Error Responses:**
    - 400 Bad Request: If `userId` is missing.
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks permission.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async getUserActiveSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const targetUserId = req.params.userId;
      
      if (!targetUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const sessions = await StreamingSessionService.getActiveSessions(targetUserId);
      
      return res.status(200).json(sessions);
    } catch (error: unknown) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 6. Get All Active Sessions (Admin Only)
- **Endpoint:** `GET /api/streaming-sessions/active/all`
- **Description:** Returns all active streaming sessions across all users in the system.
- **Authentication:** JWT required.
- **Authorization:** `admin` role required.
- **Request:** None
- **Response (200 OK):** `Array` of all active session objects.
- **Error Responses:**
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks admin permission.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async getAllActiveSessions(req: Request, res: Response) {
    try {
      // Check for user and admin role directly
      if (!req.user?.userId || req.user.role !== 'admin') {
         // Combine 401 and 403 logic: if no user or not admin, then forbid.
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const sessions = await StreamingSessionService.getAllActiveSessions();
      
      return res.status(200).json(sessions);
    } catch (error: unknown) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 7. Get Recent Sessions (Admin/Supervisors Only)
- **Endpoint:** `GET /api/streaming-sessions/recent`
- **Description:** Returns recent streaming sessions (active and recently completed) for all users.
- **Authentication:** JWT required.
- **Authorization:** `admin` or `supervisor` role required.
- **Query Parameters:**
    - `minutes`: number (optional) - Look back period in minutes (e.g., default 5 or 60).
- **Response (200 OK):**
  ```json
  {
    "sessions": "Array",    // Array of session objects
    "timestamp": "string",  // Current server time
    "filter": "Object"      // Details of the filter applied (e.g., { minutes: 5 })
  }
  ```
- **Error Responses:**
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks permission.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async getRecentSessions(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const minutes = req.query.minutes ? parseInt(req.query.minutes as string) : undefined; // Example: 60 minutes default
      if (minutes !== undefined && (isNaN(minutes) || minutes <=0)) {
        return res.status(400).json({ message: 'Invalid minutes parameter' });
      }

      const result = await StreamingSessionService.getRecentSessionsForAllUsers(minutes); // Assuming service method name
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 8. Get Recent Sessions for a Specific User (Admin/Supervisors Only)
- **Endpoint:** `GET /api/streaming-sessions/recent/:userId`
- **Description:** Returns recent streaming sessions for a specific user.
- **Authentication:** JWT required.
- **Authorization:** `admin` or `supervisor` role required.
- **Path Parameters:**
    - `userId`: string - ID of the user to check.
- **Query Parameters:**
    - `minutes`: number (optional) - Look back period in minutes.
- **Response (200 OK):**
  ```json
  {
    "sessions": "Array",
    "timestamp": "string",
    "filter": "Object"
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If `userId` is missing or `minutes` is invalid.
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks permission.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `streaming-session.controller.ts`):**
  ```typescript
  // src/controllers/streaming-session.controller.ts
  // ...existing code...
  async getUserRecentSessions(req: Request, res: Response) { // Renamed from getRecentSessions to avoid conflict
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const targetUserId = req.params.userId;
      if (!targetUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const minutes = req.query.minutes ? parseInt(req.query.minutes as string) : undefined;
      if (minutes !== undefined && (isNaN(minutes) || minutes <=0)) {
        return res.status(400).json({ message: 'Invalid minutes parameter' });
      }
      
      const result = await StreamingSessionService.getRecentSessionsForUser(targetUserId, minutes); // Assuming service method name
      
      return res.status(200).json(result);
    } catch (error: unknown) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

---

## Usage Tracking Endpoints
Handled by `UsageController`. Base path: `/api/usage`

### 1. Record a Usage Event
- **Endpoint:** `POST /api/usage/record`
- **Description:** Records a service usage event for the authenticated user.
- **Authentication:** JWT required.
- **Request Body:**
  ```json
  {
    "service": "string",        // Name of the service being used (e.g., "chat", "image-generation")
    "operation": "string",      // Specific operation performed (e.g., model ID, feature name)
    "credits": "number",        // Number of credits consumed for this event
    "metadata": "object"        // Optional: Additional contextual data (e.g., { "tokensUsed": 1500 })
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "string",             // ID of the usage record
    "service": "string",
    "operation": "string",
    "credits": "number",
    "timestamp": "string"       // ISO date string of when the event was recorded
  }
  ```
- **Error Responses:**
    - 400 Bad Request: If required fields are missing or invalid.
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If recording fails.
- **Controller Function Snippet (from `usage.controller.ts`):**
  ```typescript
  // src/controllers/usage.controller.ts
  // ...existing code...
  async recordUsage(req: Request, res: Response) {
    try {
      const { service, operation, credits, metadata } = req.body;
      
      if (!service || !operation || typeof credits !== 'number' || credits < 0) {
        return res.status(400).json({ message: 'Missing or invalid required fields' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const usage = await UsageService.recordUsage({
        userId: req.user.userId,
        service,
        operation,
        credits,
        metadata
      });
      
      return res.status(201).json({
        id: usage.id,
        service: usage.service,
        operation: usage.operation,
        credits: usage.credits,
        timestamp: usage.timestamp
      });
    } catch (error) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 2. Get Current User's Usage Statistics
- **Endpoint:** `GET /api/usage/stats`
- **Description:** Returns usage statistics for the authenticated user.
- **Authentication:** JWT required.
- **Query Parameters:**
    - `startDate`: ISO date string (optional) - Start date for filtering records.
    - `endDate`: ISO date string (optional) - End date for filtering records.
- **Response (200 OK):**
  ```json
  {
    "totalRecords": "number",
    "totalCredits": "number",
    "byService": "object",      // { "serviceName": credits, ... }
    "byDay": "object",          // { "YYYY-MM-DD": credits, ... }
    "byModel": "object",        // { "modelId": credits, ... } (typically for chat/AI services)
    "recentActivity": "Array"   // Array of recent usage record objects
  }
  ```
- **Error Responses:**
    - 401 Unauthorized: If no user authenticated.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `usage.controller.ts`):**
  ```typescript
  // src/controllers/usage.controller.ts
  // ...existing code...
  async getUserStats(req: Request, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { startDate: startDateStr, endDate: endDateStr } = req.query;
      let startDate = startDateStr ? new Date(startDateStr as string) : undefined;
      let endDate = endDateStr ? new Date(endDateStr as string) : undefined;

      // Validate dates if provided
      if ((startDate && isNaN(startDate.getTime())) || (endDate && isNaN(endDate.getTime()))) {
        return res.status(400).json({ message: 'Invalid date format for startDate or endDate' });
      }
      
      const usageStats = await UsageService.getUserStats({
        userId: req.user.userId,
        startDate,
        endDate
      });
      
      return res.status(200).json(usageStats);
    } catch (error) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 3. Get Usage Statistics for a Specific User (Admin/Supervisors Only)
- **Endpoint:** `GET /api/usage/stats/:userId`
- **Description:** Returns usage statistics for a specific user.
- **Authentication:** JWT required.
- **Authorization:** `admin` or `supervisor` role required.
- **Path Parameters:**
    - `userId`: string - ID of the user to check.
- **Query Parameters:**
    - `startDate`: ISO date string (optional).
    - `endDate`: ISO date string (optional).
- **Response (200 OK):** Same format as "Get Current User's Usage Statistics".
- **Error Responses:**
    - 400 Bad Request: If `userId` is missing or date parameters are invalid.
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks permission.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `usage.controller.ts`):**
  ```typescript
  // src/controllers/usage.controller.ts
  // ...existing code...
  async getUserStatsByAdmin(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      if (!req.user?.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (!['admin', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const { startDate: startDateStr, endDate: endDateStr } = req.query;
      let startDate = startDateStr ? new Date(startDateStr as string) : undefined;
      let endDate = endDateStr ? new Date(endDateStr as string) : undefined;

      if ((startDate && isNaN(startDate.getTime())) || (endDate && isNaN(endDate.getTime()))) {
        return res.status(400).json({ message: 'Invalid date format for startDate or endDate' });
      }
            
      const usageStats = await UsageService.getUserStats({ // Service method is the same
        userId, // Target user's ID
        startDate,
        endDate
      });
      
      return res.status(200).json(usageStats);
    } catch (error) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```

### 4. Get System-Wide Usage Statistics (Admin Only)
- **Endpoint:** `GET /api/usage/system-stats`
- **Description:** Returns system-wide usage statistics across all users.
- **Authentication:** JWT required.
- **Authorization:** `admin` role required.
- **Query Parameters:**
    - `startDate`: ISO date string (optional).
    - `endDate`: ISO date string (optional).
- **Response (200 OK):**
  ```json
  {
    "totalRecords": "number",
    "totalCredits": "number",
    "byUser": "object",         // { "userId": credits, ... }
    "byService": "object",
    "byDay": "object",
    "byModel": "object"
  }
  ```
- **Error Responses:**
    - 401 Unauthorized: If no user authenticated.
    - 403 Forbidden: If authenticated user lacks admin permission.
    - 500 Server Error: If retrieval fails.
- **Controller Function Snippet (from `usage.controller.ts`):**
  ```typescript
  // src/controllers/usage.controller.ts
  // ...existing code...
  async getSystemStats(req: Request, res: Response) {
    try {
      if (!req.user?.userId) { // Check if user is authenticated first
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (req.user.role !== 'admin') { // Then check role
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { startDate: startDateStr, endDate: endDateStr } = req.query;
      let startDate = startDateStr ? new Date(startDateStr as string) : undefined;
      let endDate = endDateStr ? new Date(endDateStr as string) : undefined;

      if ((startDate && isNaN(startDate.getTime())) || (endDate && isNaN(endDate.getTime()))) {
        return res.status(400).json({ message: 'Invalid date format for startDate or endDate' });
      }
            
      const systemStats = await UsageService.getSystemStats({
        startDate,
        endDate
      });
      
      return res.status(200).json(systemStats);
    } catch (error) {
      // ... error handling ...
    }
  }
  // ...existing code...
  ```