# Information Flow and JWT Sharing Between Services

Here are detailed sequential diagrams showing how information is shared among the three main services (Authentication, Accounting, and Chat), along with how JWT secrets enable secure cross-service communication. I'll illustrate each scenario you requested.

## System Architecture Overview

First, let's look at how the services are connected and how JWT secrets are shared:

```mermaid
graph TD
    Client[Client Applications]
    AdminDash[Admin Dashboard]
    
    AuthDB[(Authentication DB<br>MongoDB)]
    AcctDB[(Accounting DB<br>PostgreSQL)]
    ChatDB[(Chat History DB<br>MongoDB)]
    
    AuthSvc[Authentication Service]
    AcctSvc[Accounting Service]
    ChatSvc[Chat Service]
    AWS[AWS Bedrock]
    
    Client --> AuthSvc
    Client --> AcctSvc
    Client --> ChatSvc
    AdminDash --> AuthSvc
    AdminDash --> AcctSvc
    AdminDash --> ChatSvc
    
    AuthSvc <--> AuthDB
    AcctSvc <--> AcctDB
    ChatSvc <--> ChatDB
    ChatSvc <--> AWS
    
    %% JWT Secret Sharing
    jwtSecret{JWT Signing Secret<br>Environment Variable}
    
    jwtSecret -.->|Same secret in all services| AuthSvc
    jwtSecret -.->|Same secret in all services| AcctSvc
    jwtSecret -.->|Same secret in all services| ChatSvc
    
    %% Service to service communication
    ChatSvc -->|Verify Credits<br>JWT in header| AcctSvc
    
    class jwtSecret highlight
```

Now let's explore each scenario in detail.

## 1. Registration Scenario

```mermaid
sequenceDiagram
    actor User
    participant Client as Client (Browser/App)
    participant Auth as Authentication Service
    participant Email as Email Service
    participant AuthDB as MongoDB (Auth)
    
    User->>Client: Enter registration details
    Client->>Auth: POST /api/auth/signup
    
    Auth->>Auth: Validate registration data
    Auth->>AuthDB: Check if email/username exists
    AuthDB-->>Auth: Response (exists or not)
    
    alt Email or Username already exists
        Auth-->>Client: 400: Username/Email already exists
        Client-->>User: Show error message
    else Registration valid
        Auth->>AuthDB: Create new user record
        AuthDB-->>Auth: Success
        
        Auth->>Auth: Generate verification token
        Auth->>AuthDB: Store verification token
        Auth->>Email: Send verification email
        
        Auth-->>Client: 201: User created successfully
        Client-->>User: Show success & verification instructions
        
        User->>Email: Open verification email
        User->>Client: Click verification link
        Client->>Auth: POST /api/auth/verify-email
        Auth->>AuthDB: Verify and update user status
        Auth-->>Client: 200: Email verified
        Client-->>User: Show success message
    end
    
    note over Auth,AuthDB: At this point, only Auth DB has user record.<br>Accounting and Chat services will create records<br>upon first interaction using JWT data.
```

## 2. Login Scenario

```mermaid
sequenceDiagram
    actor User
    participant Client as Client (Browser/App)
    participant Auth as Authentication Service
    participant AuthDB as MongoDB (Auth)
    
    User->>Client: Enter login credentials
    Client->>Auth: POST /api/auth/login
    
    Auth->>AuthDB: Validate credentials
    AuthDB-->>Auth: User data (if valid)
    
    alt Invalid credentials
        Auth-->>Client: 401: Invalid credentials
        Client-->>User: Show error message
    else Email not verified
        Auth-->>Client: 401: Email not verified
        Client-->>User: Show verification required message
    else Valid login
        Auth->>Auth: Generate JWT tokens
        Note right of Auth: Creates access token (15m)<br>and refresh token (days)<br>using JWT_SECRET
        
        Auth-->>Client: 200: Login successful with tokens
        Client->>Client: Store tokens in local storage
        Client-->>User: Redirect to dashboard
    end
```

## 3. Credit Allocation Scenario

