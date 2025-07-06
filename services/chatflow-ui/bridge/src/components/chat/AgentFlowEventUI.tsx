import React from 'react';
import { Box } from '@mui/joy';
import { useTranslation } from 'react-i18next';

interface AgentFlowEventUIProps {
  data: any; // You can replace 'any' with a more specific type if you have one
}

const AgentFlowEventUI: React.FC<AgentFlowEventUIProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ color: 'info.main', fontWeight: 'bold', mb: 1 }}>
      {t('agentFlow.agentFlowLabel')} {typeof data === 'string' ? data : data?.status}
    </Box>
  );
};

export default AgentFlowEventUI;