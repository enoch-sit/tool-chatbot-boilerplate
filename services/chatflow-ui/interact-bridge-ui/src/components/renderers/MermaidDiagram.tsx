import React, { useEffect, useState, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import { Box, Textarea, Button, IconButton, Tooltip, Typography, Alert } from '@mui/joy';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const [svg, setSvg] = useState('');
  const [editableChart, setEditableChart] = useState(chart);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const renderDiagram = useCallback(async (diagramSource: string) => {
    try {
      // The render function needs a unique ID to avoid conflicts
      const uniqueId = `mermaid-graph-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const { svg: renderedSvg } = await mermaid.render(uniqueId, diagramSource);
      setSvg(renderedSvg);
      setError(null); // Clear previous errors on successful render
    } catch (e: any) {
      console.error('Mermaid rendering failed:', e);
      const errorMessage = e.message || 'An unknown error occurred during rendering.';
      setError(errorMessage);
      setSvg(''); // Clear the SVG to ensure the error view is shown
    }
  }, []);

  useEffect(() => {
    renderDiagram(editableChart);
  }, [chart, renderDiagram]); // Rerender when the initial chart prop changes

  const handleUpdate = () => {
    renderDiagram(editableChart);
    setIsEditing(false); // Exit editing mode after updating
  };

  // If rendering fails, default to showing the editor with an error message.
  if (error && !isEditing) {
    setIsEditing(true);
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      setIsPanning(true);
      setStartPos({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: scrollContainerRef.current.scrollLeft,
        scrollTop: scrollContainerRef.current.scrollTop,
      });
      scrollContainerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && scrollContainerRef.current) {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      scrollContainerRef.current.scrollLeft = startPos.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = startPos.scrollTop - dy;
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isPanning && scrollContainerRef.current) {
      setIsPanning(false);
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  return (
    <Box sx={{ position: 'relative', border: '1px solid', borderColor: 'divider', borderRadius: 'md', p: 1 }}>
      <Tooltip title={isEditing ? 'View Diagram' : 'Edit Diagram'}>
        <IconButton
          size="sm"
          variant="plain"
          onClick={() => setIsEditing(!isEditing)}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
          {isEditing ? <VisibilityIcon /> : <EditIcon />}
        </IconButton>
      </Tooltip>

      {isEditing ? (
        <Box>
          {error && (
            <Alert color="danger" sx={{ mb: 1 }}>
              <Typography level="body-sm">{error}</Typography>
            </Alert>
          )}
          <Textarea
            value={editableChart}
            onChange={(e) => setEditableChart(e.target.value)}
            minRows={5}
            maxRows={20}
            sx={{ mb: 1, fontFamily: 'monospace' }}
          />
          <Button startDecorator={<ReplayIcon />} onClick={handleUpdate}>
            Update Diagram
          </Button>
        </Box>
      ) : (
        <Box
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          sx={{
            overflow: 'auto',
            minHeight: '100px',
            position: 'relative',
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s ease-in-out',
              transformOrigin: 'center',
              py: 2,
              // Prevent text selection while panning
              userSelect: isPanning ? 'none' : 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 0.5, backgroundColor: 'background.surface', borderRadius: 'sm', p: 0.5, boxShadow: 'sm' }}>
            <Tooltip title="Zoom Out">
              <IconButton size="sm" variant="plain" onClick={() => setZoom(z => Math.max(0.2, z / 1.2))}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Zoom">
              <IconButton size="sm" variant="plain" onClick={() => setZoom(1)}>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom In">
              <IconButton size="sm" variant="plain" onClick={() => setZoom(z => Math.min(5, z * 1.2))}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MermaidDiagram;