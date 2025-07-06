import React from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/joy/Box';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // bgcolor: 'background.default', // Let joy UI handle it
          p: 3,
        }}
      >
        <Header />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
