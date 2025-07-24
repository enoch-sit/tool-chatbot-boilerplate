import React, { useEffect, useRef } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathPostRendererProps {
  children: React.ReactNode;
  className?: string;
  messageId?: string;
}

/**
 * Post-renders math expressions by scanning text content for math delimiters
 * and replacing them with proper KaTeX components.
 * This approach is similar to how we handle HTML content - render first, then process.
 */
const MathPostRenderer: React.FC<MathPostRendererProps> = ({ 
  children, 
  className = '',
  messageId 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [processedChildren, setProcessedChildren] = React.useState<React.ReactNode>(children);

  useEffect(() => {
    const processMathContent = () => {
      if (!containerRef.current) return;

      try {
        // Convert React children to string for processing
        const getTextContent = (node: React.ReactNode): string => {
          if (typeof node === 'string') return node;
          if (typeof node === 'number') return String(node);
          if (React.isValidElement(node)) {
            const props = node.props as any;
            if (props && typeof props.children !== 'undefined') {
              return getTextContent(props.children);
            }
          }
          if (Array.isArray(node)) {
            return node.map(getTextContent).join('');
          }
          return '';
        };

        const textContent = getTextContent(children);

        // Process math in text content and return React nodes
        const processMathInText = (text: string): React.ReactNode[] => {
          const parts: React.ReactNode[] = [];
          let lastIndex = 0;

          // Find all math expressions
          const mathMatches: Array<{ 
            type: 'display' | 'inline', 
            content: string, 
            start: number, 
            end: number 
          }> = [];

          // Find display math blocks first ($$...$$)
          const displayMathRegex = /\$\$(.*?)\$\$/gs;
          let match;
          while ((match = displayMathRegex.exec(text)) !== null) {
            mathMatches.push({
              type: 'display',
              content: match[1],
              start: match.index,
              end: match.index + match[0].length
            });
          }

          // Find inline math ($...$) but avoid those inside display math
          const inlineMathRegex = /\$([^$]+)\$/g;
          while ((match = inlineMathRegex.exec(text)) !== null) {
            // Check if this match is inside a display math block
            const isInsideDisplayMath = mathMatches.some(dm => 
              match!.index >= dm.start && match!.index + match![0].length <= dm.end
            );
            
            if (!isInsideDisplayMath) {
              mathMatches.push({
                type: 'inline',
                content: match[1],
                start: match.index,
                end: match.index + match[0].length
              });
            }
          }

          // Sort matches by position
          mathMatches.sort((a, b) => a.start - b.start);

          mathMatches.forEach((mathMatch, index) => {
            // Add text before this math expression
            if (mathMatch.start > lastIndex) {
              const beforeText = text.substring(lastIndex, mathMatch.start);
              if (beforeText) {
                parts.push(beforeText);
              }
            }

            // Add the math component
            try {
              if (mathMatch.type === 'display') {
                parts.push(
                  <BlockMath 
                    key={`display-${messageId}-${index}`} 
                    math={mathMatch.content}
                    errorColor="#cc0000"
                  />
                );
              } else {
                parts.push(
                  <InlineMath 
                    key={`inline-${messageId}-${index}`} 
                    math={mathMatch.content}
                    errorColor="#cc0000"
                  />
                );
              }
            } catch (error) {
              parts.push(
                <span 
                  key={`error-${messageId}-${index}`}
                  style={{ color: '#cc0000', fontFamily: 'monospace', fontSize: '0.9em' }}
                >
                  [Math Error: {mathMatch.content}]
                </span>
              );
            }

            lastIndex = mathMatch.end;
          });

          // Add any remaining text
          if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            if (remainingText) {
              parts.push(remainingText);
            }
          }

          return parts.length > 0 ? parts : [text];
        };

        // If there's math content, process it
        if (/\$\$[\s\S]*?\$\$|\$[^$]+\$/.test(textContent)) {
          const processed = processMathInText(textContent);
          setProcessedChildren(processed);
        }
      } catch (error) {
      }
    };

    // Process math when content changes
    const timer = setTimeout(processMathContent, 10);
    return () => clearTimeout(timer);
  }, [children, messageId]);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{
        overflowX: 'auto',
        fontSize: 'inherit',
        lineHeight: 'inherit'
      }}
    >
      {processedChildren}
    </div>
  );
};

export default MathPostRenderer;
