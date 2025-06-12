# Workflow: Service Usage with Custom Credit Deduction

## Overview

The **Workflow: Service Usage with Custom Credit Deduction** outlines how a client application or another backend service interacts with the Accounting Service to perform an operation that consumes credits, with the primary service determining the credit amount to deduct. Below is a detailed sequence of this workflow, including all API calls with their URLs, request bodies, headers, and expected responses, presented in the correct order as described in the provided documentation.

## Credit Management Administrative Operations

The Accounting Service provides three additional endpoints for advanced credit management operations that allow administrators and supervisors to directly manipulate user credit balances:

### Administrative Credit Management Endpoints

**Note**: All administrative credit management endpoints require `admin` or `supervisor` role and valid JWT authentication.

#### 1. Set Absolute Credit Amount
**Endpoint**: `POST /api/credits/set`

This endpoint replaces a user's entire credit balance with a specific amount.

**Example Request**:
```bash
curl -X POST http://localhost:3001/api/credits/set \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_12345",
    "credits": 500,
    "expiryDays": 60,
    "notes": "Monthly credit reset to 500"
  }'
```

**Expected Response (200 OK)**:
```json
{
  "userId": "user_id_12345",
  "previousCredits": 150.75,
  "newCredits": 500,
  "message": "Credits set to 500 for user johndoe"
}
```

#### 2. Remove/Deduct Credits
**Endpoint**: `DELETE /api/credits/remove`

This endpoint removes a specific amount of credits from a user's balance.

**Example Request**:
```bash
curl -X DELETE http://localhost:3001/api/credits/remove \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_12345",
    "credits": 100,
    "notes": "Penalty deduction for policy violation"
  }'
```

**Expected Response (200 OK)**:
```json
{
  "userId": "user_id_12345",
  "previousCredits": 500,
  "newCredits": 400,
  "removedCredits": 100,
  "message": "Removed 100 credits from user johndoe"
}
```

#### 3. Adjust Credits (Flexible Add/Subtract)
**Endpoint**: `PUT /api/credits/adjust`

This endpoint provides flexible credit adjustment with positive values adding credits and negative values subtracting credits.

**Example Request (Adding Credits)**:
```bash
curl -X PUT http://localhost:3001/api/credits/adjust \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_12345",
    "adjustment": 250,
    "expiryDays": 30,
    "notes": "Bonus credits for referral program"
  }'
```

**Expected Response (200 OK)**:
```json
{
  "userId": "user_id_12345",
  "previousCredits": 400,
  "newCredits": 650,
  "adjustment": 250,
  "message": "Adjusted credits by 250 for user johndoe"
}
```

**Example Request (Subtracting Credits)**:
```bash
curl -X PUT http://localhost:3001/api/credits/adjust \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_12345",
    "adjustment": -50,
    "notes": "Adjustment for refund processing"
  }'
```

**Expected Response (200 OK)**:
```json
{
  "userId": "user_id_12345",
  "previousCredits": 650,
  "newCredits": 600,
  "adjustment": -50,
  "message": "Adjusted credits by -50 for user johndoe"
}
```

### Comparison of Credit Operations

| Operation | Endpoint | Purpose | User Balance Before | Action | User Balance After |
|-----------|----------|---------|-------------------|--------|-------------------|
| **Allocate** | `POST /api/credits/allocate` | Add credits to existing balance | 100 | +50 | 150 |
| **Set** | `POST /api/credits/set` | Replace entire balance | 100 | =200 | 200 |
| **Remove** | `DELETE /api/credits/remove` | Subtract specific amount | 100 | -30 | 70 |
| **Adjust** | `PUT /api/credits/adjust` | Flexible add/subtract | 100 | +25 or -25 | 125 or 75 |

---

### Workflow Sequence: Service Usage with Custom Credit Deduction

