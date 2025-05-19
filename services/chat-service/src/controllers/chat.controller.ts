/**
 * Chat Controller Module
 * 
 * This module provides the business logic for the chat API endpoints.
 * It handles chat session management, message processing, streaming responses,
 * and supervisor monitoring capabilities.
 * 
 * Core responsibilities:
 * - Managing chat sessions (create, retrieve, list, delete)
 * - Processing and storing messages
 * - Streaming AI responses in real-time
 * - Handling supervisor observation functionality
 * - Enforcing permissions and access control
 */
// This file now acts as an aggregator for the chat controller modules.
// Specific functionalities have been moved to separate files within the ./chat directory.

export * from './chat/session.controller';
export * from './chat/message.controller';
export * from './chat/supervisor.controller';