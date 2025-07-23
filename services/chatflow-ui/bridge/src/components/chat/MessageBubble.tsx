import React from 'react';
import { Box, Typography, Chip, CircularProgress, Card, CardContent, Stack } from '@mui/joy';
import type { Message, StreamEvent } from '../../types/chat';
import type { FileUpload } from '../../types/api';
import AgentFlowTimeline from './AgentFlowTimeline';
import { MixedContentRenderer } from '../renderers/MixedContent';
import { FileService } from '../../services/fileService';
import { isImageUpload } from '../../utils/typeGuards';
import { AuthenticatedImage } from '../common/AuthenticatedImage';
import { AuthenticatedLink } from '../common/AuthenticatedLink';
import { useAuthStore } from '../../store/authStore';
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

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  return FileService.formatFileSize(bytes);
};

// Component to render file attachments with proper error handling
const FileAttachments: React.FC<{ uploads?: FileUpload[] }> = ({ uploads }) => {
  const tokens = useAuthStore(state => state.tokens);
  
  if (!uploads || uploads.length === 0) return null;

  const handleImageClick = async (upload: FileUpload) => {
    try {
      const token = tokens?.accessToken;
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(upload.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up after a delay to allow the window to load
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to open image:', error);
    }
  };

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {uploads.map((upload) => (
        <Card key={upload.file_id} size="sm" variant="outlined">
          <CardContent>
            {isImageUpload(upload) ? (
              <Box>
                <AuthenticatedImage
                  src={upload.url}
                  alt={upload.name}
                  size="medium"
                  style={{
                    maxWidth: '200px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleImageClick(upload)}
                  onError={() => {
                    // Silent error handling
                  }}
                />
                <Typography level="body-xs" sx={{ mt: 0.5, textAlign: 'center' }}>
                  {upload.name}
                </Typography>
              </Box>
            ) : (
              <AuthenticatedLink
                href={upload.download_url || upload.url}
                download={upload.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                }}
              >
                📄 {upload.name}
              </AuthenticatedLink>
            )}
            <Typography level="body-xs" sx={{ mt: 0.5 }}>
              {formatFileSize(upload.size)}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { content, sender, isStreaming = false, streamEvents, liveEvents, timeMetadata, uploads } = message;

  // Detect if this is a historical message (not streaming and has streamEvents)
  const isHistorical = !isStreaming && ((streamEvents?.length ?? 0) > 0 || (!liveEvents || liveEvents.length === 0));

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
        {tokenContent && <MixedContentRenderer content={tokenContent} messageId={message.id} isHistorical={isHistorical} />}
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
      return (
        <Box>
          <Typography>{content}</Typography>
          <FileAttachments uploads={uploads} />
        </Box>
      );
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
        <MixedContentRenderer content={mainContent} messageId={message.id} isHistorical={isHistorical} />

        {/* Show file attachments for AI responses if any */}
        <FileAttachments uploads={uploads} />

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