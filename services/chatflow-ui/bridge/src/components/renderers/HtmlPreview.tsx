import React from 'react';
import CodeBlock from './CodeBlock';

interface HtmlPreviewProps {
  htmlContent: string;
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ htmlContent }) => {
  // Simply render HTML as a code block with syntax highlighting
  return (
    <CodeBlock 
      code={htmlContent} 
      language="html" 
    />
  );
};

export default HtmlPreview;
