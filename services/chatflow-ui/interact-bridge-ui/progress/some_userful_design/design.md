# Chatbot UI API Interaction Design

This document outlines the technical specifications for the frontend UI to interact with the backend API. It is based on the behavior observed from the Python test scripts.

## 1. Authentication

### 1.1. User Login

- **Endpoint:** `POST /api/v1/chat/authenticate`
- **Description:** Authenticates a user (admin, supervisor, or end-user) and returns a JWT token. The scripts show some variability in the response format, so the frontend should be robust.
- **Request Body:**

  ```json
  {
    "username": "user_or_admin_name",
    "password": "user_or_admin_password"
  }
  ```

- **Response (Success):**

  ```json
  {
    "access_token": "your_jwt_token",
    "token_type": "bearer"
  }
  ```
  *Note: Some scripts suggest the token might be under an `accessToken` key directly.*
- **UI/UX:**
  - The UI will present a login form.
  - Upon successful login, the `access_token` must be stored securely (e.g., in `localStorage` or a secure cookie).
  - This token must be included in the `Authorization` header for all subsequent requests: `Authorization: Bearer <your_jwt_token>`.

## 2. Admin: Chatflow Management

These endpoints are accessible only to users with the 'admin' role and are prefixed with `/api/v1/admin`.

### 2.1. Sync Chatflows

- **Endpoint:** `POST /api/v1/admin/chatflows/sync`
- **Description:** Triggers a synchronization process with the Flowise instance to update the list of available chatflows in the application's database.
- **UI/UX:**
  - An admin dashboard should have a "Sync Chatflows" button.
  - The UI should provide feedback on the sync status (e.g., "Syncing...", "Sync complete", "Sync failed").

### 2.2. List All Chatflows

- **Endpoint:** `GET /api/v1/admin/chatflows`
- **Description:** Retrieves a list of all chatflows available in the system.
- **UI/UX:**
  - Display the list of chatflows in a table or list format in the admin panel.
  - Each item should be selectable to view details or manage users.

### 2.3. Get Chatflow Statistics

- **Endpoint:** `GET /api/v1/admin/chatflows/stats`
- **Description:** Retrieves statistics about the chatflows. The exact structure of the stats object is not detailed in the scripts but likely contains counts.
- **UI/UX:**
  - Display these stats on the admin dashboard.

### 2.4. Get Specific Chatflow Details

- **Endpoint:** `GET /api/v1/admin/chatflows/{flowise_id}`
- **Description:** Gets detailed information for a single chatflow.
- **Response (Success):** A JSON object with chatflow details.

  ```json
  {
    "id": "string",
    "name": "string",
    "flowData": "string",
    "deployed": "boolean",
    "isPublic": "boolean",
    "apikeyid": "string",
    "updatedAt": "string",
    "createdAt": "string",
    "folderId": "string"
  }
  ```

- **UI/UX:**
  - This can be used when an admin clicks on a chatflow from the list to see its details.

## 3. Admin: User Access Management

### 3.1. List Users for a Chatflow

- **Endpoint:** `GET /api/v1/admin/chatflows/{flowise_id}/users`
- **Description:** Retrieves a list of all users assigned to a specific chatflow.
- **Response (Success):** A JSON array of user objects.

  ```json
  [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "string"
    }
  ]
  ```

- **UI/UX:**
  - In the detailed view of a chatflow, display a list of assigned users.

### 3.2. Add User to Chatflow

- **Endpoint:** `POST /api/v1/admin/chatflows/{flowise_id}/users`
- **Description:** Assigns a user to a chatflow using their email.
- **Request Body:**

  ```json
  {
    "email": "the_user_to_add@example.com"
  }
  ```

- **UI/UX:**
  - Provide a form or a searchable dropdown to find and add a user to the selected chatflow.

### 3.3. Remove User from Chatflow

- **Endpoint:** `DELETE /api/v1/admin/chatflows/{flowise_id}/users`
- **Description:** Removes a user's access from a specific chatflow by their email.
- **Query Parameters:** `?email=user@example.com`
- **UI/UX:**
  - A "Remove" button next to each user in the assigned users list.

