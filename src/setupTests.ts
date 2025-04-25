// Mock window.AudioContext and window.webkitAudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createGain: () => ({
      connect: jest.fn(),
      gain: { value: 1 }
    }),
    createMediaElementSource: jest.fn(),
    destination: {},
    state: 'running',
    resume: () => Promise.resolve(),
    close: () => Promise.resolve()
  }))
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext
});

// Mock MediaElementSource
Object.defineProperty(window, 'MediaElementSource', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    connect: jest.fn()
  }))
});

// Mock fetch for audio files
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
  })
); 