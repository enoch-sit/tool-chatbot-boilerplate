// src/pages/AdminPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Sheet, Table, Modal, ModalDialog,
  ModalClose, Input, Textarea, CircularProgress, Alert
} from '@mui/joy';
import { useAdminStore } from '../store/adminStore';
import type { Chatflow } from '../types/chatflow';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  
  // Get permissions
  const permissions = usePermissions();
  const {
    canManageUsers,
    canManageChatflows,
    canViewAnalytics,
    canSyncChatflows,
    canAccessAdmin
  } = permissions;

  // Store state
  const {
    chatflows,
    stats,
    selectedChatflow,
    chatflowUsers,
    isLoading,
    error,
    fetchChatflows,
    fetchStats,
    fetchChatflowUsers,
    addUserToChatflow,
    removeUserFromChatflow,
    setSelectedChatflow,
    clearError,
  } = useAdminStore();

  // Local UI state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [bulkUserEmails, setBulkUserEmails] = useState('');

  //console.log('AdminPage permissions:', permissions);

  // Fetch initial data
  const loadAdminData = useCallback(async () => {
    if (!canAccessAdmin) {
      console.log('No admin access, skipping data fetch');
      return;
    }

    console.log('Fetching admin data...');
    try {
      await Promise.all([
        fetchChatflows(),
        canViewAnalytics ? fetchStats() : Promise.resolve(),
      ]);
      console.log('Admin data fetched successfully');
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  }, [canAccessAdmin, canViewAnalytics, fetchChatflows, fetchStats]);

  useEffect(() => {
    console.log('AdminPage useEffect triggered, canAccessAdmin:', canAccessAdmin);
    loadAdminData();
  }, [loadAdminData, canAccessAdmin]);

  // Handle sync (placeholder - you might want to add this to the store)
  const handleSync = async () => {
    try {
      // Import syncChatflows if you have this API function
      // await syncChatflows();
      setSuccessMessage('Chatflows synced successfully!');
      await loadAdminData();
    } catch (err) {
      console.error('Sync failed:', err);
      // Error will be handled by store
    }
  };

  // Handle user management modal
  const handleManageUsers = async (chatflow: Chatflow) => {
    try {
      setSelectedChatflow(chatflow);
      setShowUserModal(true);
      await fetchChatflowUsers(chatflow.flowise_id);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      // Error handled by store
    }
  };

  // Add single user
  const handleAddUser = async () => {
    if (!selectedChatflow || !userEmail.trim()) return;
    
    try {
      await addUserToChatflow(selectedChatflow.flowise_id, userEmail);
      setSuccessMessage(`User ${userEmail} added to ${selectedChatflow.name}.`);
      setUserEmail('');
    } catch (err) {
      console.error('Failed to add user:', err);
      // Error handled by store
    }
  };

  // Remove user
  const handleRemoveUser = async (email: string) => {
    if (!selectedChatflow) return;
    
    try {
      await removeUserFromChatflow(selectedChatflow.flowise_id, email);
      setSuccessMessage(`User removed from ${selectedChatflow.name}.`);
    } catch (err) {
      console.error('Failed to remove user:', err);
      // Error handled by store
    }
  };

  // Bulk assign users (you might want to add this to the store)
  const handleBulkAssign = async () => {
    if (!selectedChatflow || !bulkUserEmails.trim()) return;
    
    try {
      const emails = bulkUserEmails.split('\n').map(e => e.trim()).filter(Boolean);
      
      // Add users one by one (or implement bulk API if available)
      const results = await Promise.allSettled(
        emails.map(email => addUserToChatflow(selectedChatflow.flowise_id, email))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      setSuccessMessage(`${successful} users assigned. ${failed} failed.`);
      setBulkUserEmails('');
      setShowBulkAssignModal(false);
      
      // Refresh user list
      await fetchChatflowUsers(selectedChatflow.flowise_id);
    } catch (err) {
      console.error('Failed to bulk assign:', err);
      // Error handled by store
    }
  };

  // Format status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active': return t('common.active');
      case 'inactive': return t('common.inactive');
      case 'error': return t('common.error');
      default: return status;
    }
  };

  // Handle error and success message dismissal
  const handleCloseError = () => {
    clearError();
  };

  const handleCloseSuccess = () => {
    setSuccessMessage(null);
  };

  // Handle modal close
  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setSelectedChatflow(null);
    setUserEmail('');
  };

  const handleCloseBulkModal = () => {
    setShowBulkAssignModal(false);
    setBulkUserEmails('');
  };

  // Early return for unauthorized access
  if (!canAccessAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography level="h4" color="danger">
          {t('auth.unauthorized')}
        </Typography>
        <Typography level="body-md">
          {t('admin.unauthorizedDetails')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="h2">{t('admin.pageTitle')}</Typography>
        {canSyncChatflows && (
          <Button onClick={handleSync} disabled={isLoading}>
            {isLoading ? t('admin.syncing') : t('admin.syncChatflows')}
          </Button>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          color="danger" 
          sx={{ mb: 2 }}
          endDecorator={
            <Button size="sm" variant="plain" onClick={handleCloseError}>
              {t('common.close')}
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {/* Success Alert */}
      {successMessage && (
        <Alert 
          color="success" 
          sx={{ mb: 2 }}
          endDecorator={
            <Button size="sm" variant="plain" onClick={handleCloseSuccess}>
              {t('common.close')}
            </Button>
          }
        >
          {successMessage}
        </Alert>
      )}

      {canManageChatflows && (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
          <Table aria-label="Chatflow management table">
            <thead>
              <tr>
                <th>{t('admin.chatflowName')}</th>
                <th>{t('admin.chatflowId')}</th>
                <th>{t('admin.chatflowStatus')}</th>
                <th>{t('admin.chatflowActions')}</th>
              </tr>
            </thead>
            <tbody>
              {chatflows.length === 0 ? (
                <tr key="ChatflowInfo">
                  <td 
                    colSpan={canManageUsers ? 7 : 6} 
                    style={{ textAlign: 'center', padding: '20px' }}
                  >
                    {isLoading ? 'Loading...' : 'No chatflows found'}
                  </td>
                </tr>
              ) : (
                chatflows.map((flow, idx) => (
                  <tr key={`${flow.flowise_id}-${idx}`}>
                    <td>{flow.name}</td>
                    <td>{getStatusDisplay(flow.sync_status)}</td>
                    <td>{flow.deployed ? t('common.yes') : t('common.no')}</td>
                    <td>{flow.is_public ? t('common.yes') : t('common.no')}</td>
                    <td>{flow.category || 'N/A'}</td>
                    <td>{flow.type}</td>
                    {canManageUsers && (
                      <td>
                        <Button size="sm" onClick={() => handleManageUsers(flow)}>
                          {t('admin.userManagement')}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Sheet>
      )}

      {/* User Management Modal */}
      <Modal open={showUserModal} onClose={handleCloseUserModal}>
        <ModalDialog sx={{ minWidth: '400px' }}>
          <ModalClose />
          <Typography level="h4">{t('admin.userManagement')}</Typography>
          <Typography textColor="neutral.500" sx={{ mb: 2 }}>
            {t('admin.manageUsersFor', { chatflowName: selectedChatflow?.name })}
          </Typography>

          {canManageUsers && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Input
                sx={{ flexGrow: 1 }}
                placeholder={t('admin.userEmailPlaceholder')}
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <Button onClick={handleAddUser} disabled={isLoading || !userEmail.trim()}>
                {t('admin.assignButton')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowBulkAssignModal(true)}
              >
                {t('admin.bulkAssign')}
              </Button>
            </Box>
          )}

          <Sheet sx={{ maxHeight: '300px', overflow: 'auto' }}>
            <Table aria-label="User list for chatflow">
              <thead>
                <tr>
                  <th>{t('admin.userEmail')}</th>
                  {canManageUsers && <th>{t('admin.chatflowActions')}</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canManageUsers ? 2 : 1} style={{ textAlign: 'center' }}>
                      <CircularProgress size="sm" />
                    </td>
                  </tr>
                ) : chatflowUsers.length > 0 ? (
                  chatflowUsers.map((user) => (
                    <tr key={user.email}>
                      <td>{user.email}</td>
                      {canManageUsers && (
                        <td>
                          <Button
                            size="sm"
                            variant="outlined"
                            color="danger"
                            onClick={() => handleRemoveUser(user.email)}
                          >
                            {t('admin.removeButton')}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManageUsers ? 2 : 1}>{t('admin.noUsers')}</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Sheet>
        </ModalDialog>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal open={showBulkAssignModal} onClose={handleCloseBulkModal}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">{t('admin.bulkAssign')}</Typography>
          <Textarea
            minRows={4}
            placeholder={t('admin.bulkAssignPlaceholder')}
            value={bulkUserEmails}
            onChange={(e) => setBulkUserEmails(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <Button onClick={handleBulkAssign} disabled={isLoading || !bulkUserEmails.trim()}>
            {t('admin.assignButton')}
          </Button>
        </ModalDialog>
      </Modal>

      {canViewAnalytics && stats && (
        <Box sx={{ mt: 3 }}>
          <Typography level="h3" sx={{ mb: 2 }}>{t('admin.statsTitle')}</Typography>
          <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'sm' }}>
            <pre>{JSON.stringify(stats, null, 2)}</pre>
          </Sheet>
        </Box>
      )}
    </Box>
  );
};

export default AdminPage;