### 3.4. Bulk Add Users to Chatflow by Email

- **Endpoint:** `POST /api/v1/admin/chatflows/{flowise_id}/users/bulk-add`
- **Description:** Assigns multiple users to a chatflow by their emails in a single request.
- **Request Body:**

  ```json
  {
    "emails": ["user1@example.com", "user2@example.com"]
  }
  ```

- **UI/UX:**
  - A dialog allowing the admin to enter or paste a list of emails.

### 3.5. Other Admin Endpoints

The implementation also includes other administrative endpoints that may be useful for a full-featured admin panel:

- **`POST /api/v1/admin/chatflows/add-users-by-email`**: A more general endpoint to add multiple users to multiple chatflows.
- **`GET /api/v1/admin/chatflows/audit-users`**: Audits user assignments.
- **`POST /api/v1/admin/chatflows/cleanup-users`**: Cleans up user assignments.
- **`POST /api/v1/admin/users/sync-by-email`**: Syncs a user from an external authentication provider.

## 4. User: Chatflow Interaction

This section covers endpoints for regular users interacting with chatflows.

### 4.1. List Accessible Chatflows

- **Endpoint:** `GET /api/v1/chatflows`
- **Description:** Retrieves a list of chatflows the authenticated user has been granted access to. This uses the same endpoint as the admin's "List All Chatflows" but the API returns a filtered list based on the user's permissions.
- **Response (Success):** A JSON array of chatflow objects.
- **UI/UX:**
  - Display a list of available chatflows to the user on their main dashboard or chat page.

### 4.2. Start Chat (No Streaming)

- **Endpoint:** `POST /api/v1/chat/predict`
- **Description:** Sends a question to a chatflow and receives the full response at once.
- **Request Body:**

  ```json
  {
    "chatflow_id": "the_selected_chatflow_id",
    "question": "User's question here"
  }
  ```

- **Response (Success):**

  ```json
  {
    "response": "The full chatbot answer."
  }
  ```

- **UI/UX:**
  - A standard chat interface where the user types a message and sees the response appear after a loading indicator.
  - **Note:** For the current UI implementation, all chat interactions will use the streaming endpoint (`/api/v1/chat/predict/stream`) to provide a consistent, real-time experience. This non-streaming endpoint is documented for API completeness but is not actively used by the frontend.

### 4.3. Start Chat (Streaming)

- **Endpoint:** `POST /api/v1/chat/predict/stream`
- **Description:** Sends a question and receives the response as a stream of events. This is for real-time, token-by-token display of the answer. To continue a conversation, include the `session_id` in the request body (see section 5.2).
- **Request Body:**

  ```json
  {
    "chatflow_id": "the_selected_chatflow_id",
    "question": "User's question here"
  }
  ```

- **Response:** A stream of concatenated JSON objects. See **Appendix 7** for a detailed breakdown of the stream format and event types.
- **UI/UX:**
  - The chatbot's response appears word-by-word, creating a typewriter effect.

## 5. User: Chat Sessions & History

### 5.1. Create Chat Session

- **Endpoint:** `POST /api/v1/chat/sessions`
- **Description:** Creates a new, persistent chat session (conversation thread) for a specific chatflow.
- **Request Body:**

  ```json
  {
    "chatflow_id": "the_selected_chatflow_id",
    "topic": "Optional session topic"
  }
  ```

- **Response (Success):**

  ```json
  {
    "session_id": "the_newly_created_session_id"
  }
  ```

- **UI/UX:**
  - A "New Chat" button could trigger this. The UI should store the `session_id` to send subsequent messages in the same context.

### 5.2. Start Chat with Session (Streaming)

- **Endpoint:** `POST /api/v1/chat/predict/stream`
- **Description:** Sends a message within an existing chat session by using the main streaming endpoint and including the `session_id`.
- **Request Body:**

  ```json
  {
    "chatflow_id": "the_chatflow_id",
    "session_id": "the_current_session_id",
    "question": "User's follow-up question"
  }
  ```

- **Response:** A response stream, same as the non-session streaming endpoint.
- **UI/UX:**
  - The primary way users will interact after starting a new chat.

