import React from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { cleanMathContent } from '../../utils/mathCleaner';

interface MathRendererProps {
  content: string;
  display: boolean;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, display }) => {
  // Clean up content using robust math cleaner
  const cleanContent = React.useMemo(() => {
    return cleanMathContent(content, {
      removeDelimiters: false,
      trimWhitespace: false,
      fixCommonErrors: false,
      validateSyntax: false // Skip heavy validation for performance
    });
  }, [content]);

  // For inline math, use InlineMath component
  if (!display) {
    // Use lighter cleaning for inline math to preserve variable lists
    const cleanInlineContent = cleanMathContent(content, {
      removeDelimiters: true, // Remove $ delimiters for inline
      trimWhitespace: true,
      fixCommonErrors: false, // Don't fix "errors" that might be valid variable lists
      validateSyntax: false
    });
    
    // Don't render anything for empty content
    if (!cleanInlineContent) {
      return null;
    }

    // Skip validation for inline math - it's often just variable names
    // if (!isValidMath(cleanInlineContent)) {
    //   console.warn('Invalid inline math detected:', cleanInlineContent);
    //   return (
    //     <span style={{ color: '#cc0000', fontSize: '0.9em', fontFamily: 'monospace' }}>
    //       [Invalid Math: {cleanInlineContent}]
    //     </span>
    //   );
    // }

    try {
      return <InlineMath math={cleanInlineContent} />;
    } catch (error) {
      console.warn('Inline math rendering error:', error, 'Content:', content);
      return (
        <span style={{ color: '#cc0000', fontSize: '0.9em', fontFamily: 'monospace' }}>
          [Math: {cleanInlineContent}]
        </span>
      );
    }
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
