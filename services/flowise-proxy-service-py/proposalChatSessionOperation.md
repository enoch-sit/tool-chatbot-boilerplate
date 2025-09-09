# Chat Session Operation Log & History Proposal

## 1. Executive Summary

This proposal outlines a plan to implement persistent chat history for all user interactions. The goal is to automatically save every user question and assistant response, associate them with a specific chat session, and provide a mechanism for users to retrieve their conversation history. This will be achieved with minimal, targeted changes to the existing codebase, ensuring a robust and scalable solution.

## 2. Problem Statement

The current implementation is stateless from the proxy's perspective. While Flowise may maintain conversational context during a single session via a `sessionId`, the actual messages are not stored in our database. This has two major drawbacks:

1. **No History Retrieval**: Users cannot view their past conversations once their session ends.
2. **Lack of Auditability**: There is no persistent record of interactions, which can be critical for debugging, analysis, and quality assurance.

## 3. Proposed Solution

The solution involves three core components: a new data model for storing messages, modifications to the chat endpoints to save messages, and new endpoints to retrieve history.

### 3.1. New Data Model: `ChatMessage`

A new Pydantic Beanie model will be created to represent a single message in a conversation.

**File**: `app/models/chat_message.py` (new file)

```python
from beanie import Document
from pydantic import Field
from typing import str # Changed from Literal
from datetime import datetime

class ChatMessage(Document):
    """Represents a single message within a chat session."""

    session_id: str = Field(..., index=True)
    user_id: str = Field(..., index=True)
    role: str = Field(...) # Changed from Literal["user", "assistant"]
    content: str = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    class Settings:
        name = "chat_messages"
```

**Reasoning**:

* This model is simple, clear, and captures all necessary information.
* `session_id` and `user_id` link the message to the correct session and owner.
* `role` distinguishes between user queries and AI responses. Using `str` provides more flexibility for future roles.
* Indexing on `session_id` and `created_at` will ensure fast retrieval of conversation history in the correct order.

### 3.2. Logic Update: `chat_predict_stream` Endpoint

The primary logic change will be in the `chat_predict_stream` function in `app/api/chat.py`.

**Evidence & Plan**:

1. **History Loading**: The endpoint is now stateless by default. It no longer loads history from the database automatically.
2. **Saving User Message**: Immediately after validation, the user's `question` is saved as a `ChatMessage` with `role: "user"`.
3. **Saving Assistant Message**: The streaming response from Flowise is collected into a single string. After the stream successfully completes, this complete response is saved as a `ChatMessage` with `role: "assistant"`.
4. **Handling `chat_request.history`**: If a client provides the optional `history` parameter, it is passed directly to the Flowise agent. This allows for client-managed conversation context.

### 3.3. New Endpoint: Retrieve Chat History

A new endpoint will be created to allow users to fetch their conversation history for a single session.

**Endpoint**: `GET /api/v1/chat/sessions/{session_id}/history`

### 3.4. New Endpoint: Stream and Store Chat History

To support real-time interaction while ensuring data persistence, a new streaming endpoint will be created. This endpoint will stream the response from Flowise to the user and asynchronously store the user's question and the full assistant response in the database.

**Endpoint**: `POST /api/v1/chat/predict/stream/store`

**Logic**:

This endpoint is designed to provide a real-time streaming experience to the user while ensuring that the entire conversation is reliably persisted in the database. The logic is carefully structured to handle authentication, authorization, credit management, and robust data persistence, even in cases of network errors or incomplete streams.

1. **Authentication and Authorization**: The endpoint first authenticates the user using the `authenticate_user` dependency and verifies that they have the necessary permissions to access the requested chatflow via the `AuthService`. This is a critical first step to ensure security.

2. **Credit Management**: It checks if the user has sufficient credits to perform the operation and deducts the cost *before* initiating the stream. This follows a "pre-paid" model for the transaction.

