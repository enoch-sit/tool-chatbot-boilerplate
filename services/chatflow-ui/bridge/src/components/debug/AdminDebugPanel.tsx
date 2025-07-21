// src/components/debug/AdminDebugPanel.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Sheet,
  Accordion,
  AccordionGroup,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent
} from '@mui/joy';
import { useAdminStore } from '../../store/adminStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { useDebugStore } from '../../store/debugStore';
import { BugReport, VisibilityOff } from '@mui/icons-material';
import aidcecLogo from '../../assets/aidcec.png';

interface AdminDebugPanelProps {
  isVisible?: boolean;
}

const AdminDebugPanel: React.FC<AdminDebugPanelProps> = ({ isVisible: initialVisible = false }) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const { addLog } = useDebugStore();

  // Get all the stores and hooks data
  const adminStore = useAdminStore();
  const permissions = usePermissions();
  const { user, tokens } = useAuth();

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
    addLog(`Admin Debug Panel ${!isVisible ? 'opened' : 'closed'}`);
  };

  const handleRunDiagnostic = () => {
    addLog('=== ADMIN DIAGNOSTIC START ===');
    addLog(`User: ${user?.username || 'No user'}`);
    addLog(`User Role: ${user?.role || 'No role'}`);
    addLog(`Can Access Admin: ${permissions.canAccessAdmin}`);
    addLog(`Can Manage Users: ${permissions.canManageUsers}`);
    addLog(`Can Manage Chatflows: ${permissions.canManageChatflows}`);
    addLog(`Chatflows Count: ${adminStore.chatflows.length}`);
    addLog(`Current Error: ${adminStore.error || 'None'}`);
    addLog(`Is Loading: ${adminStore.isLoading}`);
    addLog(`Selected Chatflow: ${adminStore.selectedChatflow?.name || 'None'}`);
    addLog(`Chatflow Users Count: ${adminStore.chatflowUsers.length}`);
    addLog(`Token Valid: ${!!tokens?.accessToken}`);
    
    // Log raw chatflow data
    if (adminStore.chatflows.length > 0) {
      addLog('=== RAW CHATFLOW DATA ===');
      adminStore.chatflows.forEach((chatflow, index) => {
        addLog(`Chatflow ${index + 1}: ${JSON.stringify(chatflow, null, 2)}`);
      });
    }
    
    // Log selected chatflow details
    if (adminStore.selectedChatflow) {
      addLog('=== SELECTED CHATFLOW DETAILS ===');
      addLog(`Selected Chatflow Data: ${JSON.stringify(adminStore.selectedChatflow, null, 2)}`);
    }
    
    // Log users for selected chatflow
    if (adminStore.chatflowUsers.length > 0) {
      addLog('=== CHATFLOW USERS DATA ===');
      addLog(`Users Data: ${JSON.stringify(adminStore.chatflowUsers, null, 2)}`);
    }
    
    // Log admin stats if available
    if (adminStore.stats) {
      addLog('=== ADMIN STATS ===');
      addLog(`Stats Data: ${JSON.stringify(adminStore.stats, null, 2)}`);
    }
    
    addLog('=== ADMIN DIAGNOSTIC END ===');
  };

  const handleTestAPI = async () => {
    addLog('=== API TEST START ===');
    try {
      addLog('Testing fetchChatflows...');
      await adminStore.fetchChatflows();
      addLog('✅ fetchChatflows successful');
      
      if (permissions.canViewAnalytics) {
        addLog('Testing fetchStats...');
        await adminStore.fetchStats();
        addLog('✅ fetchStats successful');
      }
    } catch (error) {
      addLog(`❌ API test failed: ${error}`);
    }
    addLog('=== API TEST END ===');
  };

  const handleClearErrors = () => {
    adminStore.clearError();
    addLog('Admin errors cleared');
  };

  const handleCopyRawData = async () => {
    const rawData = {
      timestamp: new Date().toISOString(),
      user: user,
      permissions: permissions,
      adminStore: {
        chatflows: adminStore.chatflows,
        selectedChatflow: adminStore.selectedChatflow,
        chatflowUsers: adminStore.chatflowUsers,
        stats: adminStore.stats,
        isLoading: adminStore.isLoading,
        error: adminStore.error
      },
      tokens: {
        hasAccessToken: !!tokens?.accessToken,
        tokenType: tokens?.tokenType,
        hasRefreshToken: !!tokens?.refreshToken,
        tokenPreview: tokens?.accessToken ? tokens.accessToken.substring(0, 20) + '...' : null
      }
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
      addLog('✅ Raw admin data copied to clipboard');
    } catch (error) {
      addLog(`❌ Failed to copy to clipboard: ${error}`);
      // Fallback: log the data instead
      console.log('Raw Admin Debug Data:', rawData);
      addLog('📝 Raw data logged to console instead');
    }
  };

  if (!isVisible) {
    return (
      <Button
        onClick={handleToggleVisibility}
        size="sm"
        variant="soft"
        color="warning"
        startDecorator={<BugReport />}
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 9999,
          opacity: 0.7,
          '&:hover': { opacity: 1 }
        }}
      >
        <img 
          src={aidcecLogo} 
          alt="AIDCEC" 
          style={{ 
            width: '16px', 
            height: '16px',
            marginRight: '4px'
          }} 
        />
        Debug Admin
      </Button>
    );
  }

  const statusColor = adminStore.error ? 'danger' : adminStore.isLoading ? 'warning' : 'success';

  return (
    <Sheet
      variant="outlined"
      sx={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        width: '450px',
        height: '600px',
        p: 2,
        borderRadius: 'md',
        boxShadow: 'xl',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        backgroundColor: 'background.surface',
        border: '2px solid',
        borderColor: 'warning.300'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="title-md" startDecorator={<BugReport />}>
          Admin Debug Panel
        </Typography>
        <Button
          onClick={handleToggleVisibility}
          size="sm"
          variant="plain"
          startDecorator={<VisibilityOff />}
        >
          Hide
        </Button>
      </Box>

      {/* Status Overview */}
      <Card variant="soft" color={statusColor} sx={{ mb: 2 }}>
        <CardContent>
          <Typography level="title-sm">Status Overview</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip size="sm" color={permissions.canAccessAdmin ? 'success' : 'danger'}>
              Admin Access: {permissions.canAccessAdmin ? 'Yes' : 'No'}
            </Chip>
            <Chip size="sm" color={adminStore.isLoading ? 'warning' : 'neutral'}>
              Loading: {adminStore.isLoading ? 'Yes' : 'No'}
            </Chip>
            <Chip size="sm" color={adminStore.error ? 'danger' : 'success'}>
              Error: {adminStore.error ? 'Yes' : 'No'}
            </Chip>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button onClick={handleRunDiagnostic} size="sm" variant="outlined">
          Run Diagnostic
        </Button>
        <Button onClick={handleTestAPI} size="sm" variant="outlined" disabled={adminStore.isLoading}>
          Test APIs
        </Button>
        <Button onClick={handleCopyRawData} size="sm" variant="outlined" color="primary">
          Copy Raw Data
        </Button>
        <Button onClick={handleClearErrors} size="sm" variant="soft" color="danger">
          Clear Errors
        </Button>
      </Box>

      {/* Error Display */}
      {adminStore.error && (
        <Alert color="danger" sx={{ mb: 2 }}>
          <Typography level="body-sm">
            <strong>Current Error:</strong> {adminStore.error}
          </Typography>
        </Alert>
      )}

      {/* Detailed Information */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <AccordionGroup>
          <Accordion>
            <AccordionSummary>
              User & Permissions ({Object.values(permissions).filter(Boolean).length}/8 permissions)
            </AccordionSummary>
            <AccordionDetails>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>User:</strong> {user?.username || 'None'} ({user?.role || 'No role'})
              </Typography>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Email:</strong> {user?.email || 'None'}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Permissions:</strong>
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.entries(permissions).map(([key, value]) => {
                  if (typeof value === 'boolean') {
                    return (
                      <Chip key={key} size="sm" color={value ? 'success' : 'neutral'} variant="soft">
                        {key}: {value ? '✓' : '✗'}
                      </Chip>
                    );
                  }
                  return null;
                })}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary>
              Admin Store State ({adminStore.chatflows.length} chatflows)
            </AccordionSummary>
            <AccordionDetails>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Chatflows:</strong> {adminStore.chatflows.length} loaded
              </Typography>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Selected:</strong> {adminStore.selectedChatflow?.name || 'None'}
              </Typography>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Users in Selected:</strong> {adminStore.chatflowUsers.length}
              </Typography>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Stats:</strong> {adminStore.stats ? 'Loaded' : 'Not loaded'}
              </Typography>
              {adminStore.stats && (
                <Box sx={{ mt: 1, p: 1, bgcolor: 'background.level1', borderRadius: 'sm' }}>
                  <Typography level="body-xs">
                    Total: {adminStore.stats.total}, Active: {adminStore.stats.active}
                  </Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary>
              Authentication Status
            </AccordionSummary>
            <AccordionDetails>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Token Present:</strong> {!!tokens?.accessToken ? 'Yes' : 'No'}
              </Typography>
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Token Type:</strong> {tokens?.tokenType || 'None'}
              </Typography>
              {tokens?.accessToken && (
                <Typography level="body-xs" sx={{ mb: 1 }}>
                  <strong>Token Preview:</strong> {tokens.accessToken.substring(0, 20)}...
                </Typography>
              )}
              <Typography level="body-xs" sx={{ mb: 1 }}>
                <strong>Refresh Token:</strong> {!!tokens?.refreshToken ? 'Present' : 'None'}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary>
              Recent Chatflows ({adminStore.chatflows.slice(0, 3).length} shown)
            </AccordionSummary>
            <AccordionDetails>
              {adminStore.chatflows.slice(0, 3).map((chatflow, idx) => (
                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'background.level1', borderRadius: 'sm' }}>
                  <Typography level="body-xs">
                    <strong>{chatflow.name}</strong>
                  </Typography>
                  <Typography level="body-xs">
                    ID: {chatflow.flowise_id} | Status: {chatflow.sync_status} | Type: {chatflow.type}
                  </Typography>
                </Box>
              ))}
              {adminStore.chatflows.length === 0 && (
                <Typography level="body-xs" color="neutral">
                  No chatflows loaded. Try running diagnostic or test APIs.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary>
              Raw Chatflow Data ({adminStore.chatflows.length} total)
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                {adminStore.chatflows.length > 0 ? (
                  <Box>
                    <Typography level="body-xs" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Complete Chatflow Objects:
                    </Typography>
                    <Box sx={{ 
                      p: 1, 
                      bgcolor: 'background.level2', 
                      borderRadius: 'sm',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <pre style={{ 
                        fontSize: '10px', 
                        lineHeight: '1.2',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace'
                      }}>
                        {JSON.stringify(adminStore.chatflows, null, 2)}
                      </pre>
                    </Box>
                    {adminStore.selectedChatflow && (
                      <Box sx={{ mt: 2 }}>
                        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 'bold' }}>
                          Selected Chatflow Detail:
                        </Typography>
                        <Box sx={{ 
                          p: 1, 
                          bgcolor: 'primary.50', 
                          borderRadius: 'sm',
                          border: '1px solid',
                          borderColor: 'primary.200'
                        }}>
                          <pre style={{ 
                            fontSize: '10px', 
                            lineHeight: '1.2',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'monospace'
                          }}>
                            {JSON.stringify(adminStore.selectedChatflow, null, 2)}
                          </pre>
                        </Box>
                      </Box>
                    )}
                    {adminStore.chatflowUsers.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 'bold' }}>
                          Selected Chatflow Users:
                        </Typography>
                        <Box sx={{ 
                          p: 1, 
                          bgcolor: 'success.50', 
                          borderRadius: 'sm',
                          border: '1px solid',
                          borderColor: 'success.200'
                        }}>
                          <pre style={{ 
                            fontSize: '10px', 
                            lineHeight: '1.2',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'monospace'
                          }}>
                            {JSON.stringify(adminStore.chatflowUsers, null, 2)}
                          </pre>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography level="body-xs" color="neutral">
                    No chatflow data available. Click "Test APIs" to load chatflows.
                  </Typography>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </AccordionGroup>
      </Box>
    </Sheet>
  );
};

export default AdminDebugPanel;
