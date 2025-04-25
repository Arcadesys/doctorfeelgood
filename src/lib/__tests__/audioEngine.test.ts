import { AudioEngine } from '../audioEngine';
import { audioContextManager } from '@/utils/audioContextManager';

// Mock the AudioContext and related Web Audio API interfaces
class MockAudioContext {
  state = 'running';
  destination = {};
  sampleRate = 44100;
  
  createGain() {
    return {
      connect: jest.fn(),
      gain: { value: 1 }
    };
  }
  
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      getChannelData: () => new Float32Array(length),
      length,
      duration: length / sampleRate,
      numberOfChannels: channels,
      sampleRate
    };
  }
  
  createBufferSource() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      disconnect: jest.fn(),
      buffer: null,
      onended: null
    };
  }

  createMediaElementSource(element: HTMLAudioElement) {
    return {
      connect: jest.fn(),
      disconnect: jest.fn()
    };
  }
  
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  
  close() {
    return Promise.resolve();
  }

  decodeAudioData(buffer: ArrayBuffer) {
    return Promise.resolve({
      duration: 1,
      length: 44100,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100)
    });
  }
}

// Mock the MediaElementSource
class MockMediaElementSource {
  constructor(element: HTMLAudioElement) {}
  connect = jest.fn();
}

// Mock fetch for loading audio samples
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
  })
);

describe('AudioEngine', () => {
  let audioEngine: AudioEngine;
  let mockAudioElement: HTMLAudioElement;

  beforeEach(() => {
    // Setup mocks
    (window as any).AudioContext = MockAudioContext;
    (window as any).webkitAudioContext = MockAudioContext;
    (window as any).MediaElementSource = MockMediaElementSource;
    
    // Create a mock audio element
    mockAudioElement = document.createElement('audio');
    mockAudioElement.src = '/audio/sine-440hz.mp3';
  });

  afterEach(async () => {
    if (audioEngine) {
      await audioEngine.dispose();
    }
    jest.clearAllMocks();
  });

  it('should initialize successfully', async () => {
    // Arrange
    audioEngine = new AudioEngine();
    
    // Act & Assert
    await expect(audioEngine.initialize(mockAudioElement)).resolves.not.toThrow();
    expect(audioEngine.getContext()).toBeTruthy();
    expect(audioEngine.getIsPlaying()).toBe(false);
  });

  it('should handle initialization without audio element', async () => {
    // Arrange
    audioEngine = new AudioEngine();
    
    // Act & Assert
    await expect(audioEngine.initialize()).resolves.not.toThrow();
    expect(audioEngine.getContext()).toBeTruthy();
  });

  it('should maintain singleton audio context across instances', async () => {
    // Arrange
    const firstEngine = new AudioEngine();
    const secondEngine = new AudioEngine();
    
    // Act
    await firstEngine.initialize();
    await secondEngine.initialize();
    
    // Assert
    expect(firstEngine.getContext()).toBe(secondEngine.getContext());
  });

  it('should handle play/pause state correctly', async () => {
    // Arrange
    audioEngine = new AudioEngine();
    await audioEngine.initialize(mockAudioElement);
    
    // Act & Assert
    await expect(audioEngine.startPlayback()).resolves.toBe(true);
    expect(audioEngine.getIsPlaying()).toBe(true);
    
    audioEngine.stopAll();
    expect(audioEngine.getIsPlaying()).toBe(false);
  });

  it('should handle cleanup properly', async () => {
    // Arrange
    audioEngine = new AudioEngine();
    await audioEngine.initialize(mockAudioElement);
    
    // Act
    await audioEngine.dispose();
    
    // Assert
    expect(audioEngine.getContext()).toBeNull();
    expect(audioEngine.getIsPlaying()).toBe(false);
  });

  it('should handle suspended audio context', async () => {
    // Arrange
    const mockContext = new MockAudioContext();
    mockContext.state = 'suspended';
    (window as any).AudioContext = jest.fn(() => mockContext);
    
    audioEngine = new AudioEngine();
    
    // Act & Assert
    await expect(audioEngine.initialize(mockAudioElement)).resolves.not.toThrow();
    expect(mockContext.state).toBe('running');
  });

  it('should handle play button scenario', async () => {
    // Arrange
    audioEngine = new AudioEngine();
    
    // Act & Assert - First initialization
    await expect(audioEngine.initialize(mockAudioElement)).resolves.not.toThrow();
    expect(audioEngine.getContext()).toBeTruthy();
    
    // Simulate component unmount/cleanup
    await audioEngine.dispose();
    
    // Create new instance (like when component remounts)
    audioEngine = new AudioEngine();
    
    // Try to play without initialization
    const playWithoutInit = async () => audioEngine.startPlayback();
    await expect(playWithoutInit()).rejects.toThrow('AudioEngine not initialized');
    
    // Initialize and try again
    await audioEngine.initialize(mockAudioElement);
    const success = await audioEngine.startPlayback();
    expect(success).toBe(true);
    expect(audioEngine.getIsPlaying()).toBe(true);
  });

  it('should prevent usage before initialization', async () => {
    // Arrange
    audioEngine = new AudioEngine();
    
    // Act & Assert
    await expect(audioEngine.startPlayback()).rejects.toThrow('AudioEngine not initialized');
    await expect(audioEngine.playContactSound(true)).rejects.toThrow('AudioEngine not initialized');
    await expect(audioEngine.setPan(0)).rejects.toThrow('AudioEngine not initialized');
  });
}); 