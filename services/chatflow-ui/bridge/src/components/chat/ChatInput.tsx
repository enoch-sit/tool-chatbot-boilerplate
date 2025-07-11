import React, { useState } from 'react';
import { Box, Input, IconButton } from '@mui/joy';
import SendIcon from '@mui/icons-material/Send';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from 'react-i18next';

const ChatInput: React.FC = () => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const streamAssistantResponse = useChatStore((state) => state.streamAssistantResponse);
  const isStreaming = useChatStore((state) => state.isStreaming);

  const handleSubmit = () => {
    if (prompt.trim() && !isStreaming) {
      streamAssistantResponse(prompt);
      setPrompt('');
    }
  };

  return (
    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
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
          <IconButton onClick={handleSubmit} disabled={isStreaming}>
            <SendIcon />
          </IconButton>
        }
      />
    </Box>
  );
};

export default ChatInput;

