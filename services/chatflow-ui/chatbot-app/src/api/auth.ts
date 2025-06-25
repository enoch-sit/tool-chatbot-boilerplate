// src/api/auth.ts
import { LoginCredentials, LoginResponse } from '../types/auth';

const API_BASE_URL = process.env.REACT_APP_FLOWISE_PROXY_API_URL || 'http://localhost:8000';

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

export const refreshToken = async (token: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: token }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Token refresh failed: ${response.status}`);
  }

  return response.json();
};