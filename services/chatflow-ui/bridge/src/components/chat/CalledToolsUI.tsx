import React from 'react';
import { Box } from '@mui/joy';
import { useTranslation } from 'react-i18next';

interface CalledToolsUIProps {
  data: any;
}

const CalledToolsUI: React.FC<CalledToolsUIProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ color: 'warning.main', fontWeight: 'bold', mb: 1 }}>
      {t('agentFlow.calledToolsLabel')}{' '}
      {Array.isArray(data)
        ? data.map((tool, idx) => (
            <span key={idx}>{tool.name || JSON.stringify(tool)}</span>
          ))
        : JSON.stringify(data)}
    </Box>
  );
};

export default CalledToolsUI;
