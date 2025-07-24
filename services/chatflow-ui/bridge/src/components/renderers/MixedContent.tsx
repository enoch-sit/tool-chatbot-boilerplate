import React, { useState, useEffect } from 'react';
import { Box } from '@mui/joy';
import { parseMixedContent } from '../../utils/contentParser';
import MermaidDiagram from '../renderers/MermaidDiagram';
import CodeBlock from '../renderers/CodeBlock';
import HtmlPreview from '../renderers/HtmlPreview';
import MathRenderer from '../renderers/MathRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS

interface MixedContentRendererProps {
  content: string;
  messageId?: string; // Add optional message ID for better keying
  isHistorical?: boolean; // Flag to indicate this is from chat history
}

// Enhanced renderer component that handles full parsing
const EnhancedMixedContentRenderer: React.FC<{ content: string; messageId?: string }> = ({ 
  content, 
  messageId 
}) => {
  // Parse content with full math and markdown support
  const parsedContent = parseMixedContent(content);
  const blocks = parsedContent.blocks;
  // rawContent is preserved for potential future use (debugging, fallback, etc.)
  
  // Debug: Log parsed blocks
  console.group('📝 PARSED BLOCKS DEBUG');
  console.log('Raw content length:', parsedContent.rawContent.length);
  console.log('Total blocks:', blocks.length);
  blocks.forEach((block, idx) => {
    console.log(`Block ${idx}:`, {
      type: block.type,
      contentLength: block.content.length,
      contentPreview: block.content.substring(0, 100),
      language: 'language' in block ? block.language : undefined,
      display: 'display' in block ? block.display : undefined
    });
  });
  console.groupEnd();
  
  // Create a unique identifier for this content rendering instance
  const contentHash = React.useMemo(() => {
    const baseHash = messageId || `content-${Date.now()}`;
    return `${baseHash}-final-${content.length}-${content.substring(0, 20).replace(/\s/g, '')}`;
  }, [content, messageId]);

  return (
    <>
      {blocks.map((block, idx) => {
        const baseKey = `${contentHash}-${block.type}-${idx}`;
        
        if (block.type === 'mermaid') {
          const mermaidKey = `mermaid-${contentHash}-${block.content.substring(0, 20).replace(/\s/g, '')}-${idx}`;
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
          return <HtmlPreview key={`html-${baseKey}`} htmlContent={block.content} isHistorical={true} />;
        }
        
        if (block.type === 'math') {
          return <MathRenderer key={`math-${baseKey}`} content={block.content} display={block.display} />;
        }
        
        if (block.type === 'text') {
          // Clean up text content
          let cleanedContent = block.content;
          cleanedContent = cleanedContent.replace(/__MATH_(INLINE|DISPLAY)_\d+__:?\s*/g, '');
          cleanedContent = cleanedContent.replace(/\\\s*$/g, '');
          
          // Debug: Log text block processing
          console.group(`🔤 TEXT BLOCK ${idx} DEBUG`);
          console.log('Original content:', block.content);
          console.log('Cleaned content:', cleanedContent);
          console.log('Content length:', cleanedContent.length);
          console.log('Math patterns found:');
          console.log('  - \\(...\\):', (cleanedContent.match(/\\\(.*?\\\)/g) || []).length);
          console.log('  - $...$:', (cleanedContent.match(/\$[^$]+\$/g) || []).length);
          console.log('  - \\[...\\]:', (cleanedContent.match(/\\\[[\s\S]*?\\\]/g) || []).length);
          console.log('  - $$...$$:', (cleanedContent.match(/\$\$[\s\S]*?\$\$/g) || []).length);
          console.groupEnd();
          
          // Use full ReactMarkdown with math support
          // First, let's check for any manual inline math conversion
          let processedContent = cleanedContent;
          
          // Convert \(...\) to $...$ for better ReactMarkdown compatibility
          processedContent = processedContent.replace(
            /\\\((.*?)\\\)/g, 
            (match, math) => {
              console.log('🔍 Found inline LaTeX pattern:', match, '→', math);
              return `$${math}$`; // Convert \(...\) to $...$
            }
          );
          
          // Also handle standalone math expressions that might not be wrapped
          // Look for LaTeX commands at the start of lines that should be display math
          processedContent = processedContent.replace(
            /^(\s*)(\\frac\{[^}]+\}\{[^}]+\}[^$\n]*?)$/gm,
            (_, spaces, math) => {
              console.log('🔍 Found standalone math expression:', math);
              return `${spaces}$$${math}$$`; // Convert to display math
            }
          );
          
          console.log('🔄 Content transformation:');
          console.log('Before:', cleanedContent.substring(0, 300));
          console.log('After:', processedContent.substring(0, 300));
          console.log('Transformation count:', (cleanedContent.match(/\\\(.*?\\\)/g) || []).length, '→', (processedContent.match(/\$.*?\$/g) || []).length);
          
          return (
            <ReactMarkdown
              key={`text-${baseKey}`}
              remarkPlugins={[
                remarkGfm, 
                [remarkMath, { 
                  singleDollarTextMath: true // Enable single dollar math
                }]
              ]}
              rehypePlugins={[
                [rehypeKatex, { 
                  strict: false, // Allow some LaTeX errors
                  throwOnError: false, // Don't crash on errors
                  macros: {
                    "\\mu": "\\mu",
                    "\\sigma": "\\sigma",
                    "\\times": "\\times",
                    "\\cdot": "\\cdot",
                    "\\div": "\\div"
                  }
                }], 
                rehypeHighlight
              ]}
              components={{
                // Enhanced math component handling
                span: ({ node, className, children, ...props }) => {
                  if (className?.includes('math')) {
                    console.log('🧮 Math span rendered:', { className, children: children?.toString() });
                    return <span className={className} {...props}>{children}</span>;
                  }
                  return <span {...props}>{children}</span>;
                },
                // Handle display math blocks  
                div: ({ node, className, children, ...props }) => {
                  if (className?.includes('math')) {
                    console.log('🧮 Math div rendered:', { className, children: children?.toString() });
                    return <div className={className} {...props}>{children}</div>;
                  }
                  return <div {...props}>{children}</div>;
                },
                // Table styling with borders
                table: ({ children, ...props }) => (
                  <table 
                    {...props} 
                    style={{ 
                      borderCollapse: 'collapse', 
                      width: '100%', 
                      margin: '16px 0',
                      border: '1px solid #ddd'
                    }}
                  >
                    {children}
                  </table>
                ),
                th: ({ children, ...props }) => (
                  <th 
                    {...props} 
                    style={{ 
                      border: '1px solid #ddd', 
                      padding: '12px 8px', 
                      backgroundColor: '#f5f5f5',
                      fontWeight: 'bold',
                      textAlign: 'left'
                    }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td 
                    {...props} 
                    style={{ 
                      border: '1px solid #ddd', 
                      padding: '12px 8px'
                    }}
                  >
                    {children}
                  </td>
                ),
                tbody: ({ children, ...props }) => (
                  <tbody {...props}>
                    {children}
                  </tbody>
                ),
                thead: ({ children, ...props }) => (
                  <thead {...props}>
                    {children}
                  </thead>
                )
              }}
            >
              {processedContent}
            </ReactMarkdown>
          );
        }
        
        // fallback
        return <span key={`fallback-${baseKey}`}>{block.content}</span>;
      })}
    </>
  );
};

