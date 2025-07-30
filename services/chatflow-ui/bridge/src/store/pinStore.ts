// src/store/pinStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message } from '../types/chat';

interface PinState {
  pinnedMessages: Message[];
  pinMessage: (message: Message) => void;
  unpinMessage: (messageId: string) => void;
  isPinned: (messageId: string) => boolean;
}

export const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pinnedMessages: [],
      pinMessage: (message) => {
        if (message.id && !get().isPinned(message.id)) {
          set((state) => ({
            pinnedMessages: [...state.pinnedMessages, message],
          }));
        }
      },
      unpinMessage: (messageId) => {
        set((state) => ({
          pinnedMessages: state.pinnedMessages.filter((m) => m.id !== messageId),
        }));
      },
      isPinned: (messageId) => {
        return get().pinnedMessages.some((m) => m.id === messageId);
      },
    }),
    {
      name: 'pinned-messages-storage', // unique name for local storage
    }
  )
);
