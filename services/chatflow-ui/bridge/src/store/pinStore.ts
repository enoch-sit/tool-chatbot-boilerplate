// src/store/pinStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message } from '../types/chat';

interface PinState {
  pinnedMessages: Message[];
  pinnedHtmlSections: { messageId: string, htmlContent: string, sectionId: string }[];
  pinMessage: (message: Message) => void;
  unpinMessage: (messageId: string) => void;
  isPinned: (messageId: string) => boolean;
  pinHtmlSection: (messageId: string, htmlContent: string) => void;
  unpinHtmlSection: (sectionId: string) => void;
  isHtmlSectionPinned: (htmlContent: string) => boolean;
}

export const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pinnedMessages: [],
      pinnedHtmlSections: [],
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
      pinHtmlSection: (messageId, htmlContent) => {
        const sectionId = `${messageId}-${btoa(htmlContent.slice(0, 50))}`;
        if (!get().isHtmlSectionPinned(htmlContent)) {
          set((state) => ({
            pinnedHtmlSections: [...state.pinnedHtmlSections, { messageId, htmlContent, sectionId }],
          }));
        }
      },
      unpinHtmlSection: (sectionId) => {
        set((state) => ({
          pinnedHtmlSections: state.pinnedHtmlSections.filter((section) => section.sectionId !== sectionId),
        }));
      },
      isHtmlSectionPinned: (htmlContent) => {
        return get().pinnedHtmlSections.some((section) => section.htmlContent === htmlContent);
      },
    }),
    {
      name: 'pinned-messages-storage', // unique name for local storage
    }
  )
);
