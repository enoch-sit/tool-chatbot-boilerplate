// src/api/admin.ts

/**
 * This file implements the client-side API for all administrative functions.
 * These functions correspond to the backend's admin-only REST endpoints and are
 * used to manage chatflows, users, and system settings. The implementation of
 * each function is based on direct evidence from the provided Python test and
 * administrative scripts, ensuring the frontend client matches the backend contract.
 */

import { API_BASE_URL } from './config';
import { Chatflow, ChatflowStats, User, BulkAssignmentResult } from '../types/admin';
import axios from 'axios';

// Helper function to get the authorization header from local storage.
// This is crucial for securing admin-only endpoints, as seen in all
// Python scripts making authenticated requests.
const getAuthHeader = () => {
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) {
    return {};
  }
  const token = JSON.parse(authStorage).state?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Triggers a synchronization of chatflows from the Flowise instance.
 * Evidence: `quickTestChatflowsSync_01.py` shows a POST request to this endpoint.
 */
export const syncChatflows = async (): Promise<{ message: string }> => {
  const response = await axios.post(`${API_BASE_URL}/api/v1/admin/chatflows/sync`, {}, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Fetches statistics about the chatflows. While not in a specific script, this
 * is a standard administrative dashboard feature.
 */
export const getChatflowStats = async (): Promise<ChatflowStats> => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/admin/chatflows/stats`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Retrieves a list of all available chatflows.
 * Evidence: `actual_admin.py` performs a GET request to this endpoint.
 */
export const getAllChatflows = async (): Promise<Chatflow[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/admin/chatflows`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Fetches the details of a single, specific chatflow by its ID.
 * Evidence: `actual_admin.py` includes a function to get a specific chatflow.
 */
export const getSpecificChatflow = async (id: string): Promise<Chatflow> => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/admin/chatflows/${id}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Gets a list of all users assigned to a specific chatflow.
 * Evidence: `quickUserAccessListAndChat_03.py` calls this endpoint.
 */
export const getChatflowUsers = async (id: string): Promise<User[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/admin/chatflows/${id}/users`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Assigns a single user to a chatflow by their email address.
 * Evidence: `quickAddUserToChatflow_02.py` demonstrates this POST request.
 */
export const addUserToChatflow = async (id: string, email: string): Promise<{ message: string }> => {
  const response = await axios.post(`${API_BASE_URL}/api/v1/admin/chatflows/${id}/users`, 
    { email },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Assigns multiple users to a chatflow in a single bulk operation.
 * Evidence: `actual_admin.py` contains logic for this bulk-add operation.
 */
export const bulkAddUsersToChatflow = async (id: string, emails: string[]): Promise<BulkAssignmentResult> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/v1/admin/chatflows/${id}/users/bulk-add`,
    { emails },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Removes a user from a chatflow.
 * Evidence: `actual_admin.py` shows a DELETE request to this endpoint.
 */
export const removeUserFromChatflow = async (id: string, email: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/v1/admin/chatflows/${id}/users`, {
    data: { email },
    headers: getAuthHeader()
  });
};

/**
 * Syncs a user from the external auth provider to the local database.
 * Evidence: `actual_admin.py` contains a function for user synchronization.
 */
export const syncUserByEmail = async (email: string): Promise<{ message: string; user_id: string }> => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/admin/users/sync-by-email`, 
    { email },
    { headers: getAuthHeader() }
  );
  return response.data;
}
