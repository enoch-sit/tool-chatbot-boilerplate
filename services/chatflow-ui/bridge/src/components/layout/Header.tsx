// src/components/layout/Header.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import { useAuth } from '../../hooks/useAuth';
import LanguageSelector from '../LanguageSelector';
import ThemeToggleButton from '../ThemeToggleButton';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2,
        mb: 3,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography level="h4">{t('appTitle')}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {user && <Typography>{t('common.welcomeUser', { username: user.username })}</Typography>}
        <LanguageSelector />
        <ThemeToggleButton />
        {user && <Button onClick={logout}>{t('auth.logout')}</Button>}
      </Box>
    </Box>
  );
};

export default Header;

