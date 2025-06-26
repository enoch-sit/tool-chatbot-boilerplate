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