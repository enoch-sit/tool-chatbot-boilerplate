

# Comprehensive Guide: React TypeScript Chatbot with MUI Joy UI and Enhanced Authentication

This guide combines the modern architecture from the Gemini guide with the comprehensive authentication system from the Grok guide, creating a robust chatbot application with advanced features. This updated version incorporates all functionalities tested in the provided Python scripts, including chatflow synchronization, statistics, session history, user credit management, and bulk user assignments.

## Table of Contents
1. [Project Setup](#1-project-setup)
2. [Enhanced Authentication System](#2-enhanced-authentication-system)
3. [State Management with Zustand + Auth](#3-state-management-with-zustand--auth)
4. [Theme & Internationalization](#4-theme--internationalization)
5. [API Layer with Authentication](#5-api-layer-with-authentication)
6. [Protected Routes & Authorization](#6-protected-routes--authorization)
7. [Chat Interface with Auth](#7-chat-interface-with-auth)
8. [Admin Interface](#8-admin-interface)
9. [Testing with MSW](#9-testing-with-msw)

---

## 1. Project Setup

### 1.1. Initialize Project

```bash
npx create-react-app chatbot-app --template typescript
cd chatbot-app
```

### 1.2. Install Dependencies

```bash
# Core dependencies
npm install @mui/joy @emotion/react @emotion/styled
npm install react-router-dom zustand axios
npm install react-i18next i18next i18next-browser-languagedetector
npm install markdown-to-jsx mermaid prismjs
npm install @fontsource/inter

# Development dependencies
npm install -D @types/prismjs @types/react-router-dom
npm install -D msw jest @types/jest @testing-library/react @testing-library/jest-dom
```

### 1.3. Project Structure

```
src/
├── api/                     # API layer with authentication
│   ├── index.ts
│   ├── auth.ts
│   └── index.test.ts
├── components/              # Reusable components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── AuthGuard.tsx
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── ChatInput.tsx
│   │   └── MessageBubble.tsx
│   ├── renderers/
│   │   ├── CodeBlock.tsx
│   │   ├── MermaidDiagram.tsx
│   │   └── MindMap.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── ThemeToggleButton.tsx
│   └── LanguageSelector.tsx
├── hooks/                   # Custom hooks
│   ├── useAuth.ts
│   ├── useLocalStorage.ts
│   └── usePermissions.ts
├── locales/                 # i18n files
│   ├── en/translation.json
│   ├── zh-Hant/translation.json
│   └── zh-Hans/translation.json
├── mocks/                   # MSW setup
│   ├── browser.ts
│   ├── server.ts
│   └── handlers.ts
├── pages/                   # Page components
│   ├── LoginPage.tsx
│   ├── ChatPage.tsx
│   ├── AdminPage.tsx
│   └── DashboardPage.tsx
├── store/                   # Zustand stores
│   ├── authStore.ts
│   ├── chatStore.ts
│   ├── adminStore.ts
│   └── index.ts
├── types/                   # TypeScript definitions
│   ├── auth.ts
│   ├── chat.ts
│   └── api.ts
├── utils/                   # Utility functions
│   ├── auth.ts
│   ├── storage.ts
│   └── permissions.ts
├── App.tsx
├── index.tsx
└── i18n.ts
```

---

## 2. Enhanced Authentication System

### 2.1. TypeScript Definitions

```typescript
// src/types/auth.ts
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'supervisor' | 'enduser';
  permissions: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  user: User;
  role?: string;
}
```

### 2.2. Authentication Store with Zustand

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, AuthTokens, LoginCredentials } from '../types/auth';
import { login as apiLogin, logout as apiLogout, refreshToken as apiRefreshToken } from '../api/auth';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  clearError: () => void;
  checkAuthStatus: () => boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiLogin(credentials);
          
          const tokens: AuthTokens = {
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiresIn: response.expires_in,
            tokenType: response.token_type as 'Bearer',
          };

          const user: User = {
            ...response.user,
            role: response.role || response.user.role,
          };

          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Set auth header for future requests
          if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', response.access_token);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        // Clear stored token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
        }

        // Call API logout if needed
        apiLogout().catch(console.error);
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await apiRefreshToken(tokens.refreshToken);
          const newTokens: AuthTokens = {
            accessToken: response.access_token,
            refreshToken: response.refresh_token || tokens.refreshToken,
            expiresIn: response.expires_in,
            tokenType: response.token_type as 'Bearer',
          };

          set({ tokens: newTokens });

          if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', response.access_token);
          }
        } catch (error) {
          // Refresh failed, logout user
          get().logout();
          throw error;
        }
      },

      setUser: (user: User) => set({ user }),

      setTokens: (tokens: AuthTokens) => set({ tokens }),

      clearError: () => set({ error: null }),

      checkAuthStatus: () => {
        const { tokens, user } = get();
        return !!(tokens?.accessToken && user);
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      },

      hasRole: (role: string | string[]) => {
        const { user } = get();
        if (!user?.role) return false;
        
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### 2.3. Authentication API Layer

```typescript
// src/api/auth.ts
import { LoginCredentials, LoginResponse } from '../types/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Auth API functions
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Authentication failed: ${response.status}`);
  }

  return response.json();
};

export const logout = async (): Promise<void> => {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.warn('Logout API call failed:', error);
  }
};

export const refreshToken = async (refreshToken: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return response.json();
};

export const getCurrentUser = async (): Promise<any> => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('No token available');

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get current user');
  }

  return response.json();
};
```

### 2.4. Custom Authentication Hooks

```typescript
// src/hooks/useAuth.ts
import { useAuthStore } from '../store/authStore';
import { useCallback } from 'react';

