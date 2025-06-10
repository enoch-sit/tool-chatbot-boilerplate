# Flowise Proxy Service - Admin API Documentation

## 1. Overview

This document provides detailed information about the Admin API endpoints for the Flowise Proxy Service. These endpoints are used for managing chatflows, user access to chatflows, and related administrative tasks.

**Base Path**: All admin API endpoints are prefixed with `/api/admin`.

**Authentication**:
All endpoints require a valid JWT (JSON Web Token) Bearer token to be included in the `Authorization` header of the request.
Example: `Authorization: Bearer <your_jwt_token>`

The JWT token contains user information, including the user's `role`.

**Admin Privileges**:
Most administrative endpoints require the authenticated user to possess an `ADMIN_ROLE`. This requirement is specified for each endpoint. If a non-admin user attempts to access an admin-only endpoint, a `403 Forbidden` error will be returned.

### Key Concept: User-Chatflow Links vs. User Accounts

It's crucial to understand that these API endpoints primarily manage the **link** or **association** between a user and a chatflow. This link is often represented internally by a `UserChatflow` record or a similar entity.

*   **Assigning Access**: When a user is "added" or "assigned" to a chatflow, a `UserChatflow` record is typically created or marked as active (e.g., `is_active = true`). This grants the specified user permission to interact with that particular chatflow.
*   **Revoking Access**: When a user is "removed" from a chatflow, the corresponding `UserChatflow` record is typically marked as inactive (e.g., `is_active = false`) or, in some cases, the record itself might be deleted. **This action does NOT delete the user's account from the system.** The user account (`User` record) itself remains.
*   **User Account Creation (Side Effect)**: Some endpoints, particularly those that add users by email (e.g., `/chatflows/add-users-by-email`), may have an important side effect: If a user with the provided email address does not already exist in the system, a new user account (`User` record) might be automatically created. This new user is then linked to the specified chatflow.
*   **User Account Deletion**: None of the endpoints described in this document are designed to delete user accounts (`User` records) from the system. Deleting a user entirely from the platform is a separate administrative function not covered by these chatflow-specific APIs.

Understanding this distinction is vital for correctly interpreting the behavior of the user management endpoints related to chatflows.

## 2. Core Data Models

These are the primary Pydantic models used for request and response bodies.

### `AddUsersToChatflowRequest`

Used for adding users (identified by their IDs) to a chatflow.

```json
{
  "user_ids": ["string"],
  "chatflow_id": "string"
}
```

### `AddUsersToChatlowByEmailRequest`

*(Note: There is a typo "Chatlow" instead of "Chatflow" in the model name in the source code.)*
Used for adding users (identified by their email addresses) to a chatflow.

```json
{
  "emails": ["string"],
  "chatflow_id": "string"
}
```

### `UserChatflowResponse`

Standard response model for operations that add/remove users to/from a chatflow, especially in bulk operations.

```json
{
  "user_id": "string",
  "username": "string",
  "status": "string",
  "message": "string"
}
```

### `Chatflow`

Represents a chatflow entity. While the full model is not detailed here, it typically includes:

```json
{
  "id": "string",
  "flowise_id": "string",
  "name": "string",
  "description": "string",
  "status": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "is_public": "boolean"
}
```

### `ChatflowSyncResult`

Response model for the chatflow synchronization operation. While the full model is not detailed here, it typically includes:

```json
{
  "new_chatflows_added": "integer",
  "existing_chatflows_updated": "integer",
  "chatflows_removed": "integer",
  "total_chatflows_synced": "integer",
  "errors": ["string"]
}
```

## 3. User-Chatflow Association Management API Endpoints

These endpoints manage the association of users with specific chatflows.

---

### Add Multiple Users to a Chatflow (by User IDs)

* **Endpoint**: `POST /api/admin/chatflows/add-users`
* **Description**: Assigns multiple existing users, identified by their user IDs, to a specified chatflow. This creates or activates `UserChatflow` links.
* **Authentication**: Admin role required.
* **Request Body**: `AddUsersToChatflowRequest`

  ```json
  {
    "user_ids": ["user_id_1", "user_id_2"],
    "chatflow_id": "target_chatflow_id"
  }
  ```

