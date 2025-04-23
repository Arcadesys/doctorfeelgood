/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

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

// Now import the component
import { EMDRProcessor } from '../EMDRProcessor';
import { AudioEngine } from '../../lib/audioEngine';

describe('EMDRProcessor AudioEngine Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    const result = render(<EMDRProcessor />);
    container = result.container;
  });

  afterEach(() => {
    cleanup();
  });

  it('should initialize AudioEngine on mount', async () => {
    await act(async () => {
      expect(AudioEngine).toHaveBeenCalled();
      expect(AudioEngine.mock.instances[0].initialize).toHaveBeenCalled();
    });
  });

  it('should update contact sound config when settings change', async () => {
    const volumeSlider = screen.getByRole('slider', { name: /contact sound volume/i });
    
    await act(async () => {
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });
    });

    expect(AudioEngine.mock.instances[0].updateContactSoundConfig).toHaveBeenCalled();
  });

  it('should update audio track config when settings change', async () => {
    const trackVolumeSlider = screen.getByRole('slider', { name: /audio track volume/i });
    
    await act(async () => {
      fireEvent.change(trackVolumeSlider, { target: { value: '0.7' } });
    });

    expect(AudioEngine.mock.instances[0].updateAudioTrackConfig).toHaveBeenCalled();
  });

  it('should switch between click and audio track modes', async () => {
    const modeToggle = screen.getByRole('switch', { name: /audio mode/i });
    
    await act(async () => {
      fireEvent.click(modeToggle);
    });

    expect(AudioEngine.mock.instances[0].setAudioMode).toHaveBeenCalledWith('audioTrack');
  });

  it('should update volume when slider changes', async () => {
    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    
    await act(async () => {
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });
    });

    expect(AudioEngine.mock.instances[0].setVolume).toHaveBeenCalledWith(0.5);
  });

  it('should update pan when slider changes', async () => {
    const panSlider = screen.getByRole('slider', { name: /pan/i });
    
    await act(async () => {
      fireEvent.change(panSlider, { target: { value: '0.5' } });
    });

    expect(AudioEngine.mock.instances[0].setPan).toHaveBeenCalled();
  });

  it('should play contact sounds when triggered', async () => {
    render(<EMDRProcessor />);
    
    await act(async () => {
      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);
    });
    
    expect(mockAudioEngine.startPlayback).toHaveBeenCalled();
  });

  it('should cleanup AudioEngine on unmount', async () => {
    const { unmount } = render(<EMDRProcessor />);
    
    await act(async () => {
      unmount();
    });
    
    expect(mockAudioEngine.dispose).toHaveBeenCalled();
  });

  describe('Error Handling', () => {
    it('should handle AudioEngine initialization failure', async () => {
      mockAudioEngine.initialize.mockRejectedValueOnce(new Error('Initialization failed'));
      
      render(<EMDRProcessor />);
      
      expect(await screen.findByText(/failed to initialize audio/i)).toBeInTheDocument();
    });

    it('should handle playback failure', async () => {
      mockAudioEngine.startPlayback.mockRejectedValueOnce(new Error('Playback failed'));
      
      const playButton = screen.getByRole('button', { name: /play/i });
      
      await act(async () => {
        fireEvent.click(playButton);
      });
      
      expect(await screen.findByText(/failed to start playback/i)).toBeInTheDocument();
    });

    it('should handle audio mode switch failures', async () => {
      mockAudioEngine.setAudioMode.mockRejectedValueOnce(new Error('Failed to switch audio mode'));
      
      // Open settings drawer
      const settingsButtons = screen.getAllByRole('button', { name: /open settings/i });
      fireEvent.click(settingsButtons[0]);
      
      const modeToggle = screen.getByRole('switch', { name: /audio mode/i });
      
      await act(async () => {
        fireEvent.click(modeToggle);
      });
      
      expect(await screen.findByText(/failed to switch audio mode/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid mode switches', async () => {
      // Open settings drawer
      const settingsButtons = screen.getAllByRole('button', { name: /open settings/i });
      fireEvent.click(settingsButtons[0]);
      
      const modeToggle = screen.getByRole('switch', { name: /audio mode/i });
      
      await act(async () => {
        // Simulate rapid mode switches
        for (let i = 0; i < 5; i++) {
          fireEvent.click(modeToggle);
          await new Promise(resolve => setTimeout(resolve, 0)); // Allow state updates
        }
      });
      
      expect(mockAudioEngine.setAudioMode).toHaveBeenCalledTimes(5);
    });

    it('should handle rapid volume changes', async () => {
      // Open settings drawer
      const settingsButtons = screen.getAllByRole('button', { name: /open settings/i });
      fireEvent.click(settingsButtons[0]);
      
      const volumeSlider = screen.getByRole('slider', { name: /volume/i });
      
      await act(async () => {
        // Simulate rapid volume changes
        for (let i = 0; i < 5; i++) {
          fireEvent.change(volumeSlider, { target: { value: String(i * 0.2) } });
          await new Promise(resolve => setTimeout(resolve, 0)); // Allow state updates
        }
      });
      
      expect(mockAudioEngine.setVolume).toHaveBeenCalledTimes(5);
    });

    it('should handle component remounting', async () => {
      const { unmount } = render(<EMDRProcessor />);
      
      await act(async () => {
        unmount();
        mockAudioEngine.initialize.mockClear();
        render(<EMDRProcessor />);
      });
      
      expect(mockAudioEngine.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should announce audio mode changes', async () => {
      // Open settings drawer
      const settingsButtons = screen.getAllByRole('button', { name: /open settings/i });
      fireEvent.click(settingsButtons[0]);
      
      const modeToggle = screen.getByRole('switch', { name: /audio mode/i });
      
      await act(async () => {
        fireEvent.click(modeToggle);
      });
      
      expect(await screen.findByText(/audio mode changed/i)).toBeInTheDocument();
    });

    it('should announce volume changes', async () => {
      // Open settings drawer
      const settingsButtons = screen.getAllByRole('button', { name: /open settings/i });
      fireEvent.click(settingsButtons[0]);
      
      const volumeSlider = screen.getByRole('slider', { name: /volume/i });
      
      await act(async () => {
        fireEvent.change(volumeSlider, { target: { value: '0.5' } });
      });
      
      expect(await screen.findByText(/volume changed/i)).toBeInTheDocument();
    });

    it('should maintain focus management in settings drawer', async () => {
      // Open settings drawer
      const settingsButtons = screen.getAllByRole('button', { name: /open settings/i });
      fireEvent.click(settingsButtons[0]);
      
      const drawer = screen.getByRole('dialog');
      expect(drawer).toHaveAttribute('aria-modal', 'true');
      
      const closeButton = screen.getByRole('button', { name: /close settings/i });
      expect(closeButton).toHaveFocus();
    });
  });
}); 