// src/store/chatStore.ts

/**
 * This file defines the central state management for the chat application using Zustand.
 * It is responsible for managing messages, chat sessions, chatflows, and the real-time
 * state of the chat, including loading and streaming statuses.
 *
 * The store is designed to be the single source of truth for the chat UI. Its actions
 * interact with the API layer to fetch data and handle real-time communication, and
 * its state is consumed by the React components to render the UI.
 */

import { create } from 'zustand';
import { streamChatAndStore } from '../api/chat';
import { getMyChatflows } from '../api/chatflows';
// TODO: Implement and import API functions for session management.
// import { createSession, getUserSessions, getSessionHistory } from '../api'; 
import type { Message, ChatSession, StreamEvent } from '../types/chat';
import type {Chatflow} from '../types/chatflow';

/**
 * Defines the shape of the chat state, including all data and status flags
 * required for the chat interface to function.
 */
interface ChatState {
  // --- State ---
  messages: Message[]; // The list of messages in the current chat session.
  sessions: ChatSession[]; // The list of all chat sessions for the user.
  chatflows: Chatflow[]; // The list of available chatflows (agents).
  currentSession: ChatSession | null; // The currently active chat session.
  currentChatflow: Chatflow | null; // The currently selected chatflow.
  isLoading: boolean; // Indicates if a background operation is in progress (e.g., loading history).
  isStreaming: boolean; // True when the assistant is generating a response.
  error: string | null; // Stores any error messages.

  // --- Actions ---
  addMessage: (message: Message) => void; // Adds a new message to the list.
  updateMessage: (messageId: string, updates: Partial<Message>) => void; // Updates an existing message.
  clearMessages: () => void; // Clears all messages from the current session.
  setCurrentSession: (session: ChatSession | null) => Promise<void>; // Switches the active session.
  setCurrentChatflow: (chatflow: Chatflow | null) => void; // Selects a chatflow to interact with.
  createNewSession: (chatflowId: string, topic: string) => Promise<ChatSession>; // Creates a new chat session.
  loadChatflows: () => Promise<void>; // Fetches the list of available chatflows.
  loadSessions: () => Promise<void>; // Fetches the user's chat sessions.
  streamAssistantResponse: (prompt: string) => Promise<void>; // The core action to send a prompt and handle the streamed response.
  setError: (error: string | null) => void; // Sets or clears the error state.
}

export const useChatStore = create<ChatState>((set, get) => ({
  // --- Initial State ---
  messages: [],
  sessions: [],
  chatflows: [],
  currentSession: null,
  currentChatflow: null,
  isLoading: false,
  isStreaming: false,
  error: null,

  // --- Actions Implementation ---

  /** Adds a new message to the state. */
  addMessage: (message) =>
    set((state) => ({ 
      messages: [...state.messages, message] 
    })),

  /** Finds a message by its ID and applies updates. */
  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    })),

  /** Clears all messages, typically when switching sessions. */
  clearMessages: () => set({ messages: [] }),

  /**
   * Sets the current session and loads its message history.
   * NOTE: Session history loading is not yet implemented.
   */
  setCurrentSession: async (session) => {
    set({ currentSession: session, isLoading: true, messages: [] });
    if (session) {
      try {
        // TODO: Implement `getSessionHistory` in the API layer and uncomment.
        // const history = await getSessionHistory(session.id);
        // set({ messages: history, isLoading: false });
        console.log("Session history loading not implemented yet.");
        set({ isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load session history';
        set({ error: errorMessage, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  /** Sets the currently selected chatflow. */
  setCurrentChatflow: (chatflow) => set({ currentChatflow: chatflow }),

  /**
   * Creates a new chat session for a given chatflow.
   * NOTE: This is a mock implementation. It should be replaced with a real API call.
   */
  createNewSession: async (chatflowId, topic) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement `createSession` in the API layer and uncomment.
      // const session = await createSession(chatflowId, topic);
      // set(state => ({ sessions: [session, ...state.sessions], currentSession: session, isLoading: false }));
      // return session;
      console.log("Create session not implemented yet. Using mock session.");
      const tempSession: ChatSession = { id: Date.now().toString(), topic, chatflow_id: chatflowId, created_at: new Date().toISOString(), user_id: 'mock_user' };
      set(state => ({ sessions: [tempSession, ...state.sessions], currentSession: tempSession, isLoading: false }));
      get().clearMessages();
      return tempSession;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  /** Fetches the list of chatflows the user has access to from the backend. */
  loadChatflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const chatflows = await getMyChatflows();
      set({ chatflows, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chatflows';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Fetches the user's existing chat sessions.
   * NOTE: This is a mock implementation.
   */
  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement `getUserSessions` in the API layer and uncomment.
      // const sessionData = await getUserSessions();
      // set({ sessions: sessionData.sessions, isLoading: false });
      console.log("Load sessions not implemented yet. Using empty list.");
      set({ sessions: [], isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * This is the core function for handling the real-time chat interaction.
   * It sends the user's prompt to the backend and processes the resulting stream of events.
   */
  streamAssistantResponse: async (prompt: string) => {
    // Get the necessary state from the store
    const { currentSession, currentChatflow, addMessage, updateMessage } = get();

    // Guard against missing session or chatflow
    if (!currentSession) {
      get().setError("Cannot send message: No active session selected.");
      return;
    }
    if (!currentChatflow) {
      get().setError("Cannot send message: No chatflow selected.");
      return;
    }

    // 1. Add the user's message to the UI immediately.
    const userMessage: Message = {
      id: Date.now().toString(),
      session_id: currentSession.id,
      sender: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    // 2. Create a placeholder for the bot's response.
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      session_id: currentSession.id,
      sender: 'bot',
      content: '', // Start with empty content, will be populated by the stream.
      timestamp: new Date().toISOString(),
      streamEvents: [], // Store the raw events for debugging.
    };
    addMessage(assistantMessage);

    set({ isStreaming: true, error: null });

    // 3. Define the callback for handling each event from the stream.
    const onStreamEvent = (event: StreamEvent) => {
      const currentMessages = get().messages;
      const messageIndex = currentMessages.findIndex(m => m.id === assistantMessageId);
      if (messageIndex === -1) return;

      const updatedMessage = { ...currentMessages[messageIndex] };
      updatedMessage.streamEvents = [...(updatedMessage.streamEvents || []), event];

      if (event.event === 'token' && typeof event.data === 'string') {
        updatedMessage.content += event.data;
      } else if (event.event === 'end') {
        set({ isStreaming: false });
      }
      
      updateMessage(assistantMessageId, updatedMessage);
    };

    // 4. Define the error handler for the stream.
    const onError = (error: Error) => {
      console.error('Stream error:', error);
      set({ error: error.message, isStreaming: false });
    };

    // 5. Initiate the stream by calling the CORRECTED API function.
    try {
      // --- THIS IS THE CORRECTED USAGE ---
      await streamChatAndStore(
        currentChatflow.id,
        currentSession.id,
        prompt,
        onStreamEvent,
        onError
      );
      // --- END OF CORRECTION ---
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      updateMessage(assistantMessageId, {
        content: `Error: ${errorMessage}`,
      });
      set({ error: errorMessage, isStreaming: false });
    }
  },

  /** Sets or clears the global error message. */
  setError: (error) => set({ error }),
}));