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
import { useDebugStore } from './debugStore';

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
  clearSession: () => void; // Clears the current session to start a new conversation.
  clearSessionId: () => void; // Clears only the session ID to start a new session with next message.
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

  /** Clears the current session, resetting the chat state. */
  clearSession: () => {
    const { addLog } = useDebugStore.getState();
    set({ 
      currentSession: null, 
      messages: [],
      error: null 
    });
    addLog(`Session cleared. Ready to start a new conversation.`);
  },

  /** Clears only the session ID to start a new session with the next message. */
  clearSessionId: () => {
    const { addLog } = useDebugStore.getState();
    set({ 
      currentSession: null,
      messages: [], // For clarity, this clears messages, but you can keep them if desired
      error: null 
    });
    addLog(`Session ID cleared. Next message will start a new session.`);
  },

  /**
   * Sets the current session and loads its message history.
   * Evidence from mimic_client_06: history endpoint provides message list
   */
  setCurrentSession: async (session) => {
    const { addLog } = useDebugStore.getState();
    // Normalize session object to ensure it has session_id and correct structure
    if (session && (session as any).id && !(session as any).session_id) {
      // If session comes from a source with 'id' instead of 'session_id'
      session = {
        ...session,
        session_id: (session as any).id,
      };
      delete (session as any).id;
    }
    set({ currentSession: session, isLoading: true, messages: [] });
    
    if (session) {
      addLog(`Setting current session. ID: ${session.session_id}`);
      try {
        const history = await getSessionHistory(session.session_id);
        set({ messages: mapHistoryToMessages(history), isLoading: false });
        // Always set currentSession to ensure session_id is up to date
        set({ currentSession: { ...session, session_id: session.session_id } });
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
    const { addLog } = useDebugStore.getState();
    console.log("1. start handle sending");
    const { currentSession, currentChatflow, addMessage, updateMessage } = get();
    if (!currentChatflow) {
      get().setError("Cannot send message: No chatflow selected.");
      return;
    }

    // If no session, send with empty session_id and handle a new session in the stream
    let sessionId = currentSession?.session_id || '';
    addLog(`User sending message. Current session ID: ${sessionId || 'None (new session)'}`);
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
      streamEvents: [], // For history storage (token events only)
      liveEvents: [], // For real-time display (all events)
    };
    addMessage(assistantMessage);

    //console.log("3. disaplaying loading ui");
    set({ isStreaming: true, error: null });

    const onStreamEvent = (event: StreamEvent) => {
      const { addLog } = useDebugStore.getState();

      if (isNewSession && event.event === 'session_id' && event.data && typeof event.data === 'string') {
        sessionId = event.data;
        addLog(`Bot returned new session ID: ${sessionId}`);
        newSessionObj = {
          session_id: sessionId,
          chatflow_id: currentChatflow.id,
          topic: prompt.slice(0, 32) || 'New Chat',
          created_at: new Date().toISOString(),
        };
        
        set(state => {
          const filteredSessions = state.sessions.filter(s => s.session_id !== sessionId);
          return {
            currentSession: newSessionObj,
            sessions: [newSessionObj!, ...filteredSessions],
            messages: state.messages.map(m =>
              m.id === userMessage.id || m.id === assistantMessageId
                ? { ...m, session_id: sessionId }
                : m
            ),
          };
        });

        isNewSession = false;
        return;
      }

      // All other events are pushed to the liveEvents array for real-time display
      updateMessage(assistantMessageId, {
        liveEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.liveEvents || []), event],
      });

      if (event.event === 'token') {
        updateMessage(assistantMessageId, {
          content: get().messages.find(m => m.id === assistantMessageId)?.content + event.data,
        });
      }
    };

    const onStreamEnd = () => {
      const { addLog } = useDebugStore.getState();
      addLog('Stream ended.');
      const finalMessage = get().messages.find(m => m.id === assistantMessageId);
      if (finalMessage) {
        updateMessage(assistantMessageId, {
          isStreaming: false,
        });
      }
      set({ isStreaming: false });
    };

    const onError = (error: Error) => {
      const { addLog } = useDebugStore.getState();
      addLog(`Stream error: ${error.message}`);
      updateMessage(assistantMessageId, {
        isStreaming: false,
        error: error.message,
      });
      set({ isStreaming: false, error: error.message });
    };

    streamChatAndStore(currentChatflow.id, prompt, sessionId, onStreamEvent, onStreamEnd, onError);
  },

  setError: (error) => set({ error }),
}));