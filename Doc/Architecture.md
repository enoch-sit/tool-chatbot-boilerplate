# Microservices Architecture Documentation

## Overview

This project implements a microservices architecture for a chatbot application with sophisticated credit management, usage tracking, and streaming capabilities. The architecture is designed for scalability, maintainability, and performance.

## Core Services

### Accounting Service

The Accounting Service is responsible for:

- Managing user credits and allocations
- Tracking service usage
- Handling streaming session accounting
- Generating usage statistics and reports

Key features:

- Credit allocation and management
- Usage tracking and analytics
- Streaming session credit pre-allocation and refunds
- Role-based access control

For detailed documentation, see the [Accounting Service Documentation](../services/accounting-service/docs/README.md).

### Auth Service (External)

The Authentication Service handles:

- User registration and authentication
- JWT token generation and validation
- User role management
- Account management

This service is accessed via API and shares JWT secrets with other services.

### Chat Service (Upcoming)

The Chat Service will manage:

- Chat conversations and history
- Model selection and usage
- Integration with LLM providers
- Prompt management and chat settings

### Streaming Service (Upcoming)

The Streaming Service will handle:

- Real-time streaming of LLM responses
- WebSockets or SSE for client connections
- Token counting and monitoring
- Integration with Accounting Service for credit tracking

## Technical Stack

### Backend

- **Language**: TypeScript/Node.js
- **Web Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: OpenAPI/Swagger
- **Testing**: Jest for unit and integration testing

### Infrastructure

- **Containerization**: Docker and Docker Compose
- **CI/CD**: GitHub Actions (planned)
- **Monitoring**: Prometheus and Grafana (planned)
- **Logging**: Winston for structured logging

## Communication Patterns

### Synchronous Communication

- REST APIs for service-to-service communication
- JWT for authentication across services

### Asynchronous Communication (Planned)

- Message queue (RabbitMQ or Kafka) for event-driven architecture
- Event types:
  - UserCreated
  - CreditAllocated
  - CreditConsumed
  - StreamingSessionStarted
  - StreamingSessionFinalized

## Deployment Architecture

Each service is containerized with Docker and can be deployed independently:

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│   Auth Service │    │ Accounting Svc │    │   Chat Service │
│                │◄──►│                │◄──►│                │
└────────────────┘    └────────────────┘    └────────────────┘
                              ▲
                              │
                              ▼
                      ┌────────────────┐
                      │ Streaming Svc  │
                      │                │
                      └────────────────┘
```

## Data Flow Diagrams

### Credit Allocation Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│            │     │            │     │            │
│  Admin UI  │────►│Auth Service│────►│Accounting  │
│            │     │            │     │  Service   │
└────────────┘     └────────────┘     └────────────┘
                                             │
                                             ▼
                                      ┌────────────┐
                                      │            │
                                      │PostgreSQL  │
                                      │  Database  │
                                      │            │
                                      └────────────┘
```

### Streaming Session Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│            │     │            │     │            │
│   Client   │────►│Chat Service│────►│ Streaming  │
│            │     │            │     │  Service   │
└────────────┘     └────────────┘     └────────────┘
                                             │
                                             ▼
                                      ┌────────────┐
                                      │            │
                                      │Accounting  │
                                      │  Service   │
                                      │            │
                                      └────────────┘
```

## Security Considerations

- All inter-service communication is authenticated with JWTs
- Role-based access control for administrative functions
- Rate limiting to prevent abuse
- HTTP security headers with Helmet
- CORS configuration for frontend integration
- Secure database credentials management

## Development Workflow

1. Use feature branches for development
2. Write unit and integration tests
3. Perform code reviews before merging
4. Run services locally with Docker Compose
5. Deploy to staging environment for testing
6. Deploy to production after QA approval

## Monitoring and Scaling (Planned)

- Health check endpoints for each service
- Prometheus metrics collection
- Grafana dashboards for visualization
- Horizontal scaling of services behind load balancers
- Database replication for high availability

## Future Enhancements

- Implement caching layer with Redis
- Add service discovery with Consul
- Implement circuit breakers for fault tolerance
- Add distributed tracing with Jaeger
- Implement API gateway for client requests
