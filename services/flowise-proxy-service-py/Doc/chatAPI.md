# Chat API Documentation

## 1. Overview

This document provides detailed information about the Chat API endpoints for the Flowise Proxy Service. These endpoints are used for user authentication, token management, and interacting with chatflows.

**Base Path**: All Chat API endpoints are prefixed with `/api/v1/chat`.

**Authentication**: Unless otherwise specified, endpoints require a valid JWT (JSON Web Token) Bearer token to be included in the `Authorization` header of the request.
Example: `Authorization: Bearer <your_jwt_token>`

## 2. Core Data Models

### `AuthRequest`

Used for user authentication.

```json
{
  "username": "string",
  "password": "string"
}
```

### `RefreshTokenRequest`

Used for refreshing an access token.

```json
{
  "refresh_token": "string"
}
```

### `RevokeTokenRequest`

Used for revoking refresh tokens.

```json
{
  "token_id": "string", // Optional: Specific token ID to revoke
  "all_tokens": "boolean" // Optional: If true, revoke all tokens for the user
}
```

### `ChatRequest`

Used for sending a prediction request to a chatflow.

```json
{
  "chatflow_id": "string",
  "question": "string",
  "overrideConfig": {} // Optional: Dictionary for overriding chatflow configurations
}
```

## 3. API Endpoints

---

### Authenticate User

* **Endpoint**: `POST /api/v1/chat/authenticate`
* **Description**: Authenticates a user via an external authentication service and returns JWT access and refresh tokens.
* **Authentication**: None.
* **Request Body**: `AuthRequest`
* **Success Response** (`200 OK`):

  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "token_type": "bearer",
    "user": {
      // User details from the external auth service
    },
    "message": "string"
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If authentication fails.
  * `500 Internal Server Error`: If an unexpected error occurs.

---

### Refresh Access Token

* **Endpoint**: `POST /api/v1/chat/refresh`
* **Description**: Refreshes an JWT access token using a valid refresh token.
* **Authentication**: None (refresh token is provided in the request body).
* **Request Body**: `RefreshTokenRequest`
* **Success Response** (`200 OK`):

  ```json
  {
    "access_token": "string",
    "refresh_token": "string", // Potentially a new refresh token
    "token_type": "bearer"
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the refresh token is invalid or expired.
  * `500 Internal Server Error`: If an unexpected error occurs.

---

### Revoke Tokens

* **Endpoint**: `POST /api/v1/chat/revoke`
* **Description**: Revokes a specific refresh token or all refresh tokens for the authenticated user.
* **Authentication**: JWT Bearer token required.
* **Request Body**: `RevokeTokenRequest` (optional)
  * If `token_id` is provided, only that token is revoked.
  * If `all_tokens` is `true`, all tokens for the user are revoked.
  * If no body is provided, the current token used for authentication might be targeted (behavior depends on implementation details not fully shown).
* **Success Response** (`200 OK`):

  ```json
  {
    "message": "Tokens revoked successfully.",
    "revoked_count": "integer"
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the JWT is invalid or expired.
  * `400 Bad Request`: If the request parameters are invalid.
  * `500 Internal Server Error`: If an unexpected error occurs.

---

### Chat Prediction

* **Endpoint**: `POST /api/v1/chat/predict`
* **Description**: Processes a chat prediction request. It validates user access to the specified chatflow and then queries the Flowise instance.
* **Authentication**: JWT Bearer token required.
* **Request Body**: `ChatRequest`
* **Success Response** (`200 OK`):
  The response structure depends on the Flowise chatflow's output. Typically, it might be:

  ```json
  {
    "response": "string" // Or a more complex object
    // ... other fields from Flowise
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the JWT is invalid or expired.
  * `403 Forbidden`: If the user does not have permission to access the specified chatflow.
  * `404 Not Found`: If the chatflow ID does not exist.
  * `500 Internal Server Error`: If an unexpected error occurs during prediction or credit management.
  * `503 Service Unavailable`: If the Flowise service is unavailable.

---

### Get User Credits

* **Endpoint**: `GET /api/v1/chat/credits`
* **Description**: Retrieves the current credit balance for the authenticated user.
* **Authentication**: JWT Bearer token required.
* **Request Body**: None.
* **Success Response** (`200 OK`):
  The response structure depends on the `AccountingService`. Example:

  ```json
  {
    "user_id": "string",
    "credits_remaining": "number",
    "last_updated": "datetime"
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the JWT is invalid or expired.
  * `500 Internal Server Error`: If an unexpected error occurs.

---

### Get Chat Sessions

- **Endpoint**: `GET /api/v1/chat/sessions`
- **Description**: Retrieves a summary of all chat sessions for the authenticated user.
- **Authentication**: JWT Bearer token required.
- **Success Response**:
  - **Code**: `200 OK`
  - **Content**:
    ```json
    {
      "sessions": [
        {
          "session_id": "some-session-id",
          "chatflow_id": "some-chatflow-id",
          "topic": "Inquiry about product features",
          "created_at": "2025-07-03T10:00:00Z"
        }
      ],
      "count": 1
    }
    ```

---

### Get Chat Session History

* **Endpoint**: `GET /api/v1/chat/sessions/{session_id}/history`
* **Description**: Retrieves the message history of a specific chat session.
* **Authentication**: JWT Bearer token required.
* **URL Parameters**:
  * `session_id`: The ID of the session whose history is to be retrieved.
* **Success Response** (`200 OK`):
  ```json
  {
    "session_id": "some-session-id",
    "messages": [
      {
        "role": "user",
        "content": "string",
        "timestamp": "datetime"
      },
      {
        "role": "assistant",
        "content": "string",
        "timestamp": "datetime"
      }
    ]
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the JWT is invalid or expired.
  * `404 Not Found`: If the session ID does not exist.
  * `500 Internal Server Error`: If an unexpected error occurs.

---
