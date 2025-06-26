// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  login as apiLogin,
  refreshToken as apiRefreshToken,
} from '../api/auth';
import type { AuthState, LoginCredentials, User, AuthTokens, LoginResponse } from '../types/auth';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
  iat: number;
  username: string;
  role: User['role'];
  permissions: string[];
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuthStatus: () => void;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: User['role']) => boolean;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const transformLoginResponse = (data: LoginResponse): { user: User; tokens: AuthTokens } => {
    const { access_token, refresh_token, expires_in, token_type, user } = data;

    const tokens: AuthTokens = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        tokenType: token_type as 'Bearer',
    };

    return { user, tokens };
};


export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const data = await apiLogin(credentials);
          const { user, tokens } = transformLoginResponse(data);
          
          set({ user, tokens, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Login failed', isLoading: false });
          throw error;
        }
      },
      logout: () => {
        set(initialState);
        // Persist middleware will clear storage
        // Optionally, remove tokens from localStorage/sessionStorage if used
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      },
      refreshToken: async () => {
        set({ isLoading: true, error: null });
        const { tokens } = get();
        if (!tokens?.refreshToken) {
          set({ isLoading: false, error: 'No refresh token available.' });
          get().logout();
          throw new Error('No refresh token available.');
        }
        try {
          const data = await apiRefreshToken(tokens.refreshToken);
          const { user, tokens: newTokens } = transformLoginResponse(data);
          set({ user, tokens: newTokens, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Token refresh failed', isLoading: false });
          get().logout(); // Logout if refresh fails
          throw error;
        }
      },
      checkAuthStatus: () => {
        const { tokens } = get();
        if (tokens?.accessToken) {
          try {
            const decoded: DecodedToken = jwtDecode(tokens.accessToken);
            if (decoded.exp * 1000 < Date.now()) {
              // Token expired, try to refresh
              get().refreshToken().catch(() => {
                // If refresh fails, the refreshToken action will log out
              });
            } else {
              set({ isAuthenticated: true });
            }
          } catch (error) {
            // Error decoding, treat as logged out
            get().logout();
          }
        }
      },
      clearError: () => set({ error: null }),
      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions?.includes(permission) ?? false;
      },
      hasRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ tokens: state.tokens, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

