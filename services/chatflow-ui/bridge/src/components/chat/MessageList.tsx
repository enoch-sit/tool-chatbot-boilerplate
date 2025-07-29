import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/joy';
import { useChatStore } from '../../store/chatStore';
import MessageBubble from './MessageBubble';

const MessageList: React.FC = () => {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  return (
    <Box sx={{ 
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      p: 2,
    }}>
      {messages.map((msg, idx) => (
        <MessageBubble key={String(msg.id) + String(idx)} message={msg} />
      ))}
      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;