### 5.3. List Chat Sessions

- **Endpoint:** `GET /api/v1/chat/sessions`
- **Description:** Retrieves all chat sessions for a given chatflow for the authenticated user.
- **Query Parameters:** `?chatflow_id={chatflow_id}`
- **Response (Success):** A list of session objects.

  ```json
  [
    {
      "session_id": "some_session_id",
      "topic": "A previous conversation",
      "start_time": "2023-10-27T10:00:00Z"
    }
  ]
  ```

- **UI/UX:**
  - A sidebar listing previous conversations, allowing the user to resume them.

### 5.4. Get Session History

- **Endpoint:** `GET /api/v1/chat/history/{session_id}`
- **Description:** Retrieves the full message history for a specific session.
- **Response (Success):** A list of message objects.

  ```json
  [
    {
      "type": "user",
      "message": "Hello",
      "timestamp": "..."
    },
    {
      "type": "bot",
      "message": "Hi there!",
      "timestamp": "..."
    }
  ]
  ```

- **UI/UX:**
  - When a user clicks on a past session, the UI calls this endpoint to load and display the conversation history.

## 6. User: Account

### 6.1. Get User Credits (Unverified)

- **Endpoint:** `GET /api/v1/users/me/credits`
- **Description:** Retrieves the remaining credits for the authenticated user.
- **Note:** This endpoint was not found in the provided backend implementation files (`actual_admin.py`, `actual_chat.py`, `actual_chatflows.py`) and needs to be verified.
- **Response (Success):**

  ```json
  {
    "credits": 100
  }
  ```

- **UI/UX:**
  - Display the user's credit balance in the user profile section or near the chat input.

## 7. Appendix: Streaming Response Format

Based on analysis of the Python test scripts (`quickUserAccessListAndStream_04.py`, `quickUserCreateSessionAndChat_05.py`) and the stream structure documentation, the streaming endpoint (`/api/v1/chat/predict/stream`) delivers data in a specific format. This is distinct from console logs printed by the scripts for debugging.

### 7.1. Stream Format Overview

The server sends a **stream of concatenated JSON objects**. It is **not** a single, well-formed JSON array. Each chunk of data from the server may contain one or more complete JSON objects, or an incomplete one.

**Example of a raw stream:**
`{"event":"agentFlowEvent","data":...}{"event":"token","data":"Hello"}{"event":"token","data":" world"}{"event":"end","data":"[DONE]"}`

The client-side implementation must be able to buffer the incoming data and parse these JSON objects one by one as they become complete. A common strategy is to find the boundaries of each object by counting matching curly braces (`{}`)

### 7.2. Event Object Structure

Each JSON object in the stream represents an event and follows this basic structure:

```json
{
  "event": "EVENT_NAME",
  "data": "..."
}
```

### 7.3. Key Event Types for UI

The UI should primarily listen for these events to provide a rich, real-time experience:

- **`token`**: This is the most critical event for displaying the response. The `data` field contains a small piece (a "token") of the final text message. The UI should append the `data` from each `token` event to the current message bubble to create a "typewriter" effect.

- **`end`**: This event signals that the stream is complete. The `data` field contains the string `[DONE]`. Upon receiving this, the UI should consider the response finished, stop any "typing" indicators, and re-enable the user input field.

- **`agentFlowEvent`**: This provides high-level status updates for the entire workflow. The `data` can be `INPROGRESS` at the start and `FINISHED` at the end. This can be used to show a general "Bot is thinking..." status.

- **`nextAgentFlow`**: This event indicates which internal agent or node in the chatflow is about to be executed. This is useful for more detailed debugging or displaying advanced progress indicators (e.g., "Agent is searching documents...").

- **`metadata`**: This event, often sent at the end, contains session information like `chatId` and `chatMessageId`. The UI should store this if it needs to reference the conversation later.

### 7.4. Non-Stream Responses

For comparison, non-streaming endpoints like `/api/v1/chat/predict` return a single, complete JSON object, as documented in section 4.2.

**Example Non-Stream Response:**

```json
{
  "response": "The full chatbot answer."
}
```

The UI handles this by simply displaying the `response` string after the request is fully complete.
