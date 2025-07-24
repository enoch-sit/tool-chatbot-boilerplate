import React from 'react';
import { parseMixedContent } from '../../utils/contentParser';
import MermaidDiagram from '../renderers/MermaidDiagram';
import CodeBlock from '../renderers/CodeBlock';
import HtmlPreview from '../renderers/HtmlPreview';
import MathRenderer from '../renderers/MathRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
// Removed remark-math and rehype-katex - we handle math ourselves

interface MixedContentRendererProps {
  content: string;
  messageId?: string; // Add optional message ID for better keying
  isHistorical?: boolean; // Flag to indicate this is from chat history
}

export const MixedContentRenderer: React.FC<MixedContentRendererProps> = ({ 
  content, 
  messageId, 
  isHistorical = false
}) => {
  // Always parse content directly, no special streaming logic
  const blocks = parseMixedContent(content);
  
  // Create a unique identifier for this content rendering instance
  const contentHash = React.useMemo(() => {
    const baseHash = messageId || `content-${Date.now()}`;
    const histFlag = isHistorical ? 'hist' : 'live';
    return `${baseHash}-${histFlag}-${content.length}-${content.substring(0, 20).replace(/\s/g, '')}`;
  }, [content, messageId, isHistorical]);
  
  // Group consecutive text and inline math blocks for inline rendering
  const groupedBlocks = React.useMemo(() => {
    const groups: Array<{
      type: 'inline-group' | 'block';
      blocks: typeof blocks;
      isBlock?: boolean;
    }> = [];
    
    let currentInlineGroup: typeof blocks = [];
    
    for (const block of blocks) {
      const isBlockLevel = block.type === 'mermaid' || 
                          block.type === 'code' || 
                          block.type === 'html' ||
                          (block.type === 'math' && block.display);
      
      if (isBlockLevel) {
        // End current inline group if it exists
        if (currentInlineGroup.length > 0) {
          groups.push({ type: 'inline-group', blocks: [...currentInlineGroup] });
          currentInlineGroup = [];
        }
        // Add block-level element
        groups.push({ type: 'block', blocks: [block], isBlock: true });
      } else {
        // Add to current inline group (text or inline math)
        currentInlineGroup.push(block);
      }
    }
    
    // Add any remaining inline group
    if (currentInlineGroup.length > 0) {
      groups.push({ type: 'inline-group', blocks: [...currentInlineGroup] });
    }
    
    return groups;
  }, [blocks]);
  
  return (
    <>
      {groupedBlocks.map((group, groupIdx) => {
        const groupKey = `${contentHash}-group-${groupIdx}`;
        
        if (group.type === 'block') {
          // Render block-level elements normally
          const block = group.blocks[0];
          const baseKey = `${contentHash}-${block.type}-${groupIdx}`;
          
          if (block.type === 'mermaid') {
            const mermaidKey = `mermaid-${contentHash}-${block.content.substring(0, 20).replace(/\s/g, '')}-${groupIdx}`;
            return (
              <MermaidDiagram 
                key={mermaidKey} 
                chart={block.content}
              />
            );
          }
          if (block.type === 'code') {
            return <CodeBlock key={`code-${baseKey}`} code={block.content} language={block.language} />;
          }
          if (block.type === 'html') {
            return <HtmlPreview key={`html-${baseKey}`} htmlContent={block.content} isHistorical={isHistorical} />;
          }
          if (block.type === 'math' && block.display) {
            return <MathRenderer key={`math-${baseKey}`} content={block.content} display={block.display} />;
          }
        } else {
          // Alternative approach: combine inline content and render as one unit
          const hasComplexMarkdown = group.blocks.some(block => 
            block.type === 'text' && /[*_`#>\[\]!]|^\s*[-+*]\s|^\s*\d+\.\s/.test(block.content)
          );
          
          if (hasComplexMarkdown) {
            // If any block has complex markdown, use the detailed approach above
            return (
              <div key={groupKey} style={{ display: 'inline' }}>
                {group.blocks.map((block, blockIdx) => {
                  const blockKey = `${groupKey}-${blockIdx}`;
                  
                  if (block.type === 'math') {
                    return (
                      <span key={blockKey} style={{ display: 'inline' }}>
                        <MathRenderer content={block.content} display={block.display} />
                      </span>
                    );
                  } else if (block.type === 'text') {
                    // Clean up text content
                    let cleanedContent = block.content;
                    cleanedContent = cleanedContent.replace(/__MATH_(INLINE|DISPLAY)_\d+__:?\s*/g, '');
                    cleanedContent = cleanedContent.replace(/\\\s*$/g, '');
                    
                    // Check if this text needs markdown processing (has markdown syntax)
                    const hasMarkdownSyntax = /[*_`#>\[\]!]/.test(cleanedContent) || 
                                            /^\s*[-+*]\s/.test(cleanedContent) || // List items
                                            /^\s*\d+\.\s/.test(cleanedContent);   // Numbered lists
                    
                    if (hasMarkdownSyntax) {
                      // Use ReactMarkdown for complex content
                      return (
                        <ReactMarkdown
                          key={blockKey}
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            // Force inline rendering for all elements in inline groups
                            p: ({ children }) => <span>{children}</span>,
                            ul: ({ children }) => <span>{children}</span>,
                            ol: ({ children }) => <span>{children}</span>,
                            li: ({ children }) => <span>• {children}</span>,
                            h1: ({ children }) => <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{children}</span>,
                            h2: ({ children }) => <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{children}</span>,
                            h3: ({ children }) => <span style={{ fontWeight: 'bold' }}>{children}</span>,
                            strong: ({ children }) => <strong>{children}</strong>,
                            em: ({ children }) => <em>{children}</em>,
                          }}
                        >
                          {cleanedContent}
                        </ReactMarkdown>
                      );
                    } else {
                      // Render simple text directly without markdown processing
                      return (
                        <span key={blockKey} style={{ whiteSpace: 'pre-wrap' }}>
                          {cleanedContent}
                        </span>
                      );
                    }
                  }
                  return null;
                })}
              </div>
            );
          } else {
            // Simple case: combine all content and render as one unit
            const combinedContent = group.blocks.map(block => {
              if (block.type === 'math') {
                // Use a placeholder for math that we'll replace
                return `__INLINE_MATH_${block.content}__`;
              } else {
                let cleanedContent = block.content;
                cleanedContent = cleanedContent.replace(/__MATH_(INLINE|DISPLAY)_\d+__:?\s*/g, '');
                cleanedContent = cleanedContent.replace(/\\\s*$/g, '');
                return cleanedContent;
              }
            }).join('');
            
            // Split by math placeholders and render
            const parts = combinedContent.split(/(__INLINE_MATH_[^_]+__)/);
            
            return (
              <span key={groupKey} style={{ whiteSpace: 'pre-wrap' }}>
                {parts.map((part, partIdx) => {
                  if (part.startsWith('__INLINE_MATH_') && part.endsWith('__')) {
                    const mathContent = part.slice(14, -2); // Remove __INLINE_MATH_ and __
                    return (
                      <MathRenderer 
                        key={`${groupKey}-math-${partIdx}`} 
                        content={mathContent} 
                        display={false} 
                      />
                    );
                  } else {
                    return part;
                  }
                })}
              </span>
            );
          }
        }
        
        return null;
      })}
    </>
  );
};