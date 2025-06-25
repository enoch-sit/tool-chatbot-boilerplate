// src/api/admin.ts
import { apiRequest } from './index';

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
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });

export const syncChatflows = async () => apiRequest('/api/v1/admin/chatflows/sync', { method: 'POST' });

export const getChatflowStats = async () => apiRequest('/api/v1/admin/chatflows/stats');

export const syncUserByEmail = async (email: string) =>
  apiRequest('/api/v1/admin/users/sync-by-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
