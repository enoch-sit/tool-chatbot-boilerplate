import React, { useState, useRef } from 'react';
import { Box, Input, IconButton, Stack } from '@mui/joy';
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
  const { streamAssistantResponse, isStreaming } = useChatStore();
  const fileUploadRef = useRef<FileUploadRef>(null);

  const handleSubmit = () => {
    if ((prompt.trim() || pendingFiles.length > 0) && !isStreaming) {
      streamAssistantResponse(prompt, pendingFiles);
      setPrompt('');
      setPendingFiles([]);
      // Clear files from FileUpload component
      fileUploadRef.current?.clearFiles();
    }
  };

  const handleFilesSelected = (files: FileUploadData[]) => {
    setPendingFiles(files); // Files array now contains all files (existing + new)
  };

  return (
    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1}>
        <FileUpload
          ref={fileUploadRef}
          onFilesSelected={handleFilesSelected}
        />
        
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          placeholder={t('chat.typeMessage')}
          disabled={isStreaming}
          endDecorator={
            <IconButton 
              onClick={handleSubmit} 
              disabled={isStreaming || (!prompt.trim() && pendingFiles.length === 0)}
            >
              <SendIcon />
            </IconButton>
          }
        />
      </Stack>
    </Box>
  );
};

export default ChatInput;

