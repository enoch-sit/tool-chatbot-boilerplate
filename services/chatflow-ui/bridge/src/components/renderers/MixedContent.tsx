import React from 'react';
import { parseMixedContent } from '../../utils/contentParser';
import MermaidDiagram from '../renderers/MermaidDiagram';
import CodeBlock from '../renderers/CodeBlock';
import HtmlPreview from '../renderers/HtmlPreview';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MixedContentRendererProps {
  content: string;
  messageId?: string; // Add optional message ID for better keying
  isHistorical?: boolean; // Flag to indicate this is from chat history
}

export const MixedContentRenderer: React.FC<MixedContentRendererProps> = ({ content, messageId, isHistorical = false }) => {
  const blocks = parseMixedContent(content);
  
  // Create a unique identifier for this content rendering instance
  const contentHash = React.useMemo(() => {
    const baseHash = messageId || `content-${Date.now()}`;
    const histFlag = isHistorical ? 'hist' : 'live';
    return `${baseHash}-${histFlag}-${content.length}-${content.substring(0, 20).replace(/\s/g, '')}`;
  }, [content, messageId, isHistorical]);
  
  return (
    <>
      {blocks.map((block, idx) => {
        // Create more unique keys that include content hash and block type
        const baseKey = `${contentHash}-${block.type}-${idx}`;
        
        if (block.type === 'mermaid') {
          // Use both content hash and chart content for uniqueness
          const mermaidKey = `mermaid-${contentHash}-${block.content.substring(0, 20).replace(/\s/g, '')}-${idx}`;
          console.log('🎨 Creating mermaid with key:', mermaidKey, isHistorical ? '(historical)' : '(live)');
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
          return <HtmlPreview key={`html-${baseKey}`} htmlContent={block.content} />;
        }
        // Render markdown for text blocks
        if (block.type === 'text') {
          return (
            <ReactMarkdown
              key={`text-${baseKey}`}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                // Optionally override code block rendering if needed
              }}
            >
              {block.content}
            </ReactMarkdown>
          );
        }
        // fallback
        return <span key={`fallback-${baseKey}`}>{block.content}</span>;
      })}
    </>
  );
};