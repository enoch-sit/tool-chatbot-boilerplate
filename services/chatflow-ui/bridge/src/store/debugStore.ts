// src/store/debugStore.ts
import { create } from 'zustand';

interface DebugState {
  logs: string[];
  isDebugMode: boolean;
}

interface DebugActions {
  addLog: (log: string) => void;
  toggleDebugMode: () => void;
  clearLogs: () => void;
}

export const useDebugStore = create<DebugState & DebugActions>((set) => ({
  logs: [],
  isDebugMode: process.env.NODE_ENV === 'development', // Enable by default in development
  addLog: (log) => {
    if (process.env.NODE_ENV === 'development') {
      set((state) => ({ logs: [...state.logs, `[${new Date().toISOString()}] ${log}`] }));
    }
  },
  toggleDebugMode: () => set((state) => ({ isDebugMode: !state.isDebugMode })),
  clearLogs: () => set({ logs: [] }),
}));
