import React from 'react';
import { Box } from '@mui/joy';

interface AgentFlowEventUIProps {
  data: any; // You can replace 'any' with a more specific type if you have one
}

const AgentFlowEventUI: React.FC<AgentFlowEventUIProps> = ({ data }) => (
  <Box sx={{ color: 'info.main', fontWeight: 'bold', mb: 1 }}>
    Agent Flow: {typeof data === 'string' ? data : data?.status}
  </Box>
);

export default AgentFlowEventUI;