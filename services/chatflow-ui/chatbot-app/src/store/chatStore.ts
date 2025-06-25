// src/store/chatStore.ts
import { create } from 'zustand';
import { streamChatResponse, createSession, getChatflows, getUserSessions, getSessionHistory } from '../api';
import { useAuthStore } from './authStore';
import { parseMixedContent } from '../utils/contentParser';
import { StreamProcessor } from '../utils/streamParser';

// [UPDATED] New block-based structure for flexible content rendering
export type ContentBlock = {
  type: 'text' | 'mermaid' | 'mindmap' | 'code' | 'image';
  content: string;
  language?: string; // For code block syntax highlighting
};

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: ContentBlock[]; // [UPDATED] Changed from string to ContentBlock[]
  timestamp: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
};

export type ChatSession = {
  session_id: string;
  chatflow_id: string;
  topic: string;
  created_at: string;
  first_message?: string;
};

export type Chatflow = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  deployed: boolean;
  is_public: boolean;
};

interface ChatState {
  // State
  messages: Message[];
  sessions: ChatSession[];
  chatflows: Chatflow[];
  currentSession: ChatSession | null;
  currentChatflow: Chatflow | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setCurrentSession: (session: ChatSession | null) => Promise<void>;
  setCurrentChatflow: (chatflow: Chatflow | null) => void;
  createNewSession: (chatflowId: string, topic: string) => Promise<ChatSession>;
  loadChatflows: () => Promise<void>;
  loadSessions: () => Promise<void>;
  streamAssistantResponse: (prompt: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  sessions: [],
  chatflows: [],
  currentSession: null,
  currentChatflow: null,
  isLoading: false,
  isStreaming: false,
  error: null,

  // Actions
  addMessage: (message) => 
    set((state) => ({ 
      messages: [...state.messages, message] 
    })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    })),

  clearMessages: () => set({ messages: [] }),

  setCurrentSession: async (session) => {
    set({ currentSession: session, isLoading: true, messages: [] });
    if (session) {
      try {
        const history = await getSessionHistory(session.session_id);
        const formattedMessages = history.map((item: any) => ({
          id: item.id || item.messageId,
          role: item.role,
          content: item.content,
          timestamp: new Date(item.created_at),
          sessionId: session.session_id
        }));
        set({ messages: formattedMessages, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load session history';
        set({ error: errorMessage, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  setCurrentChatflow: (chatflow) => set({ currentChatflow: chatflow }),

  createNewSession: async (chatflowId, topic) => {
    set({ isLoading: true, error: null });
    try {
      const session = await createSession(chatflowId, topic);
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSession: session,
        isLoading: false,
      }));
      get().clearMessages();
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  loadChatflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const chatflows = await getChatflows();
      set({ chatflows, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chatflows';
      set({ error: errorMessage, isLoading: false });
    }
  },

  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessionData = await getUserSessions();
      set({ sessions: sessionData.sessions, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
      set({ error: errorMessage, isLoading: false });
    }
  },

  streamAssistantResponse: async (prompt: string) => {
    const { currentSession, currentChatflow, addMessage, updateMessage, messages } = get();
    const { tokens } = useAuthStore.getState();

    if (!tokens?.accessToken) throw new Error('No authentication token available');
    if (!currentSession || !currentChatflow) throw new Error('No active session or chatflow selected');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: [{ type: 'text', content: prompt }],
      timestamp: new Date(),
      sessionId: currentSession.session_id,
    };
    addMessage(userMessage);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: [], // Start with empty content
      timestamp: new Date(),
      sessionId: currentSession.session_id,
      metadata: { streamEnded: false },
    };
    addMessage(assistantMessage);

    set({ isStreaming: true, error: null });

    try {
      const stream = await streamChatResponse({
        question: prompt,
        sessionId: currentSession.session_id,
        chatflow_id: currentChatflow.id,
      });

      let accumulatedContent = '';

      for await (const event of StreamProcessor(stream)) {
        switch (event.event) {
          case 'start':
            console.log('Stream started');
            break;
          
          case 'chunk':
            accumulatedContent += event.data;
            const contentBlocks = parseMixedContent(accumulatedContent);
            updateMessage(assistantMessageId, { content: contentBlocks });
            break;

          case 'end':
            // Final parse to ensure all content is captured
            const finalContentBlocks = parseMixedContent(accumulatedContent);
            updateMessage(assistantMessageId, { 
              content: finalContentBlocks,
              metadata: { 
                ...(messages.find(m => m.id === assistantMessageId)?.metadata || {}), 
                streamEnded: true 
              } 
            });
            console.log('Stream ended');
            break;
            
          case 'error':
            throw new Error(event.data);

          default:
            // This can handle other custom events like 'tool_start', 'tool_end', etc.
            console.warn('Unhandled stream event:', event);
            // You might want to update the message metadata with these events
            updateMessage(assistantMessageId, {
              metadata: {
                ...(messages.find(m => m.id === assistantMessageId)?.metadata || {}),
                lastEvent: event,
              }
            });
            break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      updateMessage(assistantMessageId, {
        content: [{ type: 'text', content: `Error: ${errorMessage}` }],
      });
      set({ error: errorMessage });
    } finally {
      set({ isStreaming: false });
    }
  },

  setError: (error) => set({ error }),
}));