// src/pages/AdminPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Sheet, Typography, Button, Input, Modal, ModalDialog,
  Stack, Alert, Textarea, List, ListItem, ListItemButton, IconButton, ListItemDecorator, Avatar, ListItemContent, FormControl, FormLabel, DialogTitle, DialogContent, DialogActions
} from '@mui/joy';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Sync as SyncIcon, GroupAdd as GroupAddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../store/adminStore';
import { getChatflowStats } from '../api/admin';
import { usePermissions } from '../hooks/usePermissions';
import { Chatflow } from '../types/chat';
import { User } from '../types/auth';

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { canManageUsers, canManageChatflows } = usePermissions();
  
  const {
    chatflows, selectedChatflow, chatflowUsers, isLoading, isSyncing, error,
    loadAllChatflows, syncChatflows, selectChatflow, assignUser, bulkAssignUsers, removeUser, setError,
  } = useAdminStore();

  const [stats, setStats] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [bulkUserEmails, setBulkUserEmails] = useState('');

  const fetchStats = async () => {
    try {
      const data = await getChatflowStats();
      setStats(data);
    } catch (err) { console.error("Failed to fetch stats", err); }
  };

  useEffect(() => {
    if (canManageChatflows()) {
      loadAllChatflows();
      fetchStats();
    }
  }, [loadAllChatflows, canManageChatflows]);

  const handleSync = async () => {
    await syncChatflows();
    await fetchStats(); // Refresh stats after sync
  };

  const handleAssignUser = async () => {
    if (!selectedChatflow || !userEmail.trim()) return;
    try {
      await assignUser(selectedChatflow.id, userEmail.trim());
      setShowAssignModal(false);
      setUserEmail('');
    } catch (err) { console.error('Failed to assign user:', err); }
  };

  const handleBulkAssign = async () => {
    if (!selectedChatflow || !bulkUserEmails.trim()) return;
    const emails = bulkUserEmails.split('\n').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    try {
      await bulkAssignUsers(selectedChatflow.id, emails);
      setShowBulkAssignModal(false);
      setBulkUserEmails('');
    } catch (err) { console.error('Failed to bulk assign users:', err); }
  };

  if (!canManageChatflows() && !canManageUsers()) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography level="h4" color="danger">{t('auth.unauthorized')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography level="h2">{t('admin.pageTitle')}</Typography>
        <Stack direction="row" spacing={1}>
          {canManageChatflows() && (
            <Button
              variant="outlined"
              color="primary"
              startDecorator={<SyncIcon />}
              loading={isSyncing}
              onClick={handleSync}
            >
              {t('admin.syncChatflows')}
            </Button>
          )}
          <Button
            variant="outlined"
            color="neutral"
            startDecorator={<RefreshIcon />}
            onClick={() => {
              if (canManageChatflows()) {
                loadAllChatflows();
                fetchStats();
              }
            }}
          >
            {t('common.refresh')}
          </Button>
        </Stack>
      </Stack>

      {error && (<Alert color="danger" variant="soft" sx={{ mb: 3 }}>{error}</Alert>)}

      {stats && (
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
          <Typography level="h4" sx={{ mb: 2 }}>{t('admin.statsTitle')}</Typography>
          <Stack direction="row" spacing={4}>
            <Box> <Typography level="title-lg">{stats.total}</Typography> <Typography>Total</Typography> </Box>
            <Box> <Typography level="title-lg" color="success">{stats.active}</Typography> <Typography>Active</Typography> </Box>
            <Box> <Typography level="title-lg" color="neutral">{stats.deleted}</Typography> <Typography>Deleted</Typography> </Box>
            <Box> <Typography level="title-lg" color="danger">{stats.error}</Typography> <Typography>Errors</Typography> </Box>
          </Stack>
        </Sheet>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {canManageChatflows() && (
          <Box sx={{ width: { xs: '100%', md: '40%' } }}>
            <Typography level="h4" sx={{ mb: 2 }}>{t('admin.chatflowManagement')}</Typography>
            <List
              variant="outlined"
              sx={{
                borderRadius: 'sm',
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {isLoading && <ListItem>{t('common.loading')}</ListItem>}
              {chatflows.map((flow: Chatflow) => (
                <ListItem
                  key={flow.id}
                  onClick={() => selectChatflow(flow)}
                  sx={{
                    cursor: 'pointer',
                    ...(selectedChatflow?.id === flow.id && {
                      bgcolor: 'primary.softBg',
                    }),
                  }}
                >
                  <ListItemButton>{flow.name}</ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {canManageUsers() && selectedChatflow && (
          <Box sx={{ flex: 1 }}>
            <Typography level="h4" sx={{ mb: 2 }}>
              {t('admin.userManagement')} - {selectedChatflow.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="solid"
                color="primary"
                startDecorator={<AddIcon />}
                onClick={() => setShowAssignModal(true)}
              >
                {t('admin.assignUser')}
              </Button>
              <Button
                variant="outlined"
                color="neutral"
                startDecorator={<GroupAddIcon />}
                onClick={() => setShowBulkAssignModal(true)}
              >
                {t('admin.bulkAssign')}
              </Button>
            </Stack>
            <List variant="outlined" sx={{ borderRadius: 'sm' }}>
              {chatflowUsers.length === 0 ? (
                <ListItem>{t('admin.noUsers')}</ListItem>
              ) : (
                chatflowUsers.map((user: User) => (
                  <ListItem
                    key={user.email}
                    endAction={
                      <IconButton
                        aria-label="delete"
                        onClick={() => removeUser(selectedChatflow.id, user.email)}
                        color="danger"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemDecorator>
                      <Avatar size="sm" />
                    </ListItemDecorator>
                    <ListItemContent>
                      <Typography level="title-sm">{user.username || user.email}</Typography>
                      <Typography level="body-xs">{user.email}</Typography>
                    </ListItemContent>
                  </ListItem>
                ))
              }
            </List>
          </Box>
        )}
      </Stack>

      {/* Assign User Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <ModalDialog>
          <DialogTitle>{t('admin.assignUser')}</DialogTitle>
          <DialogContent>
            <FormControl>
              <FormLabel>{t('admin.userEmail')}</FormLabel>
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAssignModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAssignUser} color="primary">{t('admin.assignButton')}</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* Bulk Assign User Modal */}
      <Modal open={showBulkAssignModal} onClose={() => setShowBulkAssignModal(false)}>
        <ModalDialog>
          <DialogTitle>{t('admin.bulkAssign')}</DialogTitle>
          <DialogContent>
            <FormControl>
              <FormLabel>{t('admin.bulkAssignTooltip')}</FormLabel>
              <Textarea
                minRows={4}
                value={bulkUserEmails}
                onChange={(e) => setBulkUserEmails(e.target.value)}
                placeholder="user1@example.com
user2@example.com"
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBulkAssignModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleBulkAssign} color="primary">{t('admin.assignButton')}</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminPage;