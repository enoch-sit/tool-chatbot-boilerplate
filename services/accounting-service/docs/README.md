# Accounting Service Documentation

## Overview
The Accounting Service is responsible for managing credits, tracking usage, and handling streaming sessions for the chat application. It provides a centralized way to allocate, track, and deduct credits as users interact with various services, particularly the chat and streaming functionalities.

## Key Features

- **Credit Management**: Allocate credits to users, check credit balances, and deduct credits
- **Usage Tracking**: Record and track usage of services by users
- **Streaming Sessions**: Handle pre-allocation of credits for streaming sessions and manage refunds
- **Statistics**: Generate usage statistics for both users and administrators
- **JWT Authentication**: Secure all endpoints with JWT authentication

## Architecture

The Accounting Service follows a layered architecture:

- **Models**: Define database schemas for user accounts, credit allocations, usage records, and streaming sessions
- **Services**: Implement business logic for credit management, usage tracking, and streaming sessions
- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define API endpoints
- **Middleware**: Provide JWT authentication and authorization

## API Endpoints

### Credit Management

- `GET /api/credits/balance` - Get current user's credit balance
- `POST /api/credits/allocate` - Allocate credits to a user (admin/supervisor only)
- `POST /api/credits/check` - Check if user has sufficient credits
- `GET /api/credits/balance/:userId` - Get a user's credit balance (admin/supervisor only)
- `POST /api/credits/calculate` - Calculate credits for a specific operation

### Streaming Sessions

- `POST /api/streaming-sessions/initialize` - Initialize a streaming session
- `POST /api/streaming-sessions/finalize` - Finalize a streaming session
- `POST /api/streaming-sessions/abort` - Abort a streaming session
- `GET /api/streaming-sessions/active` - Get active sessions for current user
- `GET /api/streaming-sessions/active/all` - Get all active sessions (admin only)

### Usage Tracking

- `POST /api/usage/record` - Record a usage event
- `GET /api/usage/stats` - Get current user's usage statistics
- `GET /api/usage/system-stats` - Get system-wide usage statistics (admin only)
- `GET /api/usage/stats/:userId` - Get a user's usage statistics (admin/supervisor only)

## Database Schema

### UserAccount
- `userId`: string (primary key) - User ID from Authentication service
- `email`: string - User's email for identification
- `username`: string - User's username
- `role`: string - User's role (user, supervisor, admin)

### CreditAllocation
- `id`: number (primary key) - Auto-increment ID
- `userId`: string (foreign key) - User ID from UserAccount
- `totalCredits`: number - Total credits allocated
- `remainingCredits`: number - Remaining credits
- `allocatedBy`: string - User ID who allocated the credits
- `allocatedAt`: date - When credits were allocated
- `expiresAt`: date - When credits expire
- `notes`: string - Optional notes about the allocation

### UsageRecord
- `id`: number (primary key) - Auto-increment ID
- `userId`: string (foreign key) - User ID from UserAccount
- `timestamp`: date - When the usage occurred
- `service`: string - The service used (e.g., 'chat', 'chat-streaming')
- `operation`: string - The specific operation (e.g., model ID)
- `credits`: number - Credits consumed
- `metadata`: json - Additional metadata about the usage

### StreamingSession
- `id`: number (primary key) - Auto-increment ID
- `sessionId`: string - Unique session identifier
- `userId`: string (foreign key) - User ID from UserAccount
- `modelId`: string - The model being used
- `estimatedCredits`: number - Estimated credits needed
- `allocatedCredits`: number - Credits allocated for the session
- `usedCredits`: number - Actual credits used
- `status`: enum - Status of the session (active, completed, failed)
- `startedAt`: date - When the session started
- `completedAt`: date - When the session completed or failed

## Deployment

The service is containerized using Docker and can be deployed using the provided docker-compose.yml file. This will set up both the service and a PostgreSQL database.

```bash
docker-compose up -d
```

## Development

To run the service in development mode, change directory to services/accounting-service:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the service in development mode:
   ```bash
   npm run dev
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Integration with Other Services

The Accounting Service integrates with:

- **Authentication Service**: Validates JWTs and retrieves user information
- **Chat Service**: Records usage and manages credits for chat operations
- **Streaming Service**: Handles credit pre-allocation and refunds for streaming sessions

## Credit Calculation

Credits are calculated based on the model used and the number of tokens:

- Claude 3 Sonnet: 3.0 credits per 1000 tokens
- Claude 3 Haiku: 0.25 credits per 1000 tokens
- Claude Instant: 0.8 credits per 1000 tokens
- Titan Text Express: 0.3 credits per 1000 tokens
- Other models: 1.0 credit per 1000 tokens (default)

## Streaming Session Flow

1. **Initialization**: Client requests a streaming session with estimated token count
2. **Pre-allocation**: Service calculates required credits (with 20% buffer) and checks if user has sufficient credits
3. **Credit Lock**: Credits are deducted from user's balance and marked as used for this session
4. **Session Tracking**: Service tracks the active session
5. **Finalization**: Client reports actual tokens used when session completes
6. **Refund**: Any unused credits are refunded to the user's account
7. **Usage Recording**: Usage is recorded for analytics and reporting

## Error Handling

The service includes robust error handling for:
- Insufficient credits
- Invalid JWTs
- Session not found
- Database errors
- Permission errors

## Security Considerations

- All endpoints are protected with JWT authentication
- Admin and supervisor endpoints have additional role-based authorization
- Rate limiting is applied to prevent abuse
- Helmet middleware adds security headers
- CORS is configured to restrict access to trusted origins