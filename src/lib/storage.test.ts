import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadJSON, saveJSON, fileToDataUrl, saveCustomAudio, loadCustomAudio, clearCustomAudio, getStoredAudioSize } from './storage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('storage utilities', () => {
  describe('saveJSON', () => {
    it('saves data to localStorage as JSON string', () => {
      const testData = { foo: 'bar', num: 42 };
      
      saveJSON(testData);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'emdr-config-v1',
        JSON.stringify(testData)
      );
    });

    it('handles circular references gracefully', () => {
      // The actual implementation doesn't log errors, it just ignores them
      const circular: any = { prop: 'value' };
      circular.self = circular;
      
      // This should not throw an error
      expect(() => saveJSON(circular)).not.toThrow();
      // The implementation catches the error and continues
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Should not throw, errors are caught and ignored
      expect(() => saveJSON({ test: 'data' })).not.toThrow();
    });
  });

  describe('loadJSON', () => {
    it('loads and parses data from localStorage', () => {
      const testData = { foo: 'bar', num: 42 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testData));
      
      const result = loadJSON<typeof testData>();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('emdr-config-v1');
      expect(result).toEqual(testData);
    });

    it('returns null when no data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = loadJSON();
      
      expect(result).toBeNull();
    });

    it('returns null when data is empty string', () => {
      localStorageMock.getItem.mockReturnValue('');
      
      const result = loadJSON();
      
      expect(result).toBeNull();
    });

    it('handles invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json {');
      
      const result = loadJSON();
      
      expect(result).toBeNull();
    });

    it('handles localStorage access errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('SecurityError');
      });
      
      const result = loadJSON();
      
      expect(result).toBeNull();
    });

    it('preserves type information when loading', () => {
      interface TestConfig {
        name: string;
        count: number;
        enabled: boolean;
      }
      
      const testData: TestConfig = { name: 'test', count: 5, enabled: true };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testData));
      
      const result = loadJSON<TestConfig>();
      
      expect(result).toEqual(testData);
      expect(typeof result?.name).toBe('string');
      expect(typeof result?.count).toBe('number');
      expect(typeof result?.enabled).toBe('boolean');
    });
  });

  describe('fileToDataUrl', () => {
    it('converts a blob to a data URL', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      
      const result = await fileToDataUrl(blob);
      
      expect(result).toMatch(/^data:text\/plain;base64,/);
    });
  });

  describe('saveCustomAudio', () => {
    it('saves audio file to localStorage', async () => {
      const audioContent = new Uint8Array([1, 2, 3, 4]);
      const file = new File([audioContent], 'test.mp3', { type: 'audio/mpeg' });
      
      const result = await saveCustomAudio(file);
      
      expect(result.success).toBe(true);
      expect(result.dataUrl).toMatch(/^data:audio\/mpeg;base64,/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'emdr-custom-audio-v1',
        expect.stringContaining('"fileName":"test.mp3"')
      );
    });

    it('returns error for files that are too large', async () => {
      // Create a mock that simulates a large file by manipulating the data URL
      const originalFileReader = global.FileReader;
      const mockFileReader = vi.fn().mockImplementation(() => {
        const reader = {
          result: 'data:audio/mpeg;base64,' + 'A'.repeat(5 * 1024 * 1024), // 5MB of base64
          onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
          onerror: null as ((event: ProgressEvent<FileReader>) => void) | null,
          readAsDataURL: function() {
            setTimeout(() => this.onload?.({} as ProgressEvent<FileReader>), 0);
          }
        };
        return reader;
      });
      global.FileReader = mockFileReader as unknown as typeof FileReader;
      
      const file = new File(['test'], 'large.mp3', { type: 'audio/mpeg' });
      const result = await saveCustomAudio(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/too large/i);
      
      global.FileReader = originalFileReader;
    });

    it('handles storage quota errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const result = await saveCustomAudio(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('loadCustomAudio', () => {
    it('loads saved audio data', () => {
      const savedData = {
        dataUrl: 'data:audio/mpeg;base64,AQIDBA==',
        fileName: 'test.mp3',
        mimeType: 'audio/mpeg',
        savedAt: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));
      
      const result = loadCustomAudio();
      
      expect(result).toEqual({
        dataUrl: savedData.dataUrl,
        fileName: savedData.fileName
      });
    });

    it('returns null when no audio is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = loadCustomAudio();
      
      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid');
      
      const result = loadCustomAudio();
      
      expect(result).toBeNull();
    });
  });

  describe('clearCustomAudio', () => {
    it('removes audio from localStorage', () => {
      clearCustomAudio();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('emdr-custom-audio-v1');
    });
  });

  describe('getStoredAudioSize', () => {
    it('returns size in MB', () => {
      const data = 'x'.repeat(1024 * 1024); // 1MB
      localStorageMock.getItem.mockReturnValue(data);
      
      const size = getStoredAudioSize();
      
      expect(size).toBeCloseTo(1, 1);
    });

    it('returns 0 when no audio stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const size = getStoredAudioSize();
      
      expect(size).toBe(0);
    });
  });
});