// src/api/user.ts

/**
 * This file contains API functions related to fetching user-specific data
 * that is not directly tied to authentication, such as credit balances.
 */

import apiClient from './client';
import type { User } from '../types/auth';

/**
 * Fetches the credit balance for the currently authenticated user.
 * @evidence The `get_user_credits` function in the Python script makes a GET request
 * to this endpoint.
 */
export const getUserCredits = async (): Promise<{ totalCredits: number }> => {
  const response = await apiClient.get<{ totalCredits: number }>('/api/v1/chat/credits');
  return response.data;
};

/**
 * Fetches the current user's profile information.
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/api/v1/chat/get_current_user');
  return response.data;
};