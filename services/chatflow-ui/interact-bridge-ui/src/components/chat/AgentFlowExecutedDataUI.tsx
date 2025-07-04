import React from 'react';
import { Box } from '@mui/joy';

interface AgentFlowExecutedDataUIProps {
  data: any;
}

const AgentFlowExecutedDataUI: React.FC<AgentFlowExecutedDataUIProps> = ({ data }) => (
  <Box sx={{ color: 'success.main', fontWeight: 'bold', mb: 1 }}>
    Agent Flow Executed: {typeof data === 'string' ? data : JSON.stringify(data)}
  </Box>
);

export default AgentFlowExecutedDataUI;
