import { audioContextManager } from '../audioContextManager';

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  destination = {};
  sampleRate = 44100;
  
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  
  close() {
    return Promise.resolve();
  }
}

describe('AudioContextManager', () => {
  beforeEach(() => {
    // Setup mocks
    (window as any).AudioContext = MockAudioContext;
    (window as any).webkitAudioContext = MockAudioContext;
  });

  afterEach(async () => {
    await audioContextManager.cleanup();
  });

  it('should initialize successfully', async () => {
    // Act & Assert
    await expect(audioContextManager.initialize()).resolves.not.toThrow();
    expect(audioContextManager.getContext()).toBeTruthy();
    expect(audioContextManager.isContextInitialized()).toBe(true);
  });

  it('should maintain singleton instance', () => {
    // Act
    const instance1 = audioContextManager;
    const instance2 = audioContextManager;
    
    // Assert
    expect(instance1).toBe(instance2);
  });

  it('should handle suspended state', async () => {
    // Arrange
    const mockContext = new MockAudioContext();
    mockContext.state = 'suspended';
    (window as any).AudioContext = jest.fn(() => mockContext);
    
    // Act & Assert
    await expect(audioContextManager.initialize()).resolves.not.toThrow();
    expect(mockContext.state).toBe('running');
  });

  it('should handle cleanup properly', async () => {
    // Arrange
    await audioContextManager.initialize();
    
    // Act
    await audioContextManager.cleanup();
    
    // Assert
    expect(audioContextManager.getContext()).toBeNull();
    expect(audioContextManager.isContextInitialized()).toBe(false);
  });

  it('should handle multiple initialization calls', async () => {
    // Act
    const promise1 = audioContextManager.initialize();
    const promise2 = audioContextManager.initialize();
    
    // Assert
    await expect(Promise.all([promise1, promise2])).resolves.not.toThrow();
    expect(audioContextManager.isContextInitialized()).toBe(true);
  });

  it('should handle initialization after cleanup', async () => {
    // Arrange
    await audioContextManager.initialize();
    await audioContextManager.cleanup();
    
    // Act & Assert
    await expect(audioContextManager.initialize()).resolves.not.toThrow();
    expect(audioContextManager.isContextInitialized()).toBe(true);
  });
}); 