This workflow assumes a client application requests an operation (e.g., sending a chat message) from a primary service (e.g., a Chat Service), which then interacts with the Accounting Service to verify and deduct credits. The primary service calculates the credit cost and triggers the deduction, typically through a usage event recording or a specific workflow like finalizing a streaming session. Since the `deductCredits` method is not exposed as a generic API endpoint, we assume the deduction is handled via the `POST /api/usage/record` endpoint, which is configured to trigger a deduction based on the `credits` field, as this aligns with the provided documentation.

---

#### Step 1: Client Authenticates with External Authentication Service

The client or primary service must first obtain a JWT access token from the External Authentication Service to authenticate subsequent requests.

- **API Call**: Login to obtain JWT
- **Endpoint**: `POST http://localhost:3000/api/auth/login`
- **Headers**:

  ```
  Content-Type: application/json
  ```

- **Request Body**:

  ```json
  {
    "username": "johndoe",
    "password": "securepassword123"
  }
  ```

- **Expected Response (200 OK)**:

  ```json
  {
    "message": "Login successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_string",
    "user": {
      "id": "user_id_12345",
      "username": "johndoe",
      "email": "john@example.com",
      "isVerified": true,
      "role": "user"
    }
  }
  ```

- **Details**:
  - The client sends credentials to the Authentication Service.
  - The service verifies the credentials and returns a short-lived access token (15 minutes) and a refresh token (7 days).
  - The access token will be used in subsequent requests to the Accounting Service.
  - Possible errors:
    - 400: Missing required fields
    - 401: Invalid credentials or email not verified
    - 500: Login failed

---

#### Step 2: Client Requests Operation from Primary Service

The client requests an operation (e.g., sending a chat message) from the primary service. This step does not involve an API call to the Accounting Service but sets the context for the workflow.

- **Action**: Client sends a request to the Primary Service (e.g., Chat Service) to perform an operation.
- **Details**:
  - The request might include parameters like message content or model ID (e.g., `modelId: "gpt-4"`).
  - The Primary Service needs to check the user's credit balance before proceeding.
  - No API call is made to the Accounting Service yet; this is an internal action within the Primary Service.

---

#### Step 3: Primary Service Checks User's Credit Balance

The Primary Service calls the Accounting Service to retrieve the user's current credit balance to ensure they have sufficient credits for the operation.

- **API Call**: Get Current User's Credit Balance
- **Endpoint**: `GET /api/credits/balance`
- **Headers**:

  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- **Request Body**: None
- **Expected Response (200 OK)**:

  ```json
  {
    "totalCredits": 100.50,
    "activeAllocations": [
      {
        "id": "allocation_id_1",
        "credits": 50.00,
        "expiresAt": "2025-07-03T10:51:00.000Z",
        "allocatedAt": "2025-06-03T10:51:00.000Z"
      },
      {
        "id": "allocation_id_2",
        "credits": 50.50,
        "expiresAt": "2025-07-03T10:51:00.000Z",
        "allocatedAt": "2025-06-03T10:51:00.000Z"
      }
    ]
  }
  ```

- **Details**:
  - The Primary Service uses the JWT obtained in Step 1 to authenticate the request.
  - The Accounting Service verifies the JWT, extracts the `userId` (`user_id_12345`), and queries the database for the user's credit balance.
  - The response includes the total credits and details of active credit allocations.
  - Possible errors:
    - 401: User not authenticated (invalid or missing JWT)
    - 500: Failed to retrieve credit balance

---

#### Step 4: Primary Service Calculates Credit Cost

The Primary Service calculates the credit cost for the requested operation, either using its own logic or by calling the Accounting Service's calculate endpoint.

