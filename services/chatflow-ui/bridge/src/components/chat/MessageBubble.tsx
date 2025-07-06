import React from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/joy';
import type { Message, StreamEvent } from '../../types/chat';
import AgentFlowTimeline from './AgentFlowTimeline';
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

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { content, sender, isStreaming = false, streamEvents, liveEvents, timeMetadata } = message;

  // Use liveEvents for real-time display during streaming, streamEvents for history
  const eventsToDisplay = isStreaming ? (liveEvents || []) : (streamEvents || []);

  // Determine if there is any visible content from tokens or the main content string.
  const hasVisibleContent = content || (eventsToDisplay.length > 0 && getAccumulatedTokenContent(eventsToDisplay));

  // Show a loading spinner if the bot is "thinking" but hasn't produced output yet.
  if (sender === 'bot' && isStreaming && !hasVisibleContent) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2,
        }}
      >
        <Box
          sx={{
            maxWidth: '85%',
            p: 2,
            borderRadius: 'lg',
            bgcolor: 'background.level1',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'sm',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <CircularProgress size="sm" />
        </Box>
      </Box>
    );
  }
  
  // If message has events to display, handle token accumulation and event rendering
  if (eventsToDisplay.length > 0) {
    const tokenContent = getAccumulatedTokenContent(eventsToDisplay);
    const hasAgentFlowEvents = eventsToDisplay.some(e => 
      e.event === 'agentFlowEvent' || 
      e.event === 'nextAgentFlow' || 
      e.event === 'agentFlowExecutedData' || 
      e.event === 'calledTools'
    );

    return (
      <Box>
        {/* Show agent flow timeline */}
        {hasAgentFlowEvents && (
          <AgentFlowTimeline 
            events={eventsToDisplay} 
            isStreaming={isStreaming}
            isCompact={isStreaming} // Compact view during streaming, full view after
          />
        )}
        
        {/* Render accumulated mixed content from tokens */}
        {tokenContent && <MixedContentRenderer content={tokenContent} />}
      </Box>
    );
  }

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
          bgcolor: sender === 'user' 
            ? (theme) => theme.palette.mode === 'light' ? '#fff6ed' : 'primary.500'
            : 'background.level1',
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