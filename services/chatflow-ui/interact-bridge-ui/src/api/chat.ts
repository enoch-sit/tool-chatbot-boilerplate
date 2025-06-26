// src/api/chat.ts (Corrected)

/**
 * This file provides the client-side API for interacting with the chat backend.
 * It is responsible for sending user messages and handling the real-time streaming
 * of events from the backend.
 */

import type { StreamEvent, Message } from '../types/chat';
import { API_BASE_URL } from './config';
import { StreamParser } from '../utils/streamParser';

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
 * Sends a message to the chat backend and handles the streaming response,
 * while ensuring the interaction is stored in the session history.
 *
 * @param chatflow_id The ID of the chatflow being interacted with.
 * @param session_id The ID of the current chat session.
 * @param question The user's message/prompt.
 * @param onStreamEvent A callback function invoked for each `StreamEvent`.
 * @param onError A callback for handling parsing or stream errors.
 *
 * @evidence This function is updated based on `test_chat_predict_stream_store_with_session`
 * from `mimic_client_06_quickTestGetAllChatSessionIDNHistory_06.py`, which uses the
 * `/api/v1/chat/predict/stream/store` endpoint. This endpoint requires `chatflow_id`,
 * `sessionId`, and `question` in the payload.
 */
export const streamChatAndStore = async (
  chatflow_id: string,
  session_id: string,
  question: string,
  onStreamEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void
): Promise<void> => {
  // --- FIX STARTS HERE ---
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const authHeader = getAuthHeader();
  if (authHeader.Authorization) {
    headers['Authorization'] = authHeader.Authorization;
  }
  // --- FIX ENDS HERE ---

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/predict/stream/store`, {
    method: 'POST',
    headers: headers, // Use the correctly constructed headers object
    body: JSON.stringify({
      chatflow_id,
      sessionId: session_id,
      question,
    }),
  });

  if (!response.body) {
    throw new Error('Response body is null. The server may have failed to send a response.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const streamParser = new StreamParser(onStreamEvent, onError);

  const processStream = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      streamParser.processChunk(chunk);
    }
  };

  await processStream();
};