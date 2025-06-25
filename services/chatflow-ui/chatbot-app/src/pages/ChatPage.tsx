// src/pages/ChatPage.tsx
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

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
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
    clearMessages,
    setError,
  } = useChatStore();

  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionTopic, setNewSessionTopic] = useState('');

  useEffect(() => {
    loadChatflows();
    loadSessions();
  }, [loadChatflows, loadSessions]);

  const handleChatflowChange = (
    event: React.SyntheticEvent | null,
    newValue: string | null
  ) => {
    if (newValue) {
      const selectedChatflow = chatflows.find(cf => cf.id === newValue);
      if (selectedChatflow) {
        setCurrentChatflow(selectedChatflow);
        setCurrentSession(null); // This will clear messages via the store action
      }
    }
  };

  const handleSessionChange = (
    event: React.SyntheticEvent | null,
    newValue: string | null
  ) => {
    if (newValue) {
      const selectedSession = sessions.find(s => s.session_id === newValue);
      if (selectedSession) {
        setCurrentSession(selectedSession); // This now loads history
      }
    }
  };

  const handleCreateSession = async () => {
    if (!currentChatflow || !newSessionTopic.trim()) return;
    try {
      await createNewSession(currentChatflow.id, newSessionTopic);
      setShowNewSessionModal(false);
      setNewSessionTopic('');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Sheet variant="outlined" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography level="h4" sx={{ flexGrow: 1 }}>{t('navigation.chat')}</Typography>
          <Typography level="body-sm" color="neutral">{t('auth.welcome')}, {user?.username}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Select placeholder={t('chat.selectChatflow')} value={currentChatflow?.id || ''} onChange={handleChatflowChange} startDecorator={<FolderIcon />} sx={{ minWidth: 200 }} disabled={isLoading}>
            {chatflows.map((chatflow) => (<Option key={chatflow.id} value={chatflow.id}>{chatflow.name}</Option>))}
          </Select>
          <Select placeholder={t('chat.selectSession', 'Select session')} value={currentSession?.session_id || ''} onChange={handleSessionChange} sx={{ minWidth: 200 }} disabled={!currentChatflow || isLoading}>
            {sessions.filter(s => s.chatflow_id === currentChatflow?.id).map((session) => (<Option key={session.session_id} value={session.session_id}>{session.topic}</Option>))}
          </Select>
          <Button startDecorator={<AddIcon />} onClick={() => setShowNewSessionModal(true)} disabled={!currentChatflow || isLoading}>{t('chat.newSession')}</Button>
        </Stack>
      </Sheet>

      {/* Error Alert */}
      {error && (<Alert color="danger" variant="soft" endDecorator={<Button size="sm" variant="plain" onClick={() => setError(null)}>{t('common.close')}</Button>} sx={{ m: 2 }}>{error}</Alert>)}

      {/* Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentSession ? (
          <>
            <MessageList />
            <ChatInput />
          </>
        ) : (
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

      {/* New Session Modal */}
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