export const useAuth = () => {
  const store = useAuthStore();

  const loginWithCredentials = useCallback(async (username: string, password: string) => {
    return store.login({ username, password });
  }, [store.login]);

  return {
    // State
    user: store.user,
    tokens: store.tokens,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    login: loginWithCredentials,
    logout: store.logout,
    refreshToken: store.refreshToken,
    clearError: store.clearError,

    // Utilities
    checkAuthStatus: store.checkAuthStatus,
    hasPermission: store.hasPermission,
    hasRole: store.hasRole,
  };
};

// src/hooks/usePermissions.ts
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, hasPermission, hasRole } = useAuth();

  const canAccessAdmin = () => hasRole(['admin', 'supervisor']);
  const canManageUsers = () => hasPermission('manage_users');
  const canManageChatflows = () => hasPermission('manage_chatflows');
  const canViewAnalytics = () => hasPermission('view_analytics');

  return {
    user,
    hasPermission,
    hasRole,
    canAccessAdmin,
    canManageUsers,
    canManageChatflows,
    canViewAnalytics,
  };
};
```

---

## 3. State Management with Zustand + Auth

### 3.1. Enhanced Chat Store with Authentication

```typescript
// src/store/chatStore.ts
import { create } from 'zustand';
import { streamChatResponse, createSession, getChatflows, getUserSessions, getSessionHistory } from '../api';
import { useAuthStore } from './authStore';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'mermaid' | 'mindmap' | 'code';
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
    const { currentSession, currentChatflow, addMessage, updateMessage } = get();
    const { tokens } = useAuthStore.getState();

    if (!tokens?.accessToken) throw new Error('No authentication token available');
    if (!currentSession || !currentChatflow) throw new Error('No active session or chatflow selected');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      sessionId: currentSession.session_id,
    };
    addMessage(userMessage);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sessionId: currentSession.session_id,
    };
    addMessage(assistantMessage);

    set({ isStreaming: true, error: null });

    try {
      const stream = await streamChatResponse({
        question: prompt,
        sessionId: currentSession.session_id,
        chatflow_id: currentChatflow.id,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        content += decoder.decode(value, { stream: true });
        updateMessage(assistantMessage.id, { content });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      updateMessage(assistantMessage.id, { 
        content: `Error: ${errorMessage}`,
        type: 'text'
      });
      set({ error: errorMessage });
    } finally {
      set({ isStreaming: false });
    }
  },

  setError: (error) => set({ error }),
}));
```

### 3.2. Admin Store

```typescript
// src/store/adminStore.ts
import { create } from 'zustand';
import { 
  getAllChatflows, 
  assignUserToChatflow, 
  removeUserFromChatflow,
  getChatflowUsers,
  syncChatflows as apiSyncChatflows,
  bulkAssignUsersToChatflow
} from '../api';
import { useAuthStore } from './authStore';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  assigned_at?: string;
}

interface AdminChatflow {
  id: string;
  flowise_id: string;
  name: string;
  description?: string;
  deployed: boolean;
  is_public: boolean;
  users?: AdminUser[];
}

