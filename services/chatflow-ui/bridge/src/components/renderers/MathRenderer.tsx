import React from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

interface MathRendererProps {
  content: string;
  display: boolean;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, display }) => {
  // Clean up content for display math
  const cleanContent = React.useMemo(() => {
    if (!content || !content.trim()) {
      return '';
    }
    
    let cleaned = content.trim();
    
    // Only remove delimiters if they are actually wrapping the entire content
    if (cleaned.startsWith('$$') && cleaned.endsWith('$$') && cleaned.length > 4) {
      cleaned = cleaned.slice(2, -2); // Remove double $$ at start and end
    }
    if (cleaned.startsWith('[') && cleaned.endsWith(']') && cleaned.length > 2) {
      cleaned = cleaned.slice(1, -1); // Remove [ ] at start and end
    }
    
    // Only handle trailing issues, don't mess with the math content itself
    cleaned = cleaned.replace(/\\+$/, ''); // Remove trailing backslashes only
    cleaned = cleaned.replace(/\s+$/, ''); // Remove trailing whitespace only
    
    return cleaned;
  }, [content]);

  // For inline math, just return the content as-is without any rendering
  if (!display) {
    // Clean up trailing backslashes and whitespace for inline math
    const cleanInlineContent = content.trim().replace(/\\+$/, '').replace(/\s+$/, '');
    return <>{cleanInlineContent}</>;
  }

  // Don't render anything for empty content
  if (!cleanContent) {
    return null;
  }

  try {
    return <BlockMath math={cleanContent} />;
  } catch (error) {
    console.warn('Math rendering error:', error, 'Content:', content);
    return (
      <span style={{ color: '#cc0000', fontSize: '0.9em', fontFamily: 'monospace' }}>
        [Math: {cleanContent}]
      </span>
    );
  }
};

export default MathRenderer;
