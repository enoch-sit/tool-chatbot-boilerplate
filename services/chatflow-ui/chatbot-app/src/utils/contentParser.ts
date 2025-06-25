// src/utils/contentParser.ts
// [ADDED] This entire section is new to support mixed content rendering.
import { ContentBlock } from '../store/chatStore';

/**
 * Parses a raw string from the AI into an array of content blocks.
 * It identifies code, mermaid, and mindmap blocks using Markdown fences.
 * @param rawContent The raw string to parse.
 * @returns An array of ContentBlock objects.
 */
export const parseMixedContent = (rawContent: string): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  // This regex looks for ```language ... ``` blocks
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(rawContent)) !== null) {
    // Capture any text that appeared before this block
    if (match.index > lastIndex) {
      const textContent = rawContent.substring(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({ type: 'text', content: textContent });
      }
    }

    const language = match[1]?.toLowerCase() || 'text';
    const code = match[2].trim();

    if (language === 'mermaid' || language === 'mindmap') {
      blocks.push({ type: language, content: code });
    } else {
      blocks.push({ type: 'code', content: code, language });
    }

    lastIndex = regex.lastIndex;
  }

  // Capture any remaining text after the last block
  if (lastIndex < rawContent.length) {
    const remainingText = rawContent.substring(lastIndex).trim();
    if (remainingText) {
      blocks.push({ type: 'text', content: remainingText });
    }
  }

  // If no blocks were found, treat the entire content as a single text block
  if (blocks.length === 0 && rawContent.trim()) {
    blocks.push({ type: 'text', content: rawContent });
  }

  return blocks;
};