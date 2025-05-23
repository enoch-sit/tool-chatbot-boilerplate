# Understanding Microservices Communication with Docker

This guide explains how our services communicate with each other using Docker, with diagrams and explanations aimed at beginners who are new to deployment concepts.

## What We've Built: The Big Picture

We've created a system with three main services that work together:

1. **Authentication Service** - Manages user accounts, login, and security tokens
2. **Accounting Service** - Tracks credits, manages transactions, and handles billing
3. **Chat Service** - Provides AI chat functionality using external AI models

```mermaid
graph TB
    User[User/Client] --> Frontend[Frontend Application]
    Frontend --> Auth[Authentication Service]
    Frontend --> Accounting[Accounting Service]
    Frontend --> Chat[Chat Service]
    
    subgraph Services
        Auth -->|JWT token validation| Accounting
        Auth -->|JWT token validation| Chat
        Chat -->|Credit verification| Accounting
        
        Auth -.->|Database| AuthDB[(Auth DB)]
        Accounting -.->|Database| AcctDB[(Accounting DB)]
        Chat -.->|Database| ChatDB[(Chat DB)]
        Chat -->|AI requests| ExternalAI[External AI Service]
    end
    
    style Auth fill:#f9f,stroke:#333,stroke-width:2px
    style Accounting fill:#bbf,stroke:#333,stroke-width:2px
    style Chat fill:#bfb,stroke:#333,stroke-width:2px
```

## What is Docker?

Docker is like a shipping container for software. Just like shipping containers standardize how goods are transported regardless of what's inside them, Docker containers standardize how software runs regardless of the underlying system.

### Key Docker Concepts:

1. **Container**: A lightweight, standalone package that contains everything needed to run a piece of software, including code, runtime, libraries, and settings.

2. **Image**: A template used to create containers. Think of it as a snapshot of your application and all its dependencies.

3. **Dockerfile**: A text file with instructions for building a Docker image, similar to a recipe.

