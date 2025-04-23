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
    this.sampleRate = 44100;
    this.baseLatency = 0.005;
  }
  
  createGain() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: { 
        value: 1,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn()
      },
    };
  }
  
  createStereoPanner() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      pan: { 
        value: 0,
        setValueAtTime: jest.fn()
      },
    };
  }
  
  createOscillator() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { 
        value: 440,
        setValueAtTime: jest.fn()
      },
      type: 'sine'
    };
  }
  
  createMediaElementSource() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      mediaElement: null
    };
  }

  async decodeAudioData(arrayBuffer) {
    // Mock successful decode for valid audio files
    if (arrayBuffer.byteLength > 0) {
      return {
        duration: 2.0,
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 88200,
        getChannelData: () => new Float32Array(88200)
      };
    }
    throw new Error('Invalid audio data');
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