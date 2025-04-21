/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the AudioEngine
jest.mock('../../lib/audioEngine', () => {
  return {
    AudioEngine: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      setAudioMode: jest.fn(),
      getAudioMode: jest.fn().mockReturnValue('click'),
      playContactSound: jest.fn(),
      startPlayback: jest.fn().mockReturnValue(true),
      stopAll: jest.fn(),
      setVolume: jest.fn(),
      updateContactSoundConfig: jest.fn(),
      updateAudioTrackConfig: jest.fn(),
      getContactSoundConfig: jest.fn().mockReturnValue({
        leftSamplePath: '/sounds/click-left.mp3',
        rightSamplePath: '/sounds/click-right.mp3',
        volume: 0.5,
        enabled: true
      }),
      getAudioTrackConfig: jest.fn().mockReturnValue({
        volume: 0.7,
        loop: true,
        filePath: '/audio/sine-440hz.mp3'
      }),
      getIsPlaying: jest.fn().mockReturnValue(false),
      setPan: jest.fn(),
      dispose: jest.fn()
    })),
    AudioMode: {
      CLICK: 'click',
      AUDIO_TRACK: 'audioTrack'
    }
  };
});

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
            <label htmlFor="speed">Speed (BPM)</label>
            <input 
              id="speed" 
              type="range" 
              min="30" 
              max="120" 
              value={settings.speed} 
              onChange={(e) => onSettingChange('speed', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="targetSize">Target Size</label>
            <input 
              id="targetSize" 
              type="range" 
              min="20" 
              max="100" 
              value={settings.targetSize} 
              onChange={(e) => onSettingChange('targetSize', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="targetColor">Target Color</label>
            <input 
              id="targetColor" 
              type="color" 
              value={settings.targetColor} 
              onChange={(e) => onSettingChange('targetColor', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="backgroundColor">Background Color</label>
            <input 
              id="backgroundColor" 
              type="color" 
              value={settings.backgroundColor} 
              onChange={(e) => onSettingChange('backgroundColor', e.target.value)}
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

describe('EMDRProcessor User Changes', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    
    // Mock window size for canvas
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
  });
  
  // Test user interactions with settings
  describe('Settings Interactions', () => {
    it('should open and close settings drawer', async () => {
      render(<EMDRProcessor />);
      
      // Settings initially closed
      expect(screen.queryByTestId('settings-drawer')).not.toBeInTheDocument();
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Settings should be open
      expect(screen.getByTestId('settings-drawer')).toBeInTheDocument();
      
      // Close settings
      const closeButton = screen.getByLabelText('Close settings');
      fireEvent.click(closeButton);
      
      // Settings should be closed again
      expect(screen.queryByTestId('settings-drawer')).not.toBeInTheDocument();
    });
    
    it('should update speed setting when changed', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Change speed setting
      const speedInput = screen.getByLabelText('Speed (BPM)');
      fireEvent.change(speedInput, { target: { value: '90' } });
      
      // Verify the setting was updated
      expect(speedInput).toHaveValue(90);
    });
    
    it('should update target size setting when changed', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Change target size setting
      const targetSizeInput = screen.getByLabelText('Target Size');
      fireEvent.change(targetSizeInput, { target: { value: '70' } });
      
      // Verify the setting was updated
      expect(targetSizeInput).toHaveValue(70);
    });
    
    it('should update target color setting when changed', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Change target color setting
      const targetColorInput = screen.getByLabelText('Target Color');
      fireEvent.change(targetColorInput, { target: { value: '#ff0000' } });
      
      // Verify the setting was updated
      expect(targetColorInput).toHaveValue('#ff0000');
    });
    
    it('should update background color setting when changed', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Change background color setting
      const backgroundColorInput = screen.getByLabelText('Background Color');
      fireEvent.change(backgroundColorInput, { target: { value: '#000000' } });
      
      // Verify the setting was updated
      expect(backgroundColorInput).toHaveValue('#000000');
    });
  });
  
  // Test audio mode changes
  describe('Audio Mode Changes', () => {
    it('should switch between click and audio track modes', async () => {
      render(<EMDRProcessor />);
      
      // Get the AudioEngine instance
      const audioEngineInstance = (AudioEngine as jest.Mock).mock.results[0].value;
      
      // Initially in click mode
      expect(audioEngineInstance.getAudioMode).toHaveBeenCalled();
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Switch to audio track mode
      const audioModeSelect = screen.getByLabelText('Audio Mode');
      fireEvent.change(audioModeSelect, { target: { value: 'audioTrack' } });
      
      // Verify the audio mode was updated
      expect(audioEngineInstance.setAudioMode).toHaveBeenCalledWith('audioTrack');
    });
  });
  
  // Test play/pause functionality
  describe('Play/Pause Functionality', () => {
    it('should start playback when play button is clicked', async () => {
      render(<EMDRProcessor />);
      
      // Get the AudioEngine instance
      const audioEngineInstance = (AudioEngine as jest.Mock).mock.results[0].value;
      
      // Initially not playing
      expect(audioEngineInstance.getIsPlaying).toHaveBeenCalled();
      
      // Click play button
      const playButton = screen.getByLabelText('Play');
      fireEvent.click(playButton);
      
      // Verify playback started
      expect(audioEngineInstance.startPlayback).toHaveBeenCalled();
    });
    
    it('should stop playback when pause button is clicked', async () => {
      render(<EMDRProcessor />);
      
      // Get the AudioEngine instance
      const audioEngineInstance = (AudioEngine as jest.Mock).mock.results[0].value;
      
      // Mock isPlaying to return true after play is clicked
      audioEngineInstance.getIsPlaying.mockReturnValueOnce(false).mockReturnValueOnce(true);
      
      // Click play button
      const playButton = screen.getByLabelText('Play');
      fireEvent.click(playButton);
      
      // Verify playback started
      expect(audioEngineInstance.startPlayback).toHaveBeenCalled();
      
      // Click pause button
      const pauseButton = screen.getByLabelText('Pause');
      fireEvent.click(pauseButton);
      
      // Verify playback stopped
      expect(audioEngineInstance.stopAll).toHaveBeenCalled();
    });
  });
  
  // Test pan width changes
  describe('Pan Width Changes', () => {
    it('should update pan width when changed', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Find the pan width knob
      const panWidthKnob = screen.getByTestId('custom-knob');
      
      // Change pan width
      const panWidthInput = panWidthKnob.querySelector('input');
      fireEvent.change(panWidthInput, { target: { value: '60' } });
      
      // Verify the pan width was updated
      expect(panWidthInput).toHaveValue(60);
    });
  });
  
  // Test theme changes
  describe('Theme Changes', () => {
    it('should toggle between dark and light themes', async () => {
      render(<EMDRProcessor />);
      
      // Initially in dark mode
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      // Toggle theme
      const themeButton = screen.getByLabelText('Toggle theme');
      fireEvent.click(themeButton);
      
      // Should now be in light mode
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      // Toggle back to dark mode
      fireEvent.click(themeButton);
      
      // Should be back in dark mode
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
  
  // Test session timer functionality
  describe('Session Timer Functionality', () => {
    it('should start timer when session begins', async () => {
      jest.useFakeTimers();
      
      render(<EMDRProcessor />);
      
      // Click play button to start session
      const playButton = screen.getByLabelText('Play');
      fireEvent.click(playButton);
      
      // Timer should be visible
      const timerDisplay = screen.getByText(/00:05/);
      expect(timerDisplay).toBeInTheDocument();
      
      // Advance timer by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // Timer should now show 00:04
      expect(screen.getByText(/00:04/)).toBeInTheDocument();
      
      jest.useRealTimers();
    });
    
    it('should stop session when timer reaches zero', async () => {
      jest.useFakeTimers();
      
      render(<EMDRProcessor />);
      
      // Get the AudioEngine instance
      const audioEngineInstance = (AudioEngine as jest.Mock).mock.results[0].value;
      
      // Click play button to start session
      const playButton = screen.getByLabelText('Play');
      fireEvent.click(playButton);
      
      // Advance timer to zero (5 seconds)
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Session should be stopped
      expect(audioEngineInstance.stopAll).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
  
  // Test accessibility features
  describe('Accessibility Features', () => {
    it('should announce state changes for screen readers', async () => {
      render(<EMDRProcessor />);
      
      // Initially should have an accessibility message
      const a11yMessage = screen.getByRole('status');
      expect(a11yMessage).toHaveTextContent('Visual target ready');
      
      // Click play button
      const playButton = screen.getByLabelText('Play');
      fireEvent.click(playButton);
      
      // Accessibility message should update
      expect(a11yMessage).toHaveTextContent('Session started');
      
      // Click pause button
      const pauseButton = screen.getByLabelText('Pause');
      fireEvent.click(pauseButton);
      
      // Accessibility message should update
      expect(a11yMessage).toHaveTextContent('Session paused');
    });
    
    it('should provide keyboard navigation for all controls', async () => {
      render(<EMDRProcessor />);
      
      // All interactive elements should be focusable
      const playButton = screen.getByLabelText('Play');
      const settingsButton = screen.getByLabelText('Open settings');
      const themeButton = screen.getByLabelText('Toggle theme');
      
      // Tab through elements
      playButton.focus();
      expect(document.activeElement).toBe(playButton);
      
      // Simulate tab key
      fireEvent.keyDown(playButton, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(settingsButton);
      
      fireEvent.keyDown(settingsButton, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(themeButton);
    });
  });
}); 