interface AdminState {
  chatflows: AdminChatflow[];
  selectedChatflow: AdminChatflow | null;
  chatflowUsers: AdminUser[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  loadAllChatflows: () => Promise<void>;
  syncChatflows: () => Promise<void>;
  selectChatflow: (chatflow: AdminChatflow | null) => void;
  loadChatflowUsers: (chatflowId: string) => Promise<void>;
  assignUser: (chatflowId: string, email: string) => Promise<void>;
  bulkAssignUsers: (chatflowId: string, emails: string[]) => Promise<void>;
  removeUser: (chatflowId: string, email: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  chatflows: [],
  selectedChatflow: null,
  chatflowUsers: [],
  isLoading: false,
  isSyncing: false,
  error: null,

  loadAllChatflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const chatflows = await getAllChatflows();
      set({ chatflows, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chatflows';
      set({ error: errorMessage, isLoading: false });
    }
  },

  syncChatflows: async () => {
    set({ isSyncing: true, error: null });
    try {
      await apiSyncChatflows();
      await get().loadAllChatflows(); // Reload chatflows after sync
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync chatflows';
      set({ error: errorMessage });
    } finally {
      set({ isSyncing: false });
    }
  },

  selectChatflow: (chatflow) => {
    set({ selectedChatflow: chatflow, chatflowUsers: [] });
    if (chatflow) {
      get().loadChatflowUsers(chatflow.id);
    }
  },

  loadChatflowUsers: async (chatflowId: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await getChatflowUsers(chatflowId);
      set({ chatflowUsers: users, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
      set({ error: errorMessage, isLoading: false });
    }
  },

  assignUser: async (chatflowId: string, email: string) => {
    set({ isLoading: true, error: null });
    try {
      await assignUserToChatflow(chatflowId, email);
      await get().loadChatflowUsers(chatflowId); // Reload users
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign user';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  bulkAssignUsers: async (chatflowId: string, emails: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await bulkAssignUsersToChatflow(chatflowId, emails);
      await get().loadChatflowUsers(chatflowId); // Reload users
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to bulk assign users';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeUser: async (chatflowId: string, email: string) => {
    set({ isLoading: true, error: null });
    try {
      await removeUserFromChatflow(chatflowId, email);
      await get().loadChatflowUsers(chatflowId); // Reload users
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove user';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setError: (error) => set({ error }),
}));
```

---

## 4. Theme & Internationalization

### 4.1. Theme Setup with Auth Context

```typescript
// src/App.tsx
import React, { useEffect } from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/joy/CssBaseline';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import './i18n';

function App() {
  const { checkAuthStatus, user } = useAuth();

  useEffect(() => {
    // Check authentication status on app start
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <Router>
      <CssVarsProvider defaultMode="system">
        <CssBaseline />
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <LoginPage />
            } 
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole={['admin', 'supervisor']}>
                <Layout>
                  <AdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </CssVarsProvider>
    </Router>
  );
}

export default App;
```

### 4.2. Enhanced i18n Configuration

```typescript
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'zh-Hant', 'zh-Hans'],
    fallbackLng: 'en',
    detection: {
      order: ['cookie', 'localStorage', 'htmlTag', 'path', 'subdomain'],
      caches: ['cookie', 'localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### 4.3. Translation Files with Auth Content

```json
// public/locales/en/translation.json
{
  "appTitle": "Advanced Chatbot",
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "username": "Username",
    "password": "Password",
    "loginButton": "Sign In",
    "loginError": "Login failed. Please check your credentials.",
    "logoutConfirm": "Are you sure you want to logout?",
    "welcome": "Welcome back",
    "unauthorized": "You don't have permission to access this page"
  },
  "dashboard": {
    "title": "Dashboard",
    "credits": "Your Credits",
    "noCredits": "N/A"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "chat": "Chat",
    "admin": "Administration",
    "profile": "Profile"
  },
  "chat": {
    "typeMessage": "Type a message...",
    "send": "Send",
    "newSession": "New Session",
    "selectChatflow": "Select a chatflow",
    "createSession": "Create Session",
    "sessionTopic": "Session topic",
    "noSessions": "No chat sessions yet",
    "loadingSessions": "Loading sessions...",
    "loadingHistory": "Loading chat history..."
  },
  "admin": {
    "pageTitle": "Admin Dashboard",
    "chatflowManagement": "Chatflow Management",
    "userManagement": "User Management",
    "assignUser": "Assign User",
    "bulkAssign": "Bulk Assign",
    "bulkAssignTooltip": "Assign multiple users by entering one email per line.",
    "removeUser": "Remove User",
    "userEmail": "User Email",
    "assignButton": "Assign",
    "removeButton": "Remove",
    "noUsers": "No users assigned to this chatflow",
    "assignSuccess": "User assigned successfully",
    "removeSuccess": "User removed successfully",
    "syncChatflows": "Sync Chatflows",
    "syncing": "Syncing...",
    "statsTitle": "Chatflow Statistics"
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "create": "Create",
    "refresh": "Refresh"
  }
}
```

---

## 5. API Layer with Authentication

### 5.1. Enhanced API Module with Auth Interceptors

```typescript
// src/api/index.ts
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Request interceptor to add auth token
const makeAuthenticatedRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const { tokens, refreshToken, logout } = useAuthStore.getState();
  
  if (!tokens?.accessToken) {
    throw new Error('No authentication token available');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens.accessToken}`,
    ...options.headers,
  };

  let response = await fetch(url, { ...options, headers });

  // Handle token expiration
  if (response.status === 401) {
    try {
      await refreshToken();
      const newTokens = useAuthStore.getState().tokens;
      if (newTokens?.accessToken) {
        const retryHeaders = { ...headers, 'Authorization': `Bearer ${newTokens.accessToken}` };
        response = await fetch(url, { ...options, headers: retryHeaders }); // Retry the request
      } else {
        throw new Error('Failed to get new token after refresh.');
      }
    } catch (refreshError) {
      logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
};

// API helper function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await makeAuthenticatedRequest(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `Request failed: ${response.status}`);
  }
  
  // Handle responses with no content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  // Assuming a successful response with no content is valid
  return Promise.resolve(null as T);
};

// Chat API functions
export interface ChatRequest {
  question: string;
  sessionId: string;
  chatflow_id: string;
}

export const getChatflows = async () => apiRequest('/api/v1/chatflows');

export const createSession = async (chatflowId: string, topic: string) => 
  apiRequest('/api/v1/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ chatflow_id: chatflowId, topic }),
  });

export const getUserSessions = async () => apiRequest('/api/v1/chat/sessions');

export const getSessionHistory = async (sessionId: string) => 
  apiRequest(`/api/v1/chat/sessions/${sessionId}/history`);

export const streamChatResponse = async (payload: ChatRequest): Promise<ReadableStream<Uint8Array>> => {
  const { tokens } = useAuthStore.getState();
  if (!tokens?.accessToken) throw new Error('No authentication token available');

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/predict/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Stream request failed: ${response.status}`);
  if (!response.body) throw new Error('Response body is null');
  return response.body;
};

export const getUserCredits = async () => apiRequest('/api/v1/chat/credits');

// Admin API functions
export const getAllChatflows = async () => apiRequest('/api/v1/admin/chatflows');

export const getSpecificChatflow = async (chatflowId: string) =>
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}`);

export const assignUserToChatflow = async (chatflowId: string, email: string) => 
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const bulkAssignUsersToChatflow = async (chatflowId: string, emails: string[]) =>
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users/bulk-add`, {
    method: 'POST',
    body: JSON.stringify({ emails }),
  });

export const getChatflowUsers = async (chatflowId: string) => 
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users`);

export const removeUserFromChatflow = async (chatflowId: string, email: string) => 
  apiRequest(`/api/v1/admin/chatflows/${chatflowId}/users`, {
    method: 'DELETE',
    body: JSON.stringify({ email }), // Body might not be needed depending on server impl
  });

export const syncChatflows = async () => 
  apiRequest('/api/v1/admin/chatflows/sync', { method: 'POST' });

export const getChatflowStats = async () => apiRequest('/api/v1/admin/chatflows/stats');

export const syncUserByEmail = async (email: string) =>
  apiRequest('/api/v1/admin/users/sync-by-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
```

---

## 6. Protected Routes & Authorization

### 6.1. Enhanced Protected Route Component

```typescript
// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/joy';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/login',
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography level="body-md">{t('common.loading')}</Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!hasRole(roles)) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 2,
            textAlign: 'center',
          }}
        >
          <Typography level="h4" color="danger">
            {t('auth.unauthorized')}
          </Typography>
          <Typography level="body-md">
            Required role: {roles.join(' or ')}
          </Typography>
          <Typography level="body-sm">
            Your role: {user.role}
          </Typography>
        </Box>
      );
    }
  }

  // Check permission requirements
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasRequiredPermission = permissions.some(permission => hasPermission(permission));
    
    if (!hasRequiredPermission) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 2,
            textAlign: 'center',
          }}
        >
          <Typography level="h4" color="danger">
            {t('auth.unauthorized')}
          </Typography>
          <Typography level="body-md">
            Required permission: {permissions.join(' or ')}
          </Typography>
        </Box>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### 6.2. Authentication Guard Component

