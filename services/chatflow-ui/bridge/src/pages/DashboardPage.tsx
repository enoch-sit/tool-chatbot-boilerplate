// src/pages/DashboardPage.tsx
import React, { useEffect } from 'react';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/joy';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useUserStore } from '../store/userStore';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { credits, isLoadingCredits, fetchCredits } = useUserStore();

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h2" sx={{ mb: 2 }}>
        {t('dashboard.title')}
      </Typography>
      <Typography sx={{ mb: 3 }}>
        {t('auth.welcome')}, {user?.username || 'User'}!
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Typography level="title-md">{t('dashboard.credits')}</Typography>
          <Typography level="h2" sx={{ mt: 1 }}>
            {isLoadingCredits ? (
              <CircularProgress size="sm" />
            ) : (
              credits !== null ? credits : t('dashboard.noCredits')
            )}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;