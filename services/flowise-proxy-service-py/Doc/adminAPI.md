# Flowise Proxy Service - Admin API Documentation

## Overview & Recent Changes

**🔄 UPDATED**: This documentation reflects recent changes to integrate with external authentication as the single source of truth for user identity.

### Key Changes Made

- **❌ No Local User Creation**: User management endpoints no longer create local user accounts
- **🔗 External Auth Integration**: All user lookups now use external authentication API  
- **🔑 User ID Consistency**: `UserChatflow` records use external auth `user_id` values that match JWT tokens
- **🔒 Admin Token Usage**: Admin JWT tokens are passed through to external auth API for user lookups
- **📋 Permission Validation Fixed**: User access validation now works correctly with consistent user IDs

### Breaking Changes

- **Email-based user assignment** now requires users to **already exist** in the external auth system
- **Legacy `UserChatflow` records** with old local user IDs may need cleanup/re-assignment
- **Admin operations** now require valid JWT tokens with external auth admin privileges

---

## 1. Detailed Overview

This document provides detailed information about the Admin API endpoints for the Flowise Proxy Service. These endpoints are used for managing chatflows, user access to chatflows, and related administrative tasks.

**Base Path**: All admin API endpoints are prefixed with `/api/v1/admin`.

**Authentication**:
All endpoints require a valid JWT (JSON Web Token) Bearer token to be included in the `Authorization` header of the request.
Example: `Authorization: Bearer <your_jwt_token>`

The JWT token contains user information, including the user's `role`.

**Admin Privileges**:
Most administrative endpoints require the authenticated user to possess an `ADMIN_ROLE`. This requirement is specified for each endpoint. If a non-admin user attempts to access an admin-only endpoint, a `403 Forbidden` error will be returned.

### Key Concept: External Auth Integration & User-Chatflow Permissions

**Important**: This system uses **external authentication** as the single source of truth for user identity. The proxy service does NOT create or manage user accounts directly.

#### Architecture Overview

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│ External Auth   │    │ Flowise Proxy        │    │ Flowise API     │
│ Service         │    │ Service              │    │                 │
├─────────────────┤    ├──────────────────────┤    ├─────────────────┤
│ • User Identity │ -> │ • Permission Mgmt    │ -> │ • Chatflow Exec │
│ • Authentication│    │ • Access Control     │    │ • AI Processing │
│ • JWT Issuance  │    │ • Request Proxying   │    │                 │
│ • Role Management│   │ • User-Chatflow Map  │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

#### User-Chatflow Permission Management

- **Permission Assignment**: When a user is "added" or "assigned" to a chatflow, a `UserChatflow` record is created using the **external auth user_id**. This grants permission to interact with that chatflow.
- **Permission Revocation**: When access is "removed", the `UserChatflow` record is marked as inactive (`is_active = false`) or deleted. **This does NOT affect the user's account in the external auth system.**
- **No Local User Creation**: The system **never creates local user accounts**. All user identity is managed by the external auth service.
- **External User Lookup**: When adding users by email, the system looks up users in the external authentication API using the admin's JWT token.
- **User ID Consistency**: All `user_id` values in `UserChatflow` records come from the external auth system and match the JWT token `sub` field.

#### Authentication Flow

1. **Admin authenticates** with external auth service → receives JWT token
2. **Admin calls proxy service** with JWT token containing external `user_id`  
3. **Proxy service uses admin's JWT token** to lookup users in external auth API
4. **Proxy service creates `UserChatflow` records** using external auth `user_id`
5. **End users authenticate** with external auth → receive JWT with same `user_id`
6. **Permission validation** matches JWT `user_id` with `UserChatflow.user_id`

Understanding this external auth integration is vital for correctly interpreting the behavior of the user management endpoints.

## 2. External Authentication API Requirements

For the external auth integration to work properly, the following requirements must be met:

### Required External Auth API Endpoints

1. **User Lookup by Email**: `GET /api/admin/users/by-email/{email}`
   - **Purpose**: Look up user details by email address
   - **Authentication**: Requires admin JWT token in Authorization header
   - **Response**: User object containing at minimum `user_id`, `email`, and `username` fields
   - **Usage**: Called by proxy service during user assignment operations

### Admin JWT Token Requirements

- The admin JWT token must have sufficient privileges to access the external auth admin endpoints
- The token is passed through from the proxy service admin request to the external auth API
- The middleware extracts and includes the raw JWT token in the user context for admin operations

