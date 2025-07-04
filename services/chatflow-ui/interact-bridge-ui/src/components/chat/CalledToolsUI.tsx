import React from 'react';
import { Box } from '@mui/joy';

interface CalledToolsUIProps {
  data: any;
}

const CalledToolsUI: React.FC<CalledToolsUIProps> = ({ data }) => (
  <Box sx={{ color: 'warning.main', fontWeight: 'bold', mb: 1 }}>
    Called Tools: {Array.isArray(data) ? data.map((tool, idx) => <span key={idx}>{tool.name || JSON.stringify(tool)}</span>) : JSON.stringify(data)}
  </Box>
);

export default CalledToolsUI;
