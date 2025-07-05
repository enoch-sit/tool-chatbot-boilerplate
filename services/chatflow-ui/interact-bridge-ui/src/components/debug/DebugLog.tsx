import React from 'react';
import { useDebugStore } from '../../store/debugStore';
import { Button, Sheet, Typography } from '@mui/joy';

const DebugLog: React.FC = () => {
  const { logs, isDebugMode, toggleDebugMode, clearLogs } = useDebugStore();

  if (!isDebugMode) {
    return null;
  }

  return (
    <Sheet 
      variant="outlined"
      sx={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        width: '400px',
        height: '300px',
        p: 2,
        borderRadius: 'md',
        boxShadow: 'lg',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2000,
        backgroundColor: 'background.body'
      }}
    >
      <Typography level="title-md" component="h2" gutterBottom>
        Debug Log
      </Typography>
      <Sheet 
        variant="plain"
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          mb: 1, 
          p: 1, 
          border: '1px solid', 
          borderColor: 'divider',
          borderRadius: 'sm'
        }}
      >
        {logs.map((log, index) => (
          <Typography key={index} level="body-xs" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {log}
          </Typography>
        ))}
      </Sheet>
      <div>
        <Button onClick={toggleDebugMode} size="sm" variant="soft" color="neutral" sx={{ mr: 1 }}>
          Hide
        </Button>
        <Button onClick={clearLogs} size="sm" variant="soft" color="danger">
          Clear
        </Button>
      </div>
    </Sheet>
  );
};

export default DebugLog;
