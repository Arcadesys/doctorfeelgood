import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { EMDRProcessor } from '../components/EMDRProcessor';

// Mock the Audio Element
class MockAudio {
  src: string = '';
  onloadstart: (() => void) | null = null;
  onloadeddata: (() => void) | null = null;
  oncanplay: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  
  play() {
    return Promise.resolve();
  }
  
  pause() {}
  load() {}
}

// Mock useRef to return our mock audio
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    useRef: jest.fn(() => ({
      current: new MockAudio()
    }))
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('EMDRProcessor', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    localStorageMock.clear();
  });
  
  afterEach(() => {
    // Restore original settings
    process.env.NODE_ENV = originalNodeEnv;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });
  
  test('In development mode, it loads sine-440hz.mp3 from audio directory', async () => {
    // Set to development mode
    process.env.NODE_ENV = 'development';
    
    // Render the component
    await act(async () => {
      render(<EMDRProcessor />);
    });
    
    // Check that dev-specific logs were called
    expect(console.log).toHaveBeenCalledWith('Development mode detected, setting up audio file');
    
    // Fast-forward timers to trigger the setTimeout
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    
    // Check that it tried to load the development file
    expect(console.log).toHaveBeenCalledWith('Setting audio source to sine-440hz.mp3');
  });
  
  test('In production mode, it doesnt attempt to load development files', async () => {
    // Set to production mode
    process.env.NODE_ENV = 'production';
    
    // Render the component
    await act(async () => {
      render(<EMDRProcessor />);
    });
    
    // Check that dev-specific logs were not called
    expect(console.log).not.toHaveBeenCalledWith('Development mode detected, setting up audio file');
    expect(console.log).toHaveBeenCalledWith('Production mode detected');
    
    // Fast-forward timers to ensure setTimeout would have been triggered
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    
    // Check that it didn't try to load the development file
    expect(console.log).not.toHaveBeenCalledWith('Setting audio source to sine-440hz.mp3');
  });
}); 