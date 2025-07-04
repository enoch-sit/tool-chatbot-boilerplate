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
 * Retrieves the full message history for a specific chat session.
 */
export const getSessionHistory = async (sessionId: string): Promise<Message[]> => {
  const response = await apiClient.get<{ history: Message[] }>(`/api/v1/chat/sessions/${sessionId}/history`);
  return response.data.history || [];
};