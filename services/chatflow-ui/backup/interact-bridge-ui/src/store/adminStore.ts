// src/store/adminStore.ts
import { create } from 'zustand';
import {
  getAllChatflows,
  getChatflowStats,
  getSpecificChatflow,
  getChatflowUsers,
  addUserToChatflow,
  removeUserFromChatflow,
} from '../api/admin';
import type { Chatflow, ChatflowUser, ChatflowStats } from '../types/chatflow';

interface AdminState {
  chatflows: Chatflow[];
  stats: ChatflowStats | null;
  selectedChatflow: Chatflow | null;
  chatflowUsers: ChatflowUser[];
  isLoading: boolean;
  error: string | null;
}

interface AdminActions {
  fetchChatflows: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchChatflowDetails: (flowiseId: string) => Promise<void>;
  fetchChatflowUsers: (flowiseId: string) => Promise<void>;
  addUserToChatflow: (flowiseId: string, userEmail: string) => Promise<void>;
  removeUserFromChatflow: (flowiseId: string, userEmail: string) => Promise<void>;
  bulkAddUsersToChatflow: (flowiseId: string, userEmails: string[]) => Promise<{ successful: number; failed: string[] }>;
  syncChatflows: () => Promise<void>;
  clearError: () => void;
  setSelectedChatflow: (chatflow: Chatflow | null) => void;
  clearChatflowUsers: () => void;
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
      throw error;
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
      throw error;
    }
  },

  fetchChatflowDetails: async (flowiseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const chatflow = await getSpecificChatflow(flowiseId);
      set({ selectedChatflow: chatflow, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chatflow details';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchChatflowUsers: async (flowiseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await getChatflowUsers(flowiseId);
      set({ chatflowUsers: users, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chatflow users';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  addUserToChatflow: async (flowiseId: string, userEmail: string) => {
    set({ isLoading: true, error: null });
    try {
      await addUserToChatflow(flowiseId, userEmail);
      // 重新獲取用戶列表以獲得最新的 ChatflowUser 數據
      const users = await getChatflowUsers(flowiseId);
      set({ chatflowUsers: users, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add user to chatflow';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  removeUserFromChatflow: async (flowiseId: string, userEmail: string) => {
    set({ isLoading: true, error: null });
    try {
      await removeUserFromChatflow(flowiseId, userEmail);
      // 重新獲取用戶列表
      const users = await getChatflowUsers(flowiseId);
      set({ chatflowUsers: users, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove user from chatflow';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  bulkAddUsersToChatflow: async (flowiseId: string, userEmails: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const results = await Promise.allSettled(
        userEmails.map(email => addUserToChatflow(flowiseId, email))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results
        .filter((r) => r.status === 'rejected')
        .map((r, index) => {
          if (r.status === 'rejected') {
            // Log the reason for debugging
            console.error(`Failed to add user ${userEmails[index]}:`, r.reason);
          }
          return userEmails[index];
        });

      // 重新獲取用戶列表
      const users = await getChatflowUsers(flowiseId);
      set({ chatflowUsers: users, isLoading: false });

      return { successful, failed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to bulk add users to chatflow';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  syncChatflows: async () => {
    set({ isLoading: true, error: null });
    try {
      // 假設您有 syncChatflows API 函數
      // await syncChatflows();
      
      // 同步後重新獲取 chatflows 和 stats
      const [chatflows, stats] = await Promise.all([
        getAllChatflows(),
        getChatflowStats(),
      ]);
      
      set({ chatflows, stats, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync chatflows';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  setSelectedChatflow: (chatflow: Chatflow | null) => {
    set({ selectedChatflow: chatflow });
    // 清除之前的用戶列表
    if (!chatflow) {
      set({ chatflowUsers: [] });
    }
  },

  clearChatflowUsers: () => set({ chatflowUsers: [] }),
}));