4. **Docker Compose**: A tool for defining and running multi-container applications (which is what we're using).

## How Our Services Are Packaged in Docker

Each of our services runs in its own Docker container:

```mermaid
graph LR
    subgraph "Host Computer"
        subgraph "Docker"
            AuthContainer[Authentication Container<br>Port 3000]
            AcctContainer[Accounting Container<br>Port 3001]
            ChatContainer[Chat Container<br>Port 3002]
            AuthDB[Auth MongoDB]
            AcctDB[Accounting PostgreSQL]
            ChatDB[Chat MongoDB]
        end
    end
    
    AuthContainer --- AuthDB
    AcctContainer --- AcctDB
    ChatContainer --- ChatDB
    
    style AuthContainer fill:#f9f,stroke:#333,stroke-width:2px
    style AcctContainer fill:#bbf,stroke:#333,stroke-width:2px
    style ChatContainer fill:#bfb,stroke:#333,stroke-width:2px
```

## How Docker Containers Communicate

Docker containers can communicate in two main ways:

### 1. Through Exposed Ports (Host Network)

In development, we expose each service's port to the host computer, allowing them to communicate through "localhost":

```mermaid
sequenceDiagram
    participant User as User
    participant Host as Host Computer
    participant Auth as Auth Service (Port 3000)
    participant Acct as Accounting Service (Port 3001)
    participant Chat as Chat Service (Port 3002)
    
    User->>Host: Request to localhost:3000
    Host->>Auth: Forward request
    Auth->>Host: Response
    Host->>User: Forward response
    
    Chat->>Host: Request to localhost:3001
    Host->>Acct: Forward request
    Acct->>Host: Response
    Host->>Chat: Forward response
```

In this model:
- Each service exposes a port to the host (3000, 3001, 3002)
- Services communicate by making HTTP requests to localhost:PORT
- Simple but not ideal for production (less secure, depends on port mapping)

### 2. Through Docker Networks (Container Networking)

In production, services communicate directly through a shared Docker network:

```mermaid
graph TD
    subgraph "Docker Network: chatbot-shared-network"
        Auth[Authentication Service<br>Hostname: auth-service]
        Acct[Accounting Service<br>Hostname: accounting-service]
        Chat[Chat Service<br>Hostname: chat-service]
    end
    
    Chat -->|http://auth-service:3000| Auth
    Chat -->|http://accounting-service:3001| Acct
    Acct -->|http://auth-service:3000| Auth
    
    style Auth fill:#f9f,stroke:#333,stroke-width:2px
    style Acct fill:#bbf,stroke:#333,stroke-width:2px
    style Chat fill:#bfb,stroke:#333,stroke-width:2px
```

In this model:
- Services connect to each other using service names as hostnames
- Communication is direct within the Docker network
- More secure and better suited for production environments

## JWT Authentication Between Services

Our services don't share databases directly. Instead, they use JWT (JSON Web Tokens) to securely pass user information:

```mermaid
sequenceDiagram
    participant User
    participant Auth
    participant Chat
    participant Acct
    
    User->>Auth: Login with username/password
    Auth->>Auth: Verify credentials
    Auth->>Auth: Generate JWT signed with secret key
    Auth->>User: Return JWT token
    
    User->>Chat: Request with JWT token
    Chat->>Chat: Verify JWT signature with same secret key
    Note right of Chat: JWT contains user ID, role, etc.
    Chat->>Chat: Extract user info from token
    Chat->>User: Provide service
    
    User->>Acct: Request with JWT token
    Acct->>Acct: Verify JWT signature with same secret key
    Acct->>Acct: Extract user info from token
    Acct->>User: Provide service
```

Key points:
- The JWT secret key is shared between services (environment variable)
- Services never query each other's databases directly
- User identity and permissions are extracted from the validated JWT

## Docker Compose: Orchestrating Multiple Services

Docker Compose is a tool that helps us define and manage multiple Docker containers:

```mermaid
graph TD
    docker[docker-compose.yml] --> auth[Authentication Service]
    docker --> acct[Accounting Service]
    docker --> chat[Chat Service]
    docker --> dbs[Databases]
    
    auth --> auth_env[AUTH_SERVICE_URL<br>JWT_ACCESS_SECRET]
    acct --> acct_env[ACCOUNTING_API_URL<br>JWT_ACCESS_SECRET]
    chat --> chat_env[AUTH_API_URL<br>ACCOUNTING_API_URL<br>JWT_ACCESS_SECRET]
```

The docker-compose.yml files contain:
- Which services to run
- Environment variables for configuration
- Network settings
- Volume mounts for persistent data

## Our Communication Issues and Solution

In our original setup, services were in isolated networks:

```mermaid
graph TB
    subgraph "Chat Docker Network"
        Chat[Chat Service]
        ChatDB[(Chat DB)]
    end
    
    subgraph "Accounting Docker Network"
        Acct[Accounting Service]
        AcctDB[(Accounting DB)]
    end
    
    subgraph "Auth Docker Network"
        Auth[Auth Service]
        AuthDB[(Auth DB)]
    end
    
    Chat -.->|Cannot reach!| Acct
    Chat -.->|Cannot reach!| Auth
    
    style Chat fill:#bfb,stroke:#333,stroke-width:2px
    style Acct fill:#bbf,stroke:#333,stroke-width:2px
    style Auth fill:#f9f,stroke:#333,stroke-width:2px
```

The solution was to create a shared network:

```mermaid
graph TB
    subgraph "Shared Network"
        Chat[Chat Service]
        Acct[Accounting Service]
        Auth[Auth Service]
    end
    
    subgraph "Chat Network"
        Chat --- ChatDB[(Chat DB)]
    end
    
    subgraph "Accounting Network"
        Acct --- AcctDB[(Accounting DB)]
    end
    
    subgraph "Auth Network"
        Auth --- AuthDB[(Auth DB)]
    end
    
    Chat -->|Can now reach!| Acct
    Chat -->|Can now reach!| Auth
    Acct -->|Can now reach!| Auth
    
    style Chat fill:#bfb,stroke:#333,stroke-width:2px
    style Acct fill:#bbf,stroke:#333,stroke-width:2px
    style Auth fill:#f9f,stroke:#333,stroke-width:2px
```

## Updating Docker Compose Files to Enable Communication

We modified two Docker Compose files:

1. **Chat Service's docker-compose.yml**:
```yaml
networks:
  chatbot-network:    # Internal network for chat service components
    driver: bridge
  chatbot-shared-network:    # Shared network that connects all services
    name: chatbot-shared-network    # Network name for other services to reference
    driver: bridge    # Network type
```

2. **Accounting Service's docker-compose.yml**:
```yaml
networks:
  accounting-network:    # Internal network for accounting components
    driver: bridge
  chatbot-shared-network:    # Reference to the shared network
    external: true    # Indicates this network is created elsewhere
```

The "external: true" tag indicates that the accounting service expects this network to already exist, while the chat service is responsible for creating it.

## Starting the Services in the Right Order

Because of the network dependencies, services should be started in this order:

1. First, start the chat service (creates the shared network):
```bash
cd services/chat-service
docker-compose up -d
```

2. Next, start the accounting service (joins the existing network):
```bash
cd services/accounting-service
docker-compose up -d
```

3. Finally, start the authentication service (also joins the network).

## Environment Variables for Service Communication

Each service is configured with environment variables that tell it how to find the other services:

- **Chat Service**:
```
AUTH_API_URL=http://auth-service:3000/api
ACCOUNTING_API_URL=http://accounting-service:3001/api
```

- **Accounting Service**:
```
AUTH_SERVICE_URL=http://auth-service:3000
```

- **All services share**:
```
JWT_ACCESS_SECRET=dev_access_secret_key_change_this_in_production
```

## Development vs Production Communication

For simplicity in development, services can communicate through the host machine via localhost:

```mermaid
sequenceDiagram
    participant Chat
    participant Host
    participant Acct
    
    Chat->>Host: Request to localhost:3001/api
    Host->>Acct: Forward to container
    Acct->>Host: Response
    Host->>Chat: Forward to container
```

This works because:
1. Each container exposes its port to the host
2. Containers can reach the host machine
3. The host forwards the request to the appropriate container

For production, a direct container-to-container approach is preferred:

```mermaid
sequenceDiagram
    participant Chat
    participant Acct
    
    Chat->>Acct: Direct request to accounting-service:3001/api
    Acct->>Chat: Direct response
```

## Summary

We've built a microservices architecture with three main services (Authentication, Accounting, and Chat) that communicate through:

1. HTTP API calls between services
2. JWT tokens for secure user authentication
3. Docker networks for container-to-container communication

By using Docker and microservices:
- Each service can be developed, updated, and scaled independently
- Services maintain their own databases and domain logic
- Communication happens through well-defined APIs
- The system is more resilient and maintainable

Whether services communicate through the host machine (localhost) in development or directly via Docker networks in production, the architecture ensures they can work together seamlessly while remaining independently deployable.