### User ID Consistency 

- All `user_id` values from the external auth API must be consistent across:
  - JWT token `sub` field (for end users)
  - External auth admin API responses  
  - `UserChatflow` database records created by the proxy service
- This ensures permission validation works correctly when users access chatflows

### Data Flow Example

```
1. Admin calls: POST /api/v1/admin/chatflows/add-users-by-email
   ├─ Headers: Authorization: Bearer <admin_jwt_token>
   └─ Body: {"emails": ["user@example.com"], "chatflow_id": "123"}

2. Proxy service extracts admin_jwt_token from request

3. Proxy service calls: GET /api/admin/users/by-email/user@example.com  
   ├─ Headers: Authorization: Bearer <admin_jwt_token>
   └─ Response: {"user_id": "68142f173a381f81e190343e", "email": "user@example.com", ...}

4. Proxy service creates UserChatflow record:
   └─ UserChatflow(user_id="68142f173a381f81e190343e", chatflow_id="123")

5. End user authenticates and receives JWT token:
   └─ JWT payload: {"sub": "68142f173a381f81e190343e", ...}

6. Permission validation matches: JWT.sub == UserChatflow.user_id ✅
```

## 3. Legacy Data Cleanup Recommendations

Due to the migration from local user management to external auth integration, there may be legacy `UserChatflow` records with old local user IDs that don't match external auth user IDs. Consider:

1. **Audit existing UserChatflow records** for user_id mismatches
2. **Remove or update records** with obsolete local user IDs  
3. **Re-assign users** using the updated endpoints to ensure external auth user_id consistency

