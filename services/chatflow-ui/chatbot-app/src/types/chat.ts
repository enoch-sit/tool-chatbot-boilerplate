// src/types/chat.ts

// NEW: ContentBlock type for rendering mixed content in a single message.
export type ContentBlock = {
  type: 'text' | 'mermaid' | 'mindmap' | 'code' | 'image';
  content: string;
  language?: string; // Optional: for syntax highlighting in 'code' blocks
};

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  // UPDATED: content is now an array of ContentBlocks instead of a single string.
  content: ContentBlock[];
  timestamp: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
};

export type ChatSession = {
  session_id: string;
  chatflow_id: string;
  topic: string;
  created_at: string;
  first_message?: string;
};

export type Chatflow = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  deployed: boolean;
  is_public: boolean;
};

