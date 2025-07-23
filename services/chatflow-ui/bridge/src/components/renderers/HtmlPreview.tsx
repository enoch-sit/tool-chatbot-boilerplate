import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/joy';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface HtmlPreviewProps {
  htmlContent: string;
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ htmlContent }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableHtml, setEditableHtml] = useState(htmlContent);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Function to create a complete HTML document with proper styling
  const createFullHtmlDocument = (html: string) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    
    /* Reset and normalize some styles */
    * {
      box-sizing: border-box;
    }
    
    /* Responsive images */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* Table styling */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    
    /* Code styling */
    pre {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
    }
    
    code {
      background-color: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9em;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    /* Blockquote styling */
    blockquote {
      border-left: 4px solid #007bff;
      margin: 1em 0;
      padding: 0 0 0 16px;
      color: #666;
      font-style: italic;
    }
    
    /* Links */
    a {
      color: #007bff;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Lists */
    ul, ol {
      padding-left: 20px;
    }
    
    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.2;
    }
    
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.17em; }
    
    /* Prevent overflow issues */
    body {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    /* Form elements */
    input, textarea, select, button {
      font-family: inherit;
      font-size: inherit;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  };

  // Update iframe content when HTML changes
  useEffect(() => {
    if (iframeRef.current && !isEditing) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        const fullHtml = createFullHtmlDocument(editableHtml);
        doc.open();
        doc.write(fullHtml);
        doc.close();
        
        // Auto-resize iframe based on content
        const resizeIframe = () => {
          try {
            const body = doc.body;
            const html = doc.documentElement;
            const height = Math.max(
              body.scrollHeight,
              body.offsetHeight,
              html.clientHeight,
              html.scrollHeight,
              html.offsetHeight
            );
            iframe.style.height = Math.min(height + 20, 600) + 'px'; // Max height of 600px
          } catch (e) {
            // Fallback height if we can't access iframe content
            iframe.style.height = '300px';
          }
        };

        // Resize after content loads
        setTimeout(resizeIframe, 100);
        
        // Listen for content changes that might affect height
        const observer = new MutationObserver(resizeIframe);
        if (doc.body) {
          observer.observe(doc.body, { 
            childList: true, 
            subtree: true, 
            attributes: true 
          });
        }
        
        // Clean up observer
        return () => observer.disconnect();
      }
    }
  }, [editableHtml, isEditing, iframeKey]);

  // Function to refresh iframe content
  const refreshIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  // Function to open HTML in a new window
  const openInNewWindow = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      const fullHtml = createFullHtmlDocument(editableHtml);
      newWindow.document.write(fullHtml);
      newWindow.document.close();
    }
  };

  const handleUpdate = () => {
    setIsEditing(false);
    refreshIframe();
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      border: '1px solid', 
      borderColor: 'divider', 
      borderRadius: 'md', 
      p: 1,
      backgroundColor: 'background.surface'
    }}>
      {/* Control buttons */}
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        zIndex: 1,
        display: 'flex',
        gap: 0.5
      }}>
        <Tooltip title="Open in New Window">
          <IconButton
            size="sm"
            variant="plain"
            onClick={openInNewWindow}
          >
            <OpenInNewIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={isEditing ? 'Preview HTML' : 'Edit HTML'}>
          <IconButton
            size="sm"
            variant="plain"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <VisibilityIcon /> : <EditIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {isEditing ? (
        // Edit mode - show textarea for editing HTML
        <Box>
          <Typography level="body-sm" sx={{ mb: 1, fontWeight: 'bold' }}>
            Edit HTML Content:
          </Typography>
          
          <textarea
            value={editableHtml}
            onChange={(e) => setEditableHtml(e.target.value)}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '13px',
              lineHeight: '1.4',
              resize: 'vertical'
            }}
            placeholder="Enter your HTML content here..."
          />
          
          <Button 
            onClick={handleUpdate}
            size="sm"
            sx={{ mt: 1 }}
          >
            Update Preview
          </Button>
        </Box>
      ) : (
        // Preview mode - render the HTML content in iframe
        <Box>
          <Typography level="body-sm" sx={{ 
            mb: 1, 
            fontWeight: 'bold',
            color: 'primary.500',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            🌐 HTML Preview (Secure)
          </Typography>
          
          <Box sx={{
            border: '1px solid',
            borderColor: 'neutral.300',
            borderRadius: 'sm',
            backgroundColor: 'background.body',
            overflow: 'hidden'
          }}>
            <iframe
              key={iframeKey}
              ref={iframeRef}
              style={{
                width: '100%',
                height: '300px',
                border: 'none',
                backgroundColor: 'white'
              }}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title="HTML Preview"
            />
          </Box>
          
          {/* Show a note about security and iframe */}
          <Typography level="body-xs" sx={{ 
            mt: 1, 
            opacity: 0.7,
            fontStyle: 'italic'
          }}>
            Note: HTML content is safely rendered in an isolated iframe with sandbox restrictions.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default HtmlPreview;
