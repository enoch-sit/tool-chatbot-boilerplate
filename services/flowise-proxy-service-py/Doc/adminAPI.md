# Flowise Proxy Service - Admin API Documentation

## 1. Overview

This document provides detailed information about the Admin API endpoints for the Flowise Proxy Service. These endpoints are used for managing chatflows, user access to chatflows, and related administrative tasks.

**Base Path**: All admin API endpoints are prefixed with `/api/v1/admin`.

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
  "id": "string", // Corresponds to _id in the database
  "flowise_id": "string",
  "name": "string",
  "description": "string",
  "sync_status": "string", // Reflects the synchronization status (e.g., active, deleted)
  "created_date": "datetime", // Corresponds to created_at in some contexts
  "updated_date": "datetime", // Corresponds to updated_at in some contexts
  "is_public": "boolean"
}
```

### `ChatflowSyncResult`

Response model for the chatflow synchronization operation. While the full model is not detailed here, it typically includes:

```json
{
  "created": "integer", // Number of new chatflows added
  "updated": "integer", // Number of existing chatflows updated
  "deleted": "integer", // Number of chatflows marked as deleted
  "total_fetched": "integer", // Total chatflows fetched from the source
  "errors": "integer", // Count of errors during synchronization
  "error_details": ["string"], // List of error messages, if any
  "sync_timestamp": "datetime" // Timestamp of the synchronization
}
```

## 3. User-Chatflow Association Management API Endpoints

These endpoints manage the association of users with specific chatflows.

---

### Add Multiple Users to a Chatflow (by User IDs)

* **Endpoint**: `POST /api/v1/admin/chatflows/add-users`
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

* **Notes**: This endpoint is fully implemented. It handles user validation, checks for existing access, reactivates inactive access if present, or creates new user-chatflow links.

---

### Add Multiple Users to a Chatflow (by Email)

* **Endpoint**: `POST /api/v1/admin/chatflows/add-users-by-email`
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

* **Notes**: This endpoint is implemented. It handles finding users by email, creating new user accounts if they do not exist, and then assigns them to the chatflow by utilizing the core logic for adding users to chatflows. This is a critical endpoint often used in bulk operations.
**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py`.

---

### Add a Single User to a Chatflow (by User ID)

* **Endpoint**: `POST /api/v1/admin/chatflows/{chatflow_id}/users/{user_id}`
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

* **Notes**: This endpoint is fully implemented. It validates the user, checks for existing access, reactivates inactive access if present, or creates a new user-chatflow link.

---

### Add a Single User to a Chatflow (by Email)

* **Endpoint**: `POST /api/v1/admin/chatflows/{chatflow_id}/users/email/{email}`
* **Description**: Assigns a single user, identified by their email, to a specific chatflow. If the user doesn't exist, a new user account may be created.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow.
  * `email` (string, required): The email of the user to add.
* **Request Body**: None.
* **Success Response** (`200 OK` or `201 Created`): Expected to be a `UserChatflowResponse` or a simple success message.
* **Notes**: This endpoint is implemented. It finds a user by email (creating one if non-existent) and then utilizes the logic for adding a single user to a chatflow to assign them.
**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py` (using `flowise_id` in the path).

---

### Remove a User from a Chatflow (by User ID)

* **Endpoint**: `DELETE /api/v1/admin/chatflows/{chatflow_id}/users/{user_id}`
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
  * `409 Conflict`: May be returned if the user's access was already inactive.
* **Notes**: This endpoint is implemented. It deactivates the user's access to the chatflow (sets `is_active = false` on the `UserChatflow` link).

---

### Remove a User from a Chatflow (by Email)

* **Endpoint**: `DELETE /api/v1/admin/chatflows/{chatflow_id}/users/email/{email}`
* **Description**: Finds a user by email and revokes their access to the specified chatflow. This deactivates/deletes the `UserChatflow` link, not the user account.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow.
  * `email` (string, required): The email of the user to remove.
* **Success Response** (`200 OK` or `204 No Content`): Success message or no content.
* **Notes**: This endpoint is implemented. It finds a user by email and then utilizes the logic for removing a user from a chatflow to revoke their access.
**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py` (using `flowise_id` in the path).

