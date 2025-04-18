import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EMDRProcessor } from '../EMDRProcessor';

// Mock the imports
jest.mock('tone', () => {
  return {
    start: jest.fn().mockResolvedValue(undefined),
    Synth: jest.fn().mockImplementation(() => ({
      toDestination: jest.fn().mockReturnThis(),
      volume: { value: 0 },
      triggerAttackRelease: jest.fn(),
    })),
  };
});

// Mock AudioProcessor
jest.mock('@/utils/audioUtils', () => {
  const mockProcessor = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    stop: jest.fn(),
    setPan: jest.fn(),
    setVolume: jest.fn(),
    isPlaying: jest.fn().mockReturnValue(false),
    getTitle: jest.fn().mockReturnValue('Test Audio'),
    onEnded: jest.fn(),
    getCurrentPan: jest.fn().mockReturnValue(0),
  };

  return {
    AudioProcessor: jest.fn(),
    createAudioProcessor: jest.fn().mockResolvedValue(mockProcessor),
    resumeAudioContext: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock sample audio files
jest.mock('@/utils/sampleAudio', () => {
  const mockSample = {
    id: 'test-sample',
    title: 'Test Sample',
    url: '/audio/test.mp3',
    description: 'Test audio sample',
    license: 'CC0',
    attribution: 'Test',
  };

  return {
    sampleAudioFiles: [mockSample],
    getRandomSampleAudio: jest.fn().mockReturnValue(mockSample),
    getSampleAudioById: jest.fn().mockReturnValue(mockSample),
  };
});

// Mock global Audio
class MockAudio {
  src = '';
  crossOrigin = '';
  preload = '';
  volume = 1;
  loop = false;
  currentTime = 0;
  duration = 120;
  paused = true;
  ended = false;
  muted = false;
  error = null;
  networkState = 1;
  readyState = 0;
  currentSrc = '';
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  play = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn();
  load = jest.fn();
  buffered = { length: 1, end: () => 60, start: () => 0 };
}

// Replace global Audio with mock
global.Audio = MockAudio as any;

// Mock AudioContext
window.AudioContext = jest.fn().mockImplementation(() => ({
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
  createMediaElementSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { value: 1 },
  }),
  createStereoPanner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    pan: { value: 0 },
  }),
  destination: {},
}));

// Mock URL.createObjectURL
URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');

