// src/types/api.ts

/**
 * File upload types for chat file attachments
 */
export interface FileUpload {
  file_id: string;
  name: string;
  mime: string;
  size: number;
  is_image: boolean;
  url: string;
  download_url: string;
  thumbnail_url: string;
  thumbnail_small: string;
  thumbnail_medium: string;
}

export interface UploadResponse {
  file_id: string;
  message: string;
}

export interface FileUploadRequest {
  file: File;
  session_id: string;
}

export interface ChatMessageRequest {
  chatflow_id: string;
  sessionId: string;
  question: string;
  file_ids?: string[];
}

export interface ApiError {
  message: string;
  status: number;
  details?: Record<string, any>;
}