- **API Call**: Calculate Credits for a Specific Operation
- **Endpoint**: `POST /api/credits/calculate`
- **Headers**:

  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
  ```

- **Request Body**:

  ```json
  {
    "modelId": "gpt-4",
    "tokens": 1500
  }
  ```

- **Expected Response (200 OK)**:

  ```json
  {
    "credits": 7.50
  }
  ```

- **Details**:
  - The Primary Service sends the `modelId` and estimated `tokens` to calculate the credit cost.
  - The Accounting Service computes the cost (e.g., based on a pricing model where `gpt-4` costs 0.005 credits per token: 1500 * 0.005 = 7.50 credits).
  - The response provides the calculated credit cost (`requiredCredits`).
  - Possible errors:
    - 400: Missing or invalid `modelId` or `tokens`
    - 401: User not authenticated
    - 500: Failed to calculate credits

**Alternative**: If the Primary Service has its own logic for calculating credits (e.g., a fixed cost per operation), this step may be skipped, and the Primary Service directly determines `requiredCredits` (e.g., 7.50 credits).

---

#### Step 5: Primary Service Checks Credit Sufficiency

The Primary Service verifies if the user's credit balance is sufficient for the operation by calling the Accounting Service's check endpoint.

- **API Call**: Check if User Has Sufficient Credits
- **Endpoint**: `POST /api/credits/check`
- **Headers**:

  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
  ```

- **Request Body**:

  ```json
  {
    "requiredCredits": 7.50
  }
  ```

- **Expected Response (200 OK)**:

  ```json
  {
    "sufficient": true,
    "credits": 100.50,
    "requiredCredits": 7.50
  }
  ```

- **Details**:
  - The Primary Service sends the `requiredCredits` (from Step 4) to check against the user's balance (from Step 3).
  - The Accounting Service confirms the user has 100.50 credits, which is sufficient for 7.50 credits.
  - The response includes the current balance and the checked amount.
  - Possible errors:
    - 400: Missing or invalid `requiredCredits`
    - 401: User not authenticated
    - 500: Check fails
  - If insufficient:

    ```json
    {
      "sufficient": false,
      "message": "Insufficient credits",
      "requiredCredits": 7.50
    }
    ```

    - The Primary Service would return an error to the client (e.g., "Operation Failed: Insufficient Credits") and stop the workflow.

---

#### Step 6: Primary Service Performs the Operation

Assuming sufficient credits, the Primary Service performs its core operation (e.g., processes the chat message using `gpt-4`).

- **Action**: Internal operation within the Primary Service.
- **Details**:
  - The Primary Service executes the requested task (e.g., sends the message to an AI model, receives a response).
  - This step does not involve the Accounting Service.
  - The operation is assumed to succeed, consuming the estimated resources (e.g., 1500 tokens).
  - If the operation fails, the Primary Service may choose not to deduct credits or handle partial charges (not covered in this workflow).

---

#### Step 7: Primary Service Deducts Credits by Recording a Usage Event

After successfully completing the operation, the Primary Service calls the Accounting Service to record a usage event, which triggers the credit deduction based on the `credits` field.

