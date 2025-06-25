// src/components/layout/Sidebar.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import Box from '@mui/joy/Box';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Typography from '@mui/joy/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const navItems = [
    { to: '/dashboard', label: t('navigation.dashboard'), icon: <DashboardIcon />, requiredRoles: [] },
    { to: '/chat', label: t('navigation.chat'), icon: <ChatIcon />, requiredRoles: [] },
    { to: '/admin', label: t('navigation.admin'), icon: <AdminPanelSettingsIcon />, requiredRoles: ['admin', 'supervisor'] },
  ];

  return (
    <Box component="nav" sx={{ width: 240, flexShrink: 0, bgcolor: 'background.surface', borderRight: '1px solid', borderColor: 'divider' }}>
      <List size="lg" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px' }}>
        <ListItem nested>
          <Typography level="title-sm" sx={{ textTransform: 'uppercase', letterSpacing: '0.1rem', color: 'text.secondary', px: 2, py: 1 }}>
            {t('appTitle')}
          </Typography>
          <List>
            {navItems.map((item) => (
              (item.requiredRoles.length === 0 || hasRole(item.requiredRoles)) && (
                <ListItem key={item.to}>
                  <ListItemButton component={NavLink} to={item.to} sx={{ fontWeight: 'md' }}>
                    <ListItemDecorator>{item.icon}</ListItemDecorator>
                    {item.label}
                  </ListItemButton>
                </ListItem>
              )
            ))}
          </List>
        </ListItem>
      </List>
    </Box>
  );
};

export default Sidebar;

