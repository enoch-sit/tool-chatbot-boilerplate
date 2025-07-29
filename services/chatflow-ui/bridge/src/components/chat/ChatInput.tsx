import React, { useState, useRef, useEffect } from 'react';
import { Box, Textarea, IconButton, Stack } from '@mui/joy';
import SendIcon from '@mui/icons-material/Send';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from 'react-i18next';
import FileUpload from './FileUpload';
import type { FileUploadData } from '../../services/fileService';
import type { FileUploadRef } from './FileUpload';

const ChatInput: React.FC = () => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileUploadData[]>([]);
  const { streamAssistantResponse, isStreaming, currentSession, currentChatflow } = useChatStore();
  const fileUploadRef = useRef<FileUploadRef>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const hasSuccessfulAggressiveFocus = useRef(false); // Track if aggressive approach ever worked

  // Helper function to safely focus the input
  const focusInput = (forceAttempt = false) => {
    // Double check streaming state before attempting focus
    if (isStreaming && !forceAttempt) {
      return;
    }

    if (inputRef.current) {
      try {
        const textarea = inputRef.current.querySelector('textarea');
        if (textarea && !textarea.disabled) {
          textarea.focus();
        }
      } catch (error) {
        console.warn('Failed to focus input:', error);
      }
    }
  };

  // Autofocus the input when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      focusInput();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Refocus when session or chatflow changes (new chat, session switched, or chatflow selected)
  useEffect(() => {
    const timer = setTimeout(() => {
      focusInput();
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentSession?.session_id, currentChatflow?.id]);

  // Separate effect for when session becomes null (new chat)
  useEffect(() => {
    if (currentSession === null && currentChatflow) {
      const timer = setTimeout(() => {
        focusInput(true); // Force attempt even during streaming
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentSession, currentChatflow]);

  // Refocus when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      // First attempt after 1.5 seconds
      const timer1 = setTimeout(() => {
        if (!isStreaming) {
          console.log('First focus attempt after streaming ended');
          const textarea = inputRef.current?.querySelector('textarea');
          textarea?.focus();
          
          // Second attempt after another 1 second if first didn't work
          setTimeout(() => {
            const currentTextarea = inputRef.current?.querySelector('textarea');
            if (!isStreaming && document.activeElement !== currentTextarea) {
              console.log('Second focus attempt after streaming ended');
              currentTextarea?.focus();
              
              // Third aggressive attempt if second failed and we haven't succeeded before
              setTimeout(() => {
                const retryTextarea = inputRef.current?.querySelector('textarea');
                if (!isStreaming && document.activeElement !== retryTextarea && !hasSuccessfulAggressiveFocus.current) {
                  console.log('Trying aggressive focus approach after streaming ended');
                  if (retryTextarea) {
                    retryTextarea.blur();
                    setTimeout(() => {
                      retryTextarea.focus();
                      retryTextarea.click();
                      // Check if aggressive approach worked
                      setTimeout(() => {
                        if (document.activeElement === retryTextarea) {
                          hasSuccessfulAggressiveFocus.current = true;
                          console.log('Aggressive focus succeeded - will skip aggressive approach in future');
                        }
                      }, 100);
                    }, 100);
                  }
                }
              }, 1000);
            }
          }, 1000);
        }
      }, 1500);
      return () => clearTimeout(timer1);
    }
  }, [isStreaming]);

  const handleSubmit = () => {
    if (prompt.trim() && !isStreaming) {
      streamAssistantResponse(prompt, pendingFiles);
      setPrompt('');
      setPendingFiles([]);
      // Clear files from FileUpload component
      fileUploadRef.current?.clearFiles();
      // Focus will happen when streaming ends
    }
  };

  const handleFilesSelected = (files: FileUploadData[]) => {
    setPendingFiles(files); // Files array now contains all files (existing + new)
  };

  const handleQuickReply = (message: string) => {
    setPrompt(message);
    // Automatically send the quick reply
    streamAssistantResponse(message, pendingFiles);
    setPendingFiles([]);
    fileUploadRef.current?.clearFiles();
  };

  const handleInputClick = () => {
    // Ensure focus when input is clicked
    focusInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Shift+Enter allows new line (default behavior)
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={1}>
        <FileUpload
          ref={fileUploadRef}
          onFilesSelected={handleFilesSelected}
          onQuickReply={handleQuickReply}
        />
        
        <Box sx={{ position: 'relative' }}>
          <Textarea
            ref={inputRef}
            autoFocus={!isStreaming}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            placeholder={`${t('chat.typeMessage')}\n${t('chat.sendShortcut')}`}
            disabled={isStreaming}
            minRows={2}
            maxRows={8}
            sx={{ 
              pr: '60px', // Space for send button only
              '& textarea': {
                resize: 'none',
                lineHeight: '1.4'
              }
            }}
          />
          
          {/* Send button only */}
          <Box sx={{ 
            position: 'absolute', 
            right: 8, 
            bottom: 8
          }}>
            <IconButton 
              onClick={handleSubmit} 
              disabled={isStreaming || !prompt.trim()}
              size="sm"
              color="primary"
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default ChatInput;

