// src/pages/ChatPage.tsx

/**
 * This file implements the main chat user interface page.
 * It serves as the primary view where users interact with chatflows and sessions.
 * The component orchestrates the UI by fetching data from and dispatching actions to
 * the `useChatStore`, effectively decoupling the UI from the business logic.
 *
 * The page is responsible for:
 * - Displaying lists of available chatflows and sessions.
 * - Allowing users to select a chatflow and session to interact with.
 * - Providing a mechanism to create new chat sessions.
 * - Rendering the `MessageList` for the conversation history.
 * - Rendering the `ChatInput` for sending new messages.
 * - Displaying loading and error states to the user.
 */

import React, { useEffect } from 'react';
import {
  Box,
  Sheet,
  Typography,
  Button,
  Select,
  Option,
  Alert,
  Stack, // Add Stack here
} from '@mui/joy';

import { NoSsr } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/chatStore';
import { useAuth } from '../hooks/useAuth';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Destructure all necessary state and actions from the central chat store.
  // This is the primary way the component interacts with the application's state.
  const {
    chatflows,
    sessions,
    currentSession,
    currentChatflow,
    isLoading,
    error,
    loadChatflows,
    loadSessions,
    setCurrentChatflow,
    setCurrentSession,
    clearSession,
    setError,
  } = useChatStore();

  // On component mount, load the initial data required for the page.
  useEffect(() => {
    loadChatflows();
    loadSessions();
  }, [loadChatflows, loadSessions]);

  /**
   * Handles the user clicking the "New Chat" button.
   * This clears the current session so the next message starts a new conversation.
   */
  const handleNewChat = () => {
    clearSession();
  };

  /**
   * Handles the user selecting a different chatflow from the dropdown.
   * It updates the store, which will trigger a re-render and clear the session.
   */
  const handleChatflowChange = (
    _event: React.SyntheticEvent | null,
    newValue: string | null
  ) => {
    if (newValue) {
      const selectedChatflow = chatflows.find(cf => cf.id === newValue);
      if (selectedChatflow) {
        setCurrentChatflow(selectedChatflow);
        setCurrentSession(null); // Clearing the session prompts the user to select or create one.
      }
    }
  };

  /**
   * Handles the user selecting a different session from the dropdown.
   * The store action will then take care of loading the message history for that session.
   */
  const handleSessionChange = (_event: any, newValue: string | null) => {
    console.log('Session change triggered with value:', newValue);
    if (newValue && sessions) {
      const selectedSession = sessions.find(s => s.session_id === newValue); // ✅ Use session_id
      console.log('Found session:', selectedSession);
      if (selectedSession) {
        setCurrentSession(selectedSession);
      }
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Section: Contains controls for selecting chatflows and sessions */}
      <Sheet variant="outlined" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography level="h4" sx={{ flexGrow: 1 }}>{t('navigation.chat')}</Typography>
          <Typography level="body-sm" color="neutral">{t('common.welcomeUser', { username: user?.username })}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Select 
            placeholder={t('chat.selectChatflow')} value={currentChatflow?.id || ''} 
            onChange={handleChatflowChange} 
            startDecorator={<FolderIcon />} 
            sx={{ minWidth: 200 }} 
            disabled={isLoading}>
            {chatflows.map((chatflow) => (<Option key={chatflow.id} value={chatflow.id}>{chatflow.name}</Option>))}
          </Select>
          <NoSsr>
          <Select 
            placeholder={t('chat.selectSession')} 
            value={currentSession?.session_id || ''} 
            onChange={handleSessionChange} 
            sx={{ minWidth: 200 }} 
            disabled={!currentChatflow || isLoading}
          >
            {sessions
              .filter(s => s.chatflow_id === currentChatflow?.id)
              .map((session, idx) => (
                <Option key={String(session.session_id) + String(idx)} value={session.session_id}>
                  {session.topic}
                </Option>
              ))}
          </Select>
          </NoSsr>
          
          {/* New Chat Button */}
          <Button
            variant="outlined"
            startDecorator={<AddIcon />}
            onClick={handleNewChat}
            disabled={!currentChatflow || isLoading}
            sx={{ minWidth: 120 }}
          >
            {t('chat.newChat')}
          </Button>
        </Stack>
      </Sheet>

      {/* Error Display: Shows any errors that occur during API calls or streaming */}
      {error && (<Alert color="danger" variant="soft" endDecorator={<Button size="sm" variant="plain" onClick={() => setError(null)}>{t('common.close')}</Button>} sx={{ m: 2 }}>{error}</Alert>)}

      {/* Main Chat Area: Renders either the conversation or a prompt to start */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {currentChatflow ? (
          <>
            <MessageList />
            <ChatInput />
          </>
        ) : (
          // Placeholder view when no chatflow is selected
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Stack spacing={2}>
              <Typography level="h4" color="neutral">
                {t('chat.selectChatflowPrompt')}
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;