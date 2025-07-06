import React from 'react';
import { Box } from '@mui/joy';
import { useTranslation } from 'react-i18next';

interface NextAgentFlowUIProps {
  data: any;
}

const NextAgentFlowUI: React.FC<NextAgentFlowUIProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
      {t('agentFlow.nextFlowLabel')}{' '}
      {typeof data === 'string' ? data : data?.nodeLabel || data?.agentName || JSON.stringify(data)}
    </Box>
  );
};

export default NextAgentFlowUI;
