# Understanding the Credit Check Testing System

This document explains how the credit checking functionality works and how it's tested within our microservices architecture.

## What is Credit Checking?

Credit checking is a core functionality that ensures users have sufficient credits before they can use certain services. This is similar to how a prepaid phone plan works - you need to have enough credits in your account to make calls or use data.

## Overview of Components

The credit check system spans multiple services:

- **Authentication Service**: Validates user identity and provides JWT tokens
- **Accounting Service**: Manages credit allocations, balances, and usage
- **Chat Service**: Consumes credits when users interact with the system

The Python test script `test_credit_check.py` verifies that this system works correctly.

## System Architecture Diagram

```mermaid
graph TD
    Client[Test Client - Python] --> Auth[Authentication Service]
    Client --> Accounting[Accounting Service]
    Client --> Chat[Chat Service]
    Chat --> Accounting
    
    subgraph Authentication Flow
        Auth -->|JWT Token| Client
    end
    
    subgraph Credit Management
        Accounting -->|Credit Balance| Client
        Accounting -->|Credit Check| Chat
        Accounting -->|Credit Allocation| Client
    end
    
    subgraph Database Layer
        Accounting --> CreditDB[(Credit Allocations DB)]
        Accounting --> UsageDB[(Usage Records DB)]
        Accounting --> SessionDB[(Streaming Sessions DB)]
    end
    
    style Auth fill:#f9f,stroke:#333,stroke-width:2px
    style Accounting fill:#bbf,stroke:#333,stroke-width:2px
    style Chat fill:#bfb,stroke:#333,stroke-width:2px
```

## Test Flow Sequence Diagram

This diagram shows how the test script interacts with the services:

```mermaid
sequenceDiagram
    participant Test as test_credit_check.py
    participant Auth as Authentication Service
    participant Accounting as Accounting Service
    participant DB as Database

    Test->>Test: Initialize CreditTester
    Test->>Auth: Check services health (/health)
    Auth-->>Test: 200 OK
    Test->>Accounting: Check services health (/health)
    Accounting-->>Test: 200 OK
    
    Test->>Auth: Login as regular user (/api/auth/login)
    Auth-->>Test: 200 OK + JWT token
    Test->>Auth: Login as admin user (/api/auth/login)
    Auth-->>Test: 200 OK + Admin JWT token
    
    Test->>Accounting: Allocate credits (/api/credits/allocate)
    Note over Accounting,DB: Admin token required
    Accounting->>DB: Create credit allocation record
    DB-->>Accounting: Allocation created
    Accounting-->>Test: 201 Created
    
    Test->>Accounting: Check credit balance (/api/credits/balance)
    Accounting->>DB: Query user allocations
    DB-->>Accounting: Return active allocations
    Accounting-->>Test: 200 OK + Credit information
    
    Test->>Accounting: Test credit check endpoint (/api/credits/check)
    Accounting->>DB: Check if user has sufficient credits
    DB-->>Accounting: Return credit status
    Accounting-->>Test: 200 OK + {sufficient: true/false}
    
    Test->>Accounting: Test insufficient credits scenario
    Note over Test,Accounting: Request more credits than available
    Accounting->>DB: Check if user has sufficient credits
    DB-->>Accounting: Return credit status (insufficient)
    Accounting-->>Test: 200 OK + {sufficient: false}
```

## Credit Service Class Structure

This diagram shows the TypeScript class that handles credit operations in the accounting service:

```mermaid
classDiagram
    class CreditService {
        +getUserBalance(userId: string): Promise~BalanceResponse~
        +checkUserCredits(userId: string, requiredCredits: number): Promise~boolean~
        +allocateCredits(params: AllocateCreditsParams): Promise~CreditAllocation~
        +deductCredits(userId: string, credits: number): Promise~boolean~
        +calculateCreditsForTokens(modelId: string, tokens: number): Promise~number~
    }
    
    class CreditAllocation {
        +id: number
        +userId: string
        +totalCredits: number
        +remainingCredits: number
        +allocatedBy: string
        +allocatedAt: Date
        +expiresAt: Date
        +notes: string
    }
    
    CreditService --> CreditAllocation: uses
```

## CreditTester Class Structure

This diagram shows the structure of the Python test class:

```mermaid
classDiagram
    class CreditTester {
        -session: Session
        -user_token: string
        -admin_token: string
        -headers: object
        
        +check_services_health(): boolean
        +authenticate(): boolean
        +authenticate_admin(): boolean
        +allocate_credits(amount: number): boolean
        +allocate_non_streaming_credits(amount: number): boolean
        +test_credit_check_endpoint(): boolean
        +check_credit_balance(): boolean
        +test_insufficient_credits(): boolean
        +get_api_version(): string
    }
    
    class Logger {
        <<static>>
        +success(message: string): void
        +info(message: string): void
        +warning(message: string): void
        +error(message: string): void
        +header(message: string): void
    }
    
    CreditTester --> Logger: uses
```

