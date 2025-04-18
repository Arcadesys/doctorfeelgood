'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import * as Tone from 'tone';
import { AudioProcessor, createAudioProcessor, resumeAudioContext } from '@/utils/audioUtils';
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
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  
  // Sound effects
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundVolume, setSoundVolume] = useState(-10); // dB
  const [sound, setSound] = useState<{ playTone: (note: string, volume?: number) => void } | null>(null);
  
  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [audioProcessor, setAudioProcessor] = useState<AudioProcessor | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
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
  
  // Function to load a user-uploaded audio file
  const handleAudioFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    try {
      setIsLoadingAudio(true);
      setAudioError('');
      setAudioFile(file);
      
      // Request audio permission if not already granted
      if (!audioPermissionGranted) {
        const granted = await requestAudioPermission();
        // Continue even if not granted, as the user can try later
      }
      
      // Create object URL for the file
      const fileUrl = URL.createObjectURL(file);
      console.log(`Created URL for file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      
      // For local files, check if they're valid audio
      try {
        const tempAudio = new Audio();
        tempAudio.src = fileUrl;
        
        // Wait briefly to check if the file loads
        await new Promise((resolve, reject) => {
          tempAudio.onloadedmetadata = resolve;
          tempAudio.onerror = () => reject(new Error("Couldn't load audio file. The file may be corrupted or in an unsupported format."));
          
          // Timeout after 3 seconds
          setTimeout(() => resolve(null), 3000);
        });
      } catch (validationError) {
        console.error("File validation error:", validationError);
        setAudioError(validationError instanceof Error ? validationError.message : "Invalid audio file");
        setIsLoadingAudio(false);
        return false;
      }
      
      // Create audio processor with the file
      const processor = await createAudioProcessor(fileUrl, file.name);
      
      setAudioTitle(file.name);
      setAudioProcessor(processor);
      setAudioEnabled(true);
      setUseSampleAudio(false);
      
      // Reset sample audio if it was previously used
      setSampleAudioId('');
      
      return true;
    } catch (error) {
      console.error('Error loading audio file:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to load audio file. Try a different format or file.');
      return false;
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Function to load a sample audio file
  const loadSampleAudio = async (id?: string) => {
    try {
      setIsLoadingAudio(true);
      setAudioError('');
      
      // Request audio permission if not already granted
      if (!audioPermissionGranted) {
        const granted = await requestAudioPermission();
        // Continue even if not granted, as the user can try later
      }
      
      // Get the sample audio file - either by ID or random
      const sampleAudio = id 
        ? sampleAudioFiles.find(audio => audio.id === id) || getRandomSampleAudio()
        : getRandomSampleAudio();
      
      setSampleAudioId(sampleAudio.id);
      
      // Create audio processor
      const processor = await createAudioProcessor(
        sampleAudio.url, 
        sampleAudio.title
      );
      
      setAudioTitle(sampleAudio.title);
      setAudioProcessor(processor);
      setAudioEnabled(true);
      setUseSampleAudio(true);
      
      // Reset any uploaded file
      setAudioFile(null);
      // If there's a file input element, reset it
      const fileInput = document.getElementById('audioFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      return true;
    } catch (error) {
      console.error('Error loading sample audio:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to load sample audio');
      return false;
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Handle audio when active state changes
  useEffect(() => {
    if (!audioProcessor) return;
    
    const handleAudioPlayback = async () => {
      if (isActive && audioEnabled) {
        try {
          await resumeAudioContext();
          await audioProcessor.play();
          console.log('Audio playback started from effect');
        } catch (error) {
          console.error('Effect error playing audio:', error);
          setAudioError('Failed to play audio from effect. Click stop and start again.');
        }
      } else {
        audioProcessor.pause();
      }
    };
    
    // Don't auto-start here since we handle it in the toggleActive function
    if (!isActive) {
      audioProcessor.pause();
    }
    
    return () => {
      if (audioProcessor) {
        audioProcessor.pause();
      }
    };
  }, [isActive, audioProcessor, audioEnabled]);
  
  // Update audio volume when changed
  useEffect(() => {
    if (audioProcessor) {
      audioProcessor.setVolume(soundVolume);
    }
  }, [soundVolume, audioProcessor]);
  
  // Physics-based animation
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    console.log("Animation effect starting with audio enabled:", audioEnabled);
    
    // Immediately try to resume audio context
    const initAudio = async () => {
      try {
        await resumeAudioContext();
        if (audioEnabled && audioProcessor) {
          console.log("Animation effect resuming audio context and playing audio");
          await audioProcessor.play().catch(async (err) => {
            console.error("Failed to play audio, trying fallback:", err);
            
            // Fallback: Create a direct Audio element as last resort
            if (audioFile) {
              try {
                const fallbackPlayer = new Audio(URL.createObjectURL(audioFile));
                fallbackPlayer.volume = 0.5;
                fallbackPlayer.loop = true;
                await fallbackPlayer.play();
                console.log("Using fallback audio player");
              } catch (fallbackErr) {
                console.error("Fallback player also failed:", fallbackErr);
              }
            } else if (useSampleAudio && sampleAudioId) {
              // Try to play sample audio directly
              const sampleAudio = sampleAudioFiles.find(audio => audio.id === sampleAudioId);
              if (sampleAudio) {
                try {
                  const fallbackPlayer = new Audio(sampleAudio.url);
                  fallbackPlayer.volume = 0.5;
                  fallbackPlayer.loop = true;
                  await fallbackPlayer.play();
                  console.log("Using fallback sample audio player");
                } catch (fallbackErr) {
                  console.error("Sample fallback player failed:", fallbackErr);
                }
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to initialize audio in animation effect:", err);
      }
    };
    
    // Call immediately
    initAudio();
    
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
      if (soundEnabled && sound && !audioEnabled) {
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
        
        // Update panner for audio - full -1 to 1 range
        if (audioProcessor && audioEnabled) {
          // Map x position to panner value (-1 to 1)
          const normalizedPosition = (currentX - (viewportWidth * 0.1)) / (viewportWidth * 0.8);
          const panValue = (normalizedPosition * 2) - 1;
          audioProcessor.setPan(Math.max(-1, Math.min(1, panValue)));
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
    audioProcessor,
    audioEnabled,
  ]);

  // Handle start/stop
  const toggleActive = async () => {
    try {
      // First, immediately try to resume audio context on user interaction
      await resumeAudioContext().catch(err => {
        console.error("Failed to resume audio context:", err);
      });
      
      // If using Tone.js, ensure it's started too
      if (typeof Tone !== 'undefined') {
        await Tone.start().catch(err => {
          console.error("Failed to start Tone.js:", err);
        });
      }
      
      // Check for audio permission first
      if (audioEnabled && !audioPermissionGranted) {
        const permissionGranted = await requestAudioPermission();
        if (!permissionGranted) {
          setAudioError("Please enable audio permission using the button in settings.");
          // Continue anyway, but audio might not work
        }
      }
      
      if (!isActive) {
        if (audioEnabled && !audioProcessor) {
          // Try to load sample audio if no audio loaded
          const success = await loadSampleAudio();
          if (!success) {
            return; // Don't start if audio loading failed
          }
        }
        
        // Force some browser interaction to enable audio
        if (sound) {
          // Play and immediately stop a silent sound to kick-start audio
          sound.playTone('C2', -100);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        if (audioEnabled && audioProcessor) {
          // Make sure to resume the audio context before playing
          await resumeAudioContext();
          console.log("Starting audio playback...");
          try {
            await audioProcessor.play();
            console.log("Audio playback started successfully");
            // Set initial pan to center
            audioProcessor.setPan(0);
          } catch (error) {
            console.error('Error playing audio:', error);
            setAudioError('Failed to play audio. Please try clicking the start button again.');
          }
        }
        
        if (soundEnabled && !audioEnabled && sound) {
          sound.playTone('G4', soundVolume); // Success tone
        }
      } else {
        // Stopping - pause audio if active
        if (audioProcessor) {
          audioProcessor.pause();
        }
      }
      
      setIsActive(!isActive);
    } catch (err) {
      console.error("Toggle active failed:", err);
      setAudioError("Failed to start. Please try again.");
    }
  };

  // Toggle settings drawer
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  // Request audio permission explicitly
  const requestAudioPermission = async () => {
    try {
      console.log("Requesting audio permission...");
      
      // Initialize Tone.js first (requires user gesture)
      await Tone.start();
      console.log("Tone.js context started");
      
      // Create temporary audio context just for permission
      const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await tempContext.resume();
      
      // Play a silent sound to trigger permission
      const oscillator = tempContext.createOscillator();
      const gainNode = tempContext.createGain();
      gainNode.gain.value = 0.01; // Almost silent
      oscillator.connect(gainNode);
      gainNode.connect(tempContext.destination);
      
      oscillator.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      oscillator.stop();
      
      // Try to also resume our main audio context
      await resumeAudioContext();
      
      // Also try to play a brief sound with the HTML Audio API
      try {
        const testSound = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        testSound.volume = 0.1;
        await testSound.play();
        setTimeout(() => testSound.pause(), 50);
      } catch (e) {
        console.warn("HTML Audio test failed, might be blocked:", e);
      }
      
      setAudioPermissionGranted(true);
      setAudioError('');
      
      console.log("Audio permission granted!");
      
      return true;
    } catch (err) {
      console.error("Failed to get audio permission:", err);
      setAudioError('Audio permission denied. Please check your browser settings.');
      return false;
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
        
        {/* Audio title overlay when playing */}
        {audioEnabled && audioTitle && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded max-w-xs truncate">
            <span className="text-xs">Playing: {audioTitle}</span>
          </div>
        )}
        
        {/* Audio permission notice */}
        {audioEnabled && !audioPermissionGranted && !isActive && (
          <div className="absolute bottom-24 left-4 bg-yellow-900 bg-opacity-90 text-white p-3 rounded shadow-lg max-w-xs">
            <p className="text-sm font-bold mb-2">Audio Permission Required</p>
            <p className="text-xs mb-2">Arc browser requires explicit permission for audio playback</p>
            <button
              onClick={requestAudioPermission}
              className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 px-4 rounded"
            >
              Enable Audio
            </button>
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
        
        {audioEnabled && !audioPermissionGranted && (
          <button
            onClick={requestAudioPermission}
            className="p-3 rounded-full bg-yellow-600 hover:bg-yellow-500 text-white"
            aria-label="Enable Audio"
            title="Enable Audio Permission"
          >
            🔊
          </button>
        )}
        
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
          
          {/* Audio Upload */}
          <div className="flex flex-col mb-6 border-b border-gray-700 pb-4">
            <h3 className="text-white font-medium mb-2">Audio</h3>
            
            {/* Audio Permission Status */}
            <div className="mb-4 p-3 rounded bg-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">Audio Permission:</span>
                <span className={`text-sm font-medium ${audioPermissionGranted ? 'text-green-400' : 'text-yellow-400'}`}>
                  {audioPermissionGranted ? 'Granted ✓' : 'Required ⚠'}
                </span>
              </div>
              
              {!audioPermissionGranted && (
                <button
                  onClick={requestAudioPermission}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 px-3 rounded text-sm"
                >
                  Enable Audio Permission
                </button>
              )}
              
              <p className="text-gray-300 text-xs mt-2">
                Arc browser and other modern browsers require explicit user interaction to enable audio.
              </p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <label htmlFor="audioFile" className="text-white text-sm">
                Upload Audio File:
              </label>
              <input
                id="audioFile"
                type="file"
                accept="audio/*"
                onChange={handleAudioFileUpload}
                disabled={isActive}
                className="text-white text-sm bg-gray-700 p-2 rounded"
                aria-describedby="audioHint"
              />
              
              {audioError && (
                <p className="text-red-400 text-xs mt-1" role="alert">
                  {audioError}
                </p>
              )}
              
              <p id="audioHint" className="text-gray-400 text-xs">
                Upload MP3, WAV, OGG, or M4A files to use with stereo panning
              </p>
              
              {audioFile && (
                <div className="flex items-center mt-2">
                  <div className="flex-1">
                    <p className="text-white text-sm truncate" title={audioFile.name}>
                      {audioFile.name}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="audioEnabled"
                      type="checkbox"
                      checked={audioEnabled && !useSampleAudio}
                      onChange={(e) => {
                        setAudioEnabled(e.target.checked);
                        if (e.target.checked) setUseSampleAudio(false);
                      }}
                      className="mr-2 h-4 w-4"
                      disabled={isActive || !audioProcessor}
                      aria-checked={audioEnabled && !useSampleAudio}
                    />
                    <label htmlFor="audioEnabled" className="text-white text-sm">
                      Use uploaded audio
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
            
            {audioError && useSampleAudio && (
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
                disabled={audioEnabled}
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