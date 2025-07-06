import React from 'react';
import { parseMixedContent } from '../../utils/contentParser';
import MermaidDiagram from '../renderers/MermaidDiagram';
import CodeBlock from '../renderers/CodeBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MixedContentRendererProps {
  content: string;
}

export const MixedContentRenderer: React.FC<MixedContentRendererProps> = ({ content }) => {
  const blocks = parseMixedContent(content);
  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === 'mermaid') {
          return <MermaidDiagram key={idx} chart={block.content} />;
        }
        if (block.type === 'code') {
          return <CodeBlock key={idx} code={block.content} language={block.language} />;
        }
        // Render markdown for text blocks
        if (block.type === 'text') {
          return (
            <ReactMarkdown
              key={idx}
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
        return <span key={idx}>{block.content}</span>;
      })}
    </>
  );
};
