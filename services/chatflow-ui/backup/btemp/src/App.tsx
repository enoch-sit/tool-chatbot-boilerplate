import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';

import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ColorModeContext } from './contexts/ThemeContext';
import './i18n';
import DebugLog from './components/debug/DebugLog';
import { useDebugStore } from './store/debugStore';
import Layout from './components/layout/Layout';

function App() {
  const { checkAuthStatus, isLoading } = useAuth();
  const { toggleDebugMode } = useDebugStore();
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  useEffect(() => {
    checkAuthStatus();
    const interval = setInterval(() => {
      checkAuthStatus();
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(interval);
  }, [checkAuthStatus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        toggleDebugMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleDebugMode]);

  if (isLoading) {
    return null; // or a loading spinner/component
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <Router>
          <CssVarsProvider defaultMode="system">
            <CssBaseline />
            <DebugLog />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                </Route>
              </Route>
            </Routes>
          </CssVarsProvider>
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