## 4. Core Data Models

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
* **Description**: Assigns multiple users, identified by their email addresses, to a specified chatflow. **Users must already exist in the external authentication system** - no new accounts are created. The system looks up users from the external auth API using the admin's JWT token and creates `UserChatflow` links using the external auth user_id.
* **Authentication**: Admin role required. The admin's JWT token is used to authenticate with the external auth API.
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
      "user_id": "68142f173a381f81e190343e",
      "username": "user1_username",
      "status": "success",
      "message": "User user1@example.com successfully added to chatflow."
    },
    {
      "user_id": "68142f173a381f81e190343f",
      "username": "user2_username",
      "status": "success",
      "message": "User user2@example.com successfully added to chatflow."
    },
    {
      "user_id": null,
      "username": "user3@example.com",
      "status": "error",
      "message": "User user3@example.com not found in external auth system."
    }
  ]
  ```

* **Important Changes**: 
  - **No Local User Creation**: This endpoint **NO LONGER creates new user accounts**. Users must exist in the external authentication system.
  - **External Auth Lookup**: Uses the admin's JWT token to query the external auth API endpoint: `GET /api/admin/users/by-email/{email}`
  - **External User ID**: All `UserChatflow` records use the `user_id` from the external auth system, ensuring consistency with JWT tokens.
* **Error Handling**: If a user email is not found in the external auth system, an error status is returned for that user.
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
* **Description**: Assigns a single user, identified by their email, to a specific chatflow. **The user must already exist in the external authentication system** - no new accounts are created. The system looks up the user from the external auth API using the admin's JWT token.
* **Authentication**: Admin role required. The admin's JWT token is used to authenticate with the external auth API.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow.
  * `email` (string, required): The email of the user to add.
* **Request Body**: None.
* **Success Response** (`200 OK` or `201 Created`): Expected to be a `UserChatflowResponse` or a simple success message.
* **Important Changes**:
  - **No Local User Creation**: This endpoint **NO LONGER creates new user accounts**. Users must exist in the external authentication system.
  - **External Auth Lookup**: Uses the admin's JWT token to query the external auth API.
  - **External User ID**: `UserChatflow` records use the `user_id` from the external auth system.
* **Notes**: This endpoint finds a user by email in the external auth system and then utilizes the logic for adding a single user to a chatflow to assign them.
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
* **Description**: A wrapper endpoint to add multiple users (by email) to a chatflow identified by `flowise_id` in the path. It internally calls the `/api/v1/admin/chatflows/add-users-by-email` logic which **requires users to exist in the external authentication system**. The `chatflow_id` in the request body will be overridden by the `flowise_id` from the path.
* **Authentication**: Admin role required. The admin's JWT token is used to authenticate with the external auth API.
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
* **Important Changes**: 
  - **No Local User Creation**: Users must exist in the external authentication system.
  - **External Auth Integration**: Uses the admin's JWT token to lookup users from external auth API.
* **Notes**: This endpoint is designed to call the `add_users_to_chatflow_by_email` logic. The `flowise_id` from the path is used to identify the target chatflow, and the `chatflow_id` in the request body is overridden. The underlying `add_users_to_chatflow_by_email` function uses external auth integration.

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

---

## 5. User Cleanup & Data Quality API Endpoints

These endpoints help manage legacy data from the migration to external auth integration.

---

### Audit User-Chatflow Assignments

* **Endpoint**: `GET /api/v1/admin/chatflows/audit-users`
* **Description**: Performs a read-only audit of UserChatflow records to identify potential data quality issues, such as user IDs that don't exist in the external auth system or mismatched identifiers from the legacy system.
* **Authentication**: Admin role required. The admin's JWT token is used to verify users against the external auth API.
* **Query Parameters**:
  * `include_valid` (boolean, optional, default: `false`): Include valid user assignments in the audit results
  * `chatflow_id` (string, optional): Limit audit to a specific chatflow ID
* **Success Response** (`200 OK`): `UserAuditResult`

  ```json
  {
    "total_assignments": 150,
    "valid_assignments": 120,
    "invalid_assignments": 30,
    "assignments_by_issue_type": {
      "user_not_found": 25,
      "id_mismatch": 3,
      "external_auth_error": 2
    },
    "chatflows_affected": 8,
    "invalid_user_details": [
      {
        "user_chatflow_id": "uc_123",
        "user_id": "old_local_id_456",
        "chatflow_id": "cf_789",
        "chatflow_name": "Support Bot",
        "issue_type": "user_not_found",
        "details": "User ID not found in external auth system",
        "suggested_action": "delete_or_reassign"
      }
    ],
    "audit_timestamp": "2025-06-12T10:30:00.000Z",
    "recommendations": [
      "Consider running cleanup with 'reassign_by_email' action for legacy records",
      "8 chatflows have invalid user assignments that may affect access control"
    ]
  }
  ```

* **Notes**: This is a safe, read-only operation that helps identify data quality issues before performing cleanup.

---

### Clean Up User-Chatflow Assignments

* **Endpoint**: `POST /api/v1/admin/chatflows/cleanup-users`
* **Description**: Performs cleanup operations on UserChatflow records to resolve data quality issues identified during the migration to external auth integration. **This operation can permanently modify or remove records**.
* **Authentication**: Admin role required. The admin's JWT token is used to interact with the external auth API for user validation and reassignment.
* **Request Body**: `UserCleanupRequest`

  ```json
  {
    "action": "deactivate_invalid",
    "chatflow_ids": ["cf_789", "cf_101"],
    "dry_run": false,
    "force": false
  }
  ```

* **Action Types**:
  * `delete_invalid`: Permanently delete UserChatflow records with invalid user IDs
  * `reassign_by_email`: Attempt to find users by email in external auth and update user_id
  * `deactivate_invalid`: Set `is_active = false` for records with invalid user IDs

* **Success Response** (`200 OK`): `UserCleanupResult`

  ```json
  {
    "total_records_processed": 30,
    "invalid_user_ids_found": 25,
    "records_deleted": 0,
    "records_deactivated": 22,
    "records_reassigned": 3,
    "errors": 3,
    "error_details": [
      "Failed to lookup user old_user_123: External auth API timeout",
      "Cannot reassign user without email information"
    ],
    "dry_run": false,
    "cleanup_timestamp": "2025-06-12T10:45:00.000Z",
    "invalid_assignments": [
      {
        "user_chatflow_id": "uc_456",
        "user_id": "problematic_id",
        "chatflow_id": "cf_789",
        "issue_type": "user_not_found",
        "details": "User ID not found in external auth system",
        "suggested_action": "manual_review_required"
      }
    ]
  }
  ```

* **Important Warnings**:
  - **Data Loss Risk**: `delete_invalid` action permanently removes records
  - **Access Impact**: Cleanup may affect user access to chatflows
  - **External Dependencies**: Requires external auth API to be available for validation
  - **Backup Recommended**: Consider backing up UserChatflow table before running cleanup

* **Best Practices**:
  1. Always run with `dry_run: true` first to preview changes
  2. Use audit endpoint to understand scope of issues
  3. Start with `deactivate_invalid` action for safer cleanup
  4. Use `chatflow_ids` parameter to limit scope for testing
  5. Monitor error_details for external auth connectivity issues

---
