# Accounting Service API Endpoints Documentation

This document provides a comprehensive reference for all API endpoints in the accounting service.

## Base URL

All endpoints are relative to the base URL: `http://localhost:3001` (development) or your deployed API URL.

## Authentication

Most endpoints require authentication using JWT tokens:

```
Authorization: Bearer <access_token>
```

Access tokens are validated against the Authentication Service's JWT secret.

## Table of Contents

- [Health Check](#health-check)
- [Credit Management Endpoints](#credit-management-endpoints)
- [Streaming Session Endpoints](#streaming-session-endpoints)
- [Usage Tracking Endpoints](#usage-tracking-endpoints)

---

## Health Check

### Get Service Health

```
GET /health
```

**Description**: Returns the current health status of the accounting service.

**Access Level**: Public

**Response (200 OK)**:

```json
{
  "status": "ok",
  "service": "accounting-service",
  "version": "1.0.0",
  "timestamp": "2025-04-26T12:34:56.789Z"
}
```

---

## Credit Management Endpoints

Endpoints for managing user credits.

### Get Current User's Credit Balance

```
GET /api/credits/balance
```

**Description**: Returns the credit balance for the authenticated user.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Response (200 OK)**:

```json
{
  "totalCredits": 1000,
  "activeAllocations": [
    {
      "id": 1,
      "credits": 500,
      "expiresAt": "2025-12-31T23:59:59Z",
      "allocatedAt": "2025-04-01T10:20:30Z"
    },
    {
      "id": 2,
      "credits": 500,
      "expiresAt": "2026-06-30T23:59:59Z",
      "allocatedAt": "2025-04-15T14:25:10Z"
    }
  ]
}
```

**Possible Errors**:

- 401: Authentication required
- 500: Error fetching credit balance

### Check Credit Sufficiency

```
POST /api/credits/check
```

**Description**: Checks if the user has sufficient credits for a specific operation.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "credits": 100
}
```

**Response (200 OK - Sufficient Credits)**:

```json
{
  "sufficient": true,
  "credits": 1000,
  "requiredCredits": 100
}
```

**Response (200 OK - Insufficient Credits)**:

```json
{
  "sufficient": false,
  "message": "Insufficient credits"
}
```

**Possible Errors**:

- 400: Invalid credit amount
- 401: Authentication required
- 500: Error checking credits

### Calculate Credits

```
POST /api/credits/calculate
```

**Description**: Calculates the credits required for a specific operation.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "tokens": 1000
}
```

**Response (200 OK)**:

```json
{
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "tokens": 1000,
  "credits": 3
}
```

**Possible Errors**:

- 400: Missing required parameters
- 401: Authentication required
- 500: Error calculating credits

### Get User's Credit Balance (Admin/Supervisor)

```
GET /api/credits/balance/:userId
```

**Description**: Returns the credit balance for a specific user.

**Access Level**: Admin or Supervisor

**Headers**:

```
Authorization: Bearer <access_token>
```

**URL Parameters**:

- `userId`: The ID of the user

**Response (200 OK)**:

```json
{
  "totalCredits": 1000,
  "activeAllocations": [
    {
      "id": 1,
      "credits": 500,
      "expiresAt": "2025-12-31T23:59:59Z",
      "allocatedAt": "2025-04-01T10:20:30Z"
    },
    {
      "id": 2,
      "credits": 500,
      "expiresAt": "2026-06-30T23:59:59Z",
      "allocatedAt": "2025-04-15T14:25:10Z"
    }
  ]
}
```

**Possible Errors**:

- 401: Authentication required
- 403: Supervisor access required
- 404: User not found
- 500: Error fetching credit balance

### Allocate Credits (Admin/Supervisor)

```
POST /api/credits/allocate
```

**Description**: Allocates credits to a specific user.

**Access Level**: Admin or Supervisor

**Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "targetUserId": "user123",
  "credits": 500,
  "expiryDays": 90,
  "notes": "Quarterly allocation"
}
```

**Response (201 Created)**:

```json
{
  "id": 3,
  "userId": "user123",
  "credits": 500,
  "remainingCredits": 500,
  "expiresAt": "2025-07-25T14:30:00Z",
  "message": "Credits allocated successfully"
}
```

**Possible Errors**:

- 400: Invalid request parameters
- 401: Authentication required
- 403: Supervisor access required
- 404: User not found
- 500: Error allocating credits

---

## Streaming Session Endpoints

Endpoints for managing streaming sessions.

### Initialize Streaming Session

```
POST /api/streaming-sessions/initialize
```

**Description**: Initializes a new streaming session and pre-allocates credits.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "sessionId": "stream-1234567890",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "estimatedTokens": 2000
}
```

**Response (201 Created)**:

```json
{
  "sessionId": "stream-1234567890",
  "allocatedCredits": 8,
  "estimatedCredits": 6,
  "message": "Streaming session initialized"
}
```

**Possible Errors**:

- 400: Missing required parameters
- 401: Authentication required
- 402: Insufficient credits for streaming session
- 500: Error initializing streaming session

### Finalize Streaming Session

```
POST /api/streaming-sessions/finalize
```

**Description**: Finalizes a streaming session with actual usage and processes refunds if applicable.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "sessionId": "stream-1234567890",
  "actualTokens": 1800,
  "success": true
}
```

**Response (200 OK)**:

```json
{
  "sessionId": "stream-1234567890",
  "status": "completed",
  "estimatedCredits": 6,
  "actualCredits": 5,
  "refund": 3
}
```

**Possible Errors**:

- 400: Missing required parameters
- 401: Authentication required
- 404: Active streaming session not found
- 500: Error finalizing streaming session

### Abort Streaming Session

```
POST /api/streaming-sessions/abort
```

**Description**: Aborts an active streaming session and processes refunds for unused credits.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "sessionId": "stream-1234567890",
  "tokensGenerated": 500
}
```

**Response (200 OK)**:

```json
{
  "sessionId": "stream-1234567890",
  "status": "aborted",
  "partialCredits": 2,
  "refund": 6
}
```

**Possible Errors**:

- 400: Missing required parameters
- 401: Authentication required
- 404: Active streaming session not found
- 500: Error aborting streaming session

### Get Active Sessions

```
GET /api/streaming-sessions/active
```

**Description**: Returns all active streaming sessions for the authenticated user.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Response (200 OK)**:

```json
[
  {
    "sessionId": "stream-1234567890",
    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "estimatedCredits": 6,
    "allocatedCredits": 8,
    "status": "active",
    "startedAt": "2025-04-26T14:30:00Z"
  }
]
```

**Possible Errors**:

- 401: Authentication required
- 500: Error fetching active sessions

### Get All Active Sessions (Admin Only)

```
GET /api/streaming-sessions/active/all
```

**Description**: Returns all active streaming sessions across all users.

**Access Level**: Admin

**Headers**:

```
Authorization: Bearer <access_token>
```

**Response (200 OK)**:

```json
[
  {
    "sessionId": "stream-1234567890",
    "userId": "user123",
    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "estimatedCredits": 6,
    "allocatedCredits": 8,
    "status": "active",
    "startedAt": "2025-04-26T14:30:00Z"
  },
  {
    "sessionId": "stream-0987654321",
    "userId": "user456",
    "modelId": "anthropic.claude-3-haiku-20240307-v1:0",
    "estimatedCredits": 2,
    "allocatedCredits": 3,
    "status": "active",
    "startedAt": "2025-04-26T14:35:00Z"
  }
]
```

**Possible Errors**:

- 401: Authentication required
- 403: Admin access required
- 500: Error fetching all active sessions

---

## Usage Tracking Endpoints

Endpoints for tracking and reporting usage.

### Record Usage

```
POST /api/usage/record
```

**Description**: Records a usage event for the authenticated user.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "service": "chat",
  "operation": "anthropic.claude-3-sonnet-20240229-v1:0",
  "credits": 5,
  "metadata": {
    "tokens": 1600,
    "promptTokens": 400,
    "completionTokens": 1200
  }
}
```

**Response (201 Created)**:

```json
{
  "id": 123,
  "credits": 5,
  "service": "chat",
  "operation": "anthropic.claude-3-sonnet-20240229-v1:0",
  "timestamp": "2025-04-26T14:40:00Z",
  "message": "Usage recorded successfully"
}
```

**Possible Errors**:

- 400: Invalid request parameters
- 401: Authentication required
- 500: Error recording usage

### Get User Usage Stats

```
GET /api/usage/stats
```

**Description**: Returns usage statistics for the authenticated user.

**Access Level**: Authenticated

**Headers**:

```
Authorization: Bearer <access_token>
```

**Query Parameters**:

- `startDate` (optional): Start date for statistics (ISO format)
- `endDate` (optional): End date for statistics (ISO format)

**Response (200 OK)**:

```json
{
  "totalRecords": 10,
  "totalCredits": 45,
  "byService": {
    "chat": 30,
    "chat-streaming": 15
  },
  "byDay": {
    "2025-04-24": 15,
    "2025-04-25": 15,
    "2025-04-26": 15
  },
  "byModel": {
    "anthropic.claude-3-sonnet-20240229-v1:0": 30,
    "anthropic.claude-3-haiku-20240307-v1:0": 15
  },
  "recentActivity": [
    {
      "id": 123,
      "service": "chat",
      "operation": "anthropic.claude-3-sonnet-20240229-v1:0",
      "credits": 5,
      "timestamp": "2025-04-26T14:40:00Z"
    }
  ]
}
```

**Possible Errors**:

- 401: Authentication required
- 500: Error fetching usage statistics

### Get System-Wide Usage Stats (Admin Only)

```
GET /api/usage/system-stats
```

**Description**: Returns system-wide usage statistics across all users.

**Access Level**: Admin

**Headers**:

```
Authorization: Bearer <access_token>
```

**Query Parameters**:

- `startDate` (optional): Start date for statistics (ISO format)
- `endDate` (optional): End date for statistics (ISO format)

**Response (200 OK)**:

```json
{
  "totalRecords": 50,
  "totalCredits": 230,
  "byService": {
    "chat": 150,
    "chat-streaming": 80
  },
  "byDay": {
    "2025-04-24": 70,
    "2025-04-25": 80,
    "2025-04-26": 80
  },
  "byUser": {
    "user123": 45,
    "user456": 75,
    "user789": 110
  },
  "byModel": {
    "anthropic.claude-3-sonnet-20240229-v1:0": 150,
    "anthropic.claude-3-haiku-20240307-v1:0": 80
  }
}
```

**Possible Errors**:

- 401: Authentication required
- 403: Admin access required
- 500: Error fetching system statistics

### Get User Stats by Admin/Supervisor

```
GET /api/usage/stats/:userId
```

**Description**: Returns usage statistics for a specific user.

**Access Level**: Admin or Supervisor

**Headers**:

```
Authorization: Bearer <access_token>
```

**URL Parameters**:

- `userId`: The ID of the user

**Query Parameters**:

- `startDate` (optional): Start date for statistics (ISO format)
- `endDate` (optional): End date for statistics (ISO format)

**Response (200 OK)**:

```json
{
  "totalRecords": 10,
  "totalCredits": 45,
  "byService": {
    "chat": 30,
    "chat-streaming": 15
  },
  "byDay": {
    "2025-04-24": 15,
    "2025-04-25": 15,
    "2025-04-26": 15
  },
  "byModel": {
    "anthropic.claude-3-sonnet-20240229-v1:0": 30,
    "anthropic.claude-3-haiku-20240307-v1:0": 15
  },
  "recentActivity": [
    {
      "id": 123,
      "service": "chat",
      "operation": "anthropic.claude-3-sonnet-20240229-v1:0",
      "credits": 5,
      "timestamp": "2025-04-26T14:40:00Z"
    }
  ]
}
```

**Possible Errors**:

- 400: User ID is required
- 401: Authentication required
- 403: Insufficient permissions
- 404: User not found
- 500: Error fetching usage statistics

## Response Status Codes

- `200 OK`: The request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required or failed
- `402 Payment Required`: Insufficient credits
- `403 Forbidden`: Permission denied for the requested resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
