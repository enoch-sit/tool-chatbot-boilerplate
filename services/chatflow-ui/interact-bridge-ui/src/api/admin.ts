// src/api/admin.ts

/**
 * This file implements the client-side API for all administrative functions.
 * These functions correspond to the backend's admin-only REST endpoints and are
 * used to manage chatflows, users, and system settings. The implementation of
 * each function is based on direct evidence from the provided Python test and
 * administrative scripts, ensuring the frontend client matches the backend contract.
 */

import apiClient from './client';
import type { BulkAssignmentResult } from '../types/admin';
import type { Chatflow, ChatflowStats, ChatflowUser} from '../types/chatflow';

/**
 * Triggers a synchronization of chatflows from the Flowise instance.
 * Evidence: `quickTestChatflowsSync_01.py` shows a POST request to this endpoint.
 */
export const syncChatflows = async (): Promise<{ message: string }> => {
  const response = await apiClient.post('/api/v1/admin/chatflows/sync', {});
  return response.data;
};

/**
 * Fetches statistics about the chatflows. While not in a specific script, this
 * is a standard administrative dashboard feature.
 */
export const getChatflowStats = async (): Promise<ChatflowStats> => {
  const response = await apiClient.get('/api/v1/admin/chatflows/stats');
  return response.data;
};

/**
 * Retrieves a list of all available chatflows.
 * Evidence: `actual_admin.py` performs a GET request to this endpoint.
 */
export const getAllChatflows = async (): Promise<Chatflow[]> => {
  const response = await apiClient.get('/api/v1/admin/chatflows');
  return response.data.map((chatflow: any) => ({
    ...chatflow,
    id: chatflow.flowise_id, // 將 flowise_id 複製到 id 字段，確保兼容性
  }));
};

/**
 * Fetches the details of a single, specific chatflow by its ID.
 * Evidence: `actual_admin.py` includes a function to get a specific chatflow.
 */
export const getSpecificChatflow = async (id: string): Promise<Chatflow> => {
  const response = await apiClient.get(`/api/v1/admin/chatflows/${id}`);
  return response.data;
};

/**
 * Gets a list of all users assigned to a specific chatflow.
 * Evidence: `quickUserAccessListAndChat_03.py` calls this endpoint.
 */
export const getChatflowUsers = async (flowiseId: string): Promise<ChatflowUser[]> => {
  try {
    const response = await apiClient.get(`/api/v1/admin/chatflows/${flowiseId}/users`);
    
    // 確保返回正確的類型
    return response.data.map((user: any): ChatflowUser => ({
      _id: user.external_user_id || user._id || user.id, // make this more compatible 
      username: user.username || user.name || user.email.split('@')[0],
      email: user.email,
      role: user.role || 'user',
      assigned_at: user.assigned_at || user.created_at || new Date().toISOString(),
      external_user_id: user.external_user_id || user.externalId,
    }));
  } catch (error) {
    console.error('Error fetching chatflow users:', error);
    throw error;
  }
};

/**
 * Assigns a single user to a chatflow by their email address.
 * Evidence: `quickAddUserToChatflow_02.py` demonstrates this POST request.
 */
export const addUserToChatflow = async (id: string, email: string): Promise<{ message: string }> => {
  const response = await apiClient.post(`/api/v1/admin/chatflows/${id}/users`, {
    email
  });
  return response.data;
};

/**
 * Assigns multiple users to a chatflow in a single bulk operation.
 * Evidence: `actual_admin.py` contains logic for this bulk-add operation.
 */
export const bulkAddUsersToChatflow = async (id: string, emails: string[]): Promise<BulkAssignmentResult> => {
  const response = await apiClient.post(`/api/v1/admin/chatflows/${id}/users/bulk-add`, {
    emails
  });
  return response.data;
};

/**
 * Removes a user from a chatflow.
 * Evidence: `actual_admin.py` shows a DELETE request to this endpoint.
 */
export const removeUserFromChatflow = async (id: string, email: string): Promise<void> => {
  await apiClient.delete(`/api/v1/admin/chatflows/${id}/users`, {
    data: { email }
  });
};

/**
 * Syncs a user from the external auth provider to the local database.
 * Evidence: `actual_admin.py` contains a function for user synchronization.
 */
export const syncUserByEmail = async (email: string): Promise<{ message: string; user_id: string }> => {
  const response = await apiClient.post('/api/v1/admin/users/sync-by-email', {
    email
  });
  return response.data;
};