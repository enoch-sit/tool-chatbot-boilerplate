/**
 * Chat Session Data Model
 * 
 * This module defines the MongoDB schema and interfaces for the chat session
 * data structure, which is the core entity in the Chat Service. It represents
 * a conversation between a user and the AI assistant, including the message
 * history and associated metadata.
 * 
 * The model includes:
 * - TypeScript interfaces for type safety
 * - MongoDB schema definition
 * - Indexes for query optimization
 * - Default values and validation rules
 */
import mongoose, { Schema, Document } from 'mongoose';

/**
 * Message Interface
 * 
 * Represents a single message within a chat session.
 * Messages follow a role-based format compatible with most LLM APIs.
 */
export interface IMessage {
  role: 'user' | 'assistant' | 'system';  // Who sent the message
  content: string;                        // The actual message content
  timestamp: Date;                        // When the message was sent
}

/**
 * Chat Session Interface
 * 
 * Represents a complete chat conversation between a user and the AI.
 * Extends the Mongoose Document interface to include MongoDB document methods.
 */
export interface IChatSession extends Document {
  _id: string;          // MongoDB document ID
  userId: string;       // ID of the user who owns this chat session
  title: string;        // User-friendly title for the chat session
  messages: IMessage[]; // Array of messages in the conversation
  modelId: string;      // ID of the AI model used for this session
  createdAt: Date;      // When the session was created
  updatedAt: Date;      // When the session was last updated
  
  /**
   * Session Metadata
   * 
   * Flexible object to store additional information about the session,
   * such as streaming state, token usage statistics, and other
   * implementation-specific data.
   */
  metadata: {
    streamingSessionId?: string;       // ID for tracking streaming sessions
    lastTokensUsed?: number;           // Tokens used in the most recent interaction
    totalTokensUsed?: number;          // Cumulative token usage for the session
    activeStreamingSession?: boolean;  // Whether a streaming session is in progress
    [key: string]: any;                // Additional metadata fields
  };
}

/**
 * Chat Session MongoDB Schema
 * 
 * Defines the structure, validation rules, and defaults for chat session
 * documents stored in MongoDB. This schema corresponds to the IChatSession
 * interface for type safety.
 */
const ChatSessionSchema = new Schema({
  // User ID who owns this chat session (required, indexed for quick user-based queries)
  userId: { type: String, required: true, index: true },
  
  // Display title for the chat session
  title: { type: String, required: true },
  
  // Array of message objects in the conversation
  messages: [{
    // Message role (user, assistant, or system)
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    
    // Message content text
    content: { type: String, required: true },
    
    // Timestamp when the message was sent
    timestamp: { type: Date, default: Date.now }
  }],
  
  // ID of the AI model used for this session (includes default model)
  modelId: { type: String, required: true, default: 'anthropic.claude-3-sonnet-20240229-v1:0' },
  
  // Session creation timestamp
  createdAt: { type: Date, default: Date.now },
  
  // Session last update timestamp
  updatedAt: { type: Date, default: Date.now },
  
  // Flexible metadata object for additional session information
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { 
  // Enable automatic timestamp management by Mongoose
  timestamps: true, 
  
  // Specify the collection name in MongoDB
  collection: 'chat_sessions' 
});

/**
 * Index Definitions
 * 
 * Create compound and single-field indexes to optimize the most common
 * query patterns for chat sessions.
 */

/**
 * User Sessions Index
 * 
 * Compound index on userId (ascending) and createdAt (descending).
 * This optimizes queries to fetch a user's sessions sorted by creation date,
 * which is a common operation when listing a user's chat history.
 */
ChatSessionSchema.index({ userId: 1, createdAt: -1 });

/**
 * Streaming Session Index
 * 
 * Index on the streamingSessionId field within the metadata object.
 * This optimizes lookups of sessions by their streaming ID, which is
 * important for managing and updating streaming chat responses.
 */
ChatSessionSchema.index({ 'metadata.streamingSessionId': 1 });

// Create and export the Mongoose model from the schema
export default mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);