---

### Bulk Add Users to a Chatflow (by User IDs, using flowise_id in path)

* **Endpoint**: `POST /api/v1/admin/chatflows/{flowise_id}/users/bulk`
* **Description**: A wrapper endpoint to add multiple existing users (by ID) to a chatflow identified by `flowise_id` in the path. It internally calls the `/api/v1/admin/chatflows/add-users` logic. The `chatflow_id` in the request body will be overridden by the `flowise_id` from the path.
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
* **Notes**: This endpoint is designed to call the `add_users_to_chatflow` logic. The `flowise_id` from the path is intended to be used as the `chatflow_id` for the underlying function, effectively overriding any `chatflow_id` in the request body.

---

### Bulk Add Users to a Chatflow (by Email, using flowise_id in path)

* **Endpoint**: `POST /api/v1/admin/chatflows/{flowise_id}/users/email/bulk`
* **Description**: A wrapper endpoint to add multiple users (by email) to a chatflow identified by `flowise_id` in the path. It internally calls the `/api/v1/admin/chatflows/add-users-by-email` logic. The `chatflow_id` in the request body will be overridden by the `flowise_id` from the path.
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
* **Notes**: This endpoint is designed to call the `add_users_to_chatflow_by_email` logic. The `flowise_id` from the path is used to identify the target chatflow, and the `chatflow_id` in the request body is overridden. The underlying `add_users_to_chatflow_by_email` function is fully implemented.

---

## 4. Chatflow Management API Endpoints

These endpoints are for managing the chatflows themselves.

---

### Synchronize Chatflows from Flowise

* **Endpoint**: `POST /api/v1/admin/chatflows/sync`
* **Description**: Fetches all chatflows from the configured external Flowise instance and updates/creates corresponding records in the local database.
* **Authentication**: Admin role required.
* **Request Body**: None.
* **Success Response** (`200 OK`): `ChatflowSyncResult`

  ```json
  {
    "created": 5,
    "updated": 2,
    "deleted": 0,
    "total_fetched": 7,
    "errors": 0,
    "error_details": [],
    "sync_timestamp": "YYYY-MM-DDTHH:MM:SS.ffffff"
  }
  ```

* **Notes**: The implementation details (e.g., how it handles deletions or conflicts) depend on the `ChatflowService`.
**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py`.

---

### List All Chatflows

* **Endpoint**: `GET /api/v1/admin/chatflows`
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
      // ... other chatflow fields
    },
    {
      "id": "db_id_2",
      "flowise_id": "flowise_chatflow_id_2",
      "name": "FAQ Assistant"
      // ... other chatflow fields
    }
  ]
  ```

**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py`.

---

### Get Chatflow Statistics

* **Endpoint**: `GET /api/v1/admin/chatflows/stats`
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

**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py`.

---

### Get Chatflow by Flowise ID

* **Endpoint**: `GET /api/v1/admin/chatflows/{flowise_id}`
* **Description**: Retrieves detailed information for a specific chatflow using its Flowise ID.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `flowise_id` (string, required): The Flowise ID of the chatflow.
* **Success Response** (`200 OK`): `Chatflow` object.
* **Error Responses**:
  * `404 Not Found`: If no chatflow with the given `flowise_id` exists.
**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py`.

---

### Force Delete a Chatflow

* **Endpoint**: `DELETE /api/v1/admin/chatflows/{flowise_id}`
* **Description**: Deletes a chatflow record from the local database. **Important**: This operation typically only removes the record locally and does NOT delete the actual chatflow from the external Flowise instance.
* **Authentication**: Admin role required.
* **Path Parameters**:
  * `flowise_id` (string, required): The Flowise ID of the chatflow to delete.
* **Success Response** (`200 OK` or `204 No Content`): Success message or no content.
* **Notes**: The actual deletion logic and its implications (e.g., on data consistency, orphaned records) should be well understood before using this endpoint.

---

### List Users Assigned to a Chatflow

* **Endpoint**: `GET /api/v1/admin/chatflows/{flowise_id}/users`
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
**Coverage:** Tested in `QuickTest/quickAddUserToChatflow.py`.