* **Success Response** (`200 OK`): `List[UserChatflowResponse]`

  ```json
  [
    {
      "user_id": "user_id_1",
      "username": "user1_username",
      "status": "success",
      "message": "User successfully added to chatflow."
    },
    {
      "user_id": "user_id_2",
      "username": "user2_username",
      "status": "error",
      "message": "User not found."
    }
  ]
  ```

* **Notes**: The provided source code for this endpoint appears to be a partial implementation (stub). The actual logic for finding users and creating `UserChatflow` links needs to be fully implemented for it to function as described.

---

### Add Multiple Users to a Chatflow (by Email)

* **Endpoint**: `POST /api/admin/chatflows/add-users-by-email`
* **Description**: Assigns multiple users, identified by their email addresses, to a specified chatflow. If a user with a given email does not exist, a new user account may be created and then linked to the chatflow. This creates or activates `UserChatflow` links.
* **Authentication**: Admin role required.
* **Request Body**: `AddUsersToChatlowByEmailRequest`

  ```json
  {
    "emails": ["user1@example.com", "user2@example.com"],
    "chatflow_id": "target_chatflow_id"
  }
  ```

* **Success Response** (`200 OK`): `List[UserChatflowResponse]`

  ```json
  [
    {
      "user_id": "user_id_1",
      "username": "user1_username",
      "status": "success",
      "message": "User user1@example.com successfully added to chatflow."
    },
    {
      "user_id": "new_user_id_2",
      "username": "user2_username",
      "status": "success",
      "message": "New user user2@example.com created and added to chatflow."
    },
    {
      "user_id": null,
      "username": "user3@example.com",
      "status": "error",
      "message": "Failed to process user user3@example.com."
    }
  ]
  ```

* **Notes**: The provided source code for this endpoint appears to be a stub. For this endpoint to function as described (including user creation if non-existent), it requires full implementation. This is a critical endpoint often used in bulk operations.

---

### Add a Single User to a Chatflow (by User ID)

* **Endpoint**: `POST /api/admin/chatflows/{chatflow_id}/users/{user_id}`
* **Description**: Assigns a single existing user, identified by their user ID, to a specific chatflow identified by its `chatflow_id`.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow.
  * `user_id` (string, required): The ID of the user to add.
* **Request Body**: None.
* **Success Response** (`200 OK` or `201 Created`): Expected to be a `UserChatflowResponse` or a simple success message.

  ```json
  {
    "user_id": "user_id_1",
    "username": "user1_username",
    "status": "success",
    "message": "User successfully added to chatflow."
  }
  ```

* **Notes**: The provided source code for this endpoint appears to be a stub. Full implementation is needed.

---

### Add a Single User to a Chatflow (by Email)

* **Endpoint**: `POST /api/admin/chatflows/{chatflow_id}/users/email/{email}`
* **Description**: Assigns a single user, identified by their email, to a specific chatflow. If the user doesn't exist, a new user account may be created.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow.
  * `email` (string, required): The email of the user to add.
* **Request Body**: None.
* **Success Response** (`200 OK` or `201 Created`): Expected to be a `UserChatflowResponse` or a simple success message.
* **Notes**: The provided source code for this endpoint appears to be a stub. Full implementation is needed.

---

### Remove a User from a Chatflow (by User ID)

* **Endpoint**: `DELETE /api/admin/chatflows/{chatflow_id}/users/{user_id}`
* **Description**: Revokes a user's access to a specific chatflow. This typically deactivates the `UserChatflow` link (sets `is_active = false`) or deletes the link. **It does not delete the user account.**
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow.
  * `user_id` (string, required): The ID of the user to remove.
* **Success Response** (`200 OK` or `204 No Content`): Typically a success message or no content.

  ```json
  {
    "message": "User access to chatflow successfully revoked."
  }
  ```