```typescript
// src/components/auth/AuthGuard.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getCurrentUser } from '../../api/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { tokens, setUser, logout } = useAuth();

  useEffect(() => {
    const validateSession = async () => {
      if (tokens?.accessToken) {
        try {
          const user = await getCurrentUser();
          setUser(user);
        } catch (error) {
          console.error('Session validation failed:', error);
          logout();
        }
      }
    };

    validateSession();
  }, [tokens, setUser, logout]);

  return <>{children}</>;
};

export default AuthGuard;
```

---

## 7. Chat Interface with Auth

### 7.1. Enhanced Dashboard Page (with User Credits)

```typescript
// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/joy';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getUserCredits } from '../api';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        setIsLoading(true);
        const creditData = await getUserCredits();
        setCredits(creditData.totalCredits);
      } catch (error) {
        console.error("Failed to fetch user credits:", error);
        setCredits(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredits();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h2" sx={{ mb: 2 }}>
        {t('dashboard.title')}
      </Typography>
      <Typography sx={{ mb: 3 }}>
        {t('auth.welcome')}, {user?.username || 'User'}!
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Typography level="title-md">{t('dashboard.credits')}</Typography>
          <Typography level="h2" sx={{ mt: 1 }}>
            {isLoading ? (
              <CircularProgress size="sm" />
            ) : (
              credits !== null ? credits : t('dashboard.noCredits')
            )}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;
```

