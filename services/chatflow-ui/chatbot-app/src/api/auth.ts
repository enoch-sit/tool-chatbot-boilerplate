 
// src/api/auth.ts
import { LoginCredentials, LoginResponse } from '../types/auth';

const API_BASE_URL = process.env.FLOWISE_PROXY_API_URL || 'http://localhost:8000';

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