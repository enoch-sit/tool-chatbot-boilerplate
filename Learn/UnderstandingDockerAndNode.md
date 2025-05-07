# Understanding Docker and Node.js for Beginners

## Introduction to Docker

Docker is a platform that makes it easier to create, deploy, and run applications using containers. Think of containers as lightweight, portable, self-sufficient packages that include everything your application needs to run (code, runtime, libraries, etc.).

### What is a Container?

```mermaid
flowchart TB
    subgraph "Your Computer"
        subgraph "Container 1"
            App1[App]
            Libs1[Libraries]
            C1[Configuration]
        end
        subgraph "Container 2"
            App2[App]
            Libs2[Libraries]
            C2[Configuration]
        end
        Docker[Docker Engine]
        OS[Operating System]
    end
    Docker --> OS
    Container1 --> Docker
    Container2 --> Docker
```

A container:
- Is like a mini-computer inside your computer
- Contains everything needed to run an application
- Isolates applications from each other
- Runs the same way on any computer with Docker

## Our Project Structure

Our project consists of several services that work together:

```mermaid
flowchart LR
    Client([Client/Browser]) --> Auth
    Client --> Chat
    Client --> Accounting
    
    subgraph "Docker Containers"
        Auth[Authentication Service]
        Chat[Chat Service]
        Accounting[Accounting Service]
        Mongo[MongoDB]
        Redis[Redis]
        Prometheus[Prometheus]
        Grafana[Grafana]
    end
    
    Chat --> Mongo
    Chat --> Redis
    Chat --> Auth
    Chat --> Accounting
    Prometheus --> Chat
    Grafana --> Prometheus
```

## Common Docker Commands

When working with Docker, these are the commands we used most often:

```mermaid
graph TD
    A[Start Docker] --> B[docker-compose up -d]
    B --> C[Check Status]
    C --> D{Is Service Running?}
    D -->|Yes| E[Use the Service]
    D -->|No| F[Check Logs]
    F --> G[Fix Issues]
    G --> B
```

- `docker-compose up -d`: Start all services defined in docker-compose.yml
- `docker-compose down`: Stop all services
- `docker-compose logs service-name`: View logs for a specific service
- `docker-compose build --no-cache`: Rebuild a service without using cached layers

## What We Fixed in Our Project

We encountered and solved several issues when setting up our Docker environment:

### Issue 1: Port Conflicts

```mermaid
flowchart TD
    A[Issue: Port conflicts] --> B[Services failed to start]
    B --> C[Error: Port already in use]
    C --> D[Solution: Change ports in docker-compose.yml]
    D --> E[MongoDB: 27017 → 27018]
    D --> F[Redis: 6379 → 6380]
    D --> G[Prometheus: 9090 → 9091]
```

When multiple services try to use the same port, Docker will report an error. We solved this by changing the port mappings in our docker-compose.yml file.

### Issue 2: TypeScript Compilation Problems

```mermaid
flowchart TD
    A[Issue: Missing server.js file] --> B[Error: Cannot find module '/app/dist/server.js']
    B --> C[Problem: TypeScript configuration]
    C --> D[Solution: Fix tsconfig.json]
    D --> E[Change rootDir from '.' to 'src']
    D --> F[Update include patterns]
    F --> G[Rebuild container]
    G --> H[Service starts successfully]
```

Our chat service wouldn't start because TypeScript wasn't compiling our code correctly. The main issue was in tsconfig.json, where we needed to point the rootDir to the 'src' directory instead of the project root.

## How Docker and Node.js Work Together

```mermaid
flowchart TB
    subgraph "Docker Container"
        subgraph "Node.js App"
            TS[TypeScript Code]
            JS[Compiled JavaScript]
            NPM[NPM Packages]
        end
        NODE[Node.js Runtime]
    end
    
    TS -- "tsc (TypeScript Compiler)" --> JS
    JS -- "Executed by" --> NODE
    NPM -- "Used by" --> JS
```

In our project:
1. We write code in TypeScript (.ts files)
2. Docker builds our application using a Dockerfile
3. During build, TypeScript compiles to JavaScript
4. Node.js runtime executes the JavaScript code
5. Services communicate with each other over internal networks

## Docker Components for Our Chat Service

```mermaid
flowchart LR
    subgraph "Docker Ecosystem"
        subgraph "Chat Service Container"
            App[Node.js App]
        end
        subgraph "Database Containers"
            Mongo[MongoDB]
            Redis[Redis]
        end
        subgraph "Monitoring Containers"
            Prom[Prometheus]
            Graf[Grafana]
        end
    end
    
    App --> Mongo
    App --> Redis
    Prom --> App
    Graf --> Prom
```

Each component runs in its own container, making the system:
- Modular: Each part can be updated independently
- Scalable: Can run multiple instances of services
- Portable: Works the same in development and production
- Reliable: If one service crashes, others can continue running

## Networking Between Containers

```mermaid
flowchart LR
    subgraph "External World"
        User[User Browser]
    end
    
    subgraph "Docker Networks"
        subgraph "chatbot-shared-network"
            Auth[Auth Service<br>Port 3000]
            Acct[Accounting Service<br>Port 3001]
            Chat[Chat Service<br>Port 3002]
        end
        
        subgraph "chat-service-network"
            Chat
            MongoDB[MongoDB<br>Port 27018]
            Redis[Redis<br>Port 6380]
        end
    end
    
    User -- "http://localhost:3002" --> Chat
    Chat -- "Internal network" --> MongoDB
    Chat -- "Internal network" --> Redis
    Chat -- "chatbot-shared-network" --> Auth
    Chat -- "chatbot-shared-network" --> Acct
```

Our project uses two types of networks:
- **chatbot-shared-network**: Allows different services (Auth, Accounting, and Chat) to communicate
- **chat-service-network**: Internal network for the Chat service components

## Common Docker Issues and Solutions

### Port Conflicts
- **Issue**: "Bind for 0.0.0.0:27017 failed: port is already allocated"
- **Solution**: Change the port mapping in docker-compose.yml from "27017:27017" to "27018:27017"

### Missing Files After Build
- **Issue**: "Cannot find module '/app/dist/server.js'"
- **Solution**: Fix TypeScript configuration in tsconfig.json to compile files to the correct location

### Container Networking Problems
- **Issue**: "Error response from daemon: failed to set up container networking"
- **Solution**: Restart Docker or ensure the shared network is created first

## Best Practices We Learned

1. **Start services in the correct order**: Authentication → Accounting → Chat
2. **Check service health**: Use health endpoints to verify services are running
3. **Use unique ports**: Avoid port conflicts by using different external ports
4. **Review logs when troubleshooting**: `docker-compose logs service-name`
5. **Rebuild from scratch when needed**: `docker-compose build --no-cache`

## Conclusion

Docker provides a consistent environment for development and deployment. By containerizing our services, we can:
- Ensure consistent behavior across different environments
- Simplify dependency management
- Focus on writing code rather than setting up environments
- Deploy faster and more reliably

Our chat service project demonstrates how multiple Docker containers can work together to create a complete application system, with separate containers for the application, databases, and monitoring tools.