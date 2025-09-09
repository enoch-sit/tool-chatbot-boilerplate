# Proposal: Dedicated Chat Session Management

This document outlines a proposal to introduce a dedicated API endpoint for creating and managing chat sessions.

## 1. Rationale

The current API design creates session IDs on-the-fly within the `/predict` and `/predict/stream` endpoints. A dedicated session management endpoint will:

-   **Decouple Session Creation:** Separate the creation of a session from the prediction logic.
-   **Improve State Management:** Provide a clear record of a conversation's lifecycle.
-   **Enhance Auditing:** Allow for better tracking of user interactions.
-   **Support Future Features:** Lay the groundwork for features like conversation history and session-based analytics.

## 2. Investigation of `create_session_id`

The existing function `create_session_id(user_id, chatflow_id)` generates a *deterministic* UUID (v5) based on the user, chatflow, and a timestamp. While useful for creating predictable identifiers, it is not ideal for a primary session ID where uniqueness is more important than determinism.

For the new session management, we will use a standard, randomly generated UUID (v4) for the `session_id` to ensure it is unique.

## 3. Proposed Database Model

A new MongoDB collection named `chat_sessions` will be created with the following model:

**File:** `app/models/chat_session.py`

```python
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime
import uuid

class ChatSession(Document):
    """Represents a single chat conversation session."""

    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id: str = Field(..., index=True)
    chatflow_id: str = Field(..., index=True)
    topic: Optional[str] = Field(None, index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: Optional[datetime] = None

    class Settings:
        name = "chat_sessions"

    def __repr__(self):
        return f"<ChatSession(session_id='{self.session_id}', user_id='{self.user_id}')>"

```

## 4. Proposed API Endpoint

A new endpoint will be added to create a session.

**Endpoint:** `POST /api/v1/chat/sessions`

**Request Body Model:**

```python
class CreateSessionRequest(BaseModel):
    chatflow_id: str
    topic: Optional[str] = None
```

**Response Body Model:**

```python
class SessionResponse(BaseModel):
    session_id: str
    chatflow_id: str
    user_id: str
    topic: Optional[str]
    created_at: datetime
```

**Logic:**

1.  The user provides a `chatflow_id` and an optional `topic`.
2.  The system authenticates the user via their JWT token.
3.  It validates that the user has permission to access the requested `chatflow_id`.
4.  A new `ChatSession` document is created in the `chat_sessions` collection.
5.  The newly created session object, including the unique `session_id`, is returned to the user.

This `session_id` can then be used in subsequent calls to the `/predict` and `/predict/stream` endpoints.
