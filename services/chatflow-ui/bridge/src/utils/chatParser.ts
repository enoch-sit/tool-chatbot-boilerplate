import type {Message} from "../types/chat";

export function mapHistoryToMessages(history: any[]): Message[] {
  return history.map(item => {
    if (item.role === "assistant" && item.content.trim().startsWith("[")) {
      try {
        const events = JSON.parse(item.content);
        // Filter to only include token events in history
        const tokenEvents = events.filter((event: any) => event.event === 'token');
        return {
          content: '', // You may leave this empty or summarize
          sender: "bot",
          session_id: item.session_id,
          streamEvents: tokenEvents,
          timestamp: item.created_at,
        };
      } catch {
        // fallback
        return {
          content: item.content,
          sender: "bot",
          session_id: item.session_id,
          timestamp: item.created_at,
        };
      }
    }
    return {
      content: item.content,
      sender: item.role === "user" ? "user" : "bot",
      session_id: item.session_id,
      timestamp: item.created_at,
    };
  });
}