* **Error Responses**:
  * `404 Not Found`: If the user, chatflow, or the specific user-chatflow link doesn't exist.
  * `409 Conflict`: May be returned if the user's access was already inactive (idempotent removal).
* **Notes**: The provided source code for this endpoint appears to be a stub. Full implementation is needed.

---

### Remove a User from a Chatflow (by Email)

* **Endpoint**: `DELETE /api/admin/chatflows/{chatflow_id}/users/email/{email}`
* **Description**: Finds a user by email and revokes their access to the specified chatflow. This deactivates/deletes the `UserChatflow` link, not the user account.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow.
  * `email` (string, required): The email of the user to remove.
* **Success Response** (`200 OK` or `204 No Content`): Success message or no content.
* **Notes**: The provided source code for this endpoint appears to be a stub. Full implementation is needed.

---

### Bulk Add Users to a Chatflow (by User IDs, using flowise_id in path)

* **Endpoint**: `POST /api/admin/chatflows/{flowise_id}/users/bulk`
* **Description**: A wrapper endpoint to add multiple existing users (by ID) to a chatflow identified by `flowise_id` in the path. It internally calls the `/api/admin/chatflows/add-users` logic. The `chatflow_id` in the request body will be overridden by the `flowise_id` from the path.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `flowise_id` (string, required): The Flowise ID of the chatflow.
* **Request Body**: `AddUsersToChatflowRequest`

  ```json
  {
    "user_ids": ["user_id_1", "user_id_2"],
    "chatflow_id": "can_be_anything_or_omitted_as_overridden"
  }
  ```

* **Success Response** (`200 OK`): `List[UserChatflowResponse]` (dependent on the implementation of the called function).
* **Notes**: This endpoint is implemented to call `add_users_to_chatflow`. Its full functionality depends on the completeness of that underlying function (which is currently a stub).

---

### Bulk Add Users to a Chatflow (by Email, using flowise_id in path)

* **Endpoint**: `POST /api/admin/chatflows/{flowise_id}/users/email/bulk`
* **Description**: A wrapper endpoint to add multiple users (by email) to a chatflow identified by `flowise_id` in the path. It internally calls the `/api/admin/chatflows/add-users-by-email` logic. The `chatflow_id` in the request body will be overridden by the `flowise_id` from the path.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `flowise_id` (string, required): The Flowise ID of the chatflow.
* **Request Body**: `AddUsersToChatlowByEmailRequest`

  ```json
  {
    "emails": ["user1@example.com", "user2@example.com"],
    "chatflow_id": "can_be_anything_or_omitted_as_overridden"
  }
  ```

* **Success Response** (`200 OK`): `List[UserChatflowResponse]` (dependent on the implementation of the called function).
* **Notes**: This endpoint is implemented to call `add_users_to_chatflow_by_email`. Its full functionality depends on the completeness of that underlying function (which is currently a stub). This endpoint was previously used by test scripts, but tests have been updated to call `/api/admin/chatflows/add-users-by-email` directly.

---

## 4. Chatflow Management API Endpoints

These endpoints are for managing the chatflows themselves.

---

### Synchronize Chatflows from Flowise

* **Endpoint**: `POST /api/admin/chatflows/sync`
* **Description**: Fetches all chatflows from the configured external Flowise instance and updates/creates corresponding records in the local database.
* **Authentication**: Admin role required.
* **Request Body**: None.
* **Success Response** (`200 OK`): `ChatflowSyncResult`

  ```json
  {
    "new_chatflows_added": 5,
    "existing_chatflows_updated": 2,
    "total_chatflows_synced": 7,
    "errors": []
  }
  ```

* **Notes**: The implementation details (e.g., how it handles deletions or conflicts) depend on the `ChatflowService`.

---

### List All Chatflows

* **Endpoint**: `GET /api/admin/chatflows`
* **Description**: Retrieves a list of all chatflows stored in the local database.
* **Authentication**: Admin role required.
* **Query Parameters**:
  * `include_deleted` (boolean, optional, default: `false`): If `true`, includes chatflows that are marked as deleted.
