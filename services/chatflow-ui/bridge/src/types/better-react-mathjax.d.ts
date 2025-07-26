declare module 'better-react-mathjax' {
  import React from 'react';

  export interface MathJaxContextProps {
    children: React.ReactNode;
    version?: 2 | 3;
    config?: Record<string, unknown>;
    src?: string;
    startup?: {
      ready?: () => void;
    };
  }

  export interface MathJaxProps {
    children: React.ReactNode;
    inline?: boolean;
    dynamic?: boolean;
    hideUntilTypeset?: 'first' | 'every' | 'none';
  }

  export const MathJaxContext: React.FC<MathJaxContextProps>;
  export const MathJax: React.FC<MathJaxProps>;
}
