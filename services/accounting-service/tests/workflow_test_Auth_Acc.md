# Authentication-Accounting Service Integration Testing Flow

This document visualizes the test flow in the `workflow_test_Auth_Acc.py` script, which validates the interaction between Authentication and Accounting services.

## Overall Testing Flow

```mermaid
flowchart TD
    A[Start Test Workflow] --> B[Check Services Health]
    B --> C{Services Healthy?}
    C -->|Yes| D[Login as Admin]
    C -->|No| E[Abort Tests]
    
    D --> F[Test Registration Scenario]
    F --> G[Test Login Scenario]
    G --> H[Test Credit Allocation Scenario]
    H --> I[Test JWT Security]
    I --> J[Generate Test Report]
    J --> K[End]
    
    subgraph "Health Checks"
        B1[Check Auth Service]
        B2[Check Accounting Service]
    end
    
    subgraph "Registration Flow"
        F1[Create Test User]
        F2[Get Verification Token]
        F3[Verify Email]
    end
    
    subgraph "Login Flow"
        G1[Login with Credentials]
        G2[Validate JWT Structure]
        G3[Decode JWT Payload]
        G4[Verify Required Fields]
    end
    
    subgraph "Credit Allocation Flow"
        H1[Verify Admin JWT Works Cross-Service]
        H2[Allocate Credits to Test User]
        H3[Verify User Account Auto-Created]
    end
    
    subgraph "JWT Security Tests"
        I1[Verify User JWT Works Cross-Service]
        I2[Test Invalid JWT Rejection]
        I3[Test Role-Based Access Control]
    end
    
    B --> B1
    B --> B2
    F --> F1 --> F2 --> F3
    G --> G1 --> G2 --> G3 --> G4
    H --> H1 --> H2 --> H3
    I --> I1 --> I2 --> I3
```

## Test Logger and Reporting System

```mermaid
flowchart LR
    A[Test Script] --> B[TestLogger]
    B --> C[Console Output]
    B --> D[Log File]
    
    A --> E[Generate Report]
    E --> F[Markdown Test Report]
    
    C -->|Color-Coded Messages| G[Human Tester]
    D -->|Persistent Logs| H[Future Analysis]
    F -->|Structured Results| I[Documentation]
    
    subgraph "Log Levels"
        J[INFO - Blue]
        K[SUCCESS - Green]
        L[WARNING - Yellow]
        M[ERROR - Red]
    end
    
    B --> J
    B --> K
    B --> L
    B --> M
```

## Registration Scenario Flow

```mermaid
sequenceDiagram
    participant Script
    participant Auth as Authentication Service
    participant Test as Test Endpoints
    
    Script->>Auth: POST /api/auth/signup (test user data)
    Auth-->>Script: User Created (201)
    Note right of Script: Store user ID for future tests
    
    Script->>Test: GET /api/testing/verification-token/{userId}
    alt Testing endpoint available
        Test-->>Script: Verification Token
        Script->>Auth: POST /api/auth/verify-email (token)
        Auth-->>Script: Email Verified (200)
    else Testing endpoint not found
        Test-->>Script: 404 Not Found
        Script->>Test: POST /api/testing/verify-user/{userId}
        Test-->>Script: User Directly Verified (200)
    end
    
    Note over Script,Auth: Registration Complete
```

## Login Scenario Flow

```mermaid
sequenceDiagram
    participant Script
    participant Auth as Authentication Service
    
    Script->>Auth: POST /api/auth/login (credentials)
    Auth->>Auth: Verify Credentials
    Auth->>Auth: Generate JWT
    Auth-->>Script: JWT Token (200)
    
    Script->>Script: Validate JWT Structure
    Note right of Script: Check for 3-part structure (header.payload.signature)
    
    Script->>Script: Decode JWT Payload
    Note right of Script: Base64 decode middle section
    
    Script->>Script: Verify Required Fields
    Note right of Script: Check for sub, username, role, exp
```

## Credit Allocation Flow

```mermaid
sequenceDiagram
    participant Script
    participant Auth as Authentication Service
    participant Acc as Accounting Service
    
    Note over Script,Auth: Admin already logged in with JWT token
    
    Script->>Acc: GET /api/usage/system-stats (Admin JWT)
    Note right of Script: Verify Admin JWT works cross-service
    Acc-->>Script: System Stats (200)
    
    Script->>Acc: POST /api/credits/allocate (Admin JWT)
    Note right of Script: Allocate credits to test user
    Acc-->>Script: Credits Allocated (201)
    
    Note over Script: Switch to test user JWT
    
    Script->>Acc: GET /api/credits/balance (User JWT)
    Note right of Script: Verify user account auto-created
    Acc-->>Script: Credit Balance (200)
```

