/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
jest.mock('../../lib/audioEngine', () => ({
  AudioEngine: jest.fn().mockImplementation(() => ({
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
  })),
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
      <div data-testid="settings-drawer">
        <button onClick={onClose} aria-label="Close settings">Close</button>
        <div>
          <h2>Settings</h2>
          <div>
            <label htmlFor="audioMode">Audio Mode</label>
            <select 
              id="audioMode" 
              onChange={(e) => onSettingChange('audioMode', e.target.value)}
              aria-label="Audio Mode"
            >
              <option value="click">Click</option>
              <option value="audioTrack">Audio Track</option>
            </select>
          </div>
          <div>
            <label htmlFor="volume">Volume</label>
            <input 
              id="volume" 
              type="range" 
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
    const playButton = screen.getByRole('button', { name: /play/i });
    
    await act(async () => {
      fireEvent.click(playButton);
    });

    expect(AudioEngine.mock.instances[0].startPlayback).toHaveBeenCalled();
  });

  it('should cleanup AudioEngine on unmount', async () => {
    await act(async () => {
      cleanup();
    });

    expect(AudioEngine.mock.instances[0].dispose).toHaveBeenCalled();
  });

  describe('Error Handling', () => {
    it('should handle AudioEngine initialization failure', async () => {
      // Mock initialization failure
      AudioEngine.mock.instances[0].initialize.mockRejectedValueOnce(new Error('Initialization failed'));
      
      await act(async () => {
        cleanup();
        render(<EMDRProcessor />);
      });

      expect(screen.getByText(/Error initializing audio/i)).toBeInTheDocument();
    });

    it('should handle playback failure', async () => {
      // Mock playback failure
      AudioEngine.mock.instances[0].startPlayback.mockRejectedValueOnce(new Error('Playback failed'));
      
      const playButton = screen.getByRole('button', { name: /play/i });
      
      await act(async () => {
        fireEvent.click(playButton);
      });

      expect(screen.getByText(/Failed to start playback/i)).toBeInTheDocument();
    });

    it('should handle audio mode switch failure', async () => {
      // Mock mode switch failure
      AudioEngine.mock.instances[0].setAudioMode.mockRejectedValueOnce(new Error('Mode switch failed'));
      
      const modeToggle = screen.getByRole('switch', { name: /audio mode/i });
      
      await act(async () => {
        fireEvent.click(modeToggle);
      });

      expect(screen.getByText(/Failed to switch audio mode/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid mode switches', async () => {
      const modeToggle = screen.getByRole('switch', { name: /audio mode/i });
      
      await act(async () => {
        // Simulate rapid mode switches
        for (let i = 0; i < 5; i++) {
          fireEvent.click(modeToggle);
        }
      });

      // Should have called setAudioMode the correct number of times
      expect(AudioEngine.mock.instances[0].setAudioMode).toHaveBeenCalledTimes(5);
    });

    it('should handle rapid volume changes', async () => {
      const volumeSlider = screen.getByRole('slider', { name: /volume/i });
      
      await act(async () => {
        // Simulate rapid volume changes
        for (let i = 0; i < 10; i++) {
          fireEvent.change(volumeSlider, { target: { value: (i * 0.1).toString() } });
        }
      });

      // Should have called setVolume the correct number of times
      expect(AudioEngine.mock.instances[0].setVolume).toHaveBeenCalledTimes(10);
    });

    it('should handle component remounting', async () => {
      await act(async () => {
        cleanup();
        render(<EMDRProcessor />);
      });

      expect(AudioEngine).toHaveBeenCalledTimes(2);
      expect(AudioEngine.mock.instances[1].initialize).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should announce audio mode changes', async () => {
      const modeToggle = screen.getByRole('switch', { name: /audio mode/i });
      
      await act(async () => {
        fireEvent.click(modeToggle);
      });

      expect(screen.getByRole('status')).toHaveTextContent(/audio mode changed/i);
    });

    it('should announce volume changes', async () => {
      const volumeSlider = screen.getByRole('slider', { name: /volume/i });
      
      await act(async () => {
        fireEvent.change(volumeSlider, { target: { value: '0.5' } });
      });

      expect(screen.getByRole('status')).toHaveTextContent(/volume changed/i);
    });
  });
}); 