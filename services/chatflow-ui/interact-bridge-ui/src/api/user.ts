// src/api/user.ts

/**
 * This file contains API functions related to fetching user-specific data
 * that is not directly tied to authentication, such as credit balances.
 */

import axios from 'axios';
import { API_BASE_URL } from './config';

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
 * Fetches the credit balance for the currently authenticated user.
 * @evidence The `get_user_credits` function in the Python script makes a GET request
 * to this endpoint.
 */
export const getUserCredits = async (): Promise<{ totalCredits: number }> => {
  const response = await axios.get<{ totalCredits: number }>(`${API_BASE_URL}/api/v1/chat/credits`, {
    headers: getAuthHeader(),
  });
  return response.data;
};