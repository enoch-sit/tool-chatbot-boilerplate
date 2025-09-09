// src/hooks/useFileUpload.ts

/**
 * Custom hook for file upload functionality
 * Provides state management and upload logic for file operations
 */

import { useState, useCallback } from 'react';
import { uploadFile } from '../api/chat';
import { FileService } from '../services/fileService';
import type { UploadResponse } from '../types/api';

export interface UseFileUploadResult {
  uploadFile: (file: File, sessionId: string) => Promise<string>;
  uploading: boolean;
  error: string | null;
  progress: number;
}

export function useFileUpload(): UseFileUploadResult {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFileHandler = useCallback(async (file: File, sessionId: string): Promise<string> => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Validate file
      const validation = FileService.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Compress image if needed
      const processedFile = await FileService.compressImage(file);

      // Upload with progress tracking
      const response: UploadResponse = await uploadFile(processedFile, sessionId);

      setProgress(100);
      return response.file_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, []);

  return { 
    uploadFile: uploadFileHandler, 
    uploading, 
    error, 
    progress 
  };
}