* **Success Response** (`200 OK`): `List[Chatflow]`

  ```json
  [
    {
      "id": "db_id_1",
      "flowise_id": "flowise_chatflow_id_1",
      "name": "Support Bot"
    },
    {
      "id": "db_id_2",
      "flowise_id": "flowise_chatflow_id_2",
      "name": "FAQ Assistant"
    }
  ]
  ```

---

### Get Chatflow Statistics

* **Endpoint**: `GET /api/admin/chatflows/stats`
* **Description**: Retrieves statistics about the chatflows, potentially including sync status, counts by status, etc.
* **Authentication**: Admin role required.
* **Success Response** (`200 OK`): JSON object with statistics. The exact structure is not defined in the provided code but might look like:

  ```json
  {
    "total_chatflows": 10,
    "active_chatflows": 8,
    "inactive_chatflows": 1,
    "deleted_chatflows": 1,
    "last_sync_status": "success",
    "last_sync_time": "datetime"
  }
  ```

---

### Get Chatflow by Flowise ID

* **Endpoint**: `GET /api/admin/chatflows/{flowise_id}`
* **Description**: Retrieves detailed information for a specific chatflow using its Flowise ID.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `flowise_id` (string, required): The Flowise ID of the chatflow.
* **Success Response** (`200 OK`): `Chatflow` object.
* **Error Responses**:
  * `404 Not Found`: If no chatflow with the given `flowise_id` exists.

---

### Force Delete a Chatflow

* **Endpoint**: `DELETE /api/admin/chatflows/{flowise_id}`
* **Description**: Deletes a chatflow record from the local database. **Important**: This operation typically only removes the record locally and does NOT delete the actual chatflow from the external Flowise instance.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `flowise_id` (string, required): The Flowise ID of the chatflow to delete locally.
* **Success Response** (`200 OK` or `204 No Content`):

  ```json
  {
    "message": "Chatflow successfully deleted from local database."
  }
  ```

* **Error Responses**:
  * `404 Not Found`: If the chatflow doesn't exist locally.

---

## 5. Chatflow User Information API Endpoints

---

### List Users Assigned to a Chatflow

* **Endpoint**: `GET /api/admin/chatflows/{flowise_id}/users`
* **Description**: Retrieves a list of all users who are actively assigned to a specific chatflow.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `flowise_id` (string, required): The Flowise ID of the chatflow.
* **Success Response** (`200 OK`): `List[Dict]`
  Each dictionary in the list contains details of an assigned user:

  ```json
  [
    {
      "user_id": "string",
      "username": "string",
      "email": "string",
      "role": "string",
      "assigned_at": "datetime",
      "is_active_in_chatflow": true
    }
  ]
  ```

  If no users are assigned, an empty list `[]` is returned.
* **Error Responses**:
  * `404 Not Found`: If the chatflow with the given `flowise_id` does not exist.

---

## 6. Common HTTP Status Codes for Errors

Beyond specific success responses, expect these common HTTP status codes for errors:

* **`400 Bad Request`**: The request was malformed, e.g., missing required fields in the JSON body, or invalid data types. The response body may contain details about the error.
* **`401 Unauthorized`**: The request lacks valid authentication credentials (e.g., missing or invalid JWT token).
* **`403 Forbidden`**: The authenticated user does not have the necessary permissions (e.g., `ADMIN_ROLE`) to perform the requested operation.
* **`404 Not Found`**: The requested resource (e.g., a specific chatflow, user, or user-chatflow link) could not be found.
* **`409 Conflict`**: The request could not be completed due to a conflict with the current state of the resource. For example, trying to add a user to a chatflow they are already part of, or trying to remove access that is already inactive (though some endpoints might treat this idempotently as success).
* **`500 Internal Server Error`**: An unexpected error occurred on the server while processing the request. The response body may contain a generic error message. Server logs should be checked for more details.

---
