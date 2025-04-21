/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend expect to include axe matchers
expect.extend(toHaveNoViolations);

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
      <div data-testid="settings-drawer" role="dialog" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>
        <button onClick={onClose} aria-label="Close settings">Close</button>
        <div>
          <div>
            <label htmlFor="speed">Speed (BPM)</label>
            <input 
              id="speed" 
              type="range" 
              min="30" 
              max="120" 
              value={settings.speed} 
              onChange={(e) => onSettingChange('speed', parseInt(e.target.value))}
              aria-label="Speed (BPM)"
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
              aria-label="Target Size"
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

describe('EMDRProcessor Accessibility', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    
    // Mock window size for canvas
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
  });
  
  // Test ARIA roles and labels
  describe('ARIA Roles and Labels', () => {
    it('should have appropriate ARIA roles and labels', async () => {
      const { container } = render(<EMDRProcessor />);
      
      // Check for main region
      const mainRegion = screen.getByRole('region');
      expect(mainRegion).toBeInTheDocument();
      expect(mainRegion).toHaveAttribute('aria-label', 'EMDR Visual Target');
      
      // Check for canvas
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('aria-label', 'EMDR Visual Target Canvas');
      
      // Check for play button
      const playButton = screen.getByLabelText('Play');
      expect(playButton).toBeInTheDocument();
      expect(playButton).toHaveAttribute('aria-label', 'Play');
      
      // Check for settings button
      const settingsButton = screen.getByLabelText('Open settings');
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveAttribute('aria-label', 'Open settings');
      
      // Check for theme toggle button
      const themeButton = screen.getByLabelText('Toggle theme');
      expect(themeButton).toBeInTheDocument();
      expect(themeButton).toHaveAttribute('aria-label', 'Toggle theme');
      
      // Check for accessibility message
      const a11yMessage = screen.getByRole('status');
      expect(a11yMessage).toBeInTheDocument();
      expect(a11yMessage).toHaveTextContent('Visual target ready');
    });
  });
  
  // Test keyboard navigation
  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation to all interactive elements', async () => {
      render(<EMDRProcessor />);
      
      // Focus on play button
      const playButton = screen.getByLabelText('Play');
      playButton.focus();
      expect(document.activeElement).toBe(playButton);
      
      // Tab to settings button
      fireEvent.keyDown(playButton, { key: 'Tab', shiftKey: false });
      const settingsButton = screen.getByLabelText('Open settings');
      expect(document.activeElement).toBe(settingsButton);
      
      // Tab to theme button
      fireEvent.keyDown(settingsButton, { key: 'Tab', shiftKey: false });
      const themeButton = screen.getByLabelText('Toggle theme');
      expect(document.activeElement).toBe(themeButton);
      
      // Tab back to play button
      fireEvent.keyDown(themeButton, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(playButton);
    });
    
    it('should allow keyboard activation of buttons', async () => {
      render(<EMDRProcessor />);
      
      // Focus on play button
      const playButton = screen.getByLabelText('Play');
      playButton.focus();
      
      // Press Enter to activate
      fireEvent.keyDown(playButton, { key: 'Enter' });
      
      // Button should be activated
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
  });
  
  // Test screen reader announcements
  describe('Screen Reader Announcements', () => {
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
    
    it('should announce settings changes for screen readers', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Change a setting
      const speedInput = screen.getByLabelText('Speed (BPM)');
      fireEvent.change(speedInput, { target: { value: '90' } });
      
      // Accessibility message should update
      const a11yMessage = screen.getByRole('status');
      expect(a11yMessage).toHaveTextContent('Speed set to 90 BPM');
    });
  });
  
  // Test color contrast
  describe('Color Contrast', () => {
    it('should have sufficient color contrast for text elements', async () => {
      const { container } = render(<EMDRProcessor />);
      
      // Run axe check
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  // Test focus management
  describe('Focus Management', () => {
    it('should trap focus within the settings drawer when open', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Focus should be trapped in the drawer
      const settingsDrawer = screen.getByTestId('settings-drawer');
      const closeButton = screen.getByLabelText('Close settings');
      
      // Tab from close button should cycle back to first focusable element
      closeButton.focus();
      fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: false });
      
      // Focus should be on the first focusable element in the drawer
      expect(document.activeElement).not.toBe(closeButton);
      expect(settingsDrawer.contains(document.activeElement)).toBe(true);
    });
    
    it('should return focus to the trigger when settings drawer is closed', async () => {
      render(<EMDRProcessor />);
      
      // Open settings
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
      
      // Close settings
      const closeButton = screen.getByLabelText('Close settings');
      fireEvent.click(closeButton);
      
      // Focus should return to the settings button
      expect(document.activeElement).toBe(settingsButton);
    });
  });
  
  // Test semantic HTML
  describe('Semantic HTML', () => {
    it('should use semantic HTML elements', async () => {
      render(<EMDRProcessor />);
      
      // Check for semantic elements
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
  
  // Test reduced motion support
  describe('Reduced Motion Support', () => {
    it('should respect reduced motion preferences', async () => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      // Set reduced motion preference
      window.matchMedia('(prefers-reduced-motion: reduce)').matches = true;
      
      render(<EMDRProcessor />);
      
      // Start playback
      const playButton = screen.getByLabelText('Play');
      fireEvent.click(playButton);
      
      // Accessibility message should indicate reduced motion
      const a11yMessage = screen.getByRole('status');
      expect(a11yMessage).toHaveTextContent('reduced motion');
    });
  });
}); 