## JWT Security Testing Flow

```mermaid
sequenceDiagram
    participant Script
    participant Acc as Accounting Service
    
    Note over Script,Acc: Test 1: JWT Cross-Service Validation
    
    Script->>Acc: GET /api/credits/balance (User JWT)
    Acc->>Acc: Validate JWT Signature
    Acc->>Acc: Extract User Information
    Acc-->>Script: Balance Response (200)
    
    Note over Script,Acc: Test 2: Invalid JWT Rejection
    
    Script->>Script: Modify JWT Token
    Script->>Acc: GET /api/credits/balance (Modified JWT)
    Acc->>Acc: Detect Invalid Signature
    Acc-->>Script: Unauthorized (401)
    
    Note over Script,Acc: Test 3: Role-Based Access Control
    
    Script->>Acc: GET /api/usage/system-stats (User JWT)
    Acc->>Acc: Validate JWT Signature
    Acc->>Acc: Check User Role ≠ Admin
    Acc-->>Script: Forbidden (403)
```

## JWT Information Flow Between Services

```mermaid
flowchart TD
    subgraph "User Registration"
        A1[User Signs Up] --> A2[Email Verification]
        A2 --> A3[Account Activated]
    end
    
    subgraph "Authentication Service"
        B1[Verify Credentials]
        B2[Generate JWT Token]
        B3[Sign with Secret Key]
        B4[Issue Token to User]
    end
    
    subgraph "JWT Token"
        C1[Header - Algorithm]
        C2[Payload - User Data]
        C3[Signature - Verification]
        
        C2 --> C21[User ID]
        C2 --> C22[Username]
        C2 --> C23[Email]
        C2 --> C24[Role]
        C2 --> C25[Expiration]
    end
    
    subgraph "Accounting Service"
        D1[Receive JWT]
        D2[Verify Signature]
        D3[Extract User Info]
        D4[Auto-Create User if New]
        D5[Grant Access to Resources]
    end
    
    A3 --> B1
    B1 --> B2 --> B3 --> B4
    
    B4 -- JWT --> D1
    B4 -- JWT --> Client
    
    Client -- JWT in Header --> D1
    
    D1 --> D2 --> D3
    D3 --> D4 --> D5
    
    C3 -.-> D2
```

## Shared JWT Secret Security Model

```mermaid
graph TD
    subgraph "JWT Generation and Verification"
        JWT_Secret[Shared JWT Secret]
        
        subgraph "Authentication Service"
            A1[Verify User Identity]
            A2[Generate JWT]
            A3[Sign JWT with Secret]
        end
        
        subgraph "Accounting Service"
            B1[Receive JWT]
            B2[Verify Signature with Secret]
            B3[Trust User Claims if Valid]
        end
        
        JWT_Secret --> A3
        JWT_Secret --> B2
        
        A1 --> A2 --> A3 --> User
        User -- "JWT in Authorization Header" --> B1 --> B2 --> B3
    end
    
    subgraph "Security Benefits"
        S1[No Direct Database Sharing]
        S2[No Inter-Service Queries]
        S3[Only JWT Used for Identity]
        S4[Stateless Authentication]
    end
    
    B3 --> S1
    B3 --> S2
    B3 --> S3
    B3 --> S4
```

## Test Report Generation

```mermaid
flowchart LR
    A[Run All Test Scenarios] --> B[Collect Results]
    B --> C[Generate Markdown Report]
    
    C --> D[Test Scenario Results Table]
    C --> E[JWT Information Flow Details]
    C --> F[Security Notes Section]
    
    D --> D1[Registration Results]
    D --> D2[Login Results]
    D --> D3[Credit Allocation Results]
    D --> D4[JWT Security Results]
    
    E --> E1[Registration Flow Details]
    E --> E2[Login & JWT Issuance Details]
    E --> E3[Cross-Service Auth Details]
    E --> E4[First-Time User Flow Details]
    
    F --> F1[JWT Secret Sharing]
    F --> F2[No Database Sharing]
    F --> F3[JWT-Only Trust Model]
```

## Conclusion

The workflow test validates the entire JWT-based authentication and authorization flow between the Authentication and Accounting services. It ensures:

1. User registration and verification works correctly
2. JWT tokens are properly issued and contain required information
3. JWT tokens work seamlessly across services without direct database sharing
4. User accounts are automatically created in the Accounting service based on JWT data
5. Credit allocation from admin to users works properly
6. Security mechanisms reject invalid tokens and enforce proper authorization

This microservices design enables a secure and scalable architecture where services trust verified JWT tokens rather than requiring direct database access between services.