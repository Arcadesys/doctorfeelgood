// Import additional setup for testing-library
require('@testing-library/jest-dom');

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Comprehensive AudioContext mock
class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.destination = {};
  }
  
  createGain() {
    return {
      connect: jest.fn(),
      gain: { value: 1 },
    };
  }
  
  createStereoPanner() {
    return {
      connect: jest.fn(),
      pan: { value: 0 },
    };
  }
  
  createOscillator() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 440 },
    };
  }
  
  createMediaElementSource() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }
  
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

// Replace the AudioContext
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Set test timeout longer for async tests
jest.setTimeout(10000); 