### 7.2. Enhanced Chat Page (with Session History)

```typescript
// src/pages/ChatPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Sheet,
  Typography,
  Button,
  Select,
  Option,
  Input,
  Modal,
  ModalDialog,
  ModalClose,
  Stack,
  Alert,
} from '@mui/joy';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/chatStore';
import { useAuth } from '../hooks/useAuth';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    chatflows,
    sessions,
    currentSession,
    currentChatflow,
    isLoading,
    error,
    loadChatflows,
    loadSessions,
    createNewSession,
    setCurrentChatflow,
    setCurrentSession,
    clearMessages,
    setError,
  } = useChatStore();

  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionTopic, setNewSessionTopic] = useState('');

  useEffect(() => {
    loadChatflows();
    loadSessions();
  }, [loadChatflows, loadSessions]);

  const handleChatflowChange = (
    event: React.SyntheticEvent | null,
    newValue: string | null
  ) => {
    if (newValue) {
      const selectedChatflow = chatflows.find(cf => cf.id === newValue);
      if (selectedChatflow) {
        setCurrentChatflow(selectedChatflow);
        setCurrentSession(null); // This will clear messages via the store action
      }
    }
  };

  const handleSessionChange = (
    event: React.SyntheticEvent | null,
    newValue: string | null
  ) => {
    if (newValue) {
      const selectedSession = sessions.find(s => s.session_id === newValue);
      if (selectedSession) {
        setCurrentSession(selectedSession); // This now loads history
      }
    }
  };

  const handleCreateSession = async () => {
    if (!currentChatflow || !newSessionTopic.trim()) return;
    try {
      await createNewSession(currentChatflow.id, newSessionTopic);
      setShowNewSessionModal(false);
      setNewSessionTopic('');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Sheet variant="outlined" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography level="h4" sx={{ flexGrow: 1 }}>{t('navigation.chat')}</Typography>
          <Typography level="body-sm" color="neutral">{t('auth.welcome')}, {user?.username}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Select placeholder={t('chat.selectChatflow')} value={currentChatflow?.id || ''} onChange={handleChatflowChange} startDecorator={<FolderIcon />} sx={{ minWidth: 200 }} disabled={isLoading}>
            {chatflows.map((chatflow) => (<Option key={chatflow.id} value={chatflow.id}>{chatflow.name}</Option>))}
          </Select>
          <Select placeholder={t('chat.selectSession', 'Select session')} value={currentSession?.session_id || ''} onChange={handleSessionChange} sx={{ minWidth: 200 }} disabled={!currentChatflow || isLoading}>
            {sessions.filter(s => s.chatflow_id === currentChatflow?.id).map((session) => (<Option key={session.session_id} value={session.session_id}>{session.topic}</Option>))}
          </Select>
          <Button startDecorator={<AddIcon />} onClick={() => setShowNewSessionModal(true)} disabled={!currentChatflow || isLoading}>{t('chat.newSession')}</Button>
        </Stack>
      </Sheet>

      {/* Error Alert */}
      {error && (<Alert color="danger" variant="soft" endDecorator={<Button size="sm" variant="plain" onClick={() => setError(null)}>{t('common.close')}</Button>} sx={{ m: 2 }}>{error}</Alert>)}

      {/* Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentSession ? (
          <>
            <MessageList />
            <ChatInput />
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Stack spacing={2}>
              <Typography level="h4" color="neutral">
                {currentChatflow ? t('chat.selectSessionPrompt', 'Select a session or create a new one') : t('chat.selectChatflowPrompt', 'Select a chatflow to start chatting')}
              </Typography>
              {currentChatflow && (<Button variant="outlined" startDecorator={<AddIcon />} onClick={() => setShowNewSessionModal(true)}>{t('chat.createSession')}</Button>)}
            </Stack>
          </Box>
        )}
      </Box>

      {/* New Session Modal */}
      <Modal open={showNewSessionModal} onClose={() => setShowNewSessionModal(false)}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>{t('chat.createSession')}</Typography>
          <Stack spacing={2}>
            <Typography level="body-md">Chatflow: {currentChatflow?.name}</Typography>
            <Input placeholder={t('chat.sessionTopic')} value={newSessionTopic} onChange={(e) => setNewSessionTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSessionTopic.trim()) { handleCreateSession(); } }} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="plain" onClick={() => setShowNewSessionModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreateSession} disabled={!newSessionTopic.trim() || isLoading}>{t('common.create', 'Create')}</Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default ChatPage;
```