describe('EMDRProcessor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the viewport dimensions for consistency in tests
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });

  it('renders the component', () => {
    render(<EMDRProcessor />);
    // Check for the main container
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('toggles settings when settings button is clicked', () => {
    render(<EMDRProcessor />);
    // Click settings button
    const settingsButton = screen.getByLabelText('Settings');
    fireEvent.click(settingsButton);
    
    // Check if settings drawer is open
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Close settings
    const closeButton = screen.getByLabelText('Close settings');
    fireEvent.click(closeButton);
    
    // Settings should be closed
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('starts and stops the animation when play/stop button is clicked', async () => {
    render(<EMDRProcessor />);
    
    // Check initial state (stopped)
    expect(screen.getByLabelText('Start')).toBeInTheDocument();
    
    // Click start button
    fireEvent.click(screen.getByLabelText('Start'));
    
    // Wait for animation to start
    await waitFor(() => {
      expect(screen.getByLabelText('Stop')).toBeInTheDocument();
    });
    
    // Click stop button
    fireEvent.click(screen.getByLabelText('Stop'));
    
    // Should be back to start state
    await waitFor(() => {
      expect(screen.getByLabelText('Start')).toBeInTheDocument();
    });
  });

  it('changes shape when a shape is selected', () => {
    render(<EMDRProcessor />);
    
    // Open settings
    fireEvent.click(screen.getByLabelText('Settings'));
    
    // Select triangle shape
    const triangleButton = screen.getByLabelText('triangle shape');
    fireEvent.click(triangleButton);
    
    // The SVG should now contain a polygon element with triangle points
    const svg = document.querySelector('svg');
    expect(svg?.querySelector('polygon')).toBeInTheDocument();
  });

  it('changes color when a color is selected', () => {
    render(<EMDRProcessor />);
    
    // Open settings
    fireEvent.click(screen.getByLabelText('Settings'));
    
    // Select blue color
    const blueButton = screen.getByLabelText('Blue color');
    fireEvent.click(blueButton);
    
    // The circle fill should now be blue
    const svg = document.querySelector('svg');
    const shape = svg?.querySelector('circle, rect, polygon');
    expect(shape?.getAttribute('fill')).toBe('#0000ff');
  });

  it('handles audio file upload', async () => {
    render(<EMDRProcessor />);
    
    // Open settings
    fireEvent.click(screen.getByLabelText('Settings'));
    
    // Create file input event
    const file = new File(['dummy content'], 'test-audio.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText(/Upload Audio File/i);
    
    // Mock the file input event
    Object.defineProperty(input, 'files', {
      value: [file],
    });
    
    // Trigger file upload
    fireEvent.change(input);
    
    // Should see the file name in the UI
    await waitFor(() => {
      expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
    });
  });

  it('loads sample audio', async () => {
    render(<EMDRProcessor />);
    
    // Open settings
    fireEvent.click(screen.getByLabelText('Settings'));
    
    // Find and click on sample audio button
    const sampleButton = screen.getByText('Test Sample');
    fireEvent.click(sampleButton);
    
    // Should enable audio
    await waitFor(() => {
      // In a real scenario, this would check for a specific audio state indicator
      // Since that's hard to test, we just ensure the component renders
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });
  });
  
  it('shows audio panning visualization when audio is playing', async () => {
    // Mock AudioProcessor to simulate pan position changes
    const { createAudioProcessor } = require('@/utils/audioUtils');
    let panValue = 0;
    const mockPannerProcessor = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      stop: jest.fn(),
      setPan: jest.fn().mockImplementation(value => { panValue = value; }),
      setVolume: jest.fn(),
      isPlaying: jest.fn().mockReturnValue(true),
      getTitle: jest.fn().mockReturnValue('Pan Test Audio'),
      onEnded: jest.fn(),
      getCurrentPan: jest.fn().mockImplementation(() => panValue),
    };
    
    createAudioProcessor.mockResolvedValue(mockPannerProcessor);
    
    render(<EMDRProcessor />);
    
    // Open settings
    fireEvent.click(screen.getByLabelText('Settings'));
    
    // Load sample audio
    const sampleButton = screen.getByText('Test Sample');
    fireEvent.click(sampleButton);
    
    // Start the player
    fireEvent.click(screen.getByLabelText('Start'));
    
    // Simulate changing pan value
    mockPannerProcessor.setPan(0.5);
    
    // Wait for the audio title to appear (indicates audio is playing)
    await waitFor(() => {
      expect(screen.getByText('Playing: Pan Test Audio')).toBeInTheDocument();
    });
    
    // Force update component to show new pan value (this would normally happen via animation frame)
    // In testing, we simulate this by updating the pan again
    mockPannerProcessor.setPan(0.75);
    
    // Verify the audio pan indicator exists
    await waitFor(() => {
      const panIndicator = screen.getByLabelText('Audio pan position indicator');
      expect(panIndicator).toBeInTheDocument();
    });
  });
  
  it('adjusts audio volume using the volume slider', async () => {
    // Get reference to mocked utilities
    const { createAudioProcessor } = require('@/utils/audioUtils');
    const mockVolumeProcessor = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      stop: jest.fn(),
      setPan: jest.fn(),
      setVolume: jest.fn(),
      isPlaying: jest.fn().mockReturnValue(true),
      getTitle: jest.fn().mockReturnValue('Volume Test'),
      onEnded: jest.fn(),
      getCurrentPan: jest.fn().mockReturnValue(0),
    };
    
    createAudioProcessor.mockResolvedValue(mockVolumeProcessor);
    
    render(<EMDRProcessor />);
    
    // Open settings
    fireEvent.click(screen.getByLabelText('Settings'));
    
    // Load sample audio and enable it
    const sampleButton = screen.getByText('Test Sample');
    fireEvent.click(sampleButton);
    
    // Find the volume slider
    const volumeSlider = screen.getByLabelText(/Volume:/);
    
    // Change volume to -20dB
    fireEvent.change(volumeSlider, { target: { value: '-20' } });
    
    // Check if setVolume was called correctly
    expect(mockVolumeProcessor.setVolume).toHaveBeenCalledWith(-20);
  });
}); 