- **API Call**: Record a Usage Event
- **Endpoint**: `POST /api/usage/record`
- **Headers**:

  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
  ```

- **Request Body**:

  ```json
  {
    "service": "chat",
    "operation": "gpt-4-message",
    "credits": 7.50,
    "metadata": {
      "tokensUsed": 1500,
      "modelId": "gpt-4"
    }
  }
  ```

- **Expected Response (201 Created)**:

  ```json
  {
    "id": "usage_record_id_789",
    "service": "chat",
    "operation": "gpt-4-message",
    "credits": 7.50,
    "timestamp": "2025-06-03T10:51:00.000Z"
  }
  ```

- **Details**:
  - The Primary Service records the usage event with the calculated credits (7.50).
  - The Accounting Service processes the request, calling `UsageService.recordUsage`, which internally triggers `CreditService.deductCredits` to deduct 7.50 credits from the user's balance.
  - The user's balance is updated (100.50 - 7.50 = 93.00 credits).
  - The response confirms the usage event was recorded.
  - Possible errors:
    - 400: Missing or invalid required fields (`service`, `operation`, `credits`)
    - 401: User not authenticated
    - 500: Recording or deduction fails

**Note**: The documentation suggests that `POST /api/usage/record` can trigger a deduction via the `credits` field, as `deductCredits` is not exposed directly. If this endpoint does not support deduction, an alternative approach (e.g., a dedicated admin-level endpoint or internal service call) would be needed, but this is not specified in the provided documents.

---

#### Step 8: Primary Service Confirms Operation to Client

The Primary Service confirms the successful completion of the operation to the client.

- **Action**: Primary Service responds to the client.
- **Details**:
  - The Primary Service sends a response to the client, including the operation's result (e.g., the AI-generated chat response).
  - Example response (not an Accounting Service API):

    ```json
    {
      "status": "success",
      "message": "Operation completed",
      "result": {
        "response": "This is the AI-generated response."
      },
      "creditsDeducted": 7.50
    }
    ```

  - This step is outside the Accounting Service's scope but completes the workflow.
  - If any prior step failed (e.g., insufficient credits), the Primary Service would return an error instead.

---

### Summary of API Calls in Order

1. **Login (External Authentication Service)**:
   - `POST http://localhost:3000/api/auth/login`
   - Body: `{ "username": "johndoe", "password": "securepassword123" }`
   - Headers: `Content-Type: application/json`
   - Response: `{ "accessToken": "...", ... }`

2. **Get User Credit Balance**:
   - `GET /api/credits/balance`
   - Headers: `Authorization: Bearer <accessToken>`
   - Response: `{ "totalCredits": 100.50, "activeAllocations": [...] }`

3. **Calculate Credits (Optional)**:
   - `POST /api/credits/calculate`
   - Body: `{ "modelId": "gpt-4", "tokens": 1500 }`
   - Headers: `Authorization: Bearer <accessToken>, Content-Type: application/json`
   - Response: `{ "credits": 7.50 }`

4. **Check Sufficient Credits**:
   - `POST /api/credits/check`
   - Body: `{ "requiredCredits": 7.50 }`
   - Headers: `Authorization: Bearer <accessToken>, Content-Type: application/json`
   - Response: `{ "sufficient": true, "credits": 100.50, "requiredCredits": 7.50 }`

5. **Record Usage Event (Triggers Deduction)**:
   - `POST /api/usage/record`
   - Body: `{ "service": "chat", "operation": "gpt-4-message", "credits": 7.50, "metadata": { "tokensUsed": 1500, "modelId": "gpt-4" } }`
   - Headers: `Authorization: Bearer <accessToken>, Content-Type: application/json`
   - Response: `{ "id": "usage_record_id_789", "service": "chat", "operation": "gpt-4-message", "credits": 7.50, "timestamp": "2025-06-03T10:51:00.000Z" }`

---

### Notes

- **JWT Authentication**: All Accounting Service API calls require a valid JWT in the `Authorization: Bearer <token>` header. The token is verified using a shared secret, and the payload provides `userId`, `username`, `email`, and `role`.
- **Credit Deduction**: The workflow assumes `POST /api/usage/record` triggers `CreditService.deductCredits` internally. If this is not the case, the Primary Service would need a specific mechanism (e.g., an admin-level endpoint or internal call) to deduct credits, which is not detailed in the provided documentation.
- **Error Handling**: Each API call includes error handling for invalid inputs, authentication failures, or server errors, ensuring robust workflow execution.
- **Role-Based Access**: The workflow assumes the client has a `user` role. Admin or supervisor roles may be required for certain endpoints if the Primary Service acts on behalf of another user.
- **Base URL**: The Accounting Service base URL is assumed to be `/api` (relative to the service's host, e.g., `http://localhost:3001/api`). The Authentication Service uses `http://localhost:3000`.

This sequence provides a comprehensive and detailed outline of the workflow, covering all API interactions as specified in the documentation.
