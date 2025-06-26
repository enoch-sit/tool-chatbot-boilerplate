import React from 'react';
import { Box, Typography } from '@mui/joy';
import type { Message } from '../../types/chat';
import CodeBlock from '../renderers/CodeBlock';
import MermaidDiagram from '../renderers/MermaidDiagram';
import MindMap from '../renderers/MindMap';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { content, sender } = message;

  const renderContent = () => {
    if (content.startsWith('```mermaid')) {
      const diagram = content.substring(10, content.length - 3).trim();
      return <MermaidDiagram chart={diagram} />;
    }
    if (content.startsWith('```mindmap')) {
      const mindmap = content.substring(11, content.length - 3).trim();
      return <MindMap content={mindmap} />;
    }
    if (content.startsWith('```')) {
      const language = content.match(/```(\w+)/)?.[1] || 'plaintext';
      const code = content.replace(/```\w+\n/, '').replace(/```$/, '');
      return <CodeBlock code={code} language={language} />;
    }
    return <Typography>{content}</Typography>;
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
          maxWidth: '80%',
          p: 1.5,
          borderRadius: 'lg',
          bgcolor: sender === 'user' ? 'primary.500' : 'background.level1',
          color: sender === 'user' ? 'white' : 'text.primary',
          overflow: 'hidden',
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
};

export default MessageBubble;

