import React, { useState, useRef, useEffect } from 'react';
import { Box, Button } from '@mui/joy';
import CodeBlock from './CodeBlock';

interface HtmlPreviewProps {
  htmlContent: string;
  isHistorical?: boolean; // Flag to indicate this is from completed stream
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ htmlContent, isHistorical = false }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(300);
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // Function to resize iframe based on content
  const resizeIframe = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        // Wait a bit for content to render
        setTimeout(() => {
          const contentWindow = iframe.contentWindow;
          if (contentWindow) {
            const doc = iframe.contentDocument || contentWindow.document;
            if (doc) {
              const height = Math.max(
                doc.body.scrollHeight,
                doc.body.offsetHeight,
                doc.documentElement.scrollHeight,
                doc.documentElement.offsetHeight
              );
              // Set minimum height of 200px and maximum of 800px for reasonable display
              const newHeight = Math.max(200, Math.min(height + 20, 800));
              setIframeHeight(newHeight);
            }
          }
        }, 100);
      } catch (error) {
        // Fallback if we can't access iframe content due to CORS
        console.warn('Could not resize iframe automatically:', error);
        setIframeHeight(400);
      }
    }
  };

  // Reset height when switching to preview mode
  useEffect(() => {
    if (isPreviewMode) {
      setIframeHeight(300); // Reset to default while loading
    }
  }, [isPreviewMode]);

  // Auto-switch to preview mode when stream ends
  useEffect(() => {
    if (isHistorical && !hasAutoSwitched && !isPreviewMode) {
      // Wait 1 second after stream ends, then switch to preview mode
      const timer = setTimeout(() => {
        setIsPreviewMode(true);
        setHasAutoSwitched(true);
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [isHistorical, hasAutoSwitched, isPreviewMode]);

  const handleOpenInNewTab = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Box>
      {/* Toggle between code and preview */}
      {isPreviewMode ? (
        <Box 
          sx={{ 
            border: '1px solid #ccc', 
            borderRadius: 1,
            overflow: 'hidden',
            backgroundColor: 'white'
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            style={{
              width: '100%',
              height: `${iframeHeight}px`,
              border: 'none',
            }}
            sandbox="allow-scripts allow-same-origin"
            title="HTML Preview"
            onLoad={resizeIframe}
          />
        </Box>
      ) : (
        <CodeBlock 
          code={htmlContent} 
          language="html" 
        />
      )}
      
      {/* Action Buttons */}
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button 
          size="sm" 
          variant="outlined" 
          onClick={togglePreview}
        >
          {isPreviewMode ? '📝 Show Code' : '📱 Show Preview'}
        </Button>
        <Button 
          size="sm" 
          variant="outlined" 
          onClick={handleOpenInNewTab}
        >
          🚀 Open in New Tab
        </Button>
      </Box>
    </Box>
  );
};

export default HtmlPreview;