## Credit Check Testing Flow

This flowchart shows the testing process from start to finish:

```mermaid
flowchart TD
    Start[Start Test] --> Health[Check Services Health]
    Health -->|Services OK| Auth[Authenticate Users]
    Health -->|Services Down| Fail[Test Failed]
    
    Auth -->|Success| Admin[Authenticate as Admin]
    Auth -->|Failure| Fail
    
    Admin --> Allocate[Allocate Credits to User]
    Allocate --> Balance[Check Credit Balance]
    Balance --> Check[Test Credit Check Endpoint]
    Check --> Insufficient[Test Insufficient Credits]
    
    Insufficient --> Report[Generate Test Report]
    Report --> End[End Test]
    
    style Start fill:#f9f,stroke:#333,stroke-width:2px
    style End fill:#f9f,stroke:#333,stroke-width:2px
    style Fail fill:#f99,stroke:#333,stroke-width:2px
```

## Key TypeScript Components

The test interacts with several TypeScript files in the backend:

### 1. Credit Service Implementation

The main implementation in the accounting service is handled by `credit.service.ts` which provides these key methods:

- **getUserBalance**: Gets the current credit balance for a user
- **checkUserCredits**: Verifies if a user has enough credits for an operation
- **allocateCredits**: Gives credits to a user (admin only)
- **deductCredits**: Removes credits when a user consumes a service
- **calculateCreditsForTokens**: Converts token usage to credit cost

### 2. Credit Allocation Model

The database structure for credit allocations is defined in `credit-allocation.model.ts`.

### 3. Credit Controller

The REST API endpoints that the Python test calls are defined in `credit.controller.ts`:
- GET `/api/credits/balance`: Returns a user's current credit balance
- POST `/api/credits/allocate`: Allocates credits to a user (admin only)
- POST `/api/credits/check`: Checks if a user has sufficient credits

## API Flow Diagrams

### Credit Check API Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller as CreditController
    participant Service as CreditService
    participant Model as CreditAllocation
    participant DB as Database
    
    Client->>Controller: POST /api/credits/check
    Controller->>Service: checkUserCredits(userId, requiredCredits)
    Service->>Model: sum('remainingCredits', {where: {...}})
    Model->>DB: SQL Query
    DB-->>Model: Results
    Model-->>Service: Total available credits
    Service-->>Controller: boolean (sufficient or not)
    Controller-->>Client: {sufficient: true/false}
```

### Credit Allocation Process

```mermaid
sequenceDiagram
    participant Client
    participant Controller as CreditController
    participant Service as CreditService
    participant UserService as UserAccountService
    participant Model as CreditAllocation
    
    Client->>Controller: POST /api/credits/allocate
    Note over Client,Controller: Admin token required
    Controller->>Service: allocateCredits(params)
    Service->>UserService: findOrCreateUser(userId)
    UserService-->>Service: User details
    Service->>Model: create(allocation)
    Model-->>Service: Created allocation
    Service-->>Controller: Allocation details
    Controller-->>Client: 201 Created + allocation details
```

### User Balance Check Process

```mermaid
sequenceDiagram
    participant Client
    participant Controller as CreditController
    participant Service as CreditService
    participant Model as CreditAllocation
    
    Client->>Controller: GET /api/credits/balance
    Controller->>Service: getUserBalance(userId)
    Service->>Model: findAll({where: active allocations})
    Model-->>Service: Active allocations
    Service-->>Controller: {totalCredits, activeAllocations}
    Controller-->>Client: 200 OK + balance information
