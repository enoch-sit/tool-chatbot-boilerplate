/// <reference types="vite/client" />

// Extend ImportMeta to include env property
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_FLOWISE_PROXY_API_URL?: string;
  // more env variables...
}

// CSS modules
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Prism.js CSS
declare module 'prismjs/themes/prism-tomorrow.css';

// Highlight.js CSS
declare module 'highlight.js/styles/github-dark.css';