3. **Deferred User Message Creation**: The user's incoming message is prepared as a `ChatMessage` object but is **not** immediately saved to the database.
    * **Reasoning**: This is a key robustness improvement. If the message were saved immediately and the subsequent stream from Flowise failed, we would have an "orphaned" user message in our database with no corresponding assistant response. By deferring the save, we ensure that we only store the user's message if the interaction is successful.

4. **Streaming, Parsing, and Persistence**:
    * An `async def stream_generator` is used to handle the response from the Flowise service.
    * **Evidence**: To handle potentially concatenated or fragmented JSON objects within the stream, a `buffer` is used. The code iterates through the buffer, using `json.JSONDecoder().raw_decode()` to find and parse complete JSON objects one by one. This prevents parsing errors that would occur with a simple `json.loads()` on an incomplete stream chunk.
    * The `data` from any `{"event": "token"}` objects is accumulated into a `full_assistant_response` variable.
    * The raw, unparsed chunks are immediately yielded to the client, providing a real-time experience.

5. **Transactional Save on Success**:
    * **Reasoning**: To maintain data integrity, the database transaction is completed only after the stream has finished and a valid response has been received.
    * **Evidence**: After the stream completes, the code checks if a non-empty `full_assistant_response` was received. If so, it first saves the deferred `user_message` and then saves the `assistant_message`. This two-step save ensures the conversation is stored chronologically and only upon successful completion. If no response is streamed, the transaction is logged as a failure, and no messages are saved.

### 3.5. New Endpoint: List All User Sessions

A new endpoint will be created to allow users to retrieve a summary of all their past chat sessions.

**Endpoint**: `GET /api/v1/chat/sessions`

**File**: `app/api/chat.py`

**Logic**:

1. The endpoint will use the `authenticate_user` dependency to get the `current_user`.
2. It will use a MongoDB aggregation pipeline to efficiently fetch all `ChatSession` documents belonging to the user.
3. For each session, the pipeline will also join with the `chat_messages` collection to retrieve the content of the very first message.
4. The response will be a list of sessions, each containing the `session_id`, `chatflow_id`, `topic`, session `created_at` timestamp, and the `first_message`.

## 4. Reason for Minimal Changes

This approach is designed to be as non-intrusive as possible:

* **Leverages Existing Structure**: It builds upon the existing `ChatSession` and `authenticate_user` logic.
* **Isolated Changes**: The core changes are confined to `app/api/chat.py` and the creation of one new model file. No other services or models need to be modified.
* **No Breaking Changes**: All existing endpoint signatures remain the same. The new functionality is added transparently.

## 5. Implementation Progress (Summary of Changes Made)

* **DONE**: Created the `ChatMessage` model in `app/models/chat_message.py` to persist conversation history.
* **DONE**: Modified the `ChatMessage.role` field from `Literal` to `str` for greater flexibility.
* **DONE**: Updated the `/predict/stream` endpoint to save both user and assistant messages to the database, creating a persistent log.
* **DONE**: Implemented logic to allow clients to pass a `history` object in the request, giving them control over the conversational context sent to Flowise.
* **DONE**: Made the `/predict/stream/store` endpoint stateless by default (no database history lookup) if the client does not provide a history object.
* **DONE**: Created the `GET /sessions/{session_id}/history` endpoint to allow users to retrieve the full message history for a specific session.
* **DONE**: Implemented robust JSON stream parsing in `/predict/stream/store` using a buffer and `JSONDecoder` to handle concatenated stream objects correctly.
* **DONE**: Improved the robustness of `/predict/stream/store` by deferring the user message save until after a successful assistant response, preventing orphaned messages.
* **DONE**: Added a check to prevent storing empty or whitespace-only assistant responses.
* **DONE**: Implemented the `GET /sessions` endpoint to list all of a user's chat sessions with the first message of each conversation.

This plan provides a clear path to implementing a much-needed feature while adhering to best practices and maintaining the stability of the existing application.
