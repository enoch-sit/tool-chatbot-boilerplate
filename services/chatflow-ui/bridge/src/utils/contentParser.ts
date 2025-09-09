// src/utils/contentParser.ts
// [ADDED] This entire section is new to support mixed content rendering.
import type { ContentBlock } from '../types/chat';

/**
 * Result of parsing mixed content, including both blocks and raw text
 */
export interface ParsedContent {
  blocks: ContentBlock[];
  rawContent: string;
}

/**
 * Parses a raw string from the AI into an array of content blocks.
 * It identifies code, mermaid, mindmap, and HTML blocks, treating all other content as markdown.
 * @param rawContent The raw string to parse.
 * @returns ParsedContent object with both blocks and original raw content.
 */
export const parseMixedContent = (rawContent: string): ParsedContent => {
  if (!rawContent || !rawContent.trim()) {
    return { blocks: [], rawContent };
  }
  
  const blocks: ContentBlock[] = [];
  
  // Multi-step parsing approach:
  // 1. First parse code blocks (```...```)
  // 2. Then treat remaining text as markdown blocks
  
  // Step 1: Parse code blocks first
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

  // If no code blocks were found, treat entire content as markdown
  if (blocks.length === 0 && rawContent.trim()) {
    blocks.push({ type: 'text', content: rawContent });
  }

  return { blocks, rawContent };
};

/**
 * Converts loading blocks to actual content blocks after streaming is complete.
 * This is called when streaming finishes to trigger the final render.
 * @param rawContent The complete content after streaming
 * @returns ParsedContent object with all blocks properly rendered and raw content preserved
 */
export const finalizeStreamedContent = (rawContent: string): ParsedContent => {
  return parseMixedContent(rawContent); // Parse normally
};

/**
 * Helper function to extract just the blocks array for backward compatibility
 * @param rawContent The raw string to parse
 * @returns An array of ContentBlock objects
 */
export const parseMixedContentBlocks = (rawContent: string): ContentBlock[] => {
  return parseMixedContent(rawContent).blocks;
};
