// src/api/chatflows.ts

/**
 * This file provides the API for fetching chatflow-related data from the backend.
 * Chatflows are the conversational agents or applications that users can interact with.
 * The functions in this file are based on endpoints discovered in the Python test scripts,
 * such as `quickUserAccessListAndChat_03.py`.
 */

import apiClient from './client';
import type { Chatflow } from '../types/chatflow';

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
  const response = await apiClient.get('/api/v1/chatflows/my-chatflows');
  return response.data;
};