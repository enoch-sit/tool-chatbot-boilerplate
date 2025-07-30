// src/components/chat/PinnedMessagesPanel.tsx
import React from 'react';
import { Box, Typography, IconButton } from '@mui/joy';
import { Close } from '@mui/icons-material';
import { usePinStore } from '../../store/pinStore';
import { useTranslation } from 'react-i18next';
import MessageBubble from './MessageBubble';

const PinnedMessagesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { pinnedMessages, unpinMessage } = usePinStore();

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.surface',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography level="title-lg">{t('chat.pinnedMessages')}</Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {pinnedMessages.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'text.tertiary', mt: 4 }}>
            {t('chat.noPinnedMessages')}
          </Typography>
        ) : (
          <Box>
            {pinnedMessages.map((message) => (
              <Box key={message.id} sx={{ position: 'relative', mb: 2 }}>
                {/* Unpin button overlay */}
                <IconButton 
                  size="sm" 
                  onClick={() => message.id && unpinMessage(message.id)}
                  sx={{ 
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    bgcolor: 'background.popup',
                    boxShadow: 'sm',
                    '&:hover': { bgcolor: 'danger.100' }
                  }}
                >
                  <Close />
                </IconButton>
                
                {/* Use MessageBubble for consistent rendering */}
                <MessageBubble message={message} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PinnedMessagesPanel;