```

## Key Concepts for Beginners

### What are Credits?

Credits are a virtual currency in the system that users consume when using services. Think of them like tokens in an arcade - you need them to play games.

### What is a JWT Token?

JWT (JSON Web Token) is used for authentication. It's like a digital ID card that proves who you are to the services. The test gets tokens for both regular and admin users.

### What is an API Endpoint?

An API endpoint is like a specific doorway into the service. Each endpoint has a unique address (URL) and performs a specific function:
- `/health` checks if a service is running properly
- `/api/auth/login` lets users log in and get tokens
- `/api/credits/allocate` adds credits to a user account
- `/api/credits/check` verifies if a user has enough credits

### What is the Test Actually Checking?

The test verifies that:
1. Users can't use services if they don't have enough credits
2. Users with sufficient credits can access services
3. Admins can allocate credits to users
4. The credit balance is correctly tracked

## Running the Test

To run this test, execute:

```bash
python test_credit_check.py
```

The test will output its progress and results, letting you know if the credit checking system is working correctly.

## Debugging the Credit Check Test

This section documents the troubleshooting process for issues encountered with the credit check test.

### Initial Problem

When running the insufficient credits scenario test, we encountered the following error:

```
================================================================================
TESTING INSUFFICIENT CREDITS SCENARIO
================================================================================
[INFO] Current balance: 29829 credits
[INFO] Testing credit check with 30829 credits (more than available)
[ERROR] Credit check incorrectly reported sufficient credits
```

The test was showing that the system reported sufficient credits even when the user didn't have enough.

### Investigation Process

#### Step 1: Parameter Name Analysis

Our first investigation focused on the parameter names being used in the API request. We found potential inconsistency between the test code and API expectations:

```python
# In test_insufficient_credits method
json={
    "credits": current_balance + 1000  # Using "credits" parameter name
}

# In test_credit_check_endpoint method
json={
    "requiredCredits": 100  # Using "requiredCredits" parameter name
}
```

This inconsistency could lead to confusing behavior where one endpoint works and another fails.

#### Step 2: Examining Controller Code

Looking at the `credit.controller.ts` file in the accounting service, we found:

```typescript
const { credits: requiredCredits } = req.body;

if (typeof requiredCredits !== 'number' || requiredCredits <= 0) {
  return res.status(400).json({ message: 'Valid credits amount required' });
}
```

This confirmed that the API expected a parameter named `credits`, and was using destructuring to rename it to `requiredCredits` internally.

#### Step 3: Error Handling in Chat Service

We found a key issue in the chat service's credit.service.ts file:

```typescript
// In chat-service/src/services/credit.service.ts
catch (error) {
  logger.error('Error checking user credits:', error);
  
  // Instead of failing, default to allowing the operation if credit check fails
  logger.warn(`Credit check failed, defaulting to allow operation for user ${userId}`);
  return true;  // THIS IS THE ISSUE - DEFAULTS TO TRUE ON ERROR
}
```

The service was defaulting to allowing operations when credit checks failed, creating a security issue.

### Root Causes

We identified several issues that contributed to the problem:

1. **Parameter Name Inconsistency**: The test code was using inconsistent parameter names across different methods (`credits` in one place, `requiredCredits` in another).

2. **Fail-Open Error Handling**: The chat service was defaulting to allowing operations when credit checks failed, which is a security vulnerability.

3. **Response Field Handling**: The code was checking for both `hasSufficientCredits` and `sufficient` in the response, indicating potential API evolution without proper updates.

4. **Debug Logging**: Insufficient logging made it difficult to trace exactly what was happening during the API calls.

### Solution Implemented

We made the following changes to resolve the issues:

1. **Fixed Parameter Naming**:
   - Updated all tests to consistently use the `credits` parameter name
   - Updated the controller to support both parameter names for backward compatibility

```typescript
// Support both parameter names for backward compatibility  
const { credits, requiredCredits: reqCredits } = req.body;
const requiredCredits = credits !== undefined ? credits : reqCredits;
```

2. **Improved Error Handling**:
   - Changed the chat service to fail securely (deny operation) when credit checks encounter errors
   - Added more detailed error logging with response data

```typescript
// In case of error, fail securely - don't allow operations without confirmed credits
logger.warn(`Credit check failed, defaulting to deny operation for user ${userId}`);
return false;
```

3. **Added Robust Parameter Validation**:
   - Added explicit validation for the required credits parameter
   - Added debug logging to show exactly what parameters were being used

4. **Improved Response Handling**:
   - Standardized on using the `sufficient` field from the API response
   - Added debug logging for the full API response

### Key Takeaways

1. **API Parameter Consistency**: Always ensure consistent parameter names across your API endpoints and client code.

2. **Fail Securely**: Security-critical operations should default to a secure state (deny) when errors occur, not to a permissive state.

3. **Robust Validation**: Always validate input parameters, especially for type and range constraints.

4. **Detailed Logging**: Add sufficient logging to help trace issues in API interactions, especially in testing environments.

5. **Backward Compatibility**: When updating APIs, consider supporting both old and new parameter names to avoid breaking clients during transition periods.

### Testing After Fixes

After implementing the fixes, the credit check system correctly identifies insufficient credits scenarios, returning:

```
================================================================================
TESTING INSUFFICIENT CREDITS SCENARIO
================================================================================
[INFO] Current balance: 29829 credits
[INFO] Testing credit check with 30829 credits (more than available)
[SUCCESS] Credit check correctly identified insufficient credits
[INFO] {"sufficient": false, "message": "Insufficient credits"}
```