import React, { useState, useRef, useEffect } from 'react';
import { Box, Textarea, IconButton, Stack, Button, Tooltip, Select, Option } from '@mui/joy';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import LanguageIcon from '@mui/icons-material/Language';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from 'react-i18next';
import FileUpload from './FileUpload';
import type { FileUploadData } from '../../services/fileService';
import type { FileUploadRef } from './FileUpload';

const ChatInput: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileUploadData[]>([]);
  const [voiceLanguage, setVoiceLanguage] = useState('zh-TW'); // Default to Traditional Chinese
  const [lastTranscript, setLastTranscript] = useState(''); // Track last processed transcript
  const [cursorPosition, setCursorPosition] = useState(0); // Track cursor position for voice insertion
  const [isSubmitting, setIsSubmitting] = useState(false); // Track if we're in the process of submitting
  const { streamAssistantResponse, isStreaming, currentSession, currentChatflow } = useChatStore();
  const fileUploadRef = useRef<FileUploadRef>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Speech recognition hooks
  const {
    finalTranscript,
    interimTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Available voice languages
  const voiceLanguages = [
    { value: 'auto', label: t('chat.autoDetect'), flag: '🌐' },
    { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { value: 'zh-CN', label: '中文 (简体)', flag: '🇨🇳' },
    { value: 'zh-TW', label: '中文 (繁體)', flag: '🇹🇼' },
    { value: 'es-ES', label: 'Español', flag: '🇪🇸' },
    { value: 'fr-FR', label: 'Français', flag: '🇫🇷' },
    { value: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'ja-JP', label: '日本語', flag: '🇯🇵' },
    { value: 'ko-KR', label: '한국어', flag: '🇰🇷' },
  ];

  // Get speech recognition language based on current locale or user selection
  const getSpeechLanguage = () => {
    if (voiceLanguage === 'auto') {
      switch (i18n.language) {
        case 'zh-Hans':
          return 'zh-CN';
        case 'zh-Hant':
          return 'zh-TW';
        case 'en':
        default:
          return 'en-US';
      }
    }
    return voiceLanguage;
  };

  // Update prompt when transcript changes - use finalTranscript to avoid duplication
  useEffect(() => {
    // Don't process transcript if we're in the middle of submitting
    if (isSubmitting) {
      return;
    }
    
    // Only process final transcript to avoid progressive duplication
    if (finalTranscript && finalTranscript !== lastTranscript) {
      // Check if this is truly new content or just a repeat of existing content
      const newText = finalTranscript.slice(lastTranscript.length);
      
      // Additional safety check: ensure we're not adding duplicate content
      if (newText && newText.trim()) {
        let spaceAdded = 0;
        
        setPrompt(prev => {
          // Check if the new text is already at the end of the current prompt
          const trimmedNewText = newText.trim();
          if (prev.endsWith(trimmedNewText)) {
            // This content is already in the prompt, don't add it again
            console.log('Duplicate content detected, skipping:', trimmedNewText);
            return prev;
          }
          
          // Insert text at cursor position
          const beforeCursor = prev.slice(0, cursorPosition);
          const afterCursor = prev.slice(cursorPosition);
          
          // Smart spacing logic - only add space for word boundaries in languages that use spaces
          let textToInsert = newText;
          const currentLang = getSpeechLanguage();
          
          // Only add automatic spacing for languages that use spaces (English, etc.)
          // Skip automatic spacing for Chinese, Japanese, Korean
          if (currentLang.startsWith('en') || currentLang.startsWith('es') || currentLang.startsWith('fr') || currentLang.startsWith('de')) {
            if (beforeCursor && !beforeCursor.endsWith(' ') && !newText.startsWith(' ') && !newText.startsWith(' ')) {
              textToInsert = ' ' + newText;
              spaceAdded = 1;
            }
          }
          
          return beforeCursor + textToInsert + afterCursor;
        });
        
        // Update cursor position to be after the inserted text
        setCursorPosition(prev => prev + newText.length + spaceAdded);
        setLastTranscript(finalTranscript);
      }
    }
  }, [finalTranscript, lastTranscript, cursorPosition, isSubmitting]);

  // Speech recognition controls
  const startListening = () => {
    // Capture current cursor position before starting voice input
    const textarea = inputRef.current?.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      setCursorPosition(textarea.selectionStart || prompt.length);
    }
    
    // Clear previous transcript tracking completely
    resetTranscript();
    setLastTranscript('');
    
    SpeechRecognition.startListening({ 
      continuous: true,
      language: getSpeechLanguage()
    });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    // Reset transcript tracking when stopping to prevent accumulation
    setLastTranscript('');
    // Also reset the transcript completely to avoid any residual state
    setTimeout(() => {
      resetTranscript();
    }, 100);
  };

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
                if (!isStreaming && document.activeElement !== retryTextarea) {
                  console.log('Trying aggressive focus approach after streaming ended');
                  if (retryTextarea) {
                    retryTextarea.blur();
                    setTimeout(() => {
                      retryTextarea.focus();
                      retryTextarea.click();
                      // Check if aggressive approach worked
                      setTimeout(() => {
                        if (document.activeElement === retryTextarea) {
                          // hasSuccessfulAggressiveFocus.current = true;
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
      // Set submitting flag to prevent transcript updates during submission
      setIsSubmitting(true);
      
      // Stop listening when sending message
      if (listening) {
        stopListening();
      }
      
      // Clear the prompt immediately to prevent race conditions
      const messageToSend = prompt;
      setPrompt('');
      
      // Send the message
      streamAssistantResponse(messageToSend, pendingFiles);
      setPendingFiles([]);
      
      // Clear files from FileUpload component
      fileUploadRef.current?.clearFiles();
      
      // Reset submitting flag after a short delay to allow speech recognition to settle
      setTimeout(() => {
        setIsSubmitting(false);
      }, 500);
      
      // Focus will happen when streaming ends
    }
  };

  const handleFilesSelected = (files: FileUploadData[]) => {
    setPendingFiles(files); // Files array now contains all files (existing + new)
  };

  const handleQuickReply = (message: string) => {
    // Send the quick reply message immediately
    streamAssistantResponse(message, pendingFiles);
    setPendingFiles([]);
    fileUploadRef.current?.clearFiles();
  };

  const handleInputClick = () => {
    // Ensure focus when input is clicked and update cursor position
    focusInput();
    const textarea = inputRef.current?.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      // Update cursor position after a short delay to ensure click has been processed
      setTimeout(() => {
        setCursorPosition(textarea.selectionStart || 0);
      }, 10);
    }
  };

  const handleCursorChange = (e: React.SyntheticEvent) => {
    // Update cursor position when user clicks or uses arrow keys
    const textarea = e.currentTarget.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      setCursorPosition(textarea.selectionStart || 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Set submitting flag immediately to prevent race conditions
      setIsSubmitting(true);
      
      // Stop listening when sending message via Enter key
      if (listening) {
        stopListening();
      }
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
        />
        
        {/* Voice recognition status */}
        {listening && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            color: 'danger.500',
            fontSize: 'sm'
          }}>
            <MicIcon sx={{ fontSize: 16 }} />
            {t('chat.listening')}
          </Box>
        )}
        
        {/* Browser support warning */}
        {!browserSupportsSpeechRecognition && (
          <Box sx={{ 
            fontSize: 'xs', 
            color: 'warning.500',
            textAlign: 'center'
          }}>
            {t('chat.voiceNotSupported')}
          </Box>
        )}
        
        {/* Quick reply buttons */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <Button
            variant="soft"
            size="sm"
            onClick={() => handleQuickReply(t('chat.quickReplies.good'))}
            disabled={isStreaming}
            sx={{ minWidth: 'auto' }}
          >
            👍 {t('chat.quickReplies.good')}
          </Button>
          
          <Button
            variant="soft"
            size="sm"
            onClick={() => handleQuickReply(t('chat.quickReplies.letsLearn'))}
            disabled={isStreaming}
            sx={{ minWidth: 'auto' }}
          >
            📚 {t('chat.quickReplies.letsLearn')}
          </Button>
          
          <Button
            variant="soft"
            size="sm"
            onClick={() => handleQuickReply(t('chat.quickReplies.pleaseRecommend'))}
            disabled={isStreaming}
            sx={{ minWidth: 'auto' }}
          >
            🤔 {t('chat.quickReplies.pleaseRecommend')}
          </Button>
          
          <Button
            variant="soft"
            size="sm"
            onClick={() => handleQuickReply(t('chat.quickReplies.pleaseContinue'))}
            disabled={isStreaming}
            sx={{ minWidth: 'auto' }}
          >
            ➡️ {t('chat.quickReplies.pleaseContinue')}
          </Button>
          
          <Button
            variant="soft"
            size="sm"
            onClick={() => handleQuickReply(t('chat.quickReplies.letsJustChat'))}
            disabled={isStreaming}
            sx={{ minWidth: 'auto' }}
          >
            💬 {t('chat.quickReplies.letsJustChat')}
          </Button>
        </Stack>
        
        <Box sx={{ position: 'relative' }}>
          <Textarea
            ref={inputRef}
            autoFocus={!isStreaming}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              // Update cursor position when text changes
              const textarea = e.target;
              setCursorPosition(textarea.selectionStart || 0);
            }}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            onSelect={handleCursorChange}
            onKeyUp={handleCursorChange}
            placeholder={`${t('chat.typeMessage')}\n${t('chat.sendShortcut')}`}
            disabled={isStreaming}
            minRows={2}
            maxRows={8}
            sx={{ 
              pr: browserSupportsSpeechRecognition ? '180px' : '120px', // More space when mic is available
              '& textarea': {
                resize: 'none',
                lineHeight: '1.4'
              }
            }}
          />
          
          {/* Real-time speech recognition preview popup */}
          {listening && interimTranscript && (
            <Box sx={{
              position: 'absolute',
              bottom: '100%',
              left: 8,
              right: 8,
              mb: 1,
              backgroundColor: 'background.popup',
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder',
              borderRadius: 'sm',
              boxShadow: 'md',
              p: 1.5,
              zIndex: 1000,
              fontSize: 'sm',
              fontStyle: 'italic',
              color: 'text.secondary'
            }}>
              <Box sx={{ fontSize: 'xs', color: 'text.tertiary', mb: 0.5 }}>
                {t('chat.recognizing')}...
              </Box>
              "{interimTranscript}"
            </Box>
          )}
          
          {/* Language selector, Microphone and Send buttons */}
          <Box sx={{ 
            position: 'absolute', 
            right: 8, 
            bottom: 8,
            display: 'flex',
            gap: 0.5,
            alignItems: 'center'
          }}>
            {/* Voice language selector */}
            {browserSupportsSpeechRecognition && (
              <Select
                value={voiceLanguage}
                onChange={(_, value) => setVoiceLanguage(value as string)}
                size="sm"
                disabled={listening || isStreaming}
                sx={{ 
                  minWidth: 80,
                  maxWidth: 100,
                  '& .MuiSelect-button': {
                    fontSize: '12px'
                  }
                }}
                startDecorator={<LanguageIcon sx={{ fontSize: 14 }} />}
              >
                {voiceLanguages.map((lang) => (
                  <Option key={lang.value} value={lang.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span style={{ fontSize: '12px' }}>{lang.flag}</span>
                      <span style={{ fontSize: '11px' }}>{lang.value === 'auto' ? 'Auto' : lang.value}</span>
                    </Box>
                  </Option>
                ))}
              </Select>
            )}
            
            {/* Microphone button with stop button when listening */}
            {browserSupportsSpeechRecognition && (
              <Box sx={{ display: 'flex', gap: 0.25 }}>
                <Tooltip title={listening ? t('chat.listening') : t('chat.startListening')}>
                  <IconButton 
                    onClick={startListening} 
                    disabled={isStreaming || listening}
                    size="sm"
                    color={listening ? "danger" : "neutral"}
                    variant={listening ? "solid" : "soft"}
                  >
                    <MicIcon />
                  </IconButton>
                </Tooltip>
                
                {/* Stop button - only show when listening */}
                {listening && (
                  <Tooltip title={t('chat.stopListening')}>
                    <IconButton 
                      onClick={stopListening}
                      size="sm"
                      color="danger"
                      variant="soft"
                    >
                      <StopIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
            
            {/* Send button */}
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

