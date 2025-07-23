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
  let processedText = text;
  const mathBlocks: Array<{content: string, display: boolean, placeholder: string}> = [];
  
  // Detect LaTeX-style math first ($$...$$, $...$)
  // Block math: $$...$$
  processedText = processedText.replace(/\$\$\s*([^$]+)\s*\$\$/g, (_, mathContent) => {
    const cleanMath = mathContent.trim();
    const placeholder = `__MATH_DISPLAY_${mathBlocks.length}__`;
    mathBlocks.push({ content: cleanMath, display: true, placeholder });
    return placeholder;
  });
  
  // Inline math: $...$
  processedText = processedText.replace(/\$\s*([^$]+)\s*\$/g, (_, mathContent) => {
    const cleanMath = mathContent.trim();
    const placeholder = `__MATH_INLINE_${mathBlocks.length}__`;
    mathBlocks.push({ content: cleanMath, display: false, placeholder });
    return placeholder;
  });
  
  // Detect [ math ] blocks (display math)
  processedText = processedText.replace(/\[\s*([^[\]]+)\s*\]/g, (_, mathContent) => {
    const cleanMath = mathContent.trim();
    const placeholder = `__MATH_DISPLAY_${mathBlocks.length}__`;
    mathBlocks.push({ content: cleanMath, display: true, placeholder });
    return placeholder;
  });
  
  // Detect ( math ) blocks (inline math) - more flexible approach
  processedText = processedText.replace(/\(\s*([^()]+)\s*\)/g, (match, mathContent) => {
    // Only treat as math if it contains mathematical symbols or common math patterns
    if (/[a-zA-Z=+\-*/^_{}\\]/.test(mathContent) && mathContent.trim().length > 0) {
      const cleanMath = mathContent.trim();
      const placeholder = `__MATH_INLINE_${mathBlocks.length}__`;
      mathBlocks.push({ content: cleanMath, display: false, placeholder });
      return placeholder;
    }
    return match; // Return unchanged if it doesn't look like math
  });

  // Now split the processed text by math placeholders and create blocks
  if (mathBlocks.length === 0) {
    // No math found, just add as text block
    if (processedText.trim()) {
      blocks.push({ type: 'text', content: processedText });
    }
  } else {
    // Process placeholders in order and create blocks
    let remainingText = processedText;
    
    mathBlocks.forEach((mathBlock) => {
      const placeholderIndex = remainingText.indexOf(mathBlock.placeholder);
      
      if (placeholderIndex !== -1) {
        // Add text before this math block (if any)
        const textBefore = remainingText.substring(0, placeholderIndex);
        if (textBefore.trim()) {
          blocks.push({ type: 'text', content: textBefore });
        }
        
        // Add the math block
        blocks.push({ type: 'math', content: mathBlock.content, display: mathBlock.display });
        
        // Update remaining text to continue after this placeholder
        remainingText = remainingText.substring(placeholderIndex + mathBlock.placeholder.length);
      }
    });
    
    // Add any remaining text after all math blocks
    if (remainingText.trim()) {
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
