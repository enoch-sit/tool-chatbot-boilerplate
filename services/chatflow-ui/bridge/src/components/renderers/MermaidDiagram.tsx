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
  const [isEditing, setIsEditing] = useState(false); // Start in preview mode for automatic rendering
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const currentDiagramIdRef = useRef<string | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // No aggressive cleanup - let mermaid manage its own DOM elements completely

  const renderDiagram = useCallback(async (diagramSource: string) => {
    // Clear any pending render to prevent multiple simultaneous renders
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    
    // Create a unique ID with more entropy to avoid conflicts
    const uniqueId = `mermaid-graph-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      const { svg: renderedSvg } = await mermaid.render(uniqueId, diagramSource);
      
      // No cleanup on successful render - let mermaid manage successful diagrams
      
      currentDiagramIdRef.current = uniqueId;
      setSvg(renderedSvg);
      setError(null);
      
    } catch (e: any) {
      // Clean up immediate body children only after render failure
      setTimeout(() => {
        
        // Clean up our specific temporary element if it's an immediate child of body
        const tempElement = document.getElementById(uniqueId);
        if (tempElement && tempElement.parentNode === document.body) {
          console.log('Cleaning up failed render element:', uniqueId);
          tempElement.remove();
        }
        
        // Clean up any other mermaid elements that are immediate children of body
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(child => {
          // Only remove if it's an immediate child of body and has mermaid-related ID
          if (child.id && (child.id.startsWith('dmermaid-graph-') || child.id.startsWith('mermaid-graph-'))) {
            console.log('Cleaning up orphaned mermaid element after failure:', child.id);
            child.remove();
          }
        });
      }, 100); // Shorter delay since this is error cleanup
      
      let errorMessage = e.message || 'An unknown error occurred during rendering.';
      
      // Simplified error message cleanup
      errorMessage = errorMessage
        .replace(/mermaid-graph-\d+-\w+/g, '') // Remove generated IDs
        .replace(/element with id.*?does not exist/gi, 'Invalid diagram syntax')
        .replace(/Cannot read properties of null.*?/gi, 'Diagram rendering failed - please try again')
        .replace(/\s+/g, ' ') // Clean up extra whitespace
        .trim();
        
      // Provide a user-friendly fallback message if the cleaned message is empty
      if (!errorMessage) {
        errorMessage = 'The diagram syntax appears to be invalid. Please check your mermaid code.';
      }
      
      console.log('Setting error message:', errorMessage);
      setError(errorMessage);
      setSvg(''); // Clear the SVG to ensure the error view is shown
    }
  }, []); // No dependencies needed since we removed cleanupMermaidElements

  // Simplified initialization - start rendering immediately but debounced
  useEffect(() => {
    console.log('MermaidDiagram component mounted, starting render');
    renderTimeoutRef.current = setTimeout(() => {
      renderDiagram(editableChart);
    }, 50); // Small delay to prevent immediate multiple renders
    
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []); // Empty dependency - runs only once on mount

  // Handle chart prop changes from parent component with debouncing
  useEffect(() => {
    if (chart !== editableChart) {
      console.log('Chart prop changed, updating editableChart and re-rendering');
      setEditableChart(chart);
      
      // Clear any pending render and start a new one
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      
      renderTimeoutRef.current = setTimeout(() => {
        renderDiagram(chart);
      }, 100); // Debounce chart changes
    }
  }, [chart, renderDiagram]); // Include renderDiagram in dependencies

  // Handle successful renders - switch to preview mode when we have a valid SVG and no errors
  useEffect(() => {
    if (svg && !error) {
      console.log('Valid SVG detected, ensuring preview mode');
      setIsEditing(false);
    } else if (error && !svg) {
      console.log('Error detected with no SVG, ensuring edit mode');
      setIsEditing(true);
    }
  }, [svg, error]);

  // No cleanup on unmount - let mermaid manage its own DOM elements
  // Aggressive cleanup was causing conflicts with other mermaid instances

  const handleUpdate = () => {
    renderDiagram(editableChart);
    // Note: Don't manually set editing mode here - let the useEffect handle it based on success/failure
  };

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
              <Typography level="body-sm">
                <strong>Diagram Error:</strong> {error}
              </Typography>
              <Typography level="body-xs" sx={{ mt: 0.5, opacity: 0.8 }}>
                Please check your mermaid syntax and try updating the diagram.
              </Typography>
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