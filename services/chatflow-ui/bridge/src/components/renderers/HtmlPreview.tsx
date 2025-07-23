import React, { useState } from 'react';
import { Box, Button, Modal, ModalDialog, ModalClose, Typography } from '@mui/joy';
import CodeBlock from './CodeBlock';

interface HtmlPreviewProps {
  htmlContent: string;
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ htmlContent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePreview = () => {
    setIsModalOpen(true);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Box>
      {/* Code Block with HTML syntax highlighting */}
      <CodeBlock 
        code={htmlContent} 
        language="html" 
      />
      
      {/* Preview Buttons */}
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button 
          size="sm" 
          variant="outlined" 
          onClick={handlePreview}
        >
          📱 Preview in Modal
        </Button>
        <Button 
          size="sm" 
          variant="outlined" 
          onClick={handleOpenInNewTab}
        >
          🚀 Open in New Tab
        </Button>
      </Box>

      {/* Modal for iframe preview */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
      >
        <ModalDialog 
          sx={{ 
            width: '90vw', 
            height: '90vh', 
            maxWidth: '1200px',
            padding: 2 
          }}
        >
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>
            HTML Preview
          </Typography>
          <Box 
            sx={{ 
              flex: 1, 
              border: '1px solid #ccc', 
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <iframe
              srcDoc={htmlContent}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              sandbox="allow-scripts allow-same-origin"
              title="HTML Preview"
            />
          </Box>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default HtmlPreview;
