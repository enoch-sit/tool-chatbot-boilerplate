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
import { getUserSessions, getSessionHistory } from '../api/sessions';
import type { Message, ChatSession, StreamEvent } from '../types/chat';
import type {Chatflow} from '../types/chatflow';
import { mapHistoryToMessages } from '../utils/chatParser';

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
   * Evidence from mimic_client_06: history endpoint provides message list
   */
  setCurrentSession: async (session) => {
    set({ currentSession: session, isLoading: true, messages: [] });
    
    if (session) {
      try {
        const history = await getSessionHistory(session.session_id);
        set({ messages: mapHistoryToMessages(history), isLoading: false });
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
   * Evidence from mimic_client_06: endpoint returns sessions array
   */
  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await getUserSessions();
      set({ sessions, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Core chat function using session ID.
   * Evidence from mimic_client_05/06: sessionId is passed in predict payload
   */
  streamAssistantResponse: async (prompt: string) => {
    const { currentSession, currentChatflow, addMessage, updateMessage } = get();
    if (!currentChatflow) {
      get().setError("Cannot send message: No chatflow selected.");
      return;
    }

    // If no session, send with empty session_id and handle session creation in stream
    let sessionId = currentSession?.session_id || '';
    let isNewSession = !currentSession;
    let newSessionObj: ChatSession | undefined = undefined;

    // Add user message (session_id may be empty for first message)
    const userMessage: Message = {
      id: Date.now().toString(),
      session_id: sessionId,
      sender: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    // Create streaming assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      session_id: sessionId,
      sender: 'bot',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
      streamEvents: [],
    };
    addMessage(assistantMessage);

    set({ isStreaming: true, error: null });

    let accumulatedContent = '';
    let accumulatedTokenEvents: StreamEvent[] = [];

    const onStreamEvent = (event: StreamEvent) => {
      // Handle session_id event for new session
      if (isNewSession && event.event === 'session_id' && typeof event.data === 'string') {
        sessionId = event.data;
        // Create new session object and set as currentSession
        newSessionObj = {
          session_id: sessionId,
          chatflow_id: currentChatflow.id,
          topic: prompt.slice(0, 32) || 'New Chat',
          created_at: new Date().toISOString(),
        };
        if (newSessionObj) {
          const filteredSessions = get().sessions.filter(
            (s): s is ChatSession => !!s && s.session_id !== sessionId
          );
          set({
            currentSession: newSessionObj,
            sessions: [newSessionObj, ...filteredSessions],
          });
          set({
            messages: get().messages.map(m =>
              m.id === userMessage.id || m.id === assistantMessageId
                ? { ...m, session_id: sessionId }
                : m
            ),
          });
        }
        isNewSession = false;
      }
      // Also handle metadata event for sessionId (robustness)
      if (isNewSession && event.event === 'metadata' && event.data && typeof event.data.sessionId === 'string') {
        sessionId = event.data.sessionId;
        newSessionObj = {
          session_id: sessionId,
          chatflow_id: currentChatflow.id,
          topic: prompt.slice(0, 32) || 'New Chat',
          created_at: new Date().toISOString(),
        };
        if (newSessionObj) {
          const filteredSessions = get().sessions.filter(
            (s): s is ChatSession => !!s && s.session_id !== sessionId
          );
          set({
            currentSession: newSessionObj,
            sessions: [newSessionObj, ...filteredSessions],
          });
          set({
            messages: get().messages.map(m =>
              m.id === userMessage.id || m.id === assistantMessageId
                ? { ...m, session_id: sessionId }
                : m
            ),
          });
        }
        isNewSession = false;
      }
      if (event.event === 'content' && event.data?.content) {
        const contentData = event.data;
        accumulatedContent = contentData.content;
        updateMessage(assistantMessageId, {
          content: accumulatedContent,
          timeMetadata: contentData.timeMetadata,
          streamEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.streamEvents || []), event]
        });
      } else if (event.event === 'token' && typeof event.data === 'string') {
        accumulatedContent += event.data;
        accumulatedTokenEvents.push(event);
        updateMessage(assistantMessageId, {
          content: accumulatedContent,
          streamEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.streamEvents || []), event]
        });
      } else if (
        event.event === 'agentFlowEvent' ||
        event.event === 'nextAgentFlow' ||
        event.event === 'agentFlowExecutedData' ||
        event.event === 'calledTools'
      ) {
        // Add these events to streamEvents for special UI rendering
        updateMessage(assistantMessageId, {
          streamEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.streamEvents || []), event]
        });
      } else if (event.event === 'end') {
        updateMessage(assistantMessageId, {
          isStreaming: false
        });
        set({ isStreaming: false });
      }
    };

    const onError = (error: Error) => {
      console.error('Stream error:', error);
      updateMessage(assistantMessageId, {
        content: accumulatedContent || `Error: ${error.message}`,
        isStreaming: false
      });
      set({ error: error.message, isStreaming: false });
    };

    try {
      await streamChatAndStore(
        currentChatflow.id,
        sessionId,
        prompt,
        onStreamEvent,
        onError
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      updateMessage(assistantMessageId, {
        content: `Error: ${errorMessage}`,
        isStreaming: false
      });
      set({ error: errorMessage, isStreaming: false });
    }
  },

  /** Sets or clears the global error message. */
  setError: (error) => set({ error }),
}));