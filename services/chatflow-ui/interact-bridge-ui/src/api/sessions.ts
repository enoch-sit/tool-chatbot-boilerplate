// src/api/sessions.ts (Corrected)

import axios from 'axios';
import { API_BASE_URL } from './config';
import type { ChatSession, Message } from '../types/chat';

// Helper to get the auth token from localStorage.
const getAuthHeader = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const { state } = JSON.parse(authStorage);
      const token = state?.tokens?.accessToken;
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (e) {
    console.error('Error parsing auth storage:', e);
  }
  return {};
};

/**
 * Fetches all chat sessions for the authenticated user.
 */
export const getUserSessions = async (): Promise<ChatSession[]> => {
  const response = await axios.get<{ sessions: ChatSession[] }>(`${API_BASE_URL}/api/v1/chat/sessions`, {
    headers: getAuthHeader(),
  });
  return response.data.sessions || [];
};

/**
 * Creates a new chat session for a given chatflow.
 */
export const createSession = async (chatflowId: string, topic: string): Promise<ChatSession> => {
  const response = await axios.post<ChatSession>(
    `${API_BASE_URL}/api/v1/chat/sessions`,
    { chatflow_id: chatflowId, topic },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Retrieves the full message history for a specific chat session.
 */
export const getSessionHistory = async (sessionId: string): Promise<Message[]> => {
  const response = await axios.get<{ history: Message[] }>(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}/history`, {
    headers: getAuthHeader(),
  });
  return response.data.history || [];
};