// src/store/chatStoimport type { FileUploadData } from '@/services/fileService';e.ts

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
import type { FileUploadData } from '../services/fileService';

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
  streamAssistantResponse: (prompt: string, file_ids?: FileUploadData[]) => Promise<void>; // The core action to send a prompt and handle the streamed response.
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
        const messages = mapHistoryToMessages(history);
        set({ messages: messages, isLoading: false });
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
  streamAssistantResponse: async (prompt: string, file_data?: FileUploadData[]) => {
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
      uploads: file_data ? file_data.map(file => ({
        file_id: file.id,
        name: file.name,
        mime: file.type,
        size: file.size,
        is_image: file.type.startsWith('image/'),
        url: file.data, // Use base64 data as URL
        download_url: file.data,
        thumbnail_url: file.data,
        thumbnail_small: file.data,
        thumbnail_medium: file.data,
      })) : undefined,
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

    let accumulatedContent = '';
    const accumulatedTokenEvents: StreamEvent[] = [];

    const onStreamEvent = (event: StreamEvent) => {
      const { addLog } = useDebugStore.getState();
      // console.log("🎬 Stream event received:", event.event, event.data);
      //console.log("2. get first stream", event);
      // Handle session_id event for new session
      if (isNewSession && event.event === 'session_id' && event.data && typeof event.data === 'string') {
        //console.log("get token get session id");
        sessionId = event.data;
        addLog(`Bot returned new session ID: ${sessionId}`);
        // Create new session object
        newSessionObj = {
          session_id: sessionId,
          chatflow_id: currentChatflow.id,
          topic: prompt.slice(0, 32) || 'New Chat',
          created_at: new Date().toISOString(),
        };
        
        // Atomically update all relevant state in a single operation
        set(state => {
          // Find any existing session with the same ID to prevent duplicates
          const filteredSessions = state.sessions.filter(s => s.session_id !== sessionId);
          
          return {
            currentSession: newSessionObj,
            sessions: [newSessionObj!, ...filteredSessions],
            // Back-fill the session_id for the user and assistant messages
            messages: state.messages.map(m =>
              m.id === userMessage.id || m.id === assistantMessageId
                ? { ...m, session_id: sessionId }
                : m
            ),
          };
        });

        isNewSession = false; // Prevent this block from running again for this stream
      }
      // Also handle metadata event for sessionId (robustness)
      if (isNewSession && event.event === 'metadata' && event.data && typeof event.data === 'object') {
        const data = event.data as Record<string, unknown>;
        if (data.sessionId && typeof data.sessionId === 'string') {
          console.log("get token get session id from metadata");
          sessionId = data.sessionId;
          addLog(`Bot returned new session ID from metadata: ${sessionId}`);
          // Create new session object
          newSessionObj = {
            session_id: sessionId,
            chatflow_id: currentChatflow.id,
            topic: prompt.slice(0, 32) || 'New Chat',
            created_at: new Date().toISOString(),
          };
          
          // Atomically update all relevant state in a single operation
          set(state => {
            // Find any existing session with the same ID to prevent duplicates
            const filteredSessions = state.sessions.filter(s => s.session_id !== sessionId);
          
          return {
            currentSession: newSessionObj,
            sessions: [newSessionObj!, ...filteredSessions],
            // Back-fill the session_id for the user and assistant messages
            messages: state.messages.map(m =>
              m.id === userMessage.id || m.id === assistantMessageId
                ? { ...m, session_id: sessionId }
                : m
            ),
          };
        });

        isNewSession = false; // Prevent this block from running again for this stream
        }
      }

      if (event.event === 'content' && event.data?.content) {
        accumulatedContent += event.data.content;
        updateMessage(assistantMessageId, {
          content: accumulatedContent,
          timeMetadata: event.data.timeMetadata,
          // Store content events in history (they contain the actual response)
          streamEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.streamEvents || []), event],
          liveEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.liveEvents || []), event]
        });
      } else if (event.event === 'token' && typeof event.data === 'string') {
        accumulatedContent += event.data;
        accumulatedTokenEvents.push(event);
        updateMessage(assistantMessageId, {
          content: accumulatedContent,
          // Store token events in history (they contain the actual response)
          streamEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.streamEvents || []), event],
          liveEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.liveEvents || []), event]
        });
      } else if (
        event.event === 'agentFlowEvent' ||
        event.event === 'nextAgentFlow' ||
        event.event === 'agentFlowExecutedData' ||
        event.event === 'calledTools'
      ) {
        // Show these events in real-time UI but don't store in history
        updateMessage(assistantMessageId, {
          // Don't add to streamEvents (history) - only to liveEvents (real-time display)
          liveEvents: [...(get().messages.find(m => m.id === assistantMessageId)?.liveEvents || []), event]
        });
      } else if (event.event === 'end') {
        updateMessage(assistantMessageId, {
          isStreaming: false
        });
        set({ isStreaming: false });
      }
    };

    const onError = (error: Error) => {
      // console.error('🚨 Stream error:', error);
      // console.error('🚨 Error stack:', error.stack);
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
        onError,
        file_data
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
  setError: (error: string | null) => set({ error }),
}));