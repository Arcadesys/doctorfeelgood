'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import * as Tone from 'tone';
import { AudioProcessor, createYouTubeAudioProcessor, resumeAudioContext } from '@/utils/audioUtils';

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
      
      // Call our API route
      const response = await fetch(`/api/youtube?url=${encodeURIComponent(youtubeUrl)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch YouTube audio');
      }
      
      const data = await response.json();
      
      if (!data.formats || data.formats.length === 0) {
        throw new Error('No audio formats available for this video');
      }
      
      // Find best audio format (highest bitrate)
      const bestFormat = data.formats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      
      // Create audio processor
      const processor = await createYouTubeAudioProcessor(bestFormat.url, data.title);
      
      setYoutubeTitle(data.title);
      setYoutubeAudio(processor);
      setYoutubeEnabled(true);
      return true;
    } catch (error) {
      console.error('Error fetching YouTube audio:', error);
      setYoutubeError(error instanceof Error ? error.message : 'Failed to load YouTube audio');
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
    
    let animationFrameId: number;
    let lastTimestamp: number;
    let frameSkipCounter = 0;
    const FRAMES_TO_SKIP = 5; // Only update position every 6 frames (at 60fps this is ~10 updates per second)
    
    // Get viewport dimensions (using window dimensions for full viewport)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Half size for collision detection
    const halfSize = size / 2;
    
    // Physics constants
    const friction = 0.995; // Slight friction to maintain energy
    const speedFactor = 0.1; // Fixed very low speed factor
    
    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // Skip frames to slow down movement
      frameSkipCounter = (frameSkipCounter + 1) % FRAMES_TO_SKIP;
      if (frameSkipCounter !== 0) {
        // Skip this frame for position update
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      
      // Update position based on velocity
      const newPos = {
        x: position.x + velocity.x * speedFactor * (deltaTime / 16),
        y: position.y + velocity.y * speedFactor * (deltaTime / 16)
      };
      
      // Calculate boundaries
      const maxX = viewportWidth - halfSize;
      const maxY = viewportHeight - halfSize;
      const minX = halfSize;
      const minY = halfSize;
      
      // Check for collisions with viewport edges
      let newVelX = velocity.x;
      let newVelY = velocity.y;
      let playedSound = false;
      
      if (newPos.x > maxX) {
        newPos.x = maxX;
        newVelX = -Math.abs(velocity.x) * friction;
        if (soundEnabled && sound && !youtubeEnabled) {
          sound.playTone('G4', soundVolume);
          playedSound = true;
        }
        if (autoChangeColors) {
          setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
        }
      } else if (newPos.x < minX) {
        newPos.x = minX;
        newVelX = Math.abs(velocity.x) * friction;
        if (soundEnabled && sound && !youtubeEnabled && !playedSound) {
          sound.playTone('C4', soundVolume);
          playedSound = true;
        }
        if (autoChangeColors) {
          setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
        }
      }
      
      if (newPos.y > maxY) {
        newPos.y = maxY;
        newVelY = -Math.abs(velocity.y) * friction;
        if (soundEnabled && sound && !youtubeEnabled && !playedSound) {
          sound.playTone('A4', soundVolume);
          playedSound = true;
        }
        if (autoChangeColors) {
          setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
        }
      } else if (newPos.y < minY) {
        newPos.y = minY;
        newVelY = Math.abs(velocity.y) * friction;
        if (soundEnabled && sound && !youtubeEnabled && !playedSound) {
          sound.playTone('E4', soundVolume);
          playedSound = true;
        }
        if (autoChangeColors) {
          setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
        }
      }
      
      // Update YouTube audio panner based on position
      if (youtubeAudio && youtubeEnabled) {
        // Map x position to panner value (-1 to 1)
        const panValue = ((newPos.x / viewportWidth) * 2) - 1;
        youtubeAudio.setPan(panValue);
      }
      
      // Update state
      setPosition(newPos);
      setVelocity({ x: newVelX, y: newVelY });
      
      // Continue animation
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationFrameId = requestAnimationFrame(animate);
    
    // Initialize with a fixed very low velocity
    setVelocity({
      x: (Math.random() > 0.5 ? 1 : -1) * 0.2,
      y: (Math.random() > 0.5 ? 1 : -1) * 0.2
    });
    
    // Initialize with a random starting position
    setPosition({
      x: Math.random() * (viewportWidth - size) + size/2,
      y: Math.random() * (viewportHeight - size) + size/2
    });
    
    // Handle window resize
    const handleResize = () => {
      // Adjust position if necessary when window resizes
      setPosition(prevPos => {
        const updatedPos = { ...prevPos };
        if (prevPos.x > window.innerWidth - halfSize) {
          updatedPos.x = window.innerWidth - halfSize;
        }
        if (prevPos.y > window.innerHeight - halfSize) {
          updatedPos.y = window.innerHeight - halfSize;
        }
        return updatedPos;
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    isActive,
    position,
    velocity,
    size,
    speed,
    soundEnabled,
    sound,
    soundVolume,
    autoChangeColors,
    youtubeAudio,
    youtubeEnabled
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