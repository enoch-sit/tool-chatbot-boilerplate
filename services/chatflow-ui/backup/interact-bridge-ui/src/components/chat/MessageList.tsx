import React from 'react';
import { Box } from '@mui/joy';
import { useChatStore } from '../../store/chatStore';
import MessageBubble from './MessageBubble';

const MessageList: React.FC = () => {
  const messages = useChatStore((state) => state.messages);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      {messages.map((msg, idx) => (
        <MessageBubble key={String(msg.id) + String(idx)} message={msg} />
      ))}
    </Box>
  );
};

export default MessageList;

