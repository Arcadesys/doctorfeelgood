import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

// Mock the storage module
vi.mock('./lib/storage', () => ({
  loadJSON: vi.fn(),
  saveJSON: vi.fn(),
}));

// Mock useAudioEngine
vi.mock('./hooks/useAudioEngine', () => ({
  useAudioEngine: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    setPan: vi.fn(),
    setVolume: vi.fn(),
    click: vi.fn(),
  })),
}));

import { loadJSON, saveJSON } from './lib/storage';
import { useAudioEngine } from './hooks/useAudioEngine';

// Mock ResizeObserver
const mockRaf = vi.fn();
const mockCancelAnimationFrame = vi.fn();

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', mockRaf);
  vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);
  vi.stubGlobal('performance', { now: vi.fn(() => 1000) });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders main components', () => {
    (loadJSON as any).mockReturnValue(null);
    
    render(<App />);
    
    expect(screen.getByText('EMDR Processor · MVP')).toBeDefined();
    expect(screen.getByLabelText('Play')).toBeDefined();
    expect(screen.getByLabelText('Stop')).toBeDefined();
    expect(screen.getByLabelText('Reset session')).toBeDefined();
    expect(screen.getByLabelText('Bilateral visual stage')).toBeDefined();
  });

  it('loads saved configuration on startup', () => {
    const savedConfig = {
      durationSec: 180,
      target: {
        sizePx: 32,
        color: '#ff0000',
        shape: 'square',
        rotate: true,
        speedPxPerSec: 600,
        edgePaddingPx: 20,
        edgePauseMs: 100,
        startPosition: 'left',
      },
      audio: {
        mode: 'beep',
        volume: 0.5,
      },
    };
    
    (loadJSON as any).mockReturnValue(savedConfig);
    
    render(<App />);
    
    // Should display the loaded configuration
    expect(screen.getByDisplayValue('Beep')).toBeDefined();
    expect(screen.getByDisplayValue('0.5')).toBeDefined();
  });

  it('uses default configuration when no saved config exists', () => {
    (loadJSON as any).mockReturnValue(null);
    
    render(<App />);
    
    // Should show default values
    expect(screen.getByDisplayValue('Click')).toBeDefined();
    expect(screen.getByDisplayValue('0.8')).toBeDefined();
    // Use specific selector for time display
    const remainingTimeDisplay = screen.getByLabelText('Session controls')
      .querySelector('.time');
    expect(remainingTimeDisplay?.textContent).toBe('2:00');
  });

  it('saves configuration when config changes', async () => {
    (loadJSON as any).mockReturnValue(null);
    
    render(<App />);
    
    // Change a configuration value
    const volumeSlider = screen.getByDisplayValue('0.8');
    fireEvent.change(volumeSlider, { target: { value: '0.6' } });
    
    // Should call saveJSON
    await waitFor(() => {
      expect(saveJSON).toHaveBeenCalled();
    });
  });

  it('starts and stops audio engine correctly', () => {
    const mockAudioEngine = {
      start: vi.fn(),
      stop: vi.fn(),
      setPan: vi.fn(),
      setVolume: vi.fn(),
      click: vi.fn(),
    };
    
    (useAudioEngine as any).mockReturnValue(mockAudioEngine);
    (loadJSON as any).mockReturnValue(null);
    
    render(<App />);
    
    // Start playing
    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);
    
    expect(mockRaf).toHaveBeenCalled();
    
    // Stop playing
    const stopButton = screen.getByLabelText('Stop');
    fireEvent.click(stopButton);
    
    expect(mockAudioEngine.stop).toHaveBeenCalled();
  });

  it('resets timer correctly', () => {
    (loadJSON as any).mockReturnValue(null);
    
    render(<App />);
    
    // Start playing to change the timer
    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);
    
    // Reset
    const resetButton = screen.getByLabelText('Reset session');
    fireEvent.click(resetButton);
    
    // Should show full duration again - use specific selector
    const remainingTimeDisplay = screen.getByLabelText('Session controls')
      .querySelector('.time');
    expect(remainingTimeDisplay?.textContent).toBe('2:00');
  });

  it('handles audio engine callbacks correctly', () => {
    const mockAudioEngine = {
      start: vi.fn(),
      stop: vi.fn(),
      setPan: vi.fn(),
      setVolume: vi.fn(),
      click: vi.fn(),
    };
    
    (useAudioEngine as any).mockReturnValue(mockAudioEngine);
    (loadJSON as any).mockReturnValue(null);
    
    render(<App />);
    
    // Start playing to trigger animation
    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);
    
    expect(mockRaf).toHaveBeenCalled();
    
    // The audio engine should be initialized with correct parameters
    expect(useAudioEngine).toHaveBeenCalledWith(
      true,
      0.8, // default volume
      'square', // default waveform
      'click', // default mode
      undefined // no file URL
    );
  });

  it('updates remaining time display', () => {
    (loadJSON as any).mockReturnValue(null);
    
    render(<App />);
    
    // Should start with full duration - be more specific
    const remainingTimeDisplay = screen.getByLabelText('Session controls')
      .querySelector('.time');
    expect(remainingTimeDisplay?.textContent).toBe('2:00');
  });

  it('handles configuration migration correctly', () => {
    // Simulate old config missing some new fields
    const partialConfig = {
      durationSec: 90,
      target: {
        sizePx: 20,
        color: '#00ff00',
        speedPxPerSec: 300,
        edgePaddingPx: 10,
        edgePauseMs: 50,
        startPosition: 'right',
        // Missing: shape, rotate
      },
      audio: {
        mode: 'click',
        volume: 0.7,
        // Missing: waveform
      },
    };
    
    (loadJSON as any).mockReturnValue(partialConfig);
    
    render(<App />);
    
    // Should use defaults for missing fields
    expect(screen.getByDisplayValue('Circle')).toBeDefined(); // default shape
    expect(screen.getByDisplayValue('Square')).toBeDefined(); // default waveform
  });

  it('displays correct time format for different durations', () => {
    (loadJSON as any).mockReturnValue({ durationSec: 75 });
    
    render(<App />);
    
    // Use a more specific selector to avoid conflicts with the dropdown
    const remainingTimeDisplay = screen.getByLabelText('Session controls')
      .querySelector('.time');
    expect(remainingTimeDisplay?.textContent).toBe('1:15');
  });

  it('handles edge case with zero duration', () => {
    (loadJSON as any).mockReturnValue({ durationSec: 0 });
    
    render(<App />);
    
    const remainingTimeDisplay = screen.getByLabelText('Session controls')
      .querySelector('.time');
    expect(remainingTimeDisplay?.textContent).toBe('0:00');
  });
});