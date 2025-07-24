// src/utils/contentParser.ts
// [ADDED] This entire section is new to support mixed content rendering.
import type { ContentBlock } from '../types/chat';

/**
 * Parses a raw string from the AI into an array of content blocks.
 * It identifies code, mermaid, mindmap, HTML, and math blocks.
 * @param rawContent The raw string to parse.
 * @returns An array of ContentBlock objects.
 */
export const parseMixedContent = (rawContent: string): ContentBlock[] => {
  if (!rawContent || !rawContent.trim()) {
    return [];
  }
  
  const blocks: ContentBlock[] = [];
  
  // Multi-step parsing approach:
  // 1. First parse code blocks (```...```)
  // 2. Then parse math blocks from remaining text
  
  // Step 1: Parse code blocks first
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  const textSegments: string[] = [];

  while ((match = regex.exec(rawContent)) !== null) {
    // Capture any text that appeared before this block
    if (match.index > lastIndex) {
      const textContent = rawContent.substring(lastIndex, match.index);
      if (textContent && textContent.trim()) {
        textSegments.push(textContent);
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
      textSegments.push(remainingText);
    }
  }

  // If no code blocks were found, treat entire content as text
  if (textSegments.length === 0 && blocks.length === 0 && rawContent.trim()) {
    textSegments.push(rawContent);
  }

  // Step 2: Parse math blocks from text segments
  textSegments.forEach(textSegment => {
    parseMathFromText(textSegment, blocks);
  });

  // If no blocks were found, treat the entire content as a single text block
  if (blocks.length === 0 && rawContent.trim()) {
    blocks.push({ type: 'text', content: rawContent });
  }

  return blocks;
};

// Helper function to parse math blocks from text
function parseMathFromText(text: string, blocks: ContentBlock[]): void {
  // Define all math patterns with their types
  const mathPatterns = [
    { regex: /\$\$\s*([^$]+)\s*\$\$/g, display: true, name: 'display-dollars' },
    { regex: /\\\[\s*([\s\S]*?)\s*\\\]/g, display: true, name: 'display-brackets' },
    { regex: /\\\(\s*([\s\S]*?)\s*\\\)/g, display: false, name: 'inline-parens' },
    { regex: /\$\s*([^$]+)\s*\$/g, display: false, name: 'inline-dollars' },
    { regex: /\[\s*([^[\]]+)\s*\]/g, display: true, name: 'display-square' },
  ];

  let processedText = text;
  const foundMath: Array<{
    match: string;
    content: string;
    display: boolean;
    start: number;
    end: number;
  }> = [];

  // Find all math matches first
  for (const pattern of mathPatterns) {
    pattern.regex.lastIndex = 0; // Reset regex
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      // For inline parens pattern, only proceed if it looks like math
      if (pattern.name === 'inline-parens' || pattern.name === 'display-square') {
        const content = match[1].trim();
        // Skip if it doesn't look like math (for parens) or is empty
        if (!content || (pattern.name === 'inline-parens' && !/[a-zA-Z=+\-*/^_{}\\,]/.test(content))) {
          continue;
        }
      }
      
      foundMath.push({
        match: match[0],
        content: match[1].trim(),
        display: pattern.display,
        start: match.index!,
        end: match.index! + match[0].length
      });
    }
  }

  // Sort by start position
  foundMath.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep the first one)
  const uniqueMath: typeof foundMath = [];
  for (const mathMatch of foundMath) {
    const hasOverlap = uniqueMath.some(existing => 
      (mathMatch.start >= existing.start && mathMatch.start < existing.end) ||
      (mathMatch.end > existing.start && mathMatch.end <= existing.end)
    );
    if (!hasOverlap) {
      uniqueMath.push(mathMatch);
    }
  }

  // If no math found, add entire text as one block
  if (uniqueMath.length === 0) {
    if (text.length > 0) {
      blocks.push({ type: 'text', content: text });
    }
    return;
  }

  // Split text and create blocks
  let lastEnd = 0;
  for (const mathMatch of uniqueMath) {
    // Add text before this math block
    if (mathMatch.start > lastEnd) {
      const textBefore = text.substring(lastEnd, mathMatch.start);
      if (textBefore.length > 0) {
        blocks.push({ type: 'text', content: textBefore });
      }
    }
    
    // Add the math block
    if (mathMatch.content.length > 0) {
      blocks.push({ 
        type: 'math', 
        content: mathMatch.content, 
        display: mathMatch.display 
      });
    }
    
    lastEnd = mathMatch.end;
  }

  // Add any remaining text
  if (lastEnd < text.length) {
    const remainingText = text.substring(lastEnd);
    if (remainingText.length > 0) {
      blocks.push({ type: 'text', content: remainingText });
    }
  }
}

/**
 * Converts loading blocks to actual content blocks after streaming is complete.
 * This is called when streaming finishes to trigger the final render.
 * @param rawContent The complete content after streaming
 * @returns An array of ContentBlock objects with all blocks properly rendered
 */
export const finalizeStreamedContent = (rawContent: string): ContentBlock[] => {
  return parseMixedContent(rawContent); // Parse normally
};
