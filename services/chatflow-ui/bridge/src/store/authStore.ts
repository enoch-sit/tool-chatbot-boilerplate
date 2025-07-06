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
  // Remove permissions from JWT since we'll derive them from roles
}

interface AuthActions {
  setUser: (user: User) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuthStatus: () => void;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: User['role'] | User['role'][]) => boolean;
  getUserPermissions: () => string[];
}

// Define role-based permissions
const ROLE_PERMISSIONS: Record<User['role'], string[]> = {
  admin: [
    'manage_users',
    'manage_chatflows',
    'view_analytics',
    'sync_chatflows',
    'access_admin_panel',
    'view_all_sessions',
    'view_all_messages',
    'manage_system_settings',
  ],
  supervisor: [
    'manage_users',
    'manage_chatflows',
    'view_analytics',
    'access_admin_panel',
    'view_all_sessions',
    'view_all_messages',
  ],
  enduser: [
    'create_sessions',
    'send_messages',
    'view_own_sessions',
  ],
  user: [
    'create_sessions',
    'send_messages',
    'view_own_sessions',
  ],
};

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

  // Derive permissions from role
  const permissions = ROLE_PERMISSIONS[user?.role] || ROLE_PERMISSIONS.user;
  
  const enrichedUser: User = {
    ...user,
    permissions,
  };

  return { user: enrichedUser, tokens };
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setUser: (user) => {
        // Re-derive permissions from role in case they changed
        const permissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.user;
        const enrichedUser = { ...user, permissions };
        set({ user: enrichedUser, isAuthenticated: true });
      },
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
          get().logout();
          throw error;
        }
      },
      checkAuthStatus: () => {
        const { tokens } = get();
        if (tokens?.accessToken) {
          try {
            const decoded: DecodedToken = jwtDecode(tokens.accessToken);
            if (decoded.exp * 1000 < Date.now()) {
              get().refreshToken().catch(() => {
                // If refresh fails, the refreshToken action will log out
              });
            } else {
              // Re-derive permissions from role in case they changed
              const { user } = get();
              if (user) {
                const permissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.user;
                set({ 
                  user: { ...user, permissions },
                  isAuthenticated: true 
                });
              }
            }
          } catch {
            get().logout();
          }
        }
      },
      clearError: () => set({ error: null }),
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        
        // Get permissions based on role
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        return rolePermissions.includes(permission);
      },
      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        if (Array.isArray(role)) {
          return role.includes(user.role);
        }
        return user.role === role;
      },
      getUserPermissions: () => {
        const { user } = get();
        if (!user) return [];
        return ROLE_PERMISSIONS[user.role] || [];
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ tokens: state.tokens, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);