export const MixedContentRenderer: React.FC<MixedContentRendererProps> = ({ 
  content, 
  messageId, 
  isHistorical = false
}) => {
  const [showEnhancedRendering, setShowEnhancedRendering] = useState(isHistorical);
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

  // Debug: Detailed raw stream content logging
  console.group('🔍 RAW STREAM DEBUG');
  console.log('Content:', content);
  console.log('Content length:', content.length);
  console.log('Message ID:', messageId);
  console.log('Is historical:', isHistorical);
  console.log('Show enhanced rendering:', showEnhancedRendering);
  console.log('Content preview (first 200 chars):', content.substring(0, 200));
  console.log('Content lines:', content.split('\n').length);
  console.log('Contains math patterns:');
  console.log('  - Inline LaTeX \\(...\\):', /\\\(.*?\\\)/.test(content));
  console.log('  - Inline dollar $...$:', /\$[^$]+\$/.test(content));
  console.log('  - Display LaTeX \\[...\\]:', /\\\[[\s\S]*?\\\]/.test(content));
  console.log('  - Display dollar $$...$$:', /\$\$[\s\S]*?\$\$/.test(content));
  console.log('Contains tables:', /\|.*\|/.test(content));
  console.log('Contains code blocks:', /```/.test(content));
  console.groupEnd();

  // Auto-switch to enhanced rendering when stream ends (similar to HTML preview)
  useEffect(() => {
    if (isHistorical && !hasAutoSwitched && !showEnhancedRendering) {
  console.log('⏱️ Switching to enhanced rendering in 10ms');
  const timer = setTimeout(() => {
    setShowEnhancedRendering(true);
    setHasAutoSwitched(true);
  }, 10);      return () => clearTimeout(timer);
    }
  }, [isHistorical, hasAutoSwitched, showEnhancedRendering]);

  // For streaming content, show safe markdown rendering for better UX
  if (!showEnhancedRendering) {
    // Conservative approach: Only enable safe markdown features
    // - Tables, lists, emphasis, headers (safe)
    // - NO code highlighting, NO math, NO HTML
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Only GitHub Flavored Markdown (tables, lists, etc.)
        rehypePlugins={[]} // No rehype plugins to avoid any processing risks
        components={{
          // Block all potentially dangerous elements
          script: () => null,
          iframe: () => null,
          embed: () => null,
          object: () => null,
          link: ({ children, ...props }) => <span {...props}>{children}</span>, // Convert links to text
          // Keep code blocks as plain text during streaming
          code: ({ children, ...props }) => (
            <Box 
              component="code" 
              sx={{ 
                backgroundColor: '#f5f5f5', 
                padding: '2px 4px', 
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '0.9em'
              }}
              {...props}
            >
              {children}
            </Box>
          ),
          pre: ({ children, ...props }) => (
            <Box 
              component="pre" 
              sx={{ 
                backgroundColor: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '6px',
                overflow: 'auto',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap'
              }}
              {...props}
            >
              {children}
            </Box>
          ),
          // Apply the same table styling as enhanced mode
          table: ({ children, ...props }) => (
            <table 
              {...props} 
              style={{ 
                borderCollapse: 'collapse', 
                width: '100%', 
                margin: '16px 0',
                border: '1px solid #ddd'
              }}
            >
              {children}
            </table>
          ),
          th: ({ children, ...props }) => (
            <th 
              {...props} 
              style={{ 
                border: '1px solid #ddd', 
                padding: '12px 8px', 
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold',
                textAlign: 'left'
              }}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td 
              {...props} 
              style={{ 
                border: '1px solid #ddd', 
                padding: '12px 8px'
              }}
            >
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }

  // Use enhanced rendering for final content
  return <EnhancedMixedContentRenderer content={content} messageId={messageId} />;
};

export default MixedContentRenderer;