import React from 'react';
import { Box } from '@mui/joy';

interface NextAgentFlowUIProps {
  data: any;
}

const NextAgentFlowUI: React.FC<NextAgentFlowUIProps> = ({ data }) => (
  <Box sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
    Next Agent Flow: {typeof data === 'string' ? data : data?.nodeLabel || data?.agentName || JSON.stringify(data)}
  </Box>
);

export default NextAgentFlowUI;
