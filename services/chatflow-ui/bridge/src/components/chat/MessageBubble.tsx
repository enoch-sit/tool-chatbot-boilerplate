import React, { useState } from 'react';
import { Box, Typography, Chip, CircularProgress, Card, CardContent, Stack, Button, IconButton, Tooltip } from '@mui/joy';
import type { Message, StreamEvent } from '../../types/chat';
import type { FileUpload } from '../../types/api';
import AgentFlowTimeline from './AgentFlowTimeline';
import { MixedContentRenderer } from '../renderers/MixedContent';
import { FileService } from '../../services/fileService';
import { isImageUpload } from '../../utils/typeGuards';
import { AuthenticatedImage } from '../common/AuthenticatedImage';
import { AuthenticatedLink } from '../common/AuthenticatedLink';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from 'react-i18next';
import { usePinStore } from '../../store/pinStore';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
  const { t } = useTranslation();
  const { streamAssistantResponse } = useChatStore();
  const { pinMessage, unpinMessage, isPinned, pinHtmlSection, unpinHtmlSection, isHtmlSectionPinned } = usePinStore();
  const [isHovered, setIsHovered] = useState(false);

  const messageIsPinned = message.id ? isPinned(message.id) : false;

  const handlePinClick = () => {
    if (message.id) {
      if (messageIsPinned) {
        unpinMessage(message.id);
      } else {
        pinMessage(message);
      }
    }
  };

  // HTML section handlers
  const handlePinHtml = (htmlContent: string) => {
    if (message.id) {
      if (isHtmlSectionPinned(htmlContent)) {
        // Find and unpin the specific HTML section
        const sections = usePinStore.getState().pinnedHtmlSections;
        const section = sections.find(s => s.htmlContent === htmlContent);
        if (section) {
          unpinHtmlSection(section.sectionId);
        }
      } else {
        pinHtmlSection(message.id, htmlContent);
      }
    }
  };

  const handleCopyHtml = async (htmlContent: string) => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      console.log('✅ HTML content copied successfully');
    } catch (err) {
      console.error('❌ Failed to copy HTML: ', err);
    }
  };

  const handleCopyClick = async () => {
    try {
      // Determine what content to copy based on message type
      let contentToCopy = '';
      
      // If this is a streaming/event-based message, get the accumulated token content
      if (eventsToDisplay.length > 0) {
        const tokenContent = getAccumulatedTokenContent(eventsToDisplay);
        if (tokenContent) {
          contentToCopy = tokenContent;
        }
      }
      
      // Fall back to message content if no token content
      if (!contentToCopy && message.content) {
        contentToCopy = message.content;
      }
      
      if (!contentToCopy) {
        console.warn('⚠️ No content to copy');
        return;
      }
      
      // Copy to clipboard
      await navigator.clipboard.writeText(contentToCopy);
      console.log('✅ Message copied successfully');
      
    } catch (err) {
      console.error('❌ Failed to copy text: ', err);
      
      // Fallback: try the older execCommand method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = message.content || '';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('✅ Message copied using fallback method');
      } catch (fallbackErr) {
        console.error('❌ Fallback copy method also failed:', fallbackErr);
      }
    }
  };

  // Detect if this is a historical message (not streaming and has streamEvents)
  const isHistorical = !isStreaming && ((streamEvents?.length ?? 0) > 0 || (!liveEvents || liveEvents.length === 0));

  // Use liveEvents for real-time display during streaming, streamEvents for history
  const eventsToDisplay = isStreaming ? (liveEvents || []) : (streamEvents || []);

  // Determine if there is any visible content from tokens or the main content string.
  const hasVisibleContent = content || (eventsToDisplay.length > 0 && getAccumulatedTokenContent(eventsToDisplay));

  // Handle quick reply button clicks
  const handleQuickReply = (message: string) => {
    streamAssistantResponse(message);
  };

  // Show a loading spinner if the bot is "thinking" but hasn't produced output yet.
  if (sender === 'bot' && isStreaming && !hasVisibleContent) {
    return (
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          mb: 2,
          width: '100%',
          position: 'relative',
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
            position: 'relative',
          }}
        >
          <CircularProgress size="sm" />

          {/* Action buttons positioned absolutely at bottom of loading bubble */}
          {isHovered && (
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                position: 'absolute',
                bottom: 4,
                right: 8,
                opacity: 1,
                transition: 'opacity 0.2s',
                bgcolor: 'rgba(0,0,0,0.1)',
                borderRadius: 'md',
                p: 0.5,
              }}
            >
              <Tooltip title={t('chat.copyMessage')}>
                <IconButton
                  size="sm"
                  variant="soft"
                  color="neutral"
                  onClick={handleCopyClick}
                  disabled={!content} // Disable if no content to copy yet
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.8)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                    minHeight: '24px',
                    minWidth: '24px',
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={message.id ? (messageIsPinned ? t('chat.unpinMessage') : t('chat.pinMessage')) : 'No ID - Cannot pin'}>
                <IconButton
                  size="sm"
                  variant="soft"
                  color={messageIsPinned ? 'primary' : 'neutral'}
                  onClick={handlePinClick}
                  disabled={!message.id}
                  sx={{ 
                    bgcolor: messageIsPinned ? 'rgba(25,118,210,0.8)' : 'rgba(255,255,255,0.8)',
                    opacity: message.id ? 1 : 0.5,
                    '&:hover': { 
                      bgcolor: messageIsPinned ? 'rgba(25,118,210,1)' : 'rgba(255,255,255,1)'
                    },
                    minHeight: '24px',
                    minWidth: '24px',
                  }}
                >
                  {messageIsPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          )}
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
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: sender === 'user' ? 'flex-end' : 'flex-start',
          mb: 2,
          width: '100%',
          position: 'relative',
        }}
      >
        <Box sx={{ 
          maxWidth: '85%',
          position: 'relative',
          p: 2,
          borderRadius: 'lg',
          bgcolor: sender === 'user' 
            ? (theme) => theme.palette.mode === 'light' ? '#fff6ed' : 'primary.500'
            : 'background.level1',
          color: sender === 'user' ? 'white' : 'text.primary',
          border: sender === 'bot' ? '1px solid' : 'none',
          borderColor: 'divider',
          boxShadow: sender === 'bot' ? 'sm' : 'none',
        }}>
          {/* Show agent flow timeline */}
          {hasAgentFlowEvents && (
            <AgentFlowTimeline 
              events={eventsToDisplay} 
              isStreaming={isStreaming}
              isCompact={isStreaming} // Compact view during streaming, full view after
            />
          )}
          
          {/* Render accumulated mixed content from tokens */}
          {tokenContent && (
            <MixedContentRenderer 
              content={tokenContent} 
              messageId={message.id} 
              isHistorical={isHistorical}
              onPinHtml={handlePinHtml}
              onCopyHtml={handleCopyHtml}
              isHtmlPinned={isHtmlSectionPinned}
            />
          )}

          {/* Action buttons positioned absolutely at bottom of message bubble */}
          {(isHovered || messageIsPinned) && (
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                position: 'absolute',
                bottom: 4,
                right: 8,
                opacity: (isHovered || messageIsPinned) ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out',
                bgcolor: 'rgba(0,0,0,0.1)',
                borderRadius: 'md',
                p: 0.5,
              }}
            >
              {isHovered && (
                <Tooltip title={t('chat.copyMessage')}>
                  <IconButton
                    size="sm"
                    variant="soft"
                    color="neutral"
                    onClick={handleCopyClick}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                      minHeight: '24px',
                      minWidth: '24px',
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {(isHovered || messageIsPinned) && message.id && (
                <Tooltip title={messageIsPinned ? t('chat.unpinMessage') : t('chat.pinMessage')}>
                  <IconButton
                    size="sm"
                    variant="soft"
                    color={messageIsPinned ? 'primary' : 'neutral'}
                    onClick={handlePinClick}
                    sx={{ 
                      bgcolor: messageIsPinned ? 'rgba(25,118,210,0.8)' : 'rgba(255,255,255,0.8)',
                      '&:hover': { 
                        bgcolor: messageIsPinned ? 'rgba(25,118,210,1)' : 'rgba(255,255,255,1)'
                      },
                      minHeight: '24px',
                      minWidth: '24px',
                    }}
                  >
                    {messageIsPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Box>
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
        <MixedContentRenderer 
          content={mainContent} 
          messageId={message.id} 
          isHistorical={isHistorical}
          onPinHtml={handlePinHtml}
          onCopyHtml={handleCopyHtml}
          isHtmlPinned={isHtmlSectionPinned}
        />

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

        {/* Quick reply buttons for bot messages when not streaming */}
        {sender === 'bot' && !isStreaming && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            <Button
              variant="soft"
              size="sm"
              onClick={() => handleQuickReply(t('chat.quickReplies.good'))}
              sx={{ minWidth: 'auto' }}
            >
              👍 {t('chat.quickReplies.good')}
            </Button>
            
            <Button
              variant="soft"
              size="sm"
              onClick={() => handleQuickReply(t('chat.quickReplies.letsLearn'))}
              sx={{ minWidth: 'auto' }}
            >
              📚 {t('chat.quickReplies.letsLearn')}
            </Button>
            
            <Button
              variant="soft"
              size="sm"
              onClick={() => handleQuickReply(t('chat.quickReplies.pleaseRecommend'))}
              sx={{ minWidth: 'auto' }}
            >
              🤔 {t('chat.quickReplies.pleaseRecommend')}
            </Button>
          </Stack>
        )}
      </Box>
    );
  };

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: sender === 'user' ? 'flex-end' : 'flex-start',
        mb: 2,
        width: '100%',
        position: 'relative',
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
          transition: 'all 0.15s ease-out',
          position: 'relative',
        }}
      >
        {renderContent()}
        
        {/* Action buttons positioned absolutely at bottom of message bubble */}
        {(isHovered || messageIsPinned) && (
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              position: 'absolute',
              bottom: 4,
              right: 8,
              opacity: (isHovered || messageIsPinned) ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
              bgcolor: 'rgba(0,0,0,0.1)',
              borderRadius: 'md',
              p: 0.5,
            }}
          >
            {isHovered && (
              <Tooltip title={t('chat.copyMessage')}>
                <IconButton
                  size="sm"
                  variant="soft"
                  color="neutral"
                  onClick={handleCopyClick}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.8)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                    minHeight: '24px',
                    minWidth: '24px',
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {(isHovered || messageIsPinned) && message.id && (
              <Tooltip title={messageIsPinned ? t('chat.unpinMessage') : t('chat.pinMessage')}>
                <IconButton
                  size="sm"
                  variant="soft"
                  color={messageIsPinned ? 'primary' : 'neutral'}
                  onClick={handlePinClick}
                  sx={{ 
                    bgcolor: messageIsPinned ? 'rgba(25,118,210,0.8)' : 'rgba(255,255,255,0.8)',
                    '&:hover': { 
                      bgcolor: messageIsPinned ? 'rgba(25,118,210,1)' : 'rgba(255,255,255,1)'
                    },
                    minHeight: '24px',
                    minWidth: '24px',
                  }}
                >
                  {messageIsPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default MessageBubble;