---

## 8. Admin Interface

### 8.1. Enhanced Admin Page (with Sync, Stats, and Bulk Assign)

```typescript
// src/pages/AdminPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Sheet, Typography, Table, Button, Input, Modal, ModalDialog, ModalClose,
  Stack, Alert, Chip, IconButton, CircularProgress, Textarea, Tooltip
} from '@mui/joy';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, People as PeopleIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../store/adminStore';
import { usePermissions } from '../hooks/usePermissions';
import { getChatflowStats } from '../api';

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { canManageUsers, canManageChatflows } = usePermissions();
  
  const {
    chatflows, selectedChatflow, chatflowUsers, isLoading, isSyncing, error,
    loadAllChatflows, syncChatflows, selectChatflow, assignUser, bulkAssignUsers, removeUser, setError,
  } = useAdminStore();

  const [stats, setStats] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [bulkUserEmails, setBulkUserEmails] = useState('');

  const fetchStats = async () => {
    try {
      const data = await getChatflowStats();
      setStats(data);
    } catch (err) { console.error("Failed to fetch stats", err); }
  };

  useEffect(() => {
    if (canManageChatflows) {
      loadAllChatflows();
      fetchStats();
    }
  }, [loadAllChatflows, canManageChatflows]);

  const handleSync = async () => {
    await syncChatflows();
    await fetchStats(); // Refresh stats after sync
  };

  const handleAssignUser = async () => {
    if (!selectedChatflow || !userEmail.trim()) return;
    try {
      await assignUser(selectedChatflow.id, userEmail.trim());
      setShowAssignModal(false);
      setUserEmail('');
    } catch (err) { console.error('Failed to assign user:', err); }
  };

  const handleBulkAssign = async () => {
    if (!selectedChatflow || !bulkUserEmails.trim()) return;
    const emails = bulkUserEmails.split('\n').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    try {
      await bulkAssignUsers(selectedChatflow.id, emails);
      setShowBulkAssignModal(false);
      setBulkUserEmails('');
    } catch (err) { console.error('Failed to bulk assign users:', err); }
  };

  if (!canManageChatflows && !canManageUsers) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography level="h4" color="danger">{t('auth.unauthorized')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography level="h2">{t('admin.pageTitle')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button startDecorator={isSyncing ? <CircularProgress size="sm" /> : <RefreshIcon />} variant="outlined" onClick={handleSync} disabled={isSyncing || isLoading}>
            {isSyncing ? t('admin.syncing') : t('admin.syncChatflows')}
          </Button>
        </Stack>
      </Stack>

      {error && (<Alert color="danger" variant="soft" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>)}

      {stats && (
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
          <Typography level="h4" sx={{ mb: 2 }}>{t('admin.statsTitle')}</Typography>
          <Stack direction="row" spacing={4}>
            <Box> <Typography level="title-lg">{stats.total}</Typography> <Typography>Total</Typography> </Box>
            <Box> <Typography level="title-lg" color="success">{stats.active}</Typography> <Typography>Active</Typography> </Box>
            <Box> <Typography level="title-lg" color="neutral">{stats.deleted}</Typography> <Typography>Deleted</Typography> </Box>
            <Box> <Typography level="title-lg" color="danger">{stats.error}</Typography> <Typography>Errors</Typography> </Box>
          </Stack>
        </Sheet>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Sheet variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 'md' }}>
          <Typography level="h4" sx={{ mb: 2 }}>{t('admin.chatflowManagement')}</Typography>
          <Table hoverRow>
            <thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {chatflows.map((cf) => (
                <tr key={cf.id} style={{ backgroundColor: selectedChatflow?.id === cf.id ? 'var(--joy-palette-primary-50)' : 'transparent' }}>
                  <td><Typography level="body-md">{cf.name}</Typography></td>
                  <td>
                    <Stack direction="row" spacing={1}>
                      <Chip color={cf.deployed ? 'success' : 'neutral'} size="sm">{cf.deployed ? 'Deployed' : 'Not Deployed'}</Chip>
                      {cf.is_public && <Chip color="primary" size="sm">Public</Chip>}
                    </Stack>
                  </td>
                  <td><Button size="sm" variant={selectedChatflow?.id === cf.id ? 'solid' : 'outlined'} onClick={() => selectChatflow(cf)}>Select</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Sheet>

        <Sheet variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 'md' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography level="h4">{t('admin.userManagement')}</Typography>
            {selectedChatflow && canManageUsers && (
              <Stack direction="row" spacing={1}>
                <Button startDecorator={<AddIcon />} size="sm" onClick={() => setShowAssignModal(true)} disabled={isLoading}>{t('admin.assignUser')}</Button>
                <Button startDecorator={<PeopleIcon />} size="sm" onClick={() => setShowBulkAssignModal(true)} disabled={isLoading}>{t('admin.bulkAssign')}</Button>
              </Stack>
            )}
          </Stack>
          {!selectedChatflow ? (<Typography color="neutral">{t('admin.selectChatflow', 'Select a chatflow to manage users')}</Typography>) : (
            <Table>
              <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {chatflowUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td><td>{u.email}</td>
                    <td><Chip size="sm">{u.role}</Chip></td>
                    <td><IconButton size="sm" color="danger" onClick={() => removeUser(selectedChatflow.id, u.email)} disabled={isLoading}><DeleteIcon /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Sheet>
      </Stack>

      {/* Assign User Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <ModalDialog><ModalClose /><Typography level="h4" sx={{ mb: 2 }}>{t('admin.assignUser')}</Typography>
          <Stack spacing={2}>
            <Typography>Chatflow: {selectedChatflow?.name}</Typography>
            <Input placeholder={t('admin.userEmail')} value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="plain" onClick={() => setShowAssignModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleAssignUser} disabled={!userEmail.trim() || isLoading}>{t('admin.assignButton')}</Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Bulk Assign User Modal */}
      <Modal open={showBulkAssignModal} onClose={() => setShowBulkAssignModal(false)}>
        <ModalDialog><ModalClose /><Typography level="h4" sx={{ mb: 2 }}>{t('admin.bulkAssign')}</Typography>
          <Stack spacing={2}>
            <Typography>Chatflow: {selectedChatflow?.name}</Typography>
            <Tooltip title={t('admin.bulkAssignTooltip')} variant="outlined">
              <Textarea placeholder="user1@example.com\nuser2@example.com" minRows={4} value={bulkUserEmails} onChange={(e) => setBulkUserEmails(e.target.value)} />
            </Tooltip>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="plain" onClick={() => setShowBulkAssignModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleBulkAssign} disabled={!bulkUserEmails.trim() || isLoading}>{t('admin.assignButton')}</Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminPage;
```

