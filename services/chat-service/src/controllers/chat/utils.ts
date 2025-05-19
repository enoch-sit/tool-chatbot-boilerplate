// Define types for message content
export interface MessageContent {
  text: string;
  [key: string]: any; // Allow for additional properties
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'; // Changed from string to specific roles
  content: string | MessageContent | MessageContent[];
  timestamp?: Date; // Added timestamp as it's used in messages
}

/**
 * Escape special characters in a regular expression pattern
 *
 * This utility function escapes special regex characters to ensure
 * they are treated as literal characters in a regex pattern.
 *
 * @param string - The string to escape for safe use in regex
 * @returns The escaped string with special characters prefixed with backslashes
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\\\]]/g, '\\$&'); // $& means the whole matched string
}
