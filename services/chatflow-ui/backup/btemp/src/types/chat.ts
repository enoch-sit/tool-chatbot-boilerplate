// src/types/chat.ts

/**
 * This file defines the core TypeScript types used throughout the chat application.
 * The type definitions are derived from the backend API contract, as observed in
 * the Python test scripts and the `flowise_agent_stream_struct.md` documentation.
 * Having a centralized and accurate type definition file is crucial for ensuring
 * type safety and preventing data-related bugs.
 */


export type Sender = 'user' | 'bot';

export interface Message {
  id: string;
  session_id?: string; // Add this line
  content: string;
  sender: Sender;
  timestamp: string;
  isStreaming?: boolean;
  streamEvents?: StreamEvent[];
  liveEvents?: StreamEvent[];
  timeMetadata?: {
    start: number;
    end: number;
    delta: number;
    latency?: number;
  };
  error?: string;
}

/**
 * Represents a chat session, which is a single, continuous conversation.
 * The structure is based on data returned from endpoints in `actual_chat.py`.
 */
export interface ChatSession {
  session_id: string;
  topic: string; // A title or topic for the session
  created_at: string;
  chatflow_id: string; // The ID of the agent being chatted with
  user_id?: string;
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
    [key: string]: unknown;
  };
}

export interface NextAgentFlowEvent {
  event: 'nextAgentFlow';
  data: {
    agentName: string;
    status: string;
    [key: string]: unknown;
  };
}

export interface AgentFlowExecutedDataEvent {
  event: 'agentFlowExecutedData';
  data: Record<string, unknown>; // The data resulting from an agent flow execution
}

export interface CalledToolsEvent {
  event: 'calledTools';
  data: Record<string, unknown>[]; // Information about any tools that the agent called
}

export interface UsageMetadataEvent {
  event: 'usageMetadata';
  data: Record<string, unknown>; // Metadata about resource usage (e.g., token counts)
}

export interface MetadataEvent {
  event: 'metadata';
  data: Record<string, unknown>; // Generic metadata event
}

export interface ContentEvent {
  event: 'content';
  data: {
    content: string;
    timeMetadata?: Record<string, unknown>;
    usageMetadata?: Record<string, unknown>;
    calledTools?: Record<string, unknown>;
  };
}

export interface StartEvent {
    event: 'start';
}

export interface EndEvent {
    event: 'end';
    data: {
        final_answer: string;
    };
}

export interface SessionIdEvent {
    event: 'session_id';
    data: string;
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
  | ContentEvent
  | StartEvent
  | EndEvent
  | SessionIdEvent;

export type StreamEventType = 'token' | 'agentFlowEvent' | 'nextAgentFlow' | 'agentFlowExecutedData' | 'calledTools' | 'usageMetadata' | 'metadata' | 'end' | 'content';

/**
 * Represents a block of content that can be either text, code, or a diagram.
 * This is used by the `MixedContentRenderer` to display chat messages that
 * contain a mix of formatted text and specialized blocks.
 */
export type ContentBlock = 
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language: string }
  | { type: 'mermaid'; content: string }
  | { type: 'mindmap'; content: string };
