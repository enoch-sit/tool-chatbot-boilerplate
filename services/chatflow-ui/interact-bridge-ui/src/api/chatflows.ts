// src/api/chatflows.ts

/**
 * This file provides the API for fetching chatflow-related data from the backend.
 * Chatflows are the conversational agents or applications that users can interact with.
 * The functions in this file are based on endpoints discovered in the Python test scripts,
 * such as `quickUserAccessListAndChat_03.py`.
 */

import axios from 'axios';
import { API_BASE_URL } from './config';
import type { Chatflow } from '../types/chat';

// Helper to get the auth token from localStorage, where the Zustand store persists it.
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
 * Fetches the list of chatflows that the currently authenticated user has access to.
 * This function is crucial for displaying the available chat applications to the user.
 *
 * The endpoint `/api/v1/chatflows/my-chatflows` was identified from the Python
 * test script `quickUserAccessListAndChat_03.py`, which performs a GET request
 * to this URL to retrieve a list of chatflows accessible to the user.
 *
 * @returns A promise that resolves to an array of `Chatflow` objects.
 */
export const getMyChatflows = async (): Promise<Chatflow[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/chatflows/my-chatflows`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