---

## 9. Testing with MSW

### 9.1. Enhanced MSW Handlers with Auth

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

const API_BASE_URL = 'http://localhost:8000';

export const handlers = [
  // Auth
  rest.post(`${API_BASE_URL}/api/v1/chat/authenticate`, (req, res, ctx) => {
    const { username } = req.body as any;
    if (username === 'admin') {
      return res(ctx.status(200), ctx.json({
        access_token: 'mock-admin-token', user: { id: '1', username: 'admin', role: 'admin', permissions: ['manage_users', 'manage_chatflows'] }
      }));
    }
    return res(ctx.status(200), ctx.json({
      access_token: 'mock-user-token', user: { id: '2', username: 'user1', role: 'enduser', permissions: ['chat'] }
    }));
  }),
  rest.get(`${API_BASE_URL}/api/v1/auth/me`, (req, res, ctx) => res(ctx.status(200), ctx.json({ id: '1', username: 'admin' }))),

  // User-facing Chat
  rest.get(`${API_BASE_URL}/api/v1/chatflows`, (req, res, ctx) => res(ctx.status(200), ctx.json([{ id: 'cf-1', name: 'General Assistant' }]))),
  rest.get(`${API_BASE_URL}/api/v1/chat/sessions`, (req, res, ctx) => res(ctx.status(200), ctx.json({ sessions: [{ session_id: 'sess-1', chatflow_id: 'cf-1', topic: 'Test Topic' }], count: 1 }))),
  rest.post(`${API_BASE_URL}/api/v1/chat/sessions`, (req, res, ctx) => res(ctx.status(201), ctx.json({ session_id: `sess-${Date.now()}` }))),
  rest.get(`${API_BASE_URL}/api/v1/chat/sessions/:id/history`, (req, res, ctx) => res(ctx.status(200), ctx.json({ history: [{id: 'msg-1', role: 'user', content: 'Hello', created_at: new Date().toISOString()}], count: 1 }))),
  rest.get(`${API_BASE_URL}/api/v1/chat/credits`, (req, res, ctx) => res(ctx.status(200), ctx.json({ totalCredits: 499 }))),
  rest.post(`${API_BASE_URL}/api/v1/chat/predict/stream`, (req, res, ctx) => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('Stream response chunk.')); controller.close(); } });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });
  }),

  // Admin
  rest.get(`${API_BASE_URL}/api/v1/admin/chatflows`, (req, res, ctx) => res(ctx.status(200), ctx.json([{ id: 'cf-1', name: 'General Assistant', deployed: true, is_public: false }]))),
  rest.post(`${API_BASE_URL}/api/v1/admin/chatflows/sync`, (req, res, ctx) => res(ctx.status(200), ctx.json({ message: 'Sync successful' }))),
  rest.get(`${API_BASE_URL}/api/v1/admin/chatflows/stats`, (req, res, ctx) => res(ctx.status(200), ctx.json({ total: 10, active: 8, deleted: 2, error: 0 }))),
  rest.get(`${API_BASE_URL}/api/v1/admin/chatflows/:id/users`, (req, res, ctx) => res(ctx.status(200), ctx.json([{ id: 'user-2', username: 'user1', email: 'user1@example.com', role: 'enduser' }]))),
  rest.post(`${API_BASE_URL}/api/v1/admin/chatflows/:id/users`, (req, res, ctx) => res(ctx.status(200), ctx.json({ message: 'User assigned' }))),
  rest.post(`${API_BASE_URL}/api/v1/admin/chatflows/:id/users/bulk-add`, (req, res, ctx) => res(ctx.status(200), ctx.json({ successful_assignments: 1, failed_assignments: [] }))),
  rest.delete(`${API_BASE_URL}/api/v1/admin/chatflows/:id/users`, (req, res, ctx) => res(ctx.status(200), ctx.json({ message: 'User removed' }))),
];
```

---
