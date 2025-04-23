/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EMDRProcessorAudioEngine } from '../EMDRProcessorAudioEngine';
import { useAudioEngine } from '../../hooks/useAudioEngine';

// Mock canvas
const mockGetContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  closePath: jest.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  stroke: jest.fn(),
}));

// Mock canvas element
HTMLCanvasElement.prototype.getContext = mockGetContext;

// Mock AudioEngine
const mockAudioEngine = {
  initialize: jest.fn().mockResolvedValue(true),
  dispose: jest.fn(),
  startPlayback: jest.fn().mockResolvedValue(true),
  stopAll: jest.fn(),
  setVolume: jest.fn(),
  setPan: jest.fn(),
  updateContactSoundConfig: jest.fn(),
  updateAudioTrackConfig: jest.fn(),
  setAudioMode: jest.fn(),
  getAudioMode: jest.fn().mockReturnValue('click'),
  getIsPlaying: jest.fn().mockReturnValue(false),
};

jest.mock('../../lib/audioEngine', () => ({
  AudioEngine: jest.fn().mockImplementation(() => mockAudioEngine),
}));

// Mock the CustomKnob component
jest.mock('../CustomKnob', () => {
  return function MockCustomKnob({ onChange, value, min, max, step, label }) {
    return (
      <div data-testid="custom-knob" data-value={value} data-label={label}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e, parseFloat(e.target.value))}
          aria-label={label}
        />
      </div>
    );
  };
});

// Mock the SettingsDrawer component
jest.mock('../SettingsDrawer', () => {
  return function MockSettingsDrawer({ isOpen, onClose, isSessionActive, settings, onSettingChange }) {
    if (!isOpen) return null;
    
    return (
      <div role="dialog" aria-modal="true" aria-label="Settings menu">
        <div role="tablist">
          <button role="tab" aria-selected={true}>Audio</button>
        </div>
        <div role="tabpanel">
          <div>
            <label htmlFor="audioMode">Audio Mode</label>
            <button
              role="switch"
              aria-checked={settings.audioMode}
              onClick={() => onSettingChange('audioMode', !settings.audioMode)}
              aria-label="Audio mode"
            >
              <span />
            </button>
          </div>
          <div>
            <label htmlFor="volume">Volume</label>
            <input
              type="range"
              id="volume"
              role="slider"
              aria-label="Volume"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => onSettingChange('volume', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    );
  };
});

// Mock AudioContext and related APIs
class MockAudioContext {
  destination = {};
  createGain = jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  }));
  createOscillator = jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    type: 'sine'
  }));
  createStereoPanner = jest.fn(() => ({
    connect: jest.fn(),
    pan: { value: 0 }
  }));
  createMediaElementSource = jest.fn(() => ({
    connect: jest.fn()
  }));
  close = jest.fn();
}

// Mock window objects needed for the component
window.AudioContext = window.AudioContext || MockAudioContext;
window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = jest.fn();
window.HTMLMediaElement.prototype.load = jest.fn();

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(callback => {
  return setTimeout(callback, 0);
});
global.cancelAnimationFrame = jest.fn(id => {
  clearTimeout(id);
});

// Mock the useAudioEngine hook
jest.mock('../../hooks/useAudioEngine');

describe('EMDRProcessorAudioEngine', () => {
  const mockSettings = {
    speed: 5,
    sessionDuration: 10,
    audioMode: true,
    volume: 0.5,
    targetSize: 5,
    targetColor: '#000000',
    backgroundColor: '#FFFFFF',
  };

  const mockOnSettingsChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAudioEngine as jest.Mock).mockReturnValue({
      isPlaying: false,
      volume: 0.5,
      audioMode: true,
      togglePlayback: jest.fn(),
      setVolume: jest.fn(),
      toggleAudioMode: jest.fn(),
    });
  });

  it('renders settings drawer with correct initial values', () => {
    render(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Speed')).toHaveValue(mockSettings.speed.toString());
    expect(screen.getByLabelText('Session duration in minutes')).toHaveValue(mockSettings.sessionDuration.toString());
    expect(screen.getByRole('switch', { name: 'Audio mode' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Volume')).toHaveValue(mockSettings.volume.toString());
  });

  it('handles rapid mode switches correctly', async () => {
    render(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const audioModeButton = screen.getByRole('switch', { name: 'Audio mode' });
    
    // Simulate 5 rapid mode switches
    for (let i = 0; i < 5; i++) {
      fireEvent.click(audioModeButton);
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    }

    expect(mockOnSettingsChange).toHaveBeenCalledTimes(5);
  });

  it('handles volume changes correctly', async () => {
    render(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const volumeSlider = screen.getByLabelText('Volume');
    
    // Simulate 5 volume changes
    for (let i = 0; i < 5; i++) {
      fireEvent.change(volumeSlider, { target: { value: (i + 1) * 0.2 } });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    }

    expect(mockOnSettingsChange).toHaveBeenCalledTimes(5);
  });

  it('maintains focus management when drawer is opened', () => {
    render(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close settings' });
    expect(document.activeElement).toBe(closeButton);
  });

  it('announces audio mode changes', () => {
    const { rerender } = render(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={{ ...mockSettings, audioMode: false }}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const audioModeButton = screen.getByRole('switch', { name: 'Audio mode' });
    expect(audioModeButton).toHaveAttribute('aria-checked', 'false');

    rerender(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={{ ...mockSettings, audioMode: true }}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(audioModeButton).toHaveAttribute('aria-checked', 'true');
  });

  it('announces volume changes', () => {
    const { rerender } = render(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={{ ...mockSettings, volume: 0.3 }}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const volumeSlider = screen.getByLabelText('Volume');
    expect(volumeSlider).toHaveValue('0.3');

    rerender(
      <EMDRProcessorAudioEngine
        isOpen={true}
        onClose={mockOnClose}
        settings={{ ...mockSettings, volume: 0.7 }}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(volumeSlider).toHaveValue('0.7');
  });
}); 