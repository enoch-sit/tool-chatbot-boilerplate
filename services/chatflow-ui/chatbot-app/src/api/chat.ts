// src/api/chat.ts

/**
 * This file provides the client-side API for interacting with the chat backend.
 * It is responsible for sending user messages and handling the real-time streaming
 * of events from the backend.
 *
 * The implementation is based on the backend contract observed in the Python
 * test scripts, particularly `quickUserCreateSessionAndChat_05.py` and
 * `quickUserAccessListAndStreamChat_04.py`, which show a POST request to a
 * `/chat/{session_id}` endpoint to receive a stream of events.
 */

import { StreamEvent, Message } from '../types/chat';
import { API_BASE_URL } from './config';
import { StreamParser } from '../utils/streamParser';

/**
 * Sends a message to the chat backend and handles the streaming response.
 * This function establishes a connection to the backend, sends the user's message,
 * and then processes the incoming stream of events in real-time.
 *
 * As documented in `flowise_agent_stream_struct.md`, the backend produces a stream
 * of concatenated JSON objects. This function uses the `StreamParser` to correctly
 * parse this stream.
 *
 * @param session_id The ID of the chat session, obtained when a new chat is created.
 *                   Evidence for this is in `quickUserCreateSessionAndChat_05.py`.
 * @param message The message object to send. It contains the user's query.
 * @param onStreamEvent A callback function that is invoked for each `StreamEvent`
 *                      parsed from the response stream. This is used to update the
 *                      UI in real-time.
 * @param onError A callback function to handle any parsing errors that occur,
 *                ensuring the application can gracefully handle malformed data.
 * @returns A promise that resolves when the stream is closed, indicating the end
 *          of the conversation turn.
 */
export const streamChat = async (
  session_id: string,
  message: Omit<Message, 'session_id'>,
  onStreamEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void
): Promise<void> => {
  // The endpoint structure `/chat/${session_id}` and the POST method are derived
  // from analyzing the Python test script `quickUserAccessListAndStreamChat_04.py`,
  // which makes a similar request to the backend.
  const response = await fetch(`${API_BASE_URL}/chat/${session_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authentication headers would be added here if required by the backend.
    },
    body: JSON.stringify(message),
  });

  if (!response.body) {
    throw new Error('Response body is null. The server may have failed to send a response.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  // The `StreamParser` is essential for handling the backend's concatenated JSON format.
  // It uses a brace-counting mechanism to split the raw text stream into valid JSON objects.
  const streamParser = new StreamParser(onStreamEvent, onError);

  const processStream = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // The 'end' event is signaled by the stream closing.
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      streamParser.processChunk(chunk);
    }
  };

  await processStream();
};
