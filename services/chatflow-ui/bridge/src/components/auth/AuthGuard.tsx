// src/components/auth/AuthGuard.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getCurrentUser } from '../../api/user';

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