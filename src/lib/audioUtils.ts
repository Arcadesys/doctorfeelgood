// Utility functions for managing audio file uploads and memory cleanup

/**
 * Revokes a blob URL to free up memory
 */
export function revokeFileUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Validates if a file is a supported audio format
 */
export function isValidAudioFile(file: File): boolean {
  return file.type.startsWith('audio/');
}

/**
 * Gets a human-readable file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}