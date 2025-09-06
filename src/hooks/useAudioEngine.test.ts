import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioEngine } from './useAudioEngine';

// Mock AudioContext and related APIs
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { value: 0 },
  type: 'square' as OscillatorType,
};

const mockGainNode = {
  connect: vi.fn(),
  gain: { 
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

const mockStereoPannerNode = {
  connect: vi.fn(),
  pan: { value: 0 },
};

const mockBufferSource = {
  connect: vi.fn(),
  start: vi.fn(),
  buffer: null,
};

const mockBiquadFilter = {
  connect: vi.fn(),
  type: 'highpass' as BiquadFilterType,
  frequency: { value: 0 },
};

const mockAudioContext = {
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGainNode),
  createStereoPanner: vi.fn(() => mockStereoPannerNode),
  createBufferSource: vi.fn(() => mockBufferSource),
  createBiquadFilter: vi.fn(() => mockBiquadFilter),
  createBuffer: vi.fn(() => ({ getChannelData: vi.fn(() => new Float32Array(1000)) })),
  decodeAudioData: vi.fn(() => Promise.resolve({ duration: 1.5 })),
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  state: 'running' as AudioContextState,
  suspend: vi.fn(),
  resume: vi.fn(),
};

// Mock fetch for file loading
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Mock AudioContext constructor
  global.AudioContext = vi.fn(() => mockAudioContext) as any;
  (global as any).webkitAudioContext = global.AudioContext;
  
  // Mock URL.createObjectURL
  global.URL = {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  } as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAudioEngine', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'square', 'click')
    );

    expect(result.current).toHaveProperty('start');
    expect(result.current).toHaveProperty('stop');
    expect(result.current).toHaveProperty('setPan');
    expect(result.current).toHaveProperty('setVolume');
    expect(result.current).toHaveProperty('click');
  });

  it('creates audio context on start', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'square', 'click')
    );

    await act(async () => {
      result.current.start();
    });

    expect(global.AudioContext).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockAudioContext.createStereoPanner).toHaveBeenCalled();
  });

  it('plays click sound when enabled', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'square', 'click')
    );

    await act(async () => {
      result.current.start();
      result.current.click();
    });

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.connect).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockOscillator.stop).toHaveBeenCalled();
  });

  it('plays beep sound with correct frequency', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'sine', 'beep')
    );

    await act(async () => {
      result.current.start();
      result.current.click();
    });

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.frequency.value).toBe(800);
  });

  it('generates white noise for hiss sound', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'sine', 'hiss')
    );

    await act(async () => {
      result.current.start();
      result.current.click();
    });

    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
  });

  it('sets pan value correctly', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'square', 'click')
    );

    await act(async () => {
      result.current.start();
      result.current.setPan(0.5);
    });

    expect(mockStereoPannerNode.pan.value).toBe(0.5);
  });

  it('sets volume correctly', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.8, 'square', 'click')
    );

    await act(async () => {
      result.current.start();
      result.current.setVolume(0.3);
    });

    expect(mockGainNode.gain.value).toBe(0.3);
  });

  it('does not play sound when disabled', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(false, 0.5, 'square', 'click')
    );

    await act(async () => {
      result.current.click();
    });

    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });

  it('loads audio file when fileUrl is provided', async () => {
    const mockArrayBuffer = new ArrayBuffer(1000);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });

    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'square', 'file', 'blob:test-url')
    );

    await act(async () => {
      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(global.fetch).toHaveBeenCalledWith('blob:test-url');
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
  });

  it('handles audio file loading errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'square', 'file', 'blob:test-url')
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load audio file:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('clamps pan values to valid range', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 0.5, 'square', 'click')
    );

    await act(async () => {
      result.current.start();
      result.current.setPan(2.0); // Should be clamped to 1.0
    });

    expect(mockStereoPannerNode.pan.value).toBe(1);

    await act(async () => {
      result.current.setPan(-2.0); // Should be clamped to -1.0
    });

    expect(mockStereoPannerNode.pan.value).toBe(-1);
  });

  it('clamps volume values to valid range', async () => {
    const { result } = renderHook(() => 
      useAudioEngine(true, 2.0, 'square', 'click')
    );

    await act(async () => {
      result.current.start();
      result.current.setVolume(2.0); // Should be clamped to 1.0
    });

    expect(mockGainNode.gain.value).toBe(1);

    await act(async () => {
      result.current.setVolume(-0.5); // Should be clamped to 0
    });

    expect(mockGainNode.gain.value).toBe(0);
  });
});