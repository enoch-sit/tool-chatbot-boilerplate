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

// src/store/adminStore.ts
import { create } from 'zustand';
import {
  getAllChatflows,
  getChatflowStats,
  getSpecificChatflow,
  getChatflowUsers,
} from '../api/admin';
import { Chatflow, ChatflowStats } from '../types/chat';
import { User } from '../types/auth';

interface AdminState {
  chatflows: Chatflow[];
  stats: ChatflowStats | null;
  selectedChatflow: Chatflow | null;
  chatflowUsers: User[];
  isLoading: boolean;
  error: string | null;
}

interface AdminActions {
  fetchChatflows: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchChatflowDetails: (id: string) => Promise<void>;
  fetchChatflowUsers: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState & AdminActions>((set) => ({
  // Initial state
  chatflows: [],
  stats: null,
  selectedChatflow: null,
  chatflowUsers: [],
  isLoading: false,
  error: null,

  // Actions
  fetchChatflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const chatflows = await getAllChatflows();
      set({ chatflows, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chatflows';
      set({ isLoading: false, error: errorMessage });
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await getChatflowStats();
      set({ stats, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
      set({ isLoading: false, error: errorMessage });
    }
  },

  fetchChatflowDetails: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const chatflow = await getSpecificChatflow(id);
      set({ selectedChatflow: chatflow, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chatflow details';
      set({ isLoading: false, error: errorMessage });
    }
  },

  fetchChatflowUsers: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await getChatflowUsers(id);
      set({ chatflowUsers: users, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chatflow users';
      set({ isLoading: false, error: errorMessage });
    }
  },

  clearError: () => set({ error: null }),
}));