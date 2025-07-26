// Alternative approach: Custom inline math parser
export const parseAndRenderMixedContent = (content: string) => {
  const parts: Array<{ type: 'text' | 'math', content: string, display?: boolean }> = [];
  
  // Split by inline math patterns
  const regex = /\\\((.*?)\\\)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Add text before math
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      });
    }
    
    // Add math
    parts.push({
      type: 'math',
      content: match[1],
      display: false
    });
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }
  
  return parts;
};