```mermaid
sequenceDiagram
    actor Admin
    participant AdminDash as Admin Dashboard
    participant AuthSvc as Authentication Service
    participant AcctSvc as Accounting Service
    participant AuthDB as MongoDB (Auth)
    participant AcctDB as PostgreSQL (Accounting)
    
    Admin->>AdminDash: Open user management
    AdminDash->>AuthSvc: GET /api/admin/users
    Note right of AdminDash: Sends admin's JWT in Authorization header
    
    AuthSvc->>AuthSvc: Verify JWT signature & admin role
    AuthSvc->>AuthDB: Fetch users list
    AuthDB-->>AuthSvc: Users data
    AuthSvc-->>AdminDash: 200: Users list
    
    Admin->>AdminDash: Select user & allocate credits
    
    AdminDash->>AcctSvc: POST /api/credits/allocate
    Note right of AdminDash: Sends admin's JWT in Authorization header
    
    AcctSvc->>AcctSvc: Verify JWT signature & admin/supervisor role
    
    alt First interaction with this user
        AcctSvc->>AcctSvc: Extract user data from JWT
        AcctSvc->>AcctDB: Create user account record
        AcctDB-->>AcctSvc: Created
    end
    
    AcctSvc->>AcctDB: Create credit allocation record
    AcctDB-->>AcctSvc: Allocation created
    
    AcctSvc-->>AdminDash: 201: Credits allocated
    AdminDash-->>Admin: Show success message
    
    note over AuthSvc,AcctSvc: Admin's JWT contains their user ID<br>Target user's ID is sent in request body<br>No direct DB connection between services
```

## 4. User Chat Scenario with Streaming

```mermaid
sequenceDiagram
    actor User
    participant Client as Client (Browser/App)
    participant ChatSvc as Chat Service
    participant AcctSvc as Accounting Service
    participant AWS as AWS Bedrock
    participant ChatDB as Chat DB
    participant AcctDB as Accounting DB
    
    User->>Client: Enter chat message
    Client->>ChatSvc: POST /api/chat/sessions/:id/stream
    Note right of Client: Sends user's JWT token in header
    
    ChatSvc->>ChatSvc: Verify JWT signature 
    
    alt First time chat for user
        ChatSvc->>ChatSvc: Extract user data from JWT
        ChatSvc->>ChatDB: Create user's first chat session
        ChatDB-->>ChatSvc: Session created
    else Existing user
        ChatSvc->>ChatDB: Append user message to session
        ChatDB-->>ChatSvc: Session updated
    end
    
    ChatSvc->>ChatSvc: Prepare message for streaming
    
    %% Streaming session initialization with accounting
    ChatSvc->>AcctSvc: POST /api/streaming-sessions/initialize
    Note right of ChatSvc: Forwards user's JWT in header
    
    AcctSvc->>AcctSvc: Verify JWT & extract user data
    AcctSvc->>AcctDB: Check user's credit balance
    AcctDB-->>AcctSvc: Credit balance data
    
    alt Insufficient credits
        AcctSvc-->>ChatSvc: 402: Insufficient credits
        ChatSvc-->>Client: Error: Need more credits
        Client-->>User: Show "Insufficient credits" message
    else Credits available
        AcctSvc->>AcctDB: Pre-allocate credits for session
        AcctDB-->>AcctSvc: Credits allocated
        AcctSvc-->>ChatSvc: 201: Session initialized with ID
        
        %% Streaming from AWS Bedrock
        ChatSvc->>Client: Open SSE stream connection
        ChatSvc->>AWS: Start streaming request to Bedrock
        
        loop For each chunk from Bedrock
            AWS-->>ChatSvc: Stream response chunk
            ChatSvc-->>Client: Send chunk via SSE
            Client-->>User: Display incremental response
        end
        
        AWS-->>ChatSvc: Stream complete
        ChatSvc->>ChatDB: Save complete response
        ChatDB-->>ChatSvc: Response saved
        
        %% Finalize accounting
        ChatSvc->>AcctSvc: POST /api/streaming-sessions/finalize
        Note right of ChatSvc: Sends actual token count
        
        AcctSvc->>AcctDB: Update session & refund unused credits
        AcctDB-->>AcctSvc: Session finalized
        AcctSvc-->>ChatSvc: 200: Session finalized
        
        ChatSvc-->>Client: Stream complete event
    end
    
    note over Client,AWS: If connection drops during streaming,<br>the Chat Service will call /abort endpoint<br>on Accounting Service to handle partial usage
```

## 5. Supervisor Interrupt Scenario

