# Flowise Frontend API Interaction Analysis

This document outlines how the frontend of this application communicates with the Flowise backend API for sending messages and receiving responses, including details on the request and response structures.

## 1. Core Service: `flowiseService.js`

All communication with the Flowise API is encapsulated within `src/services/flowiseService.js`. This service uses the `flowise-sdk` for making API calls but also includes a fallback mechanism using direct `fetch` requests.

### Configuration

The service is configured using environment variables:

- `VITE_FLOWISE_BASE_URL`: The base URL of the Flowise instance (e.g., `https://your-flowise.com`).
- `VITE_FLOWISE_CHATFLOW_ID`: The ID of the specific chatflow to interact with.
- `VITE_FLOWISE_API_KEY`: An API key for authentication (sent as a Bearer token).

The final API endpoint for direct fetch calls is constructed as:
`${VITE_FLOWISE_BASE_URL}/api/v1/prediction/${VITE_FLOWISE_CHATFLOW_ID}`

## 2. API Request Structure

The application sends requests to the Flowise API in two modes: streaming and non-streaming.

### Request Body

The body of the `POST` request is a JSON object with the following structure:

```json
{
  "question": "The user's message text",
  "history": [
    { "role": "userMessage", "content": "Previous user message" },
    { "role": "apiMessage", "content": "Previous AI response" }
  ],
  "streaming": true
}
```

- `question` (string): The current message sent by the user.
- `history` (array): An array of previous messages to provide context for the conversation. Each message object has a `role` (`userMessage` or `apiMessage`) and `content`.
- `streaming` (boolean): `true` for streaming responses, `false` for a single, complete response. The application defaults to `true`.

### Request Headers

The following headers are sent with the request:

```
Content-Type: application/json
Accept: text/event-stream       // For streaming requests
Authorization: Bearer <API_KEY>  // If an API key is provided
```

## 3. API Response Structure

The response structure depends on whether streaming is enabled.

### Streaming Response (Server-Sent Events)

When `streaming: true`, the server sends a stream of Server-Sent Events (SSE). The frontend listens for these events to build the response in real-time. Each event has an `event` type and `data`.

Key events observed from Flowise:

- **`event: start`**:
  - Indicates the beginning of the stream.
  - `data`: Contains session information like `chatId`.
    ```json
    data: {"chatId":"...","messageId":"..."}
    ```

- **`event: token`**:
  - The most frequent event, delivering a small chunk (token) of the response text.
  - `data`: A string containing the text chunk.
    ```
    data: "Hello"
    data: ", how"
    data: " can"
    data: " I"
    data: " help"
    data: " you"
    data: "?"
    ```

- **`event: metadata`**:
  - Contains metadata about the session.
  - `data`: A JSON object with details like `chatId` and `messageId`.
    ```json
    data: {"chatId":"...","messageId":"..."}
    ```

- **`event: sourceDocuments`**:
  - If the chatflow uses retrieval-augmented generation (RAG), this event provides the source documents used to generate the response.
  - `data`: An array of document objects.
    ```json
    data: [{"pageContent":"...","metadata":{...}}]
    ```

- **`event: end`**:
  - Signals the end of the streaming response.

- **`data: [DONE]`**:
  - An alternative end-of-stream marker used in some Flowise setups.

### Non-Streaming Response

When `streaming: false`, the API returns a single JSON object after the full response has been generated.

```json
{
  "text": "The complete response from the AI.",
  "chatId": "...",
  "sourceDocuments": [...]
}
```

- `text` (string): The full text of the AI's response.
- `chatId` (string): The ID of the current chat session.
- `sourceDocuments` (array): (Optional) Source documents used for the response.

## 4. Frontend Implementation (`App.jsx`)

The `App.jsx` component orchestrates the API calls and manages the chat UI.

1.  **Sending a Message**:
    -   When a user sends a message, `handleSendMessage` is triggered.
    -   It calls `flowiseService.streamMessage` with the user's message and the chat history.
    -   A new, empty message from the AI is added to the UI with a `isStreaming: true` flag.

2.  **Handling the Stream**:
    -   The `onToken` callback from `flowiseService` receives text chunks.
    -   With each new token, the content of the streaming AI message in the UI is updated, creating the "typing" effect.
    -   The `onEnd` callback is triggered when the stream finishes. It finalizes the message by setting `isStreaming: false`.

This approach ensures a responsive user experience by displaying the AI's response as it's being generated.
