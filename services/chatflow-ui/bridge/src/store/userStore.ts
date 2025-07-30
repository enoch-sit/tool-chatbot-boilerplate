// src/store/userStore.ts
import { create } from 'zustand';
import { getUserCredits } from '../api/user';

interface UserState {
  credits: number | null;
  isLoadingCredits: boolean;
  fetchCredits: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  credits: null,
  isLoadingCredits: false,
  fetchCredits: async () => {
    set({ isLoadingCredits: true });
    try {
      const creditData = await getUserCredits();
      set({ credits: creditData.totalCredits, isLoadingCredits: false });
    } catch (error) {
      console.error("Failed to fetch user credits from store:", error);
      set({ credits: null, isLoadingCredits: false });
    }
  },
}));
