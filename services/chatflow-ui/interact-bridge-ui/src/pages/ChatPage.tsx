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

import React, { useEffect, useState } from 'react';
import {
  Box,
  Sheet,
  Typography,
  Button,
  Select,
  Option,
  Input,
  Modal,
  ModalDialog,
  ModalClose,
  Stack,
  Alert,
} from '@mui/joy';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/chatStore';
import { useAuth } from '../hooks/useAuth';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import NoSsr from '@mui/material/NoSsr';

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
    createNewSession,
    setCurrentChatflow,
    setCurrentSession,
    setError,
  } = useChatStore();

  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionTopic, setNewSessionTopic] = useState('');

  // On component mount, load the initial data required for the page.
  useEffect(() => {
    loadChatflows();
    loadSessions();
  }, [loadChatflows, loadSessions]);

  /**
   * Handles the user selecting a different chatflow from the dropdown.
   * It updates the store, which will trigger a re-render and clear the session.
   */
  const handleChatflowChange = (
    event: React.SyntheticEvent | null,
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
  // const handleSessionChange = (
  //   event: React.SyntheticEvent | null,
  //   newValue: string | null
  // ) => {
  //   if (newValue) {
  //     const selectedSession = sessions.find(s => s.id === newValue);
  //     if (selectedSession) {
  //       setCurrentSession(selectedSession);
  //     }
  //   }
  // };
  const handleSessionChange = (event: any, newValue: string | null) => {
  console.log('Session change triggered with value:', newValue);
  if (newValue && sessions) {
    const selectedSession = sessions.find(s => s.session_id === newValue); // ✅ Use session_id
    console.log('Found session:', selectedSession);
    if (selectedSession) {
      setCurrentSession(selectedSession);
    }
  }
};

  /**
   * Handles the creation of a new chat session.
   * It calls the store action with the topic and current chatflow ID.
   */
  const handleCreateSession = async () => {
    if (!currentChatflow || !newSessionTopic.trim()) return;
    try {
      await createNewSession(currentChatflow.id, newSessionTopic);
      setShowNewSessionModal(false);
      setNewSessionTopic('');
    } catch (error) {
      console.error('Failed to create session:', error);
      // The store will handle setting the error state.
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Section: Contains controls for selecting chatflows and sessions */}
      <Sheet variant="outlined" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography level="h4" sx={{ flexGrow: 1 }}>{t('navigation.chat')}</Typography>
          <Typography level="body-sm" color="neutral">{t('auth.welcome')}, {user?.username}</Typography>
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
              placeholder={t('chat.selectSession', 'Select session')} 
              value={currentSession?.id || ''} 
              onChange={handleSessionChange} 
              sx={{ minWidth: 200 }} 
              disabled={!currentChatflow || isLoading}
            >
              
               {(() => {
                  console.log('Sessions data:', sessions); // Move console.log here
                  return sessions
                    .filter(s => s.chatflow_id === currentChatflow?.id)
                    .map((session, idx) => {
                      console.log('Rendering session:', session, 'at index:', idx);
                      return (
                        <Option key={String(session.id) + String(idx)} value={session.session_id}>
                          {session.topic}
                        </Option>
                      );
                    });
                })()}
            </Select>
          </NoSsr>
          <Button startDecorator={<AddIcon />} onClick={() => setShowNewSessionModal(true)} disabled={!currentChatflow || isLoading}>{t('chat.newSession')}</Button>
        </Stack>
      </Sheet>

      {/* Error Display: Shows any errors that occur during API calls or streaming */}
      {error && (<Alert color="danger" variant="soft" endDecorator={<Button size="sm" variant="plain" onClick={() => setError(null)}>{t('common.close')}</Button>} sx={{ m: 2 }}>{error}</Alert>)}

      {/* Main Chat Area: Renders either the conversation or a prompt to start */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentSession ? (
          <>
            <MessageList />
            <ChatInput />
          </>
        ) : (
          // This is the placeholder view shown when no session is active.
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Stack spacing={2}>
              <Typography level="h4" color="neutral">
                {currentChatflow ? t('chat.selectSessionPrompt', 'Select a session or create a new one') : t('chat.selectChatflowPrompt', 'Select a chatflow to start chatting')}
              </Typography>
              {currentChatflow && (<Button variant="outlined" startDecorator={<AddIcon />} onClick={() => setShowNewSessionModal(true)}>{t('chat.createSession')}</Button>)}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Modal for creating a new session */}
      <Modal open={showNewSessionModal} onClose={() => setShowNewSessionModal(false)}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>{t('chat.createSession')}</Typography>
          <Stack spacing={2}>
            <Typography level="body-md">Chatflow: {currentChatflow?.name}</Typography>
            <Input placeholder={t('chat.sessionTopic')} value={newSessionTopic} onChange={(e) => setNewSessionTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSessionTopic.trim()) { handleCreateSession(); } }} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="plain" onClick={() => setShowNewSessionModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreateSession} disabled={!newSessionTopic.trim() || isLoading}>{t('common.create', 'Create')}</Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default ChatPage;