// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL,API_TIMEOUT } from './config';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT, // almost never
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        await useAuthStore.getState().refreshToken();
        
        // Retry the original request with new token
        const tokens = useAuthStore.getState().tokens;
        if (tokens?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;