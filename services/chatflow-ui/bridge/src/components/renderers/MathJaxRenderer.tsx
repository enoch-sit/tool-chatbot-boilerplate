import React from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';

interface MathJaxRendererProps {
  children: React.ReactNode;
  messageId?: string;
}

/**
 * MathJax-based math renderer that automatically processes math content.
 * Uses better-react-mathjax for reliable math rendering with auto-detection.
 */
const MathJaxRenderer: React.FC<MathJaxRendererProps> = ({ 
  children,
}) => {
  // MathJax configuration optimized for our use case
  const config = {
    loader: { load: ['[tex]/html'] },
    tex: {
      packages: { '[+]': ['html'] },
      inlineMath: [
        ['$', '$'],
        ['\\(', '\\)']
      ],
      displayMath: [
        ['$$', '$$'],
        ['\\[', '\\]']
      ],
      processEscapes: true,
      processEnvironments: true,
      maxMacros: 1000, // Limit macro expansions to prevent infinite recursion
      // Minimal macro support to avoid recursion issues
      macros: {}
    },
    options: {
      enableMenu: false, // Disable right-click menu for cleaner UX
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'code', 'pre'],
      ignoreHtmlClass: 'no-mathjax'
    },
    startup: {
      typeset: false // We'll handle typesetting manually for better control
    }
  };

  return (
    <MathJaxContext config={config}>
      <MathJax 
        dynamic={true} // Enable dynamic typesetting for streaming content
        hideUntilTypeset="first" // Hide content until first typeset for smoother experience
      >
        {children}
      </MathJax>
    </MathJaxContext>
  );
};

export default MathJaxRenderer;
