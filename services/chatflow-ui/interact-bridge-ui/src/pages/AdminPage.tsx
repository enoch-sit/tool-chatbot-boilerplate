// src/pages/AdminPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Button, Typography, Sheet, Table, Modal, ModalDialog,
  ModalClose, Input, Textarea, CircularProgress, Alert
} from '@mui/joy';
import {
  syncChatflows, getAllChatflows, getChatflowStats, getChatflowUsers,
  addUserToChatflow, bulkAddUsersToChatflow, removeUserFromChatflow
} from '../api/admin';
import type { Chatflow, ChatflowStats } from '../types/admin';
import type { User } from '../types/auth';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { canManageUsers, canManageChatflows } = usePermissions();

  const [chatflows, setChatflows] = useState<Chatflow[]>([]);
  const [stats, setStats] = useState<ChatflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedChatflow, setSelectedChatflow] = useState<Chatflow | null>(null);
  const [chatflowUsers, setChatflowUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [bulkUserEmails, setBulkUserEmails] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [flows, stats] = await Promise.all([
        getAllChatflows(),
        getChatflowStats(),
      ]);
      setChatflows(flows);
      setStats(stats);
    } catch (err) {
      setError('Failed to fetch admin data. Please make sure the backend is running and you are authenticated.');
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncChatflows();
      setSuccessMessage('Chatflows synced successfully!');
      fetchAdminData();
    } catch (err) {
      setError('Failed to sync chatflows.');
    }
    setLoading(false);
  };

  const handleManageUsers = async (chatflow: Chatflow) => {
    setSelectedChatflow(chatflow);
    setShowUserModal(true);
    try {
      const users = await getChatflowUsers(chatflow.id);
      setChatflowUsers(users);
    } catch (err) {
      setError(`Failed to fetch users for ${chatflow.name}.`);
    }
  };

  const handleAddUser = async () => {
    if (!selectedChatflow || !userEmail) return;
    try {
      await addUserToChatflow(selectedChatflow.id, userEmail);
      setSuccessMessage(`User ${userEmail} added to ${selectedChatflow.name}.`);
      setUserEmail('');
      handleManageUsers(selectedChatflow); // Refresh user list
    } catch (err) {
      setError('Failed to add user.');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedChatflow) return;
    try {
      await removeUserFromChatflow(selectedChatflow.id, userId);
      setSuccessMessage(`User removed from ${selectedChatflow.name}.`);
      handleManageUsers(selectedChatflow); // Refresh user list
    } catch (err) {
      setError('Failed to remove user.');
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedChatflow || !bulkUserEmails.trim()) return;
    try {
      const emails = bulkUserEmails.split('\n').map(e => e.trim()).filter(Boolean);
      const result = await bulkAddUsersToChatflow(selectedChatflow.id, emails);
      setSuccessMessage(`${result.successful_assignments} users assigned. ${result.failed_assignments.length} failed.`);
      setBulkUserEmails('');
      setShowBulkAssignModal(false);
      handleManageUsers(selectedChatflow); // Refresh user list
    } catch (err) {
      setError('Failed to bulk assign users.');
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!canManageChatflows() && !canManageUsers()) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography level="h4" color="danger">{t('auth.unauthorized')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h2" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && <Alert color="danger">{error}</Alert>}
      {successMessage && <Alert color="success">{successMessage}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="h4">Chatflow Management</Typography>
        <Button onClick={handleSync} disabled={loading}>{t('admin.syncChatflows')}</Button>
      </Box>

      {stats && (
        <Sheet variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 'sm' }}>
          <Typography>Total: {stats.total} | Active: {stats.active} | Deleted: {stats.deleted} | Error: {stats.error}</Typography>
        </Sheet>
      )}

      <Sheet variant="outlined" sx={{ borderRadius: 'sm' }}>
        <Table aria-label="Chatflows table">
          <thead>
            <tr>
              <th>{t('admin.chatflowName')}</th>
              <th>{t('admin.status')}</th>
              <th>{t('admin.deployed')}</th>
              <th>{t('admin.public')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {chatflows.map((flow) => (
              <tr key={flow.id}>
                <td>{flow.name}</td>
                <td>{flow.status}</td>
                <td>{flow.deployed ? 'Yes' : 'No'}</td>
                <td>{flow.public ? 'Yes' : 'No'}</td>
                <td>
                  <Button size="sm" onClick={() => handleManageUsers(flow)}>{t('admin.manageUsers')}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      {/* User Management Modal */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)}>
        <ModalDialog layout="fullscreen">
          <ModalClose />
          <Typography level="h4">{t('admin.manageUsers')} - {selectedChatflow?.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
            <Input
              placeholder={t('admin.userEmailPlaceholder')}
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <Button onClick={handleAddUser}>{t('admin.addUser')}</Button>
            <Button color="success" onClick={() => setShowBulkAssignModal(true)}>{t('admin.bulkAssign')}</Button>
          </Box>
          <Sheet variant="outlined" sx={{ borderRadius: 'sm' }}>
            <Table>
              <thead>
                <tr><th>{t('admin.email')}</th><th>{t('admin.role')}</th><th>{t('admin.actions')}</th></tr>
              </thead>
              <tbody>
                {chatflowUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td><Button size="sm" color="danger" onClick={() => handleRemoveUser(user.id)}>{t('admin.remove')}</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>
        </ModalDialog>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal open={showBulkAssignModal} onClose={() => setShowBulkAssignModal(false)}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">{t('admin.bulkAssign')}</Typography>
          <Textarea
            placeholder={t('admin.bulkAssignTooltip')}
            minRows={5}
            value={bulkUserEmails}
            onChange={(e) => setBulkUserEmails(e.target.value)}
          />
          <Button onClick={handleBulkAssign} sx={{ mt: 2 }}>{t('admin.assignUsers')}</Button>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminPage;