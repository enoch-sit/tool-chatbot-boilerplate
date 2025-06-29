// src/components/chat/MessageBubble.tsx
import React from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/joy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message } from '../../types/chat';
import CodeBlock from '../renderers/CodeBlock';
import MermaidDiagram from '../renderers/MermaidDiagram';
import 'highlight.js/styles/github-dark.css';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { content, sender, isStreaming = false, timeMetadata } = message;

  // Process content to handle special AI elements
  const processContent = (rawContent: string) => {
    // Extract and handle <thinking> tags from AI responses
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
    let processedContent = rawContent;
    const thinkingBlocks: string[] = [];

    // Extract thinking blocks
    let match;
    while ((match = thinkingRegex.exec(rawContent)) !== null) {
      thinkingBlocks.push(match[1].trim());
      processedContent = processedContent.replace(match[0], '').trim();
    }

    return { content: processedContent, thinkingBlocks };
  };

  const renderContent = () => {
    if (sender === 'user') {
      return <Typography>{content}</Typography>;
    }

    // Process AI response content
    const { content: mainContent, thinkingBlocks } = processContent(content);

    return (
      <Box>
        {/* Show thinking blocks if present */}
        {thinkingBlocks.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {thinkingBlocks.map((thinking, index) => (
              <Chip
                key={index}
                variant="soft"
                color="neutral"
                size="sm"
                sx={{ 
                  mb: 0.5, 
                  display: 'block', 
                  whiteSpace: 'normal',
                  fontSize: '0.75rem',
                  opacity: 0.7
                }}
              >
                💭 {thinking}
              </Chip>
            ))}
          </Box>
        )}

        {/* Render main content as markdown */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code({ node, className, children, ...props }) {
              if (node.type === 'inlineCode') {
                // Handle inline code
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              } else if (node.type === 'code') {
                // Handle block code
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                if (language === 'mermaid') {
                  return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                }
                return <CodeBlock code={String(children).replace(/\n$/, '')} language={language} />;
              }
              // Fallback (should not happen)
              return null;
            },
            // Style markdown elements for Joy UI
            h1: ({ children }) => <Typography level="h2" sx={{ my: 1.5 }}>{children}</Typography>,
            h2: ({ children }) => <Typography level="h3" sx={{ my: 1 }}>{children}</Typography>,
            h3: ({ children }) => <Typography level="h4" sx={{ my: 0.5 }}>{children}</Typography>,
            p: ({ children }) => <Typography sx={{ my: 0.5, lineHeight: 1.6 }}>{children}</Typography>,
            blockquote: ({ children }) => (
              <Box sx={{ 
                borderLeft: '3px solid',
                borderColor: 'primary.300',
                pl: 2,
                py: 0.5,
                my: 1,
                bgcolor: 'background.level1',
                borderRadius: 'sm',
                fontStyle: 'italic'
              }}>
                {children}
              </Box>
            ),
            ul: ({ children }) => <Box component="ul" sx={{ my: 0.5, pl: 3 }}>{children}</Box>,
            ol: ({ children }) => <Box component="ol" sx={{ my: 0.5, pl: 3 }}>{children}</Box>,
          }}
        >
          {mainContent}
        </ReactMarkdown>

        {/* Show streaming indicator */}
        {isStreaming && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, opacity: 0.7 }}>
            <CircularProgress size="sm" sx={{ mr: 1 }} />
            <Typography level="body-sm">Generating response...</Typography>
          </Box>
        )}

        {/* Show timing metadata if available */}
        {timeMetadata && !isStreaming && (
          <Typography level="body-xs" sx={{ mt: 0.5, opacity: 0.5 }}>
            Generated in {timeMetadata.delta}ms
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: sender === 'user' ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          p: 2,
          borderRadius: 'lg',
          bgcolor: sender === 'user' ? 'primary.500' : 'background.level1',
          color: sender === 'user' ? 'white' : 'text.primary',
          border: sender === 'bot' ? '1px solid' : 'none',
          borderColor: 'divider',
          boxShadow: sender === 'bot' ? 'sm' : 'none',
          // Add transition for smooth content updates during streaming
          transition: 'all 0.15s ease-out',
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
};

export default MessageBubble;