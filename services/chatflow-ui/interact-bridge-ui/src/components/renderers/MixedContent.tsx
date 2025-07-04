import { parseMixedContent } from '../../utils/contentParser';
import MermaidDiagram from '../renderers/MermaidDiagram';
import CodeBlock from '../renderers/CodeBlock';

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
        // Default to text
        return <span key={idx}>{block.content}</span>;
      })}
    </>
  );
};