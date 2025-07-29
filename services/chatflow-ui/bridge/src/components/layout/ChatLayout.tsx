// src/components/layout/ChatLayout.tsx

import React, { useEffect, useState, useRef } from 'react';
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
 * - Scrollable messages area with dynamically calculated height
 * - Input positioned at bottom without overlapping content
 * - Proper content boundaries and overflow handling
 */
const ChatLayout: React.FC<ChatLayoutProps> = ({
  header,
  messages,
  input,
  children,
}) => {
  const [availableHeight, setAvailableHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calculate available height for messages area
  useEffect(() => {
    const calculateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const headerHeight = headerRef.current?.clientHeight || 0;
        const inputHeight = inputRef.current?.clientHeight || 0;
        const availableSpace = containerHeight - headerHeight - inputHeight - 20; // 20px for padding/margins
        setAvailableHeight(Math.max(availableSpace, 200)); // Minimum 200px
      }
    };

    // Calculate on mount
    calculateHeight();

    // Recalculate on window resize
    const handleResize = () => calculateHeight();
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for more accurate container size changes
    const resizeObserver = new ResizeObserver(calculateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [header, input, children]);

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden' // Prevent container from growing
      }}
    >
      {/* Header section (optional) */}
      {header && (
        <Box ref={headerRef} sx={{ flexShrink: 0 }}>
          {header}
        </Box>
      )}
      
      {/* Scrollable messages area with calculated height */}
      <Box 
        sx={{ 
          height: availableHeight > 0 ? `${availableHeight}px` : '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: availableHeight > 0 ? 'none' : 1,
          minHeight: 0,
          position: 'relative'
        }}
      >
        {messages}
      </Box>
      
      {/* Additional content if needed */}
      {children}
      
      {/* Input area at bottom - fixed height */}
      <Box 
        ref={inputRef}
        sx={{ 
          flexShrink: 0,
          backgroundColor: 'background.body',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {input}
      </Box>
    </Box>
  );
};

export default ChatLayout;
