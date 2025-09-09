import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, Stack, Alert } from '@mui/joy';
import { AttachFile as AttachFileIcon, Close as CloseIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { FileService } from '../../services/fileService';
import type { FileUploadData } from '../../services/fileService';

interface FileUploadProps {
  onFilesSelected: (files: FileUploadData[]) => void;
}

export interface FileUploadRef {
  clearFiles: () => void;
  triggerFileInput: () => void;
}

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ 
  onFilesSelected
}, ref) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileUploadData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatFileSize = (bytes: number): string => {
    return FileService.formatFileSize(bytes);
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    return FileService.validateFile(file);
  };

  // Convert file to base64 data URL
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setError(null);

    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        setError(`${file.name}: ${validation.error}`);
        return;
      }
    }

    // Automatically process files when selected
    if (validFiles.length > 0) {
      await processFiles(validFiles);
    }
  };

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    // console.log('🔄 Processing files:', files.length);

    try {
      const fileUploadData: FileUploadData[] = [];
      
      for (const file of files) {
        // Validate each file
        const validation = validateFile(file);
        if (!validation.valid) {
          setError(`${file.name}: ${validation.error}`);
          return;
        }
        
        // console.log('📁 Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
        const base64Data = await fileToBase64(file);
        // console.log('✅ Base64 conversion complete for:', file.name, 'Data length:', base64Data.length);
        
        fileUploadData.push({
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data,
        });
      }

      // console.log('📤 All files processed, updating state');
      // Update attached files state for preview
      setAttachedFiles(prev => [...prev, ...fileUploadData]);
      
      // Notify parent component with ALL current files (existing + new)
      const allFiles = [...attachedFiles, ...fileUploadData];
      onFilesSelected(allFiles);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      // console.error('❌ File processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'File processing failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onFilesSelected, attachedFiles, validateFile, fileToBase64]);

  const removeFile = (fileId: string) => {
    const updatedFiles = attachedFiles.filter(f => f.id !== fileId);
    setAttachedFiles(updatedFiles);
    // Also notify parent that files have been removed
    onFilesSelected(updatedFiles);
  };

  const isImageFile = (file: FileUploadData): boolean => {
    return file.type.startsWith('image/');
  };

  // Copy image to clipboard
  const copyImageToClipboard = async (file: FileUploadData) => {
    if (!isImageFile(file)) return;
    
    try {
      // Convert base64 to blob
      const response = await fetch(file.data);
      const blob = await response.blob();
      
      // Create clipboard item
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob
      });
      
      // Copy to clipboard
      await navigator.clipboard.write([clipboardItem]);
      
      // You could add a toast notification here
      console.log('Image copied to clipboard');
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearFiles: () => {
      setAttachedFiles([]);
    },
    triggerFileInput: () => {
      fileInputRef.current?.click();
    }
  }));

  // Handle paste events for image clipboard data
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageItems: DataTransferItem[] = [];
    
    // Find image items in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        imageItems.push(item);
      }
    }

    if (imageItems.length > 0) {
      event.preventDefault();
      setError(null);
      
      const files: File[] = [];
      
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          // Generate a proper filename for pasted images
          const timestamp = new Date().getTime();
          const extension = file.type.split('/')[1] || 'png';
          const renamedFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
            type: file.type,
            lastModified: file.lastModified,
          });
          files.push(renamedFile);
        }
      }
      
      if (files.length > 0) {
        await processFiles(files);
      }
    }
  }, [processFiles]);

  // Add paste event listener
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => handlePaste(e);
    
    // Add listener to document so it works globally within the component area
    document.addEventListener('paste', handlePasteEvent);
    
    return () => {
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [handlePaste]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        border: isDragOver ? '2px dashed' : 'none',
        borderColor: isDragOver ? 'primary.main' : 'transparent',
        borderRadius: 'sm',
        p: isDragOver ? 1 : 0,
        backgroundColor: isDragOver ? 'primary.softBg' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isProcessing}
        style={{ display: 'none' }}
      />
      
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Button
          variant="outlined"
          size="sm"
          startDecorator={<AttachFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : t('chat.attachImage')}
        </Button>
        
        {attachedFiles.length === 0 && !isDragOver && (
          <Typography level="body-xs" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            {t('chat.attachImageTooltip')}
          </Typography>
        )}
        
        {attachedFiles.length > 0 && (
          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
            {attachedFiles.length} images attached
          </Typography>
        )}
        
        {isDragOver && (
          <Typography level="body-sm" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            Drop images here to upload
          </Typography>
        )}

        {/* Show image previews and file list */}
        {attachedFiles.map((file) => (
          <Box
            key={file.id}
            sx={{
              position: 'relative',
              display: 'inline-block',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 'sm',
              overflow: 'hidden',
              maxWidth: '60px',
              maxHeight: '60px',
              cursor: isImageFile(file) ? 'pointer' : 'default'
            }}
            onClick={isImageFile(file) ? () => copyImageToClipboard(file) : undefined}
            title={isImageFile(file) ? 'Click to copy image' : file.name}
          >
            {isImageFile(file) ? (
              <img
                src={file.data}
                alt={file.name}
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'background.level1',
                  fontSize: '12px',
                  textAlign: 'center',
                  p: 0.5,
                }}
              >
                <Typography level="body-xs" sx={{ wordBreak: 'break-all' }}>
                  {file.name.split('.').pop()?.toUpperCase()}
                </Typography>
              </Box>
            )}
            
            {/* Remove button */}
            <Button
              variant="solid"
              size="sm"
              onClick={() => removeFile(file.id)}
              sx={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                minHeight: '20px',
                minWidth: '20px',
                borderRadius: '50%',
                p: 0,
                backgroundColor: 'danger.500',
                '&:hover': {
                  backgroundColor: 'danger.600',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: '12px' }} />
            </Button>
          </Box>
        ))}
      </Stack>

      {/* File details list below */}
      {attachedFiles.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Stack spacing={0.5}>
            {attachedFiles.map((file) => (
              <Box
                key={file.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 0.5,
                  backgroundColor: 'background.level1',
                  borderRadius: 'sm',
                }}
              >
                <Typography level="body-sm">
                  {file.name} ({formatFileSize(file.size)})
                </Typography>
                <Button
                  variant="plain"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  disabled={isProcessing}
                >
                  <CloseIcon />
                </Button>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {error && (
        <Alert color="danger" size="sm" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload;
