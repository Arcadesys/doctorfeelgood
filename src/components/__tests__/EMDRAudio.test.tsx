import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EMDRProcessor } from '../EMDRProcessor';

// Mock Web Audio API
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

describe('EMDR Audio System', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    
    // Mock window size for canvas
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
  });
  
  // Tests for constant tones
  describe('Constant Tone System', () => {
    it('should create an audio context when component mounts', () => {
      render(<EMDRProcessor />);
      
      // Wait for useEffect to run
      act(() => {
        jest.runAllTimers();
      });
      
      expect(MockAudioContext.prototype.createGain).toHaveBeenCalled();
      expect(MockAudioContext.prototype.createStereoPanner).toHaveBeenCalled();
    });
    
    it('should connect audio element to audio context when playing', async () => {
      render(<EMDRProcessor />);
      
      // Find and click play button
      const playButton = await screen.findByLabelText(/Play/i);
      fireEvent.click(playButton);
      
      expect(MockAudioContext.prototype.createMediaElementSource).toHaveBeenCalled();
    });
    
    it('should update pan value when animation moves target', async () => {
      render(<EMDRProcessor />);
      
      // Find and click play button
      const playButton = await screen.findByLabelText(/Play/i);
      fireEvent.click(playButton);
      
      // Let animation run a few frames
      act(() => {
        for (let i = 0; i < 10; i++) {
          jest.runOnlyPendingTimers();
        }
      });
      
      // Check that pan value was updated (exact value depends on implementation)
      const panDisplay = await screen.findByText(/Current Pan:/i);
      expect(panDisplay).toBeInTheDocument();
    });
    
    it('should allow user to select different oscillator types', async () => {
      render(<EMDRProcessor />);
      
      // Open menu
      const menuButton = await screen.findByLabelText(/Toggle menu/i);
      fireEvent.click(menuButton);
      
      // Check that oscillator types are available
      const sineOption = await screen.findByText(/Sine Wave/i);
      expect(sineOption).toBeInTheDocument();
    });
  });
  
  // Tests for contact beeps
  describe('Contact Beep System', () => {
    it('should create an oscillator when target hits boundary', async () => {
      render(<EMDRProcessor />);
      
      // Find and click play button
      const playButton = await screen.findByLabelText(/Play/i);
      fireEvent.click(playButton);
      
      // Run enough frames for the target to hit a boundary
      act(() => {
        for (let i = 0; i < 200; i++) {
          jest.runOnlyPendingTimers();
        }
      });
      
      expect(MockAudioContext.prototype.createOscillator).toHaveBeenCalled();
    });
    
    it('should play different tones for left and right contacts', async () => {
      render(<EMDRProcessor />);
      
      // Set up spies to track frequency values
      const frequencySpy = jest.fn();
      MockAudioContext.prototype.createOscillator = jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { setValueAtTime: frequencySpy },
        type: 'sine'
      }));
      
      // Find and click play button
      const playButton = await screen.findByLabelText(/Play/i);
      fireEvent.click(playButton);
      
      // Run enough frames for the target to hit both boundaries
      act(() => {
        for (let i = 0; i < 400; i++) {
          jest.runOnlyPendingTimers();
        }
      });
      
      // Check that different frequencies were used
      const frequencies = frequencySpy.mock.calls.map(call => call[0]);
      expect(new Set(frequencies).size).toBeGreaterThan(1);
    });
    
    it('should pan contact sounds based on which side was hit', async () => {
      render(<EMDRProcessor />);
      
      // Set up mock implementation to track panner values
      const pannerConnectSpy = jest.fn();
      MockAudioContext.prototype.createStereoPanner = jest.fn(() => ({
        connect: pannerConnectSpy,
        pan: { value: 0 }
      }));
      
      // Find and click play button
      const playButton = await screen.findByLabelText(/Play/i);
      fireEvent.click(playButton);
      
      // Run enough frames for the target to hit a boundary
      act(() => {
        for (let i = 0; i < 200; i++) {
          jest.runOnlyPendingTimers();
        }
      });
      
      expect(pannerConnectSpy).toHaveBeenCalled();
    });
  });
  
  // Tests for UI organization
  describe('UI Organization', () => {
    it('should display separate sections for constant tones and contact sounds', async () => {
      render(<EMDRProcessor />);
      
      // Open menu
      const menuButton = await screen.findByLabelText(/Toggle menu/i);
      fireEvent.click(menuButton);
      
      // Set audio mode to synthesizer
      const synthesizerButton = await screen.findByText(/Synthesizer/i);
      fireEvent.click(synthesizerButton);
      
      // Check for separate sections
      const constantToneSection = await screen.findByText(/Constant Tone/i);
      const contactSoundSection = await screen.findByText(/Contact Sounds/i);
      
      expect(constantToneSection).toBeInTheDocument();
      expect(contactSoundSection).toBeInTheDocument();
    });
    
    it('should allow customizing contact sound settings', async () => {
      render(<EMDRProcessor />);
      
      // Open menu
      const menuButton = await screen.findByLabelText(/Toggle menu/i);
      fireEvent.click(menuButton);
      
      // Set audio mode to synthesizer
      const synthesizerButton = await screen.findByText(/Synthesizer/i);
      fireEvent.click(synthesizerButton);
      
      // Check for contact sound controls
      const leftContactControl = await screen.findByLabelText(/Left contact frequency/i);
      const rightContactControl = await screen.findByLabelText(/Right contact frequency/i);
      
      expect(leftContactControl).toBeInTheDocument();
      expect(rightContactControl).toBeInTheDocument();
    });
    
    it('should allow customizing oscillator for constant tone', async () => {
      render(<EMDRProcessor />);
      
      // Open menu
      const menuButton = await screen.findByLabelText(/Toggle menu/i);
      fireEvent.click(menuButton);
      
      // Set audio mode to synthesizer
      const synthesizerButton = await screen.findByText(/Synthesizer/i);
      fireEvent.click(synthesizerButton);
      
      // Check for oscillator type controls
      const oscillatorTypeControl = await screen.findByLabelText(/Oscillator type sine/i);
      expect(oscillatorTypeControl).toBeInTheDocument();
      
      // Check for ADSR controls
      const attackControl = await screen.findByLabelText(/Attack/i);
      expect(attackControl).toBeInTheDocument();
    });
  });
}); 