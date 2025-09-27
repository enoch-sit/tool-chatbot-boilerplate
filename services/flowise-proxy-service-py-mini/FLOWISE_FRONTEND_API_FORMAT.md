# Flowise Frontend API: Handling Server-Sent Events (SSE)

This document outlines the format of Server-Sent Events (SSE) sent by the Flowise backend and provides guidance on how a frontend client should handle them. The communication is designed for real-time streaming of agent responses and metadata.

## 1. Overview

The frontend communicates with the backend via an SSE connection. The backend pushes a series of events to the client, each containing a specific type of data. The client is responsible for parsing these events and updating the UI accordingly.

A typical streaming session looks like this:

1. The flow starts, and progress events are sent.
2. The AI agent generates a response, which is streamed token by token.
3. Metadata about the execution (e.g., tool calls, token usage) is sent.
4. The stream is terminated.

## 2. Message Format

All messages from the backend follow the standard SSE format:

```text
event: <event_name>
data: <json_payload_string>
```

- `event`: A string identifying the type of the event.
- `data`: A JSON string containing the payload for the event. The client must parse this string to get the data object.

## 3. Event Types

The following are the key event types and their data payloads.

### `agentFlowEvent`

Indicates the overall status of the agent execution flow.

- **When:** At the beginning and end of the entire flow.
- **Payload:** A string, either `"INPROGRESS"` or `"FINISHED"`.
- **Example:**

  ```json
  // When the flow starts
  data: {"event":"agentFlowEvent","data":"INPROGRESS"}

  // When the flow completes
  data: {"event":"agentFlowEvent","data":"FINISHED"}
  ```

- **Client Action:** Can be used to show a global loading indicator.

### `nextAgentFlow`

Tracks the execution progress through the different nodes in the Flowise graph.

- **When:** Sent every time a new node begins and finishes execution.
- **Payload:** An object with details about the node and its status.
  - `nodeId`: (string) The unique ID of the node.
  - `nodeLabel`: (string) The human-readable name of the node.
  - `status`: (string) The current status, either `"INPROGRESS"` or `"FINISHED"`.
- **Example:**

  ```json
  data: {"event":"nextAgentFlow","data":{"nodeId":"agentAgentflow_0","nodeLabel":"Tutor Agent Front","status":"INPROGRESS"}}
  ```

- **Client Action:** Useful for debugging or displaying a visual representation of the agent's workflow.

### `token`

Streams the AI-generated response token by token. This is the main content to be displayed to the user.

- **When:** Sent for each token as the response is being generated.
- **Payload:** A string containing a part of the response.
- **Example:**

  ```json
  data: {"event":"token","data":"HEL"}
  data: {"event":"token","data":"LO"}
  ```

- **Client Action:** Concatenate the `data` strings from all `token` events in the order they are received to construct the full response. The UI should be updated in real-time as tokens arrive. An empty string (`""`) may be sent, which can be ignored.

### `agentFlowExecutedData`

Provides a detailed summary of the data and state for each node that has finished executing.

- **When:** Sent after a node's execution is finished.
- **Payload:** An array of objects, where each object represents an executed node and contains its inputs, outputs, state, and status. This can be a large and complex object.
- **Example:**

  ```json
  data: {"event":"agentFlowExecutedData","data":[{"nodeId":"startAgentflow_0", ... }]}
  ```

- **Client Action:** Primarily for debugging and logging. A frontend could use this to provide advanced inspection capabilities.

### `calledTools`

Contains information about any tools that the agent called during its execution.

- **When:** Sent after the agent decides to call tools.
- **Payload:** An array of objects, where each object describes a tool call.
- **Example (empty):**

  ```json
  data: {"event":"calledTools","data":[]}
  ```

- **Client Action:** Can be used to show the user that the agent is using external tools.

### `usageMetadata`

Provides metadata about the token consumption for the request.

- **When:** Sent once, typically after the response has been fully generated.
- **Payload:** An object detailing input, output, and total tokens used.
- **Example:**

  ```json
  data: {"event":"usageMetadata","data":{"input_tokens":3210,"output_tokens":108,"total_tokens":3318, ...}}
  ```

- **Client Action:** Useful for analytics, monitoring costs, or debugging.

### `metadata`

Contains session and message identifiers.

- **When:** Sent once per stream, usually towards the end.
- **Payload:** An object with IDs for the chat, message, and session.
  - `chatId`: (string) The ID for the overall chat conversation.
  - `chatMessageId`: (string) The unique ID for the current message/response pair.
  - `question`: (string) The original user prompt.
  - `sessionId`: (string) The session ID.
- **Example:**

  ```json
  data: {"event":"metadata","data":{"chatId":"27e3e63b-5a1a-44af-a717-6ac4709dad06", ...}}
  ```

- **Client Action:** Store these IDs to manage conversation history and state.

### `end`

Signals the end of the SSE stream.

- **When:** The very last message sent from the backend.
- **Payload:** The string `"[DONE]"`.
- **Example:**

  ```text
  event: end
  data: [DONE]
  ```

- **Client Action:** Close the SSE connection and finalize any UI states (e.g., hide loading indicators).

## 4. Client Implementation Summary

A robust frontend client should:

1. Establish an `EventSource` connection to the Flowise streaming endpoint.
2. Register listeners for all relevant event types (`agentFlowEvent`, `nextAgentFlow`, `token`, `end`, etc.).
3. For `token` events, append the received data to a buffer and update the displayed message.
4. For `agentFlowEvent`, manage a global loading state.
5. For `metadata`, store the session and message IDs for future requests.
6. Listen for the `end` event (or the `onmessage` event with `data: "[DONE]"`) to gracefully close the connection.
7. Implement error handling for the `EventSource` connection.