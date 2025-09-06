import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadJSON, saveJSON } from './storage';

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
});