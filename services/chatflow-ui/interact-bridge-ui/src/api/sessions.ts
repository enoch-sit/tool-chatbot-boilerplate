// src/api/sessions.ts

import apiClient from './client';
import type { ChatSession, Message } from '../types/chat';

/**
 * Fetches all chat sessions for the authenticated user.
 */
export const getUserSessions = async (): Promise<ChatSession[]> => {
  const response = await apiClient.get<{ sessions: ChatSession[] }>('/api/v1/chat/sessions');
  return response.data.sessions || [];
};

/**
 * Creates a new chat session for a given chatflow.
 */
export const createSession = async (chatflowId: string, topic: string): Promise<ChatSession> => {
  const response = await apiClient.post<ChatSession>('/api/v1/chat/sessions', {
    chatflow_id: chatflowId,
    topic
  });
  return response.data;
};

/**
 * Retrieves the full message history for a specific chat session.
 */
export const getSessionHistory = async (sessionId: string): Promise<Message[]> => {
  const response = await apiClient.get<{ history: Message[] }>(`/api/v1/chat/sessions/${sessionId}/history`);
  return response.data.history || [];
};