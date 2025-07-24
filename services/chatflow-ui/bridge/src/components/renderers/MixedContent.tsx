import React, { useState, useEffect } from 'react';
import { Box } from '@mui/joy';
import { parseMixedContent } from '../../utils/contentParser';
import MermaidDiagram from '../renderers/MermaidDiagram';
import CodeBlock from '../renderers/CodeBlock';
import HtmlPreview from '../renderers/HtmlPreview';
import MathJaxRenderer from '../renderers/MathJaxRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // Add highlight.js theme

interface MixedContentRendererProps {
  content: string;
  messageId?: string; // Add optional message ID for better keying
  isHistorical?: boolean; // Flag to indicate this is from chat history
}

// Enhanced renderer component that uses unified ReactMarkdown approach
const EnhancedMixedContentRenderer: React.FC<{ content: string; messageId?: string }> = ({ 
  content, 
  messageId 
}) => {
  // Global preprocessing: Convert LaTeX delimiters for MathJax compatibility  
  const processedContent = React.useMemo(() => {
    let updated = content;
    
    // Convert \[...\] to $$...$$ for display math, handling × symbols and \text
    updated = updated.replace(/\\\[([\s\S]*?)\\\]/g, (_, mathContent) => {
      let cleanContent = mathContent.replace(/×/g, '\\times');
      cleanContent = cleanContent.replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}');
      return `$$${cleanContent}$$`;
    });
    
    // Convert \(...\) to $...$ for inline math, handling × symbols and \text
    updated = updated.replace(/\\\((.*?)\\\)/g, (_, mathContent) => {
      let cleanContent = mathContent.replace(/×/g, '\\times');
      cleanContent = cleanContent.replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}');
      return `$${cleanContent}$`;
    });
    
    // Log preprocessing results
    console.group('🔄 MATH PREPROCESSING FOR MATHJAX');
    console.log('Original content length:', content.length);
    console.log('Processed content length:', updated.length);
    console.log('LaTeX patterns converted:');
    console.log('  - \\[...\\] to $$...$$:', (content.match(/\\\[[\s\S]*?\\\]/g) || []).length);
    console.log('  - \\(...\\) to $...$:', (content.match(/\\\(.*?\\\)/g) || []).length);
    console.log('Final math patterns for MathJax:');
    console.log('  - Display $$...$$:', (updated.match(/\$\$[\s\S]*?\$\$/g) || []).length);
    console.log('  - Inline $...$:', (updated.match(/\$[^$]+\$/g) || []).length);
    console.log('Contains tables:', /\|.*\|/.test(updated));
    console.groupEnd();
    
    return updated;
  }, [content]);

  // Check if content has special blocks that need custom handling
  const hasSpecialBlocks = /```(mermaid|html|mindmap)/.test(content);
  
  if (hasSpecialBlocks) {
    // Use the existing parser for special blocks, but let ReactMarkdown handle math in text blocks
    const parsedContent = parseMixedContent(content);
    const blocks = parsedContent.blocks;
    
    console.group('📝 SPECIAL BLOCKS DETECTED');
    console.log('Total blocks:', blocks.length);
    blocks.forEach((block, idx) => {
      console.log(`Block ${idx}:`, {
        type: block.type,
        contentLength: block.content.length,
        language: 'language' in block ? block.language : undefined
      });
    });
    console.groupEnd();
    
    // Create a unique identifier for this content rendering instance
    const contentHash = React.useMemo(() => {
      const baseHash = messageId || `content-${Date.now()}`;
      return `${baseHash}-blocks-${content.length}`;
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
          
          if (block.type === 'text') {
            // For text blocks, use ReactMarkdown with MathJax processing
            let textContent = block.content;
            
            // Apply preprocessing to text blocks for MathJax compatibility
            // Convert × symbol to \times and \text to \mathrm within math expressions
            textContent = textContent.replace(/\\\[([\s\S]*?)\\\]/g, (_, content) => {
              let cleanContent = content.replace(/×/g, '\\times');
              cleanContent = cleanContent.replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}');
              return `$$${cleanContent}$$`;
            });
            textContent = textContent.replace(/\\\((.*?)\\\)/g, (_, content) => {
              let cleanContent = content.replace(/×/g, '\\times');
              cleanContent = cleanContent.replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}');
              return `$${cleanContent}$`;
            });
            
            return (
              <MathJaxRenderer key={`text-${baseKey}`} messageId={messageId}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Custom components for enhanced table styling
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
                  {textContent}
                </ReactMarkdown>
              </MathJaxRenderer>
            );
          }
          
          // fallback
          return <span key={`fallback-${baseKey}`}>{block.content}</span>;
        })}
      </>
    );
  }

  // For content without special blocks, use unified ReactMarkdown approach with MathJax
  return (
    <MathJaxRenderer messageId={messageId}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Handle code blocks with language detection
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            
            if (lang === 'mermaid') {
              return <MermaidDiagram chart={String(children).trim()} />;
            }
            
            if (lang === 'html') {
              return <HtmlPreview htmlContent={String(children).trim()} isHistorical={true} />;
            }
            
            // For inline code, use simple styling
            if (!className) {
              return (
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
              );
            }
            
            return <CodeBlock code={String(children).trim()} language={lang} />;
          },
          // Enhanced table styling
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
        {processedContent}
      </ReactMarkdown>
    </MathJaxRenderer>
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
  console.log('Contains special blocks:', /```(mermaid|html|mindmap)/.test(content));
  console.groupEnd();

  // Auto-switch to enhanced rendering when stream ends (similar to HTML preview)
  useEffect(() => {
    if (isHistorical && !hasAutoSwitched && !showEnhancedRendering) {
      console.log('⏱️ Switching to enhanced rendering in 10ms');
      const timer = setTimeout(() => {
        setShowEnhancedRendering(true);
        setHasAutoSwitched(true);
      }, 10);      
      return () => clearTimeout(timer);
    }
  }, [isHistorical, hasAutoSwitched, showEnhancedRendering]);

  // For streaming content, show safe markdown rendering without math/highlighting
  if (!showEnhancedRendering) {
    // Conservative approach: Only enable safe markdown features
    // - Tables, lists, emphasis, headers (safe)
    // - NO code highlighting, NO math, NO HTML to avoid processing during streaming
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Only GitHub Flavored Markdown (tables, lists, etc.)
        rehypePlugins={[]} // No rehype plugins to avoid any processing risks
        components={{
          // Block all potentially dangerous elements during streaming
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