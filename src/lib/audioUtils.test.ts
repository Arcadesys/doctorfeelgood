import { describe, it, expect, vi } from 'vitest';
import { isValidAudioFile, revokeFileUrl, formatFileSize } from './audioUtils';

describe('audioUtils', () => {
  describe('isValidAudioFile', () => {
    it('returns true for audio files', () => {
      const audioFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      expect(isValidAudioFile(audioFile)).toBe(true);
    });

    it('returns true for various audio types', () => {
      const files = [
        new File([''], 'test.mp3', { type: 'audio/mpeg' }),
        new File([''], 'test.wav', { type: 'audio/wav' }),
        new File([''], 'test.ogg', { type: 'audio/ogg' }),
        new File([''], 'test.m4a', { type: 'audio/mp4' }),
        new File([''], 'test.flac', { type: 'audio/flac' }),
      ];

      files.forEach(file => {
        expect(isValidAudioFile(file)).toBe(true);
      });
    });

    it('returns false for non-audio files', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      expect(isValidAudioFile(textFile)).toBe(false);
    });

    it('returns false for image files', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidAudioFile(imageFile)).toBe(false);
    });

    it('returns false for video files', () => {
      const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      expect(isValidAudioFile(videoFile)).toBe(false);
    });

    it('returns false for files with empty type', () => {
      const unknownFile = new File([''], 'test.unknown', { type: '' });
      expect(isValidAudioFile(unknownFile)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(512)).toBe('512 Bytes');
      expect(formatFileSize(1000)).toBe('1000 Bytes');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1536000)).toBe('1.46 MB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(formatFileSize(2.25 * 1024 * 1024)).toBe('2.25 MB');
    });

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('handles large numbers', () => {
      const largeSize = 5.5 * 1024 * 1024 * 1024;
      expect(formatFileSize(largeSize)).toBe('5.5 GB');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatFileSize(1536.7777)).toBe('1.5 KB');
      expect(formatFileSize(1638400.333)).toBe('1.56 MB');
    });
  });

  describe('revokeFileUrl', () => {
    it('calls URL.revokeObjectURL for blob URLs', () => {
      // Mock URL.revokeObjectURL
      const originalRevoke = URL.revokeObjectURL;
      const mockRevoke = vi.fn();
      URL.revokeObjectURL = mockRevoke;

      revokeFileUrl('blob:http://localhost:3000/12345');
      
      expect(mockRevoke).toHaveBeenCalledWith('blob:http://localhost:3000/12345');

      // Restore original
      URL.revokeObjectURL = originalRevoke;
    });

    it('does not call URL.revokeObjectURL for non-blob URLs', () => {
      // Mock URL.revokeObjectURL
      const originalRevoke = URL.revokeObjectURL;
      const mockRevoke = vi.fn();
      URL.revokeObjectURL = mockRevoke;

      revokeFileUrl('http://example.com/audio.mp3');
      revokeFileUrl('data:audio/wav;base64,xyz');
      revokeFileUrl('');
      
      expect(mockRevoke).not.toHaveBeenCalled();

      // Restore original
      URL.revokeObjectURL = originalRevoke;
    });

    it('handles empty or undefined URLs safely', () => {
      // These should not throw errors
      expect(() => revokeFileUrl('')).not.toThrow();
      expect(() => revokeFileUrl(undefined as any)).not.toThrow();
      expect(() => revokeFileUrl(null as any)).not.toThrow();
    });
  });
});