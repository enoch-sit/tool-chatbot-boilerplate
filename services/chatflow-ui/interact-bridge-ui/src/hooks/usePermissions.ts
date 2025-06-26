 
// src/hooks/usePermissions.ts
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, hasPermission, hasRole } = useAuth();

  const isStrictlyAdmin = () => hasRole('admin');
  const canAccessAdmin = () => hasRole(['admin', 'supervisor']);
  const canManageUsers = () => hasPermission('manage_users');
  const canManageChatflows = () => hasPermission('manage_chatflows');
  const canViewAnalytics = () => hasPermission('view_analytics');

  return {
    user,
    hasPermission,
    hasRole,
    isStrictlyAdmin,
    canAccessAdmin,
    canManageUsers,
    canManageChatflows,
    canViewAnalytics,
  };
};