```mermaid
sequenceDiagram
    actor Student
    actor Supervisor
    participant StudentClient as Student Client
    participant SupervisorClient as Supervisor Dashboard
    participant ChatSvc as Chat Service
    participant AuthSvc as Authentication Service
    participant AcctSvc as Accounting Service
    participant MonitorSvc as Monitoring Service
    participant RelationshipDB as Monitoring DB
    
    %% Student begins chat
    Student->>StudentClient: Start chat session
    
    %% Normal chat interaction (simplified)
    StudentClient->>ChatSvc: Start streaming chat
    ChatSvc->>AcctSvc: Initialize credits
    AcctSvc-->>ChatSvc: Credits initialized
    
    %% Streaming begins
    ChatSvc-->>StudentClient: Begin streaming response
    
    %% Supervisor monitors
    Supervisor->>SupervisorClient: Open monitoring dashboard
    SupervisorClient->>MonitorSvc: GET /api/supervised-students
    Note right of SupervisorClient: Sends supervisor's JWT
    
    MonitorSvc->>MonitorSvc: Verify JWT & supervisor role
    MonitorSvc->>RelationshipDB: Get supervisor's students
    RelationshipDB-->>MonitorSvc: Student relationships
    MonitorSvc-->>SupervisorClient: List of supervised students
    
    %% View active sessions
    SupervisorClient->>AcctSvc: GET /api/streaming-sessions/active/:studentId
    Note right of SupervisorClient: Supervisor's JWT in header
    
    AcctSvc->>MonitorSvc: Verify supervisor-student relationship
    MonitorSvc->>RelationshipDB: Check relationship
    RelationshipDB-->>MonitorSvc: Relationship confirmed
    MonitorSvc-->>AcctSvc: Relationship valid
    
    AcctSvc->>AcctSvc: Get active sessions for student
    AcctSvc-->>SupervisorClient: Active sessions data
    
    %% Join streaming session
    Supervisor->>SupervisorClient: Click to observe session
    SupervisorClient->>MonitorSvc: GET /api/observe/:studentId/:sessionId/stream
    
    MonitorSvc->>RelationshipDB: Verify relationship
    RelationshipDB-->>MonitorSvc: Verified
    
    MonitorSvc->>ChatSvc: Request to observe stream
    ChatSvc->>ChatSvc: Duplicate stream for observer
    
    %% Both receive stream
    ChatSvc-->>StudentClient: Continue streaming
    ChatSvc-->>SupervisorClient: Mirror streaming data
    
    %% Supervisor interrupts
    Supervisor->>SupervisorClient: Click "Interrupt Session"
    SupervisorClient->>ChatSvc: POST /api/sessions/:id/interrupt
    
    ChatSvc->>AWS: Stop generation request
    ChatSvc->>AcctSvc: Finalize session with partial usage
    AcctSvc-->>ChatSvc: Session finalized
    
    ChatSvc-->>StudentClient: Stream interrupted notification
    ChatSvc-->>SupervisorClient: Interruption confirmed
    
    %% Supervisor adds feedback
    Supervisor->>SupervisorClient: Add feedback message
    SupervisorClient->>ChatSvc: POST /api/sessions/:id/feedback
    ChatSvc->>ChatDB: Store supervisor feedback
    ChatSvc-->>StudentClient: Show supervisor feedback
    StudentClient-->>Student: Display supervisor message
    
    note over MonitorSvc,RelationshipDB: The Monitoring Service maintains<br>supervisor-student relationships<br>and mediates access permissions
```

## JWT Token Contents and Sharing

To clarify how JWT works across services:

```mermaid
graph TD
    subgraph JWT Token Structure
        header[Header:<br>alg: HS256<br>typ: JWT]
        
        payload[Payload:<br>sub: user_id<br>username: string<br>email: string<br>role: string<br>type: access|refresh<br>iat: timestamp<br>exp: timestamp]
        
        sig[Signature:<br>HMACSHA256(<br>base64UrlEncode(header) + "." +<br>base64UrlEncode(payload),<br>JWT_SECRET<br>)]
    end
    
    subgraph Environment Variables
        authEnv[Authentication Service:<br>JWT_ACCESS_SECRET=shared_secret<br>JWT_REFRESH_SECRET=shared_secret]
        
        acctEnv[Accounting Service:<br>JWT_ACCESS_SECRET=shared_secret<br>JWT_REFRESH_SECRET=shared_secret]
        
        chatEnv[Chat Service:<br>JWT_ACCESS_SECRET=shared_secret<br>JWT_REFRESH_SECRET=shared_secret]
    end
    
    subgraph Token Verification
        verify[Each service:<br>1. Extracts token from Authorization header<br>2. Verifies signature using shared JWT_SECRET<br>3. Checks token type (access vs refresh)<br>4. Verifies expiration time<br>5. Extracts user data (id, role, etc.)]
    end
    
    jwt[JWT Token:<br>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<br>eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJqb2huX2RvZSIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjM5NjIyfQ.<br>SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c]
    
    class jwt highlight
```

## Final Notes About JWT Security

1. **Shared Secret**: The same JWT secret is stored as an environment variable in all three services, allowing them to independently verify tokens.

2. **No Database Sharing**: The services don't share database access - they only trust the data in validated JWT tokens.

3. **User Data Flow**: When a user first interacts with Accounting or Chat services, those services create their own user records based on JWT data, not by querying the Auth database.

4. **Service-to-Service Communication**: When Chat Service needs to verify credits with Accounting Service, it forwards the user's JWT in the request header.

5. **Token Refresh**: The Authentication Service is the only one that can issue new tokens. When access tokens expire, clients must request a new one from Auth Service using their refresh token.

This architecture allows each service to operate independently while maintaining secure, stateless authentication across the entire system.
