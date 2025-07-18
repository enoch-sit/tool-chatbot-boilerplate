// src/utils/typeGuards.ts

/**
 * Type guard utilities for runtime type checking
 * Ensures type safety when working with dynamic data
 */

import type { FileUpload } from '../types/api';
import type { Message } from '../types/chat';

/**
 * Checks if an object is a valid FileUpload
 */
export function isFileUpload(obj: any): obj is FileUpload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.file_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.mime === 'string' &&
    typeof obj.size === 'number' &&
    typeof obj.is_image === 'boolean' &&
    typeof obj.url === 'string' &&
    typeof obj.download_url === 'string' &&
    typeof obj.thumbnail_url === 'string' &&
    typeof obj.thumbnail_small === 'string' &&
    typeof obj.thumbnail_medium === 'string'
  );
}

/**
 * Checks if a message has file uploads
 */
export function hasUploads(message: Message): message is Message & { uploads: FileUpload[] } {
  return message.uploads !== undefined && message.uploads.length > 0;
}

/**
 * Checks if an object is a valid Message
 */
export function isMessage(obj: any): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.sender === 'string' &&
    typeof obj.content === 'string'
  );
}

/**
 * Filters out invalid FileUpload objects from an array
 */
export function filterValidUploads(uploads: any[]): FileUpload[] {
  return uploads.filter(isFileUpload);
}

/**
 * Checks if a file upload is an image
 */
export function isImageUpload(upload: FileUpload): boolean {
  return upload.is_image === true;
}

/**
 * Gets image uploads from a message
 */
export function getImageUploads(message: Message): FileUpload[] {
  if (!hasUploads(message)) return [];
  return message.uploads.filter(isImageUpload);
}

/**
 * Gets non-image uploads from a message
 */
export function getFileUploads(message: Message): FileUpload[] {
  if (!hasUploads(message)) return [];
  return message.uploads.filter(upload => !isImageUpload(upload));
}
