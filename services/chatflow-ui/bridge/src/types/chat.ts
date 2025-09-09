// src/types/chat.ts

/**
 * This file defines the core TypeScript types used throughout the chat application.
 * The type definitions are derived from the backend API contract, as observed in
 * the Python test scripts and the `flowise_agent_stream_struct.md` documentation.
 * Having a centralized and accurate type definition file is crucial for ensuring
 * type safety and preventing data-related bugs.
 */

import type { FileUpload } from './api';

export interface Message {
  id?: string;
  session_id?: string;
  role?: 'user' | 'assistant' | 'system' | 'agent'; // Add role to distinguish senders
  sender: string, //'user' | 'bot' | 'agent' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  streamEvents?: StreamEvent[]; // Events stored in history (only token events)
  liveEvents?: StreamEvent[]; // Events shown during real-time streaming (all events)
  isStreaming?: boolean; // Add this to track if message is still streaming
  uploads?: FileUpload[]; // File uploads attached to the message
  timeMetadata?: {
    start: number;
    end: number;
    delta: number;
  };
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
  data: unknown; // The data resulting from an agent flow execution
}

export interface CalledToolsEvent {
  event: 'calledTools';
  data: unknown[]; // Information about any tools that the agent called
}

export interface UsageMetadataEvent {
  event: 'usageMetadata';
  data: unknown; // Metadata about resource usage (e.g., token counts)
}

export interface MetadataEvent {
  event: 'metadata';
  data: unknown; // Generic metadata event
}

export interface EndEvent {
  event: 'end'; // Signals the end of the entire streaming response
  data: string
}

/**
 * A union type representing all possible events that can be received from the
 * backend stream. This is the primary type used by the `streamChat` function
 * and the `chatStore` to handle real-time updates.
 *
 * The definition of these events is critical and is based entirely on the
 * `flowise_agent_stream_struct.md` documentation.
 */

// src/types/chat.ts - Add to StreamEvent union
export interface ContentEvent {
  event: 'content';
  data: {
    content: string;
    timeMetadata?: {
      start: number;
      end: number;
      delta: number;
    };
    usageMetadata?: unknown;
    calledTools?: unknown[];
  };
}

export interface SessionIdEvent {
  event: 'session_id';
  data: string; // The new session_id
}

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language: string }
  | { type: 'mermaid'; content: string }
  | { type: 'mindmap'; content: string }
  | { type: 'html'; content: string }
  | { type: 'html-loading'; content: string }
  | { type: 'math'; content: string; display: boolean };

// Update the StreamEvent union type
export type StreamEvent =
  | TokenEvent
  | ContentEvent  // Add this
  | AgentFlowEvent
  | NextAgentFlowEvent
  | AgentFlowExecutedDataEvent
  | CalledToolsEvent
  | UsageMetadataEvent
  | MetadataEvent
  | EndEvent
  | SessionIdEvent; // <-- Add this;




