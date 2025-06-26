import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        // The render function takes an ID, but we can use a dummy one since we are capturing the SVG directly.
        const { svg: renderedSvg } = await mermaid.render('mermaid-graph', chart);
        setSvg(renderedSvg);
      } catch (error) {
        console.error('Mermaid rendering failed:', error);
        setSvg('<p>Error rendering diagram.</p>');
      }
    };
    renderDiagram();
  }, [chart]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default MermaidDiagram;

