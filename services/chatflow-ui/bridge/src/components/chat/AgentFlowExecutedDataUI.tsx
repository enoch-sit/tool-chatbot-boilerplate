import React from 'react';
import { Box } from '@mui/joy';
import { useTranslation } from 'react-i18next';

interface AgentFlowExecutedDataUIProps {
  data: any;
}

const AgentFlowExecutedDataUI: React.FC<AgentFlowExecutedDataUIProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ color: 'success.main', fontWeight: 'bold', mb: 1 }}>
      {t('agentFlow.executedLabel')} {typeof data === 'string' ? data : JSON.stringify(data)}
    </Box>
  );
};

export default AgentFlowExecutedDataUI;
