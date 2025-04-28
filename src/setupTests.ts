// Mock window.AudioContext and window.webkitAudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createGain: () => ({
      connect: jest.fn(),
      gain: { value: 1 }
    }),
    createMediaElementSource: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      disconnect: jest.fn()
    })),
    createBuffer: jest.fn().mockImplementation((channels, length, sampleRate) => ({
      getChannelData: () => new Float32Array(length),
      length,
      duration: length / sampleRate,
      numberOfChannels: channels,
      sampleRate
    })),
    createBufferSource: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
      buffer: null,
      onended: null
    })),
    decodeAudioData: jest.fn().mockImplementation(() => Promise.resolve({
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 1,
      length: 44100,
      getChannelData: () => new Float32Array(44100)
    })),
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
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'default' as ResponseType,
    url: '',
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    body: null,
    bodyUsed: false,
    clone: () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'default' as ResponseType,
      url: '',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      body: null,
      bodyUsed: false,
      clone: () => ({})
    })
  } as Response)
); 