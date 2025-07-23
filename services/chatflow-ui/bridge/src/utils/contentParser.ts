// src/utils/contentParser.ts
// [ADDED] This entire section is new to support mixed content rendering.
import type { ContentBlock } from '../types/chat';

/**
 * Parses a raw string from the AI into an array of content blocks.
 * It identifies code, mermaid, mindmap, and HTML blocks using Markdown fences.
 * @param rawContent The raw string to parse.
 * @returns An array of ContentBlock objects.
 */
export const parseMixedContent = (rawContent: string): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  
  // Always parse content directly, no loading states during streaming
  
  // This regex looks for ```language ... ``` blocks
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(rawContent)) !== null) {
    // Capture any text that appeared before this block
    if (match.index > lastIndex) {
      const textContent = rawContent.substring(lastIndex, match.index);
      if (textContent && textContent.trim()) {
        blocks.push({ type: 'text', content: textContent });
      }
    }

    const language = match[1]?.toLowerCase() || 'text';
    const code = match[2];

    if (language === 'mermaid' || language === 'mindmap') {
      blocks.push({ type: language, content: code });
    } else if (language === 'html') {
      // Post-stream rendering: Only create actual HTML blocks when not streaming
      blocks.push({ type: 'html', content: code });
    } else {
      blocks.push({ type: 'code', content: code, language });
    }

    lastIndex = regex.lastIndex;
  }

  // Capture any remaining text after the last block
  if (lastIndex < rawContent.length) {
    const remainingText = rawContent.substring(lastIndex);
    if (remainingText && remainingText.trim()) {
      blocks.push({ type: 'text', content: remainingText });
    }
  }

  // If no blocks were found, treat the entire content as a single text block
  if (blocks.length === 0 && rawContent.trim()) {
    blocks.push({ type: 'text', content: rawContent });
  }

  return blocks;
};

/**
 * Converts loading blocks to actual content blocks after streaming is complete.
 * This is called when streaming finishes to trigger the final render.
 * @param rawContent The complete content after streaming
 * @returns An array of ContentBlock objects with all blocks properly rendered
 */
export const finalizeStreamedContent = (rawContent: string): ContentBlock[] => {
  return parseMixedContent(rawContent); // Parse normally
};