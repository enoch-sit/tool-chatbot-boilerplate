// src/components/chat/MessageBubble.tsx
import React from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/joy';
import type { Message, StreamEvent } from '../../types/chat';
import CodeBlock from '../renderers/CodeBlock';
import MermaidDiagram from '../renderers/MermaidDiagram';
import AgentFlowEventUI from './AgentFlowEventUI';
import NextAgentFlowUI from './NextAgentFlowUI';
import AgentFlowExecutedDataUI from './AgentFlowExecutedDataUI';
import CalledToolsUI from './CalledToolsUI';
import { MixedContentRenderer } from '../renderers/MixedContent';
import 'highlight.js/styles/github-dark.css';

interface MessageBubbleProps {
  message: Message;
}

// Helper to accumulate all token event data into a single string
const getAccumulatedTokenContent = (events: StreamEvent[]) => {
  return events
    .filter(e => e.event === 'token' && typeof e.data === 'string')
    .map(e => e.data)
    .join('');
};

const renderEvent = (event: StreamEvent) => {
  if (!('data' in event)) return null;
  switch (event.event) {
    case 'agentFlowEvent':
      return <AgentFlowEventUI data={event.data} />;
    case 'nextAgentFlow':
      return <NextAgentFlowUI data={event.data} />;
    case 'agentFlowExecutedData':
      return <AgentFlowExecutedDataUI data={event.data} />;
    case 'calledTools':
      return <CalledToolsUI data={event.data} />;
    // token events are handled in accumulation below
    default:
      return null;
  }
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  // If message has streamEvents, handle token accumulation and event rendering
  if (message.streamEvents) {
    // Accumulate all token data into a single string
    const tokenContent = getAccumulatedTokenContent(message.streamEvents);
    // Render all non-token events
    const nonTokenEvents = message.streamEvents.filter(e => e.event !== 'token');
    return (
      <Box>
        
        {/* Render special UI for other events */}
        {nonTokenEvents.map((event, idx) => (
          <div key={idx}>{renderEvent(event)}</div>
        ))}
        {/* Render accumulated mixed content from tokens */}
        {tokenContent && <MixedContentRenderer content={tokenContent} />}
      </Box>
    );
  }

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

        {/* Render main content as mixed content (markdown/code/mermaid) */}
        <MixedContentRenderer content={mainContent} />

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