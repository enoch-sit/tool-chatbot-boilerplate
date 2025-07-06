import { v4 as uuidv4 } from 'uuid';
import type { Message, StreamEvent } from '../types/chat';

export function mapHistoryToMessages(history: any[]): Message[] {
  return history.map(item => {
    if (item.role === "assistant" && item.content.trim().startsWith("[")) {
      try {
        const events = JSON.parse(item.content) as StreamEvent[];
        // Filter to only include token events in history
        const tokenEvents = events.filter((event: StreamEvent) => event.event === 'token');
        return {
          id: item.id || uuidv4(),
          content: '', // You may leave this empty or summarize
          sender: "bot",
          session_id: item.session_id,
          streamEvents: tokenEvents,
          timestamp: item.created_at,
        };
      } catch {
        // fallback
        return {
          id: item.id || uuidv4(),
          content: item.content,
          sender: "bot",
          session_id: item.session_id,
          timestamp: item.created_at,
        };
      }
    }
    return {
      id: item.id || uuidv4(),
      content: item.content,
      sender: item.role === "user" ? "user" : "bot",
      session_id: item.session_id,
      timestamp: item.created_at,
    };
  });
}