// src/api/index.ts
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.FLOWISE_PROXY_API_URL || 'http://localhost:8000';

// Request interceptor to add auth token
const makeAuthenticatedRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const { tokens, refreshToken, logout } = useAuthStore.getState();
  
  if (!tokens?.accessToken) {
    throw new Error('No authentication token available');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens.accessToken}`,
    ...options.headers,
  };

  let response = await fetch(url, { ...options, headers });

  // Handle token expiration
  if (response.status === 401) {
    try {
      await refreshToken();
      const newTokens = useAuthStore.getState().tokens;
      if (newTokens?.accessToken) {
        const retryHeaders = { ...headers, 'Authorization': `Bearer ${newTokens.accessToken}` };
        response = await fetch(url, { ...options, headers: retryHeaders }); // Retry the request
      } else {
        throw new Error('Failed to get new token after refresh.');
      }
    } catch (refreshError) {
      logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
};

// API helper function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await makeAuthenticatedRequest(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `Request failed: ${response.status}`);
  }
  
  // Handle responses with no content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  // Assuming a successful response with no content is valid
  return Promise.resolve(null as T);
};

// Chat API functions
export interface ChatRequest {
  question: string;
  sessionId: string;
  chatflow_id: string;
}

export const getChatflows = async () => apiRequest('/api/v1/chatflows');

export const createSession = async (chatflowId: string, topic: string) => 
  apiRequest('/api/v1/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ chatflow_id: chatflowId, topic }),
  });

export const getUserSessions = async () => apiRequest('/api/v1/chat/sessions');

export const getSessionHistory = async (sessionId: string) => 
  apiRequest(`/api/v1/chat/sessions/${sessionId}/history`);

export const streamChatResponse = async (payload: ChatRequest): Promise<ReadableStream<Uint8Array>> => {
  const { tokens } = useAuthStore.getState();
  if (!tokens?.accessToken) throw new Error('No authentication token available');

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/predict/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Stream request failed: ${response.status}`);
  if (!response.body) throw new Error('Response body is null');
  return response.body;
};

export const getUserCredits = async () => apiRequest('/api/v1/chat/credits');

// Admin API functions
export const getAllChatflows = async () => apiRequest('/api/v1/admin/chatflows');

export const getSpecificChatflow = async (chatflowId: string) =>
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}`);

export const assignUserToChatflow = async (chatflowId: string, email: string) => 
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const bulkAssignUsersToChatflow = async (chatflowId: string, emails: string[]) =>
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users/bulk-add`, {
    method: 'POST',
    body: JSON.stringify({ emails }),
  });

export const getChatflowUsers = async (chatflowId: string) => 
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users`);

export const removeUserFromChatflow = async (chatflowId: string, email: string) => 
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users`, {
    method: 'DELETE',
    body: JSON.stringify({ email }), // Body might not be needed depending on server impl
  });

export const syncChatflows = async () => 
  apiRequest('/api/v1/admin/chatflows/sync', { method: 'POST' });

export const getChatflowStats = async () => apiRequest('/api/v1/admin/chatflows/stats');

export const syncUserByEmail = async (email: string) =>
  apiRequest('/api/v1/admin/users/sync-by-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });