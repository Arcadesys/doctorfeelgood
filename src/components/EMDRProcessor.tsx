'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import * as Tone from 'tone';
import { AudioProcessor, createYouTubeAudioProcessor, resumeAudioContext } from '@/utils/audioUtils';
import { sampleAudioFiles, getRandomSampleAudio } from '@/utils/sampleAudio';

// Define the shape options with their SVG paths
const SHAPES = {
  circle: { 
    shape: 'circle',
    element: (props: any) => <circle cx="50%" cy="50%" r="40%" {...props} />
  },
  square: { 
    shape: 'rect',
    element: (props: any) => <rect x="10%" y="10%" width="80%" height="80%" {...props} />
  },
  triangle: { 
    shape: 'polygon',
    element: (props: any) => <polygon points="50,10 90,90 10,90" {...props} />
  },
  star: { 
    shape: 'polygon',
    element: (props: any) => (
      <polygon points="50,10 61,35 90,35 65,55 75,80 50,65 25,80 35,55 10,35 39,35" {...props} />
    )
  }
};

// Available colors with nice names
const COLORS = [
  { name: 'Red', value: '#ff0000' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Purple', value: '#800080' },
  { name: 'Orange', value: '#ffa500' },
  { name: 'Pink', value: '#ffc0cb' },
  { name: 'Cyan', value: '#00ffff' },
];

// Sound player setup
const setupSound = () => {
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2 }
  }).toDestination();
  
  const playTone = (note: string, volume = -10) => {
    synth.volume.value = volume;
    synth.triggerAttackRelease(note, '0.1');
  };
  
  return { playTone };
};

export function EMDRProcessor() {
  // Refs for container dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for settings
  const [isActive, setIsActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per full cycle
  const [selectedShape, setSelectedShape] = useState('circle');
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [autoChangeColors, setAutoChangeColors] = useState(false);
  const [size, setSize] = useState(50); // px
  
  // Sound effects
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundVolume, setSoundVolume] = useState(-10); // dB
  const [sound, setSound] = useState<{ playTone: (note: string, volume?: number) => void } | null>(null);
  
  // YouTube integration
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [youtubeAudio, setYoutubeAudio] = useState<AudioProcessor | null>(null);
  const [youtubeEnabled, setYoutubeEnabled] = useState(false);
  
  // Sample audio integration
  const [sampleAudioId, setSampleAudioId] = useState('');
  const [useSampleAudio, setUseSampleAudio] = useState(false);
  
  // Physics values
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 5, y: 5 });
  
  // Initialize sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSound(setupSound());
    }
  }, []);
  
  // Function to fetch YouTube audio
  const fetchYoutubeAudio = async () => {
    if (!youtubeUrl) {
      setYoutubeError('Please enter a YouTube URL');
      return false;
    }
    
    try {
      setIsLoadingYoutube(true);
      setYoutubeError('');
      
      // Try direct embedding first for YouTube URLs
      if (youtubeUrl.includes('youtube.com/watch') || youtubeUrl.includes('youtu.be/')) {
        console.log('Attempting direct YouTube embedding...');
        
        // Extract video ID from URL
        let videoId = '';
        if (youtubeUrl.includes('youtube.com/watch')) {
          const url = new URL(youtubeUrl);
          videoId = url.searchParams.get('v') || '';
        } else if (youtubeUrl.includes('youtu.be/')) {
          videoId = youtubeUrl.split('/').pop() || '';
        }
        
        if (!videoId) {
          throw new Error('Could not extract YouTube video ID');
        }
        
        console.log('Using direct YouTube embed for video ID:', videoId);
        
        try {
          // Create audio processor with direct YouTube URL
          const processor = await createYouTubeAudioProcessor(
            `https://www.youtube.com/watch?v=${videoId}`, 
            `YouTube Video (${videoId})`
          );
          
          setYoutubeTitle(`YouTube Audio (${videoId})`);
          setYoutubeAudio(processor);
          setYoutubeEnabled(true);
          return true;
        } catch (directError) {
          console.error('Direct embed failed, falling back to API:', directError);
          // Continue to API approach below
        }
      }
      
      // Call our API route
      console.log('Fetching YouTube info via API route...');
      const response = await fetch(`/api/youtube?url=${encodeURIComponent(youtubeUrl)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API route error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to fetch YouTube audio');
      }
      
      const data = await response.json();
      console.log('API returned data:', data);
      
      if (!data.formats || data.formats.length === 0) {
        throw new Error('No audio formats available for this video');
      }
      
      // Find best audio format (highest bitrate)
      const bestFormat = data.formats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      console.log('Selected audio format:', bestFormat);
      
      // Create audio processor
      const processor = await createYouTubeAudioProcessor(bestFormat.url, data.title);
      
      setYoutubeTitle(data.title);
      setYoutubeAudio(processor);
      setYoutubeEnabled(true);
      return true;
    } catch (error) {
      console.error('Error fetching YouTube audio:', error);
      setYoutubeError(error instanceof Error ? error.message : 'Failed to load YouTube audio');
      
      // Show detailed error to help debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`YouTube Error: ${errorMessage}\n\nYouTube may be blocking access to this video. Try a different video or check console for details.`);
      
      return false;
    } finally {
      setIsLoadingYoutube(false);
    }
  };
  
  // Handle YouTube audio when active state changes
  useEffect(() => {
    if (!youtubeAudio) return;
    
    if (isActive && youtubeEnabled) {
      youtubeAudio.play().catch(error => {
        console.error('Error playing YouTube audio:', error);
        setYoutubeError('Failed to play audio. Try clicking the start button again.');
      });
    } else {
      youtubeAudio.pause();
    }
    
    return () => {
      if (youtubeAudio) {
        youtubeAudio.pause();
      }
    };
  }, [isActive, youtubeAudio, youtubeEnabled]);
  
  // Update audio volume when changed
  useEffect(() => {
    if (youtubeAudio) {
      youtubeAudio.setVolume(soundVolume);
    }
  }, [soundVolume, youtubeAudio]);
  
  // Physics-based animation
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Initial position - center
    setPosition({
      x: viewportWidth / 2,
      y: viewportHeight / 2
    });
    
    // Define fixed positions for smooth movement, with wider range
    const positions = [
      { x: viewportWidth * 0.1, y: viewportHeight / 2 },   // Far left
      { x: viewportWidth * 0.5, y: viewportHeight / 2 },   // Center
      { x: viewportWidth * 0.9, y: viewportHeight / 2 },   // Far right
      { x: viewportWidth * 0.5, y: viewportHeight / 2 },   // Center
    ];
    
    let positionIndex = 0;
    let playedSound = false;
    let isTransitioning = false;
    
    // Create an interval that triggers transitions between positions
    const interval = setInterval(() => {
      if (isTransitioning) return; // Skip if already in transition
      
      // Set the next position index
      positionIndex = (positionIndex + 1) % positions.length;
      const nextPosition = positions[positionIndex];
      
      // Start transition
      isTransitioning = true;
      
      // Play sound at extremes (positions 0 and 2)
      if (soundEnabled && sound && !youtubeEnabled) {
        if (positionIndex === 0) {
          sound.playTone('C4', soundVolume);
        } else if (positionIndex === 2) {
          sound.playTone('G4', soundVolume);
        }
      }
      
      // Change color if enabled and at extreme positions
      if (autoChangeColors && (positionIndex === 0 || positionIndex === 2)) {
        setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
      }
      
      // Create smooth transition
      const startPosition = { ...position };
      const startTime = Date.now();
      const duration = Math.max(500, speed); // Transition duration in ms
      
      // Create animation function
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth transition (ease-in-out)
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Calculate current position
        const currentX = startPosition.x + (nextPosition.x - startPosition.x) * eased;
        const currentY = startPosition.y + (nextPosition.y - startPosition.y) * eased;
        
        // Update position
        setPosition({
          x: currentX,
          y: currentY
        });
        
        // Update panner for YouTube audio - full -1 to 1 range
        if (youtubeAudio && youtubeEnabled) {
          // Map x position to panner value (-1 to 1)
          // Adjusted mapping to use the full range
          const normalizedPosition = (currentX - (viewportWidth * 0.1)) / (viewportWidth * 0.8);
          const panValue = (normalizedPosition * 2) - 1;
          youtubeAudio.setPan(Math.max(-1, Math.min(1, panValue)));
        }
        
        // Continue animation if not complete
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isTransitioning = false;
        }
      };
      
      // Start animation
      requestAnimationFrame(animate);
      
    }, Math.max(1000, speed * 1.5)); // Wait time between movements
    
    // Handle window resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      // Update positions array for the new dimensions
      positions[0].x = newWidth * 0.1;  // Far left
      positions[0].y = newHeight / 2;
      positions[1].x = newWidth * 0.5;  // Center
      positions[1].y = newHeight / 2;
      positions[2].x = newWidth * 0.9;  // Far right
      positions[2].y = newHeight / 2;
      positions[3].x = newWidth * 0.5;  // Center
      positions[3].y = newHeight / 2;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    isActive,
    size,
    speed,
    soundEnabled,
    sound,
    soundVolume,
    autoChangeColors,
    youtubeAudio,
    youtubeEnabled,
    position // Added position as dependency since we use it in the animation
  ]);

  // Handle start/stop
  const toggleActive = async () => {
    // Initialize audio context on user interaction
    await resumeAudioContext();
    
    if (!isActive) {
      // If YouTube is enabled but no audio loaded yet, try to load it
      if (youtubeEnabled && !youtubeAudio && youtubeUrl) {
        const success = await fetchYoutubeAudio();
        if (!success) {
          return; // Don't start if YouTube loading failed
        }
      }
      
      if (soundEnabled && !youtubeEnabled && sound) {
        sound.playTone('G4', soundVolume); // Success tone
      }
    } else {
      // Stopping - pause YouTube audio if active
      if (youtubeAudio) {
        youtubeAudio.pause();
      }
    }
    
    setIsActive(!isActive);
  };

  // Toggle settings drawer
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  // Function to load a sample audio file
  const loadSampleAudio = async (id?: string) => {
    try {
      setIsLoadingYoutube(true);
      setYoutubeError('');
      
      // Get the sample audio file - either by ID or random
      const sampleAudio = id 
        ? sampleAudioFiles.find(audio => audio.id === id) || getRandomSampleAudio()
        : getRandomSampleAudio();
      
      setSampleAudioId(sampleAudio.id);
      
      // Create audio processor
      const processor = await createYouTubeAudioProcessor(
        sampleAudio.url, 
        sampleAudio.title
      );
      
      setYoutubeTitle(sampleAudio.title);
      setYoutubeAudio(processor);
      setYoutubeEnabled(true);
      setUseSampleAudio(true);
      return true;
    } catch (error) {
      console.error('Error loading sample audio:', error);
      setYoutubeError(error instanceof Error ? error.message : 'Failed to load sample audio');
      return false;
    } finally {
      setIsLoadingYoutube(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col relative">
      {/* Main content area - full viewport */}
      <div 
        ref={containerRef}
        className="relative w-full h-full bg-black overflow-hidden flex-grow"
        role="region"
        aria-label="EMDR visual target area"
      >
        {/* Moving element */}
        <div
          className="absolute"
          style={{ 
            width: size, 
            height: size,
            left: position.x - size/2,
            top: position.y - size/2,
            transform: 'translate(0, 0)',
            transition: 'none'
          }}
          aria-live="polite"
          aria-label={isActive ? "Moving target" : "Stationary target"}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            {SHAPES[selectedShape as keyof typeof SHAPES].element({ 
              fill: selectedColor,
              stroke: "white",
              strokeWidth: "2",
            })}
          </svg>
        </div>
        
        {/* YouTube title overlay when playing */}
        {youtubeEnabled && youtubeTitle && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded max-w-xs truncate">
            <span className="text-xs">Playing: {youtubeTitle}</span>
          </div>
        )}
      </div>

      {/* Control bar with hamburger menu */}
      <div className="fixed top-4 right-4 z-10 flex gap-2">
        <button 
          onClick={toggleActive}
          className={`p-3 rounded-full text-white font-bold ${
            isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
          aria-pressed={isActive}
          aria-label={isActive ? 'Stop' : 'Start'}
        >
          {isActive ? '⏹' : '▶'}
        </button>
        
        <button 
          onClick={toggleSettings}
          className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
          aria-expanded={settingsOpen}
          aria-label="Settings"
        >
          ☰
        </button>
      </div>

      {/* Settings drawer */}
      {settingsOpen && (
        <div className="fixed right-0 top-0 h-full bg-gray-800 w-80 p-4 shadow-lg overflow-y-auto z-20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl text-white font-bold">Settings</h2>
            <button 
              onClick={toggleSettings}
              className="text-white text-xl"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>
          
          {/* YouTube URL Input */}
          <div className="flex flex-col mb-6 border-b border-gray-700 pb-4">
            <h3 className="text-white font-medium mb-2">YouTube Audio</h3>
            
            <div className="flex flex-col space-y-2">
              <label htmlFor="youtubeUrl" className="text-white text-sm">
                YouTube URL:
              </label>
              <div className="flex">
                <input
                  id="youtubeUrl"
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 p-2 rounded-l text-sm bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
                  disabled={isActive}
                  aria-describedby="youtubeHint"
                />
                <button
                  onClick={fetchYoutubeAudio}
                  disabled={isActive || isLoadingYoutube || !youtubeUrl}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 rounded-r"
                  aria-label="Load YouTube audio"
                >
                  {isLoadingYoutube ? '⏳' : '📥'}
                </button>
              </div>
              
              {youtubeError && (
                <p className="text-red-400 text-xs mt-1" role="alert">
                  {youtubeError}
                </p>
              )}
              
              <p id="youtubeHint" className="text-gray-400 text-xs">
                Paste a YouTube URL to use its audio with stereo panning
              </p>
              
              {youtubeTitle && (
                <div className="flex items-center mt-2">
                  <div className="flex-1">
                    <p className="text-white text-sm truncate" title={youtubeTitle}>
                      {youtubeTitle}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="youtubeEnabled"
                      type="checkbox"
                      checked={youtubeEnabled}
                      onChange={(e) => setYoutubeEnabled(e.target.checked)}
                      className="mr-2 h-4 w-4"
                      disabled={isActive || !youtubeAudio}
                      aria-checked={youtubeEnabled}
                    />
                    <label htmlFor="youtubeEnabled" className="text-white text-sm">
                      Use YouTube audio
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Sample Audio Selection */}
          <div className="flex flex-col mb-6 border-t border-gray-700 pt-4">
            <h3 className="text-white font-medium mb-2">Sample Audio</h3>
            <p className="text-gray-400 text-xs mb-2">
              Use these royalty-free audio samples when YouTube isn't available
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              {sampleAudioFiles.map((audio) => (
                <button
                  key={audio.id}
                  onClick={() => loadSampleAudio(audio.id)}
                  disabled={isActive}
                  className={`p-2 rounded-md text-left ${
                    sampleAudioId === audio.id && useSampleAudio
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium text-white">{audio.title}</div>
                  <div className="text-xs text-gray-300">{audio.description}</div>
                </button>
              ))}
            </div>
            
            {youtubeError && useSampleAudio && (
              <div className="mt-2 p-2 bg-yellow-900 text-yellow-300 text-xs rounded">
                <p>YouTube failed, using sample audio instead</p>
              </div>
            )}
          </div>
          
          {/* Speed Control */}
          <div className="flex flex-col mb-4">
            <label htmlFor="speed" className="text-white mb-1">
              Speed: {(1000 / speed).toFixed(1)} Hz
            </label>
            <input
              id="speed"
              type="range"
              min={500}
              max={3000}
              step={100}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full"
              aria-valuemin={500}
              aria-valuemax={3000}
              aria-valuenow={speed}
            />
          </div>
          
          {/* Size Control */}
          <div className="flex flex-col mb-4">
            <label htmlFor="size" className="text-white mb-1">
              Size: {size}px
            </label>
            <input
              id="size"
              type="range"
              min={20}
              max={100}
              step={5}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
              aria-valuemin={20}
              aria-valuemax={100}
              aria-valuenow={size}
            />
          </div>
          
          {/* Sound Controls */}
          <div className="flex flex-col mb-4">
            <div className="flex items-center mb-2">
              <input
                id="sound"
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="mr-2 h-4 w-4"
                aria-checked={soundEnabled}
                disabled={youtubeEnabled}
              />
              <label htmlFor="sound" className="text-white">
                Enable sound effects
              </label>
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="soundVolume" className="text-white mb-1">
                Volume: {soundVolume} dB
              </label>
              <input
                id="soundVolume"
                type="range"
                min={-30}
                max={0}
                step={5}
                value={soundVolume}
                onChange={(e) => setSoundVolume(Number(e.target.value))}
                className="w-full"
                aria-valuemin={-30}
                aria-valuemax={0}
                aria-valuenow={soundVolume}
              />
            </div>
          </div>
          
          {/* Shape Selector */}
          <div className="mb-4">
            <p className="text-white mb-2">Select Shape:</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SHAPES).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setSelectedShape(shape)}
                  className={`p-2 rounded-md ${
                    selectedShape === shape ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                  aria-pressed={selectedShape === shape}
                  aria-label={`${shape} shape`}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                      {SHAPES[shape as keyof typeof SHAPES].element({ 
                        fill: selectedColor,
                        stroke: "white",
                        strokeWidth: "2",
                      })}
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Color Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-white">Select Color:</p>
              <div className="flex items-center">
                <input
                  id="autoChangeColors"
                  type="checkbox"
                  checked={autoChangeColors}
                  onChange={(e) => setAutoChangeColors(e.target.checked)}
                  className="mr-2 h-4 w-4"
                  aria-checked={autoChangeColors}
                />
                <label htmlFor="autoChangeColors" className="text-white text-sm">
                  Auto-change on bounce
                </label>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-full h-8 rounded-md border-2 ${
                    selectedColor === color.value ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-pressed={selectedColor === color.value}
                  aria-label={`${color.name} color`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 