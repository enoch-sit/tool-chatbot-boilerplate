// src/types/chat.ts

/**
 * This file defines the core TypeScript types used throughout the chat application.
 * The type definitions are derived from the backend API contract, as observed in
 * the Python test scripts and the `flowise_agent_stream_struct.md` documentation.
 * Having a centralized and accurate type definition file is crucial for ensuring
 * type safety and preventing data-related bugs.
 */

/**
 * Represents a single chat message in a session. This is a fundamental object
 * used to display the conversation history in the UI.
 */
export interface Message {
  id?: string; // Optional ID, as it may not be present on new messages
  session_id: string;
  sender: 'user' | 'bot' | 'system'; // Differentiates between user, AI, and system messages
  content: string; // The textual content of the message
  timestamp?: string;
  metadata?: Record<string, any>; // For any extra data associated with the message
  streamEvents?: StreamEvent[]; // Stores the raw events for a bot message, for debugging or reprocessing
}

/**
 * Represents a chat session, which is a single, continuous conversation.
 * The structure is based on data returned from endpoints in `actual_chat.py`.
 */
export interface ChatSession {
  id: string;
  topic: string; // A title or topic for the session
  created_at: string;
  chatflow_id: string; // The ID of the agent being chatted with
  user_id: string;
}



// --- Stream Event Types ---
// The following types are derived directly from the `flowise_agent_stream_struct.md`
// document, which details the real-time events sent by the backend during a chat.

export interface TokenEvent {
  event: 'token';
  data: string; // A single piece of the response, like a word or character
}

export interface AgentFlowEvent {
  event: 'agentFlowEvent';
  data: {
    status: 'INPROGRESS' | 'SUCCESS' | 'ERROR';
    flowId: string;
    [key: string]: any;
  };
}

export interface NextAgentFlowEvent {
  event: 'nextAgentFlow';
  data: {
    agentName: string;
    status: string;
    [key: string]: any;
  };
}

export interface AgentFlowExecutedDataEvent {
  event: 'agentFlowExecutedData';
  data: any; // The data resulting from an agent flow execution
}

export interface CalledToolsEvent {
  event: 'calledTools';
  data: any[]; // Information about any tools that the agent called
}

export interface UsageMetadataEvent {
  event: 'usageMetadata';
  data: any; // Metadata about resource usage (e.g., token counts)
}

export interface MetadataEvent {
  event: 'metadata';
  data: any; // Generic metadata event
}

export interface EndEvent {
  event: 'end'; // Signals the end of the entire streaming response
}

/**
 * A union type representing all possible events that can be received from the
 * backend stream. This is the primary type used by the `streamChat` function
 * and the `chatStore` to handle real-time updates.
 *
 * The definition of these events is critical and is based entirely on the
 * `flowise_agent_stream_struct.md` documentation.
 */
export type StreamEvent =
  | TokenEvent
  | AgentFlowEvent
  | NextAgentFlowEvent
  | AgentFlowExecutedDataEvent
  | CalledToolsEvent
  | UsageMetadataEvent
  | MetadataEvent
  | EndEvent;

