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
  console.log('Attempting to fetch user credits...');
  try {
    // Handle both { credits: ... } and { totalCredits: ... } formats
    const response = await apiClient.get<any>('/api/v1/chat/credits');
    const data = response.data;
    console.log('Successfully fetched user credits raw data:', data);

    const creditsValue = data.credits ?? data.totalCredits;

    if (creditsValue === undefined || creditsValue === null) {
      throw new Error('Credit information not found in API response.');
    }

    return { totalCredits: creditsValue };
  } catch (error) {
    console.error('Failed to fetch user credits:', error);
    throw error;
  }
};

/**
 * Fetches the current user's profile information.
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/api/v1/chat/get_current_user');
  return response.data;
};