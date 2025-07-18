// src/services/fileService.ts

/**
 * FileService provides utility functions for file operations
 * including validation, URL generation, and file information retrieval
 */

import { API_BASE_URL } from '../api/config';
import type { FileUpload } from '../types/api';

export interface FileUploadData {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 data URL
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
} as const;

export class FileService {
  /**
   * Validates if a file meets the upload requirements
   */
  static validateFile(file: File): FileValidationResult {
    if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${FileService.formatFileSize(FILE_CONSTRAINTS.MAX_SIZE)} limit`,
      };
    }

    if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type as any)) {
      return {
        valid: false,
        error: 'File type not supported',
      };
    }

    return { valid: true };
  }

  /**
   * Formats file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Gets the URL for accessing a file
   */
  static getFileUrl(fileId: string): string {
    return `${API_BASE_URL}/api/v1/chat/files/${fileId}`;
  }

  /**
   * Gets the URL for downloading a file
   */
  static getDownloadUrl(fileId: string): string {
    return `${API_BASE_URL}/api/v1/chat/files/${fileId}?download=true`;
  }

  /**
   * Gets the URL for a file thumbnail
   */
  static getThumbnailUrl(fileId: string, size?: number): string {
    const baseUrl = `${API_BASE_URL}/api/v1/chat/files/${fileId}/thumbnail`;
    return size ? `${baseUrl}?size=${size}` : baseUrl;
  }

  /**
   * Compresses an image file if it's too large
   */
  static async compressImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);

        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Creates a mock FileUpload object for display purposes
   * In a real application, this would fetch file metadata from the backend
   */
  static createMockFileUpload(fileId: string): FileUpload {
    return {
      file_id: fileId,
      name: `File ${fileId}`,
      mime: 'application/octet-stream',
      size: 0,
      is_image: false,
      url: FileService.getFileUrl(fileId),
      download_url: FileService.getDownloadUrl(fileId),
      thumbnail_url: FileService.getThumbnailUrl(fileId),
      thumbnail_small: FileService.getThumbnailUrl(fileId, 150),
      thumbnail_medium: FileService.getThumbnailUrl(fileId, 300),
    };
  }

  /**
   * Checks if a file URL is valid (exists and is accessible)
   */
  static async validateFileUrl(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(FileService.getFileUrl(fileId), { 
        method: 'HEAD' // Only check if file exists, don't download
      });
      return response.ok;
    } catch (error) {
      console.warn(`File validation failed for ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Gets the best available URL for a file (with fallbacks)
   */
  static getFileUrlWithFallbacks(fileId: string): string[] {
    return [
      FileService.getFileUrl(fileId),
      FileService.getThumbnailUrl(fileId, 300),
      FileService.getThumbnailUrl(fileId, 150),
      FileService.getThumbnailUrl(fileId)
    ];
  }
}
