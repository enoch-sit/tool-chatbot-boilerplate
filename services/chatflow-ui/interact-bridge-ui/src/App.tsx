// src/App.tsx
import React, { useEffect } from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/joy/CssBaseline';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import './i18n';

function App() {
  const { checkAuthStatus, user } = useAuth();

  useEffect(() => {
    // Check authentication status on app start and set up an interval
    checkAuthStatus();
    const interval = setInterval(() => {
      checkAuthStatus();
    }, 14 * 60 * 1000); // 14 minutes

    // Clean up the interval on component unmount
    return () => clearInterval(interval);
  }, [checkAuthStatus]);

  return (
    <Router>
      <CssVarsProvider defaultMode="system">
        <CssBaseline />
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <LoginPage />
            } 
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole={['admin', 'supervisor']}>
                <Layout>
                  <AdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </CssVarsProvider>
    </Router>
  );
}

export default App;