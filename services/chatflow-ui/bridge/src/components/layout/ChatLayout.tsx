// src/components/layout/ChatLayout.tsx

import React from 'react';
import { Box } from '@mui/joy';

interface ChatLayoutProps {
  header?: React.ReactNode;
  messages: React.ReactNode;
  input: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * ChatLayout provides a specialized layout for chat interfaces with:
 * - Optional header section
 * - Scrollable messages area with proper boundaries
 * - Input fixed at bottom of viewport
 * - Proper content boundaries and overflow handling
 */
const ChatLayout: React.FC<ChatLayoutProps> = ({
  header,
  messages,
  input,
  children,
}) => {
  return (
    <>
      {/* Main chat container with messages */}
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header section (optional) */}
        {header}
        
        {/* Scrollable messages area with bottom padding for fixed input */}
        <Box 
          sx={{ 
            flex: 1,
            overflowY: 'auto',
            paddingBottom: '100px' // Space for fixed input at bottom
          }}
        >
          {messages}
        </Box>
        
        {/* Additional content if needed */}
        {children}
      </Box>
      
      {/* Fixed input at bottom of viewport */}
      <Box 
        sx={{ 
          position: 'fixed',
          bottom: 0,
          left: '240px', // Account for sidebar width
          right: 0,
          backgroundColor: 'background.body',
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px 16px 16px 16px',
          zIndex: 1000,
        //   boxShadow: '0 -4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {input}
      </Box>
    </>
  );
};

export default ChatLayout;
