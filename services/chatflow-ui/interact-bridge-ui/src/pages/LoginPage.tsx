// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDebugStore } from '../store/debugStore';
import {
  CssVarsProvider,
  Sheet,
  Typography,
  FormControl,
  FormLabel,
  Input,
  Button,
  Box,
  Alert,
} from '@mui/joy';
import CssBaseline from '@mui/joy/CssBaseline';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
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
      <main>
        <Sheet
          sx={{
            width: 300,
            mx: 'auto', // margin left & right
            my: 4, // margin top & bottom
            py: 3, // padding top & bottom
            px: 2, // padding left & right
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderRadius: 'sm',
            boxShadow: 'md',
          }}
          variant="outlined"
        >
          <div>
            <Typography level="h4" component="h1">
              <b>Welcome!</b>
            </Typography>
            <Typography level="body-sm">Sign in to continue.</Typography>
          </div>
          <form onSubmit={handleSubmit}>
            <FormControl>
              <FormLabel>Username</FormLabel>
              <Input
                name="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </FormControl>
            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input
                name="password"
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormControl>
            <Button sx={{ mt: 1 }} type="submit" loading={isLoading}>
              Log in
            </Button>
          </form>
          {error && (
            <Box sx={{ mt: 2 }}>
              <Alert color="danger">{error}</Alert>
            </Box>
          )}
        </Sheet>
      </main>
    </CssVarsProvider>
  );
};

export default LoginPage;

