// src/pages/AdminPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Sheet, Typography, Table, Button, Input, Modal, ModalDialog, ModalClose,
  Stack, Alert, Chip, IconButton, CircularProgress, Textarea, Tooltip
} from '@mui/joy';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, People as PeopleIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../store/adminStore';
import { usePermissions } from '../hooks/usePermissions';
import { getChatflowStats } from '../api';

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
    if (canManageChatflows) {
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

  if (!canManageChatflows && !canManageUsers) {
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
          <Button startDecorator={isSyncing ? <CircularProgress size="sm" /> : <RefreshIcon />} variant="outlined" onClick={handleSync} disabled={isSyncing || isLoading}>
            {isSyncing ? t('admin.syncing') : t('admin.syncChatflows')}
          </Button>
        </Stack>
      </Stack>

      {error && (<Alert color="danger" variant="soft" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>)}

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
        <Sheet variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 'md' }}>
          <Typography level="h4" sx={{ mb: 2 }}>{t('admin.chatflowManagement')}</Typography>
          <Table hoverRow>
            <thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {chatflows.map((cf) => (
                <tr key={cf.id} style={{ backgroundColor: selectedChatflow?.id === cf.id ? 'var(--joy-palette-primary-50)' : 'transparent' }}>
                  <td><Typography level="body-md">{cf.name}</Typography></td>
                  <td>
                    <Stack direction="row" spacing={1}>
                      <Chip color={cf.deployed ? 'success' : 'neutral'} size="sm">{cf.deployed ? 'Deployed' : 'Not Deployed'}</Chip>
                      {cf.is_public && <Chip color="primary" size="sm">Public</Chip>}
                    </Stack>
                  </td>
                  <td><Button size="sm" variant={selectedChatflow?.id === cf.id ? 'solid' : 'outlined'} onClick={() => selectChatflow(cf)}>Select</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Sheet>

        <Sheet variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 'md' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography level="h4">{t('admin.userManagement')}</Typography>
            {selectedChatflow && canManageUsers && (
              <Stack direction="row" spacing={1}>
                <Button startDecorator={<AddIcon />} size="sm" onClick={() => setShowAssignModal(true)} disabled={isLoading}>{t('admin.assignUser')}</Button>
                <Button startDecorator={<PeopleIcon />} size="sm" onClick={() => setShowBulkAssignModal(true)} disabled={isLoading}>{t('admin.bulkAssign')}</Button>
              </Stack>
            )}
          </Stack>
          {!selectedChatflow ? (<Typography color="neutral">{t('admin.selectChatflow', 'Select a chatflow to manage users')}</Typography>) : (
            <Table>
              <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {chatflowUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td><td>{u.email}</td>
                    <td><Chip size="sm">{u.role}</Chip></td>
                    <td><IconButton size="sm" color="danger" onClick={() => removeUser(selectedChatflow.id, u.email)} disabled={isLoading}><DeleteIcon /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Sheet>
      </Stack>

      {/* Assign User Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <ModalDialog><ModalClose /><Typography level="h4" sx={{ mb: 2 }}>{t('admin.assignUser')}</Typography>
          <Stack spacing={2}>
            <Typography>Chatflow: {selectedChatflow?.name}</Typography>
            <Input placeholder={t('admin.userEmail')} value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="plain" onClick={() => setShowAssignModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleAssignUser} disabled={!userEmail.trim() || isLoading}>{t('admin.assignButton')}</Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Bulk Assign User Modal */}
      <Modal open={showBulkAssignModal} onClose={() => setShowBulkAssignModal(false)}>
        <ModalDialog><ModalClose /><Typography level="h4" sx={{ mb: 2 }}>{t('admin.bulkAssign')}</Typography>
          <Stack spacing={2}>
            <Typography>Chatflow: {selectedChatflow?.name}</Typography>
            <Tooltip title={t('admin.bulkAssignTooltip')} variant="outlined">
              <Textarea placeholder="user1@example.com\nuser2@example.com" minRows={4} value={bulkUserEmails} onChange={(e) => setBulkUserEmails(e.target.value)} />
            </Tooltip>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="plain" onClick={() => setShowBulkAssignModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleBulkAssign} disabled={!bulkUserEmails.trim() || isLoading}>{t('admin.assignButton')}</Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminPage;