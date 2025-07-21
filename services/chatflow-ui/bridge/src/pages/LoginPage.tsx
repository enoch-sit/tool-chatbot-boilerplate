// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDebugStore } from '../store/debugStore';
import {
  CssVarsProvider,
  Typography,
  FormControl,
  FormLabel,
  Input,
  Button,
  Box,
  Alert,
  Card,
  CardContent,
  Divider,
  Stack,
} from '@mui/joy';
import CssBaseline from '@mui/joy/CssBaseline';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Person, Lock } from '@mui/icons-material';
import LanguageSelector from '../components/LanguageSelector';
import bLogo from '../assets/b.svg';
import aidcecLogo from '../assets/aidcec.png';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const addLog = useDebugStore((state) => state.addLog);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (error) {
      clearError(); // Clear previous errors
    }
    addLog(`Login attempt with username: ${username}`);
    await login(username, password);
  };

  return (
    <CssVarsProvider>
      <CssBaseline />
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top bar with language controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 10,
            p: 2,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <LanguageSelector />
        </Box>

        {/* Animated wave background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 90% 10%, rgba(255, 215, 0, 0.4) 0%, rgba(255, 165, 0, 0.3) 30%, transparent 60%),
              radial-gradient(circle at 20% 80%, rgba(120, 50, 180, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 60% 40%, rgba(180, 50, 120, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(150, 40, 200, 0.2) 0%, transparent 50%)
            `,
            animation: 'waveMoveLR 25s ease-in-out infinite',
            '@keyframes waveMoveLR': {
              '0%': {
                transform: 'translateX(-50px) translateY(0px) scale(1)',
              },
              '50%': {
                transform: 'translateX(50px) translateY(-20px) scale(1.1)',
              },
              '100%': {
                transform: 'translateX(-50px) translateY(0px) scale(1)',
              },
            },
          }}
        />
        
        {/* Secondary wave layer */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 80% 20%, rgba(255, 193, 7, 0.3) 0%, rgba(255, 87, 34, 0.2) 40%, transparent 70%),
              radial-gradient(circle at 30% 70%, rgba(200, 60, 100, 0.2) 0%, transparent 60%),
              radial-gradient(circle at 70% 50%, rgba(100, 60, 200, 0.2) 0%, transparent 60%)
            `,
            animation: 'waveMoveLR2 35s ease-in-out infinite',
            '@keyframes waveMoveLR2': {
              '0%': {
                transform: 'translateX(-30px) translateY(10px) scale(1)',
              },
              '33%': {
                transform: 'translateX(40px) translateY(-15px) scale(1.2)',
              },
              '66%': {
                transform: 'translateX(20px) translateY(25px) scale(0.9)',
              },
              '100%': {
                transform: 'translateX(-30px) translateY(10px) scale(1)',
              },
            },
          }}
        />
        
        {/* Main content container */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
          }}
        >
        
        {/* Left side - Company branding */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
                  <img 
                    src={aidcecLogo} 
                    alt="AIDCEC" 
                    style={{ 
                      height: '60px',
                      width: 'auto',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
                    }} 
                  />
                  <Divider orientation="vertical" sx={{ height: '60px', mx: 2 }} />
                  <img 
                    src={bLogo} 
                    alt="Bridge" 
                    style={{ 
                      width: '50px', 
                      height: '50px',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
                    }} 
                  />
                </Stack>
                
              </Box>
            <Typography level="h1" sx={{ fontSize: '2.5rem', fontWeight: 'bold', mb: 2, color: 'white' }}>
              {t('appTitle')}
            </Typography>
            <Typography level="h4" sx={{ opacity: 0.8, maxWidth: '400px', lineHeight: 1.5, color: 'white' }}>
              {t('auth.enterpriseSubtitle')}
            </Typography>
          </Box>
        </Box>

        {/* Right side - Login form */}
        <Box
          sx={{
            flex: { xs: 1, md: 0.6 },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
          }}
        >
          <Card
            sx={{
              width: '100%',
              maxWidth: '420px',
              p: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <CardContent sx={{ p: 0 }}>
              {/* Company logos and title */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
                  <img 
                    src={aidcecLogo} 
                    alt="AIDCEC" 
                    style={{ 
                      height: '60px',
                      width: 'auto',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
                    }} 
                  />
                  <Divider orientation="vertical" sx={{ height: '60px', mx: 2 }} />
                  <img 
                    src={bLogo} 
                    alt="Bridge" 
                    style={{ 
                      width: '50px', 
                      height: '50px',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
                    }} 
                  />
                </Stack>
                <Typography level="body-md" sx={{ color: 'text.secondary', mb: 3 }}>
                  {t('auth.signInPrompt')}
                </Typography>
              </Box>

              {/* Login form */}
              <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <FormControl>
                    <FormLabel sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                      {t('auth.username')}
                    </FormLabel>
                    <Input
                      name="username"
                      type="text"
                      placeholder={t('auth.usernamePlaceholder')}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      startDecorator={<Person sx={{ color: 'text.tertiary' }} />}
                      sx={{
                        py: 1.5,
                        fontSize: '1rem',
                        borderRadius: '8px',
                        '--Input-focusedHighlight': 'var(--joy-palette-primary-500)',
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                      {t('auth.password')}
                    </FormLabel>
                    <Input
                      name="password"
                      type="password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      startDecorator={<Lock sx={{ color: 'text.tertiary' }} />}
                      sx={{
                        py: 1.5,
                        fontSize: '1rem',
                        borderRadius: '8px',
                        '--Input-focusedHighlight': 'var(--joy-palette-primary-500)',
                      }}
                    />
                  </FormControl>

                  <Button 
                    type="submit" 
                    loading={isLoading}
                    size="lg"
                    sx={{ 
                      mt: 2,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      background: 'linear-gradient(45deg, var(--joy-palette-primary-500), var(--joy-palette-primary-600))',
                      '&:hover': {
                        background: 'linear-gradient(45deg, var(--joy-palette-primary-600), var(--joy-palette-primary-700))',
                      }
                    }}
                  >
                    {t('auth.loginButton')}
                  </Button>
                </Stack>
              </form>

              {/* Error message */}
              {error && (
                <Alert 
                  color="danger" 
                  sx={{ 
                    mt: 3,
                    borderRadius: '8px',
                    '--Alert-radius': '8px'
                  }}
                >
                  {error}
                </Alert>
              )}

              {/* Footer */}
              <Divider sx={{ my: 4 }} />
              <Typography 
                level="body-xs" 
                sx={{ 
                  textAlign: 'center', 
                  color: 'text.tertiary',
                  letterSpacing: '0.5px'
                }}
              >
                {t('auth.copyrightFooter')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        </Box>
      </Box>
    </CssVarsProvider>
  );
};

export default LoginPage;

