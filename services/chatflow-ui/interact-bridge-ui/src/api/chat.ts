// src/api/chat.ts

/**
 * This file provides the client-side API for interacting with the chat backend.
 * It is responsible for sending user messages and handling the real-time streaming
 * of events from the backend.
 */

import type { StreamEvent } from '../types/chat';
import { API_BASE_URL } from './config';
import { StreamParser } from '../utils/streamParser';
import { useAuthStore } from '../store/authStore';

/**
 * Sends a message to the chat backend and handles the streaming response,
 * while ensuring the interaction is stored in the session history.
 *
 * @param chatflow_id The ID of the chatflow being interacted with.
 * @param session_id The ID of the current chat session. Can be empty string for new sessions.
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
  // Get auth token from store instead of localStorage directly
  const tokens = useAuthStore.getState().tokens;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/predict/stream/store`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      chatflow_id,
      sessionId: session_id,
      question,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token and retry
      try {
        await useAuthStore.getState().refreshToken();
        const newTokens = useAuthStore.getState().tokens;
        
        if (newTokens?.accessToken) {
          headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
          
          // Retry the request
          const retryResponse = await fetch(`${API_BASE_URL}/api/v1/chat/predict/stream/store`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              chatflow_id,
              sessionId: session_id,
              question,
            }),
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          
          // Process the retry response
          await processStreamResponse(retryResponse, onStreamEvent, onError);
          return;
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        let errorMsg = '';
        if (refreshError instanceof Error) {
          errorMsg = refreshError.message;
        } else if (typeof refreshError === 'object' && refreshError !== null && 'message' in refreshError) {
          errorMsg = String((refreshError as { message: unknown }).message);
        } else {
          errorMsg = String(refreshError);
        }
        throw new Error('Authentication failed: ' + errorMsg);
      }
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  await processStreamResponse(response, onStreamEvent, onError);
};

// Helper function to process the stream response
const processStreamResponse = async (
  response: Response,
  onStreamEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void
): Promise<void> => {
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