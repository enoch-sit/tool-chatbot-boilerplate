# Understanding the Credit Check Testing System

This document explains how the credit checking functionality works and how it's tested within our microservices architecture.

## What is Credit Checking?

Credit checking is a core functionality that ensures users have sufficient credits before they can use certain services. This is similar to how a prepaid phone plan works - you need to have enough credits in your account to make calls or use data.

## Overview of Components

The credit check system spans multiple services:

- **Authentication Service**: Validates user identity and provides JWT tokens
- **Accounting Service**: Manages credit allocations, balances, and usage. This is the primary service responsible for the logic detailed below.
- **Chat Service**: Consumes credits when users interact with the system (and would call the Accounting Service to verify credits).

The Python test script `test_credit_check.py` verifies that this system works correctly by interacting with these services.

## TypeScript Codebase Findings (Accounting Service)

The primary logic for credit checking and management resides in the `accounting-service`.

### 1. API Endpoints (`services/accounting-service/src/routes/api.routes.ts`)

All routes under `/api/credits/*` require JWT authentication.

*   **`GET /api/credits/balance`**:
    *   Controller: `CreditController.getUserBalance`
    *   Description: Retrieves the current authenticated user\'s credit balance and active allocations.
*   **`POST /api/credits/check`**:
    *   Controller: `CreditController.checkCredits`
    *   Description: Checks if the authenticated user has sufficient credits for an operation.
    *   Request Body: `{ "credits": number }` (required)
    *   Response: `{ "sufficient": boolean, "credits"?: number, "requiredCredits"?: number, "message"?: string }`
*   **`POST /api/credits/calculate`**:
    *   Controller: `CreditController.calculateCredits`
    *   Description: Calculates the credit cost for a given model and token count.
    *   Request Body: `{ "modelId": string, "tokens": number }` (required)
    *   Response: `{ "credits": number }`
*   **`GET /api/credits/balance/:userId`**:
    *   Controller: `CreditController.getUserBalanceByAdmin`
    *   Middleware: `requireSupervisor` (accessible by admin or supervisor roles)
    *   Description: Retrieves a specific user\'s credit balance.
*   **`POST /api/credits/allocate`**:
    *   Controller: `CreditController.allocateCredits`
    *   Middleware: `requireSupervisor` (accessible by admin or supervisor roles)
    *   Description: Allocates credits to a specific user.
    *   Request Body: `{ "userId": string, "credits": number, "expiryDays"?: number, "notes"?: string }` (userId and credits are required)

### 2. Controller Logic (`services/accounting-service/src/controllers/credit.controller.ts`)

The `CreditController` class handles HTTP requests for credit endpoints.

*   **`getUserBalance`**: Fetches balance for the authenticated user.
*   **`getUserBalanceByAdmin`**: Fetches balance for a specified `userId`, with role checks (admin/supervisor).
*   **`checkCredits`**:
    *   Validates that `credits` in the request body is a positive number.
    *   Calls `CreditService.checkUserCredits`.
    *   If sufficient, it also fetches the current balance to include in the response.
*   **`calculateCredits`**:
    *   Validates `modelId` and `tokens`.
    *   Calls `CreditService.calculateCreditsForTokens`.
*   **`allocateCredits`**:
    *   Validates `userId` and `credits`.
    *   Ensures the target `userId` exists by checking `UserAccount` and creating one if it doesn\'t (with a temporary email/username).
    *   Calls `CreditService.allocateCredits`.

### 3. Service Layer (`services/accounting-service/src/services/credit.service.ts`)

The `CreditService` class contains the core business logic.

*   **`getUserBalance(userId)`**:
    *   Ensures user account exists (`UserAccountService.findOrCreateUser`).
    *   Fetches non-expired `CreditAllocation` records with `remainingCredits > 0`, ordered by expiration (ASC).
    *   Returns total credits and active allocations.
*   **`checkUserCredits(userId, requiredCredits)`**:
    *   Sums `remainingCredits` from non-expired allocations for the user.
    *   Returns `true` if the sum >= `requiredCredits`.
*   **`allocateCredits(params)`**:
    *   Ensures user account exists.
    *   Creates a `CreditAllocation` record. `expiryDays` defaults to 30.
*   **`deductCredits(userId, credits)`**:
    *   Retrieves active, non-expired allocations, ordered by `expiresAt` (ASC).
    *   Deducts credits, emptying earlier expiring allocations first.
    *   Saves changes to allocations. Returns `true` on success.
*   **`calculateCreditsForTokens(modelId, tokens, tokenType = \'both\')`**:
    *   Uses a `modelPricing` map for costs per 1000 tokens (e.g., `amazon.nova-micro-v1:0`, `meta.llama3-70b-instruct-v1:0`, and a `default`).
    *   Calculates cost based on `tokenType` (\'input\', \'output\', or \'both\' - 50/50 split for \'both\').
    *   Rounds up credit cost using `Math.ceil`.

### 4. Data Model (`services/accounting-service/src/models/credit-allocation.model.ts`)

The `CreditAllocation` Sequelize model.

*   **Table**: `credit_allocations`
*   **Attributes**: `id` (PK), `userId` (FK), `totalCredits`, `remainingCredits`, `allocatedBy`, `allocatedAt`, `expiresAt`, `notes`.
*   **Naming**: `underscored: true` for snake_case DB columns (e.g., `user_id`).
*   **Indexes**: On `user_id` and `expires_at`.

## Credit Service Class Structure

```plaintext
services/
└── accounting-service/
    └── src/
        └── services/
            └── credit.service.ts
```

## CreditTester Class Structure

```plaintext
tests/
└── credit_check/
    └── test_credit_check.py
```

## Credit Check Testing Flow

1. User sends a request to the Chat Service.
2. Chat Service checks if the user has enough credits by calling the Accounting Service.
3. Accounting Service verifies the user's credit balance.
4. If sufficient, the operation is allowed to proceed; otherwise, it is denied.

## Key TypeScript Components

*   `CreditController`: Handles incoming requests and returns responses.
*   `CreditService`: Contains business logic for credit allocation and deduction.
*   `UserAccountService`: Manages user account creation and retrieval.

## API Flow Diagrams

*   **Check Credits**:

```plaintext
POST /api/credits/check
```

*   **Calculate Credits**:

```plaintext
POST /api/credits/calculate
```

## Key Concepts for Beginners

*   **JWT Authentication**: A method for securely transmitting information between parties as a JSON object.
*   **Sequelize**: A promise-based Node.js ORM for PostgreSQL, MySQL, MariaDB, SQLite, and Microsoft SQL Server.
*   **Middleware**: Functions that have access to the request object (req), the response object (res), and the next middleware function in the application’s request-response cycle.

## Running the Test

To run the credit check tests:

1. Ensure the accounting service is running.
2. Execute `pytest` in the `tests/credit_check` directory.

## Debugging the Credit Check Test

For debugging:

*   Use `print` statements in the test code to output variable values.
*   Check the service logs for any error messages.
*   Ensure all services are running and accessible.

## Update on Security Fix for Credit Checking

A security fix has been applied to address potential vulnerabilities in the credit checking logic. All services have been updated to the latest secure versions.