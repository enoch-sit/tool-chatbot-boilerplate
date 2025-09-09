import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Modal,
  ModalDialog,
  ModalClose,
  Divider,
  CircularProgress,
  Stack,
  Avatar,
} from '@mui/joy';
import { CheckCircle, PlayCircle, PauseCircle, Info } from '@mui/icons-material';
import type { StreamEvent } from '../../types/chat';

interface AgentFlowTimelineProps {
  events: StreamEvent[];
  isStreaming?: boolean;
  isCompact?: boolean; // For live streaming view
}

interface AgentFlowStep {
  id: string;
  event: StreamEvent;
  status: 'pending' | 'active' | 'completed' | 'error';
  timestamp: number;
}

const AgentFlowTimeline: React.FC<AgentFlowTimelineProps> = ({
  events,
  isStreaming = false,
  isCompact = false,
}) => {
  const { t } = useTranslation();
  const [selectedEvent, setSelectedEvent] = useState<StreamEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Process events into steps with status
  const agentFlowEvents = events.filter(e => 
    e.event === 'agentFlowEvent' || 
    e.event === 'nextAgentFlow' || 
    e.event === 'agentFlowExecutedData' ||
    e.event === 'calledTools'
  );

  const steps: AgentFlowStep[] = agentFlowEvents.map((event, index) => ({
    id: `step-${index}`,
    event,
    status: isStreaming && index === agentFlowEvents.length - 1 ? 'active' : 'completed',
    timestamp: Date.now() + index * 100, // Mock timestamp
  }));

  const getStepIcon = (status: AgentFlowStep['status']) => {
    switch (status) {
      case 'active':
        return <CircularProgress size="sm" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <PauseCircle color="error" />;
      default:
        return <PlayCircle color="primary" />;
    }
  };

  const getStepColor = (status: AgentFlowStep['status']) => {
    switch (status) {
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'error':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getEventTitle = (event: StreamEvent) => {
    switch (event.event) {
      case 'agentFlowEvent':
        return typeof event.data === 'string' ? event.data : event.data?.status || t('agentFlow.event');
      case 'nextAgentFlow':
        return t('agentFlow.nextFlow');
      case 'agentFlowExecutedData':
        return t('agentFlow.executed');
      case 'calledTools':
        return t('agentFlow.toolsCalled');
      default:
        return event.event;
    }
  };

  const getEventDescription = (event: StreamEvent) => {
    if (typeof event.data === 'string') return event.data;
    if (event.data && typeof event.data === 'object') {
      const data = event.data as Record<string, unknown>;
      if (data.description && typeof data.description === 'string') return data.description;
      if (data.status && typeof data.status === 'string') return data.status;
    }
    return t('agentFlow.processing');
  };

  const handleEventClick = (event: StreamEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  if (steps.length === 0) {
    return null;
  }

  // Compact view for live streaming
  if (isCompact) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography level="body-sm" sx={{ mb: 1, opacity: 0.7 }}>
          {t('agentFlow.progress')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {steps.map((step, index) => (
            <Chip
              key={step.id}
              variant="soft"
              color={getStepColor(step.status)}
              size="sm"
              startDecorator={getStepIcon(step.status)}
              sx={{ minWidth: 'auto' }}
            >
              {index + 1}
            </Chip>
          ))}
          {isStreaming && (
            <Typography level="body-xs" sx={{ alignSelf: 'center', opacity: 0.5 }}>
              {t('agentFlow.processing')}
            </Typography>
          )}
        </Stack>
      </Box>
    );
  }

  // Full timeline view for completed flows
  return (
    <Box sx={{ mb: 2 }}>
      <Typography level="title-sm" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Info sx={{ mr: 1, fontSize: 'md' }} />
        {t('agentFlow.timeline', { count: steps.length })}
      </Typography>
      
      <Stack spacing={2}>
        {steps.map((step, index) => (
          <Card
            key={step.id}
            variant="outlined"
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 'md',
                transform: 'translateY(-1px)',
              },
            }}
            onClick={() => handleEventClick(step.event)}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Step indicator */}
                <Avatar
                  size="sm"
                  variant="soft"
                  color={getStepColor(step.status)}
                  sx={{ minWidth: 32 }}
                >
                  {index + 1}
                </Avatar>
                
                {/* Step content */}
                <Box sx={{ flex: 1 }}>
                  <Typography level="title-sm" sx={{ mb: 0.5 }}>
                    {getEventTitle(step.event)}
                  </Typography>
                  <Typography level="body-sm" sx={{ opacity: 0.7 }}>
                    {getEventDescription(step.event)}
                  </Typography>
                </Box>
                
                {/* Status indicator */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStepIcon(step.status)}
                  <Typography level="body-xs" sx={{ opacity: 0.5 }}>
                    {step.status}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Modal for event details */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalDialog sx={{ maxWidth: 600, width: '90%' }}>
          <ModalClose />
          <Typography level="title-lg" sx={{ mb: 2 }}>
            {selectedEvent ? getEventTitle(selectedEvent) : t('agentFlow.eventDetails')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {selectedEvent && (
            <Box>
              <Typography level="body-sm" sx={{ mb: 1 }}>
                <strong>Event Type:</strong> {selectedEvent.event}
              </Typography>
              
              <Typography level="body-sm" sx={{ mb: 2 }}>
                <strong>Data:</strong>
              </Typography>
              
              <Card variant="outlined" sx={{ bgcolor: 'background.level1' }}>
                <CardContent>
                  <pre style={{ 
                    fontSize: '0.875rem', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    fontFamily: 'monospace'
                  }}>
                    {JSON.stringify(selectedEvent.data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </Box>
          )}
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AgentFlowTimeline;
