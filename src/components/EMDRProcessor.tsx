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

// Add interface for saved audio files
interface SavedAudioFile {
  id: string;
  name: string;
  url: string;
  timestamp: number;
  size: number;
}

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
  const [audioPanningEnabled, setAudioPanningEnabled] = useState(true);
  
  // Target motion controls
  const [targetMotionType, setTargetMotionType] = useState('auto'); // 'auto' or 'controlled'
  const [motionAmplitude, setMotionAmplitude] = useState(80); // percentage of screen width
  
  // Sample audio integration
  const [sampleAudioId, setSampleAudioId] = useState('');
  const [useSampleAudio, setUseSampleAudio] = useState(false);
  
  // Physics values
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 5, y: 5 });
  
  // Add state for saved audio files
  const [savedAudioFiles, setSavedAudioFiles] = useState<SavedAudioFile[]>([]);
  const [showSavedFiles, setShowSavedFiles] = useState(false);
  
  // Initialize sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSound(setupSound());
      
      // Initialize position to center of screen
      setPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
    }
  }, []);
  
  // Load saved files from localStorage on component mount
  useEffect(() => {
    const loadSavedFiles = () => {
      try {
        const savedFilesJson = localStorage.getItem('emdr_saved_audio_files');
        if (savedFilesJson) {
          const files = JSON.parse(savedFilesJson) as SavedAudioFile[];
          setSavedAudioFiles(files);
          console.log(`Loaded ${files.length} saved audio files from localStorage`);
        }
      } catch (error) {
        console.error('Error loading saved audio files:', error);
      }
    };
    
    loadSavedFiles();
  }, []);
  
  // Function to save a file to localStorage
  const saveAudioFile = (file: File, url: string) => {
    try {
      // Create a new saved file entry
      const newSavedFile: SavedAudioFile = {
        id: `file_${Date.now()}`,
        name: file.name,
        url: url,
        timestamp: Date.now(),
        size: file.size
      };
      
      // Add to the saved files list
      const updatedFiles = [...savedAudioFiles, newSavedFile];
      setSavedAudioFiles(updatedFiles);
      
      // Save to localStorage
      localStorage.setItem('emdr_saved_audio_files', JSON.stringify(updatedFiles));
      
      console.log(`Saved audio file to localStorage: ${file.name}`);
      return true;
    } catch (error) {
      console.error('Error saving audio file to localStorage:', error);
      return false;
    }
  };
  
  // Function to load a saved file
  const loadSavedAudioFile = (savedFile: SavedAudioFile) => {
    try {
      setIsLoadingAudio(true);
      setAudioError('');
      
      // Create a audio processor for the saved file
      const simpleProcessor = createSimpleAudioProcessor(savedFile.url, savedFile.name);
      
      setAudioTitle(savedFile.name);
      setAudioProcessor(simpleProcessor);
      setAudioEnabled(true);
      setUseSampleAudio(false);
      
      // Hide the saved files dialog
      setShowSavedFiles(false);
      
      // Reset any uploaded file input
      const fileInput = document.getElementById('audioFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      setIsLoadingAudio(false);
      return true;
    } catch (error) {
      console.error('Error loading saved audio file:', error);
      setAudioError(`Failed to load saved file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoadingAudio(false);
      return false;
    }
  };
  
  // Function to delete a saved file
  const deleteSavedAudioFile = (id: string) => {
    try {
      // Filter out the file to delete
      const updatedFiles = savedAudioFiles.filter(file => file.id !== id);
      
      // Update state
      setSavedAudioFiles(updatedFiles);
      
      // Save updated list to localStorage
      localStorage.setItem('emdr_saved_audio_files', JSON.stringify(updatedFiles));
      
      console.log(`Deleted saved audio file: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting saved audio file:', error);
      return false;
    }
  };
  
  // Function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Function to format date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  // Update the handleAudioFileUpload function to save to localStorage
  const handleAudioFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    try {
      setIsLoadingAudio(true);
      setAudioError('');
      setAudioFile(file);
      
      // Create object URL for the file
      const fileUrl = URL.createObjectURL(file);
      console.log(`Created URL for file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      
      // Set the audio title and URL
      setAudioTitle(file.name);
      setAudioEnabled(true);
      setUseSampleAudio(false);
      
      // Create a new audio processor in the simplified way
      const simpleProcessor = createSimpleAudioProcessor(fileUrl, file.name);
      setAudioProcessor(simpleProcessor);
      
      // Reset sample audio if it was previously used
      setSampleAudioId('');
      
      // Save the file to localStorage
      saveAudioFile(file, fileUrl);
      
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
      
      // Get the sample audio file - either by ID or random
      const sampleAudio = id 
        ? sampleAudioFiles.find(audio => audio.id === id) || getRandomSampleAudio()
        : getRandomSampleAudio();
      
      setSampleAudioId(sampleAudio.id);
      
      // Create a simple audio processor for the sample
      const simpleProcessor = createSimpleAudioProcessor(sampleAudio.url, sampleAudio.title);
      
      setAudioTitle(sampleAudio.title);
      setAudioProcessor(simpleProcessor);
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
    if (!containerRef.current) return;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Set initial position based on whether animation is active
    if (!isActive) {
      // When inactive, ensure target is centered
      setPosition({
        x: viewportWidth / 2,
        y: viewportHeight / 2
      });
      return; // Exit early if not active
    }
    
    console.log("Animation effect starting with audio enabled:", audioEnabled);
    
    // Immediately try to resume audio context
    const initAudio = async () => {
      try {
        await resumeAudioContext();
        if (audioEnabled && audioProcessor) {
          console.log("Animation effect resuming audio context and playing audio");
          
          // First check if the audio processor has a functional panner
          try {
            // Test panner with extreme values
            audioProcessor.setPan(-1);
            await new Promise(resolve => setTimeout(resolve, 50));
            audioProcessor.setPan(1);
            await new Promise(resolve => setTimeout(resolve, 50));
            audioProcessor.setPan(0);
            console.log("Animation effect: panner test successful");
          } catch (panError) {
            console.warn("Animation effect: panner test failed, will use fallback:", panError);
            // We'll continue anyway - the audioUtils fallback should handle this
          }
          
          // Now try to play the audio
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
    
    // Calculate motion boundaries based on amplitude
    const amplitude = motionAmplitude / 100; // Convert percentage to ratio (0-1)
    const leftPosition = viewportWidth * (0.5 - amplitude/2); 
    const rightPosition = viewportWidth * (0.5 + amplitude/2);
    const centerPosition = viewportWidth * 0.5;
    
    // Set to true if we want audio pan values to control target position
    const useAudioPanForPosition = targetMotionType === 'auto' && audioEnabled && audioProcessor;
    
    // Initialize position before animation starts to prevent flashing at 0,0
    if (useAudioPanForPosition && audioProcessor) {
      // If audio-controlled, set position based on current pan
      const currentPan = audioProcessor.getCurrentPan();
      const newX = centerPosition + (currentPan * (rightPosition - centerPosition));
      setPosition({
        x: newX,
        y: viewportHeight / 2
      });
    } else {
      // For controlled movement, start at center
      setPosition({
        x: centerPosition,
        y: viewportHeight / 2
      });
    }
    
    if (!useAudioPanForPosition) {
      // CONTROLLED MOVEMENT LOGIC - Predictable motion with configurable parameters
      // Define movement positions differently to create smooth continuous motion
      const leftPoint = { x: leftPosition, y: viewportHeight / 2 };
      const centerPoint = { x: centerPosition, y: viewportHeight / 2 };
      const rightPoint = { x: rightPosition, y: viewportHeight / 2 };
      
      // Create smoother oscillation pattern
      let startTime = Date.now();
      let animationFrameId: number;
      let lastX = position.x;
      
      // Use sine wave for smoother oscillation
      const animate = () => {
        const elapsed = Date.now() - startTime;
        // Convert speed from ms for full cycle to oscillation frequency
        const frequency = 1000 / speed;
        // Calculate position using sine wave, ranging from -1 to 1
        const oscillation = Math.sin(elapsed * frequency * Math.PI / 1000);
        
        // Map oscillation value to screen position
        const newX = centerPoint.x + oscillation * (rightPoint.x - centerPoint.x);
        
        // Update position
        setPosition({
          x: newX,
          y: viewportHeight / 2
        });
        
        // Play sound at extremes (near -1 or 1)
        if (soundEnabled && sound && !audioEnabled) {
          // Only trigger sounds when crossing thresholds
          const threshold = 0.95; // How close to extremes to trigger sound
          if (Math.abs(oscillation) > threshold) {
            // Only play sound when crossing the threshold from below
            const prevOscillation = (lastX - centerPoint.x) / (rightPoint.x - centerPoint.x);
            
            if (Math.abs(prevOscillation) <= threshold) {
              sound.playTone(oscillation > 0 ? 'G4' : 'C4', soundVolume);
              
              // Change color at extremes if enabled
              if (autoChangeColors) {
                setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
              }
            }
          }
        }
        
        // Update audio panning if enabled
        if (audioProcessor && audioEnabled && audioPanningEnabled) {
          try {
            // Map current position to pan value (-1 to 1)
            const normalizedPosition = (newX - leftPoint.x) / (rightPoint.x - leftPoint.x);
            const panValue = (normalizedPosition * 2) - 1; 
            const clampedPanValue = Math.max(-1, Math.min(1, panValue));
            
            // Only update if the pan value changed significantly (helps reduce browser load)
            const currentPan = audioProcessor.getCurrentPan();
            if (Math.abs(currentPan - clampedPanValue) > 0.05) {
              audioProcessor.setPan(clampedPanValue);
            }
          } catch (panError) {
            console.warn("Error setting pan during animation:", panError);
            // Continue animation even if pan setting fails
          }
        } else if (audioProcessor && audioEnabled && !audioPanningEnabled) {
          // Keep audio centered if panning is disabled
          try {
            audioProcessor.setPan(0);
          } catch (error) {
            console.warn("Error resetting pan to center:", error);
          }
        }
        
        // Store last position for threshold detection
        lastX = newX;
        
        // Continue animation
        animationFrameId = requestAnimationFrame(animate);
      };
      
      // Start animation
      animationFrameId = requestAnimationFrame(animate);
      
      // Clean up function
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    } else {
      // AUDIO-CONTROLLED MOVEMENT - Position follows audio pan
      
      // Setup pan detection frame loop
      let frameId: number;
      let lastPanValue = 0;
      
      // Function to update position based on audio pan
      const updatePositionFromPan = () => {
        if (!audioProcessor || !audioEnabled) return;
        
        // Get current pan value from audio processor - ranges from -1 to 1
        const currentPan = audioProcessor.getCurrentPan();
        
        // Convert pan value to screen position
        // Pan range is -1 to 1, convert to screen position with configurable amplitude
        const amplitude = motionAmplitude / 100; // Convert percentage to decimal
        const leftPosition = viewportWidth * (0.5 - amplitude/2);
        const rightPosition = viewportWidth * (0.5 + amplitude/2);
        const centerPosition = viewportWidth * 0.5;
        
        // Calculate position based on pan value
        const newX = centerPosition + (currentPan * (rightPosition - centerPosition));
        
        // Update position state
        setPosition({
          x: newX,
          y: viewportHeight / 2 // Keep vertical position centered
        });
        
        // Only trigger special effects when crossing thresholds
        if (currentPan !== lastPanValue) {
          // If audio panning enabled, periodically force extreme pan values
          // to make sure the audio system stays active
          if (audioPanningEnabled && Math.random() < 0.01) { // ~1% chance per frame
            // Briefly ping extreme value and return to current
            const extremePan = currentPan > 0 ? 1 : -1;
            audioProcessor.setPan(extremePan);
            setTimeout(() => {
              // Return to where we should be
              audioProcessor.setPan(currentPan);
            }, 50);
          }
          
          // Handle color changes at extremes
          if (autoChangeColors) {
            if (Math.abs(currentPan) > 0.9 && Math.abs(lastPanValue) <= 0.9) {
              setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
            }
          }
          
          // Play sound at extremes if enabled
          if (soundEnabled && sound) {
            if (Math.abs(currentPan) > 0.9 && Math.abs(lastPanValue) <= 0.9) {
              sound.playTone(currentPan > 0 ? 'G4' : 'C4', soundVolume);
            }
          }
          
          lastPanValue = currentPan;
        }
        
        // Continue the animation loop
        frameId = requestAnimationFrame(updatePositionFromPan);
      };
      
      // Start the animation loop
      frameId = requestAnimationFrame(updatePositionFromPan);
      
      // Handle window resize
      const handleResize = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        // Recalculate position based on current pan value
        if (audioProcessor) {
          const currentPan = audioProcessor.getCurrentPan();
          const amplitude = motionAmplitude / 100; // Convert percentage to decimal
          const leftPosition = newWidth * (0.5 - amplitude/2);
          const rightPosition = newWidth * (0.5 + amplitude/2);
          const centerPosition = newWidth * 0.5;
          
          // Calculate position based on pan value
          const newX = centerPosition + (currentPan * (rightPosition - centerPosition));
          
          // Update position state
          setPosition({
            x: newX,
            y: newHeight / 2 // Keep vertical position centered
          });
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        // Clean up
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
        window.removeEventListener('resize', handleResize);
      };
    }
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
    audioPanningEnabled,
    targetMotionType,
    motionAmplitude,
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
            
            // Force extreme pan values to kickstart the panning system
            if (audioPanningEnabled) {
              // Quick ping-pong to ensure panner is active
              audioProcessor.setPan(-1);
              setTimeout(() => {
                audioProcessor.setPan(1);
                setTimeout(() => {
                  audioProcessor.setPan(0);
                }, 100);
              }, 100);
            } else {
              // Set initial pan to center
              audioProcessor.setPan(0);
            }
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
        
        // Gracefully return to center with animation
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Apply a smooth transition to center
        document.documentElement.style.setProperty('--emdr-transition-duration', '0.6s');
        setPosition({
          x: viewportWidth / 2,
          y: viewportHeight / 2
        });
        
        // Play a gentle completion tone
        if (soundEnabled && sound) {
          sound.playTone('C4', soundVolume - 5); // Softer completion tone
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

  // Create a simpler audio processor based on the SimplePanner approach
  const createSimpleAudioProcessor = (audioUrl: string, title: string): AudioProcessor => {
    // Create an audio element 
    const audioElement = new Audio();
    audioElement.src = audioUrl;
    audioElement.crossOrigin = 'anonymous';
    audioElement.loop = true;
    audioElement.preload = 'auto';
    
    // These will be initialized when play is called
    let audioContext: AudioContext | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let gainNode: GainNode | null = null;
    let pannerNode: StereoPannerNode | null = null;
    let isPlaying = false;
    let currentPanValue = 0;
    
    // Initialize Web Audio API nodes
    const initAudioNodes = async () => {
      if (audioContext && sourceNode && gainNode && pannerNode) {
        return; // Already initialized
      }
      
      try {
        // Create audio context
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume the context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        // Create audio nodes
        sourceNode = audioContext.createMediaElementSource(audioElement);
        gainNode = audioContext.createGain();
        pannerNode = audioContext.createStereoPanner();
        
        // Connect the nodes
        sourceNode.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set initial values
        pannerNode.pan.value = 0;
        gainNode.gain.value = 1.0;
        
        console.log('Audio nodes initialized successfully');
      } catch (error) {
        console.error('Failed to initialize audio nodes:', error);
        throw error;
      }
    };
    
    return {
      play: async () => {
        try {
          // Initialize audio nodes if not done yet
          await initAudioNodes();
          
          // Play the audio
          await audioElement.play();
          isPlaying = true;
          console.log('Audio playback started');
          
          return Promise.resolve();
        } catch (error) {
          console.error('Error playing audio:', error);
          
          // Try direct playback if Web Audio API fails
          try {
            // Disconnect any audio nodes to allow direct playback
            if (sourceNode) {
              sourceNode.disconnect();
            }
            
            // Try direct playback
            await audioElement.play();
            isPlaying = true;
            console.log('Using fallback direct playback');
            
            return Promise.resolve();
          } catch (fallbackError) {
            console.error('Fallback playback also failed:', fallbackError);
            return Promise.reject(fallbackError);
          }
        }
      },
      pause: () => {
        audioElement.pause();
        isPlaying = false;
      },
      stop: () => {
        audioElement.pause();
        audioElement.currentTime = 0;
        isPlaying = false;
      },
      setPan: (value: number) => {
        // Store the current pan value even if we can't apply it yet
        currentPanValue = Math.max(-1, Math.min(1, value));
        
        // Apply pan if pannerNode exists
        if (pannerNode) {
          pannerNode.pan.value = currentPanValue;
        }
      },
      getCurrentPan: () => {
        // Return the stored value if pannerNode doesn't exist yet
        return pannerNode ? pannerNode.pan.value : currentPanValue;
      },
      setVolume: (value: number) => {
        // Convert dB to linear gain (value is in dB)
        const dbValue = Math.max(-60, Math.min(0, value));
        const gainValue = Math.pow(10, dbValue / 20);
        
        if (gainNode) {
          gainNode.gain.value = gainValue;
        } else {
          // Fallback to element volume
          audioElement.volume = Math.max(0, Math.min(1, (dbValue + 60) / 60));
        }
      },
      isPlaying: () => {
        return isPlaying;
      },
      getTitle: () => {
        return title;
      },
      onEnded: (callback: () => void) => {
        audioElement.addEventListener('ended', callback);
      }
    };
  };

  // Request audio permission explicitly
  const requestAudioPermission = async () => {
    try {
      console.log("Requesting audio permission...");
      
      // Create a temporary audio context just for permission
      const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await tempContext.resume();
      
      // Try to also initialize Tone.js
      try {
        await Tone.start();
        console.log("Tone.js context started");
      } catch (toneError) {
        console.warn("Tone.js initialization failed:", toneError);
        // Continue anyway
      }
      
      // Try to play a brief silent sound
      try {
        const oscillator = tempContext.createOscillator();
        const gainNode = tempContext.createGain();
        gainNode.gain.value = 0.01; // Almost silent
        oscillator.connect(gainNode);
        gainNode.connect(tempContext.destination);
        
        oscillator.start();
        await new Promise(resolve => setTimeout(resolve, 100));
        oscillator.stop();
      } catch (oscError) {
        console.warn("Oscillator test failed:", oscError);
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
        style={{
          // Define CSS variables for transitions
          "--emdr-transition-duration": "0.3s"
        } as React.CSSProperties}
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
            transition: isActive ? 'none' : 'left var(--emdr-transition-duration) ease-out, top var(--emdr-transition-duration) ease-out' // Add smooth transition when not active
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
            
            {/* Audio pan visualization */}
            {isActive && audioPanningEnabled && (
              <div className="mt-1 flex items-center" aria-label="Audio pan position indicator">
                <div className="h-2 bg-gray-700 rounded-full w-full flex items-center relative">
                  <div 
                    className="h-4 w-2 bg-white absolute rounded-full transform -translate-y-1/2"
                    style={{ 
                      left: `${((audioProcessor?.getCurrentPan() || 0) + 1) * 50}%`,
                      transition: 'left 0.05s ease-out'
                    }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs ml-2 sr-only">
                  Pan: {Math.round(((audioProcessor?.getCurrentPan() || 0) + 1) * 50)}% left to right
                </span>
              </div>
            )}
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
            
            {/* Saved Audio Files */}
            <div className="mt-3">
              <button
                onClick={() => setShowSavedFiles(!showSavedFiles)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded text-sm mb-2"
                aria-expanded={showSavedFiles}
              >
                {showSavedFiles ? 'Hide' : 'Show'} Saved Audio Files ({savedAudioFiles.length})
              </button>
              
              {showSavedFiles && (
                <div className="mt-2 max-h-48 overflow-y-auto bg-gray-900 rounded p-2">
                  {savedAudioFiles.length === 0 ? (
                    <p className="text-gray-400 text-sm py-2 px-1">
                      No saved audio files yet. Upload an MP3 to save it here.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {savedAudioFiles.map((file) => (
                        <li key={file.id} className="bg-gray-800 rounded p-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {formatFileSize(file.size)} • {formatDate(file.timestamp)}
                              </p>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() => loadSavedAudioFile(file)}
                                className="bg-green-600 hover:bg-green-500 text-white rounded-full p-1"
                                title="Load this audio file"
                                aria-label={`Load ${file.name}`}
                              >
                                ▶
                              </button>
                              <button
                                onClick={() => deleteSavedAudioFile(file.id)}
                                className="bg-red-600 hover:bg-red-500 text-white rounded-full p-1"
                                title="Delete this saved audio file"
                                aria-label={`Delete ${file.name}`}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Explanation of audio panning */}
          {audioEnabled && (
            <div className="mt-2 p-3 rounded bg-blue-900 bg-opacity-40 text-sm text-blue-100">
              <p className="mb-1 font-medium">About audio mode:</p>
              <p className="text-xs mb-2">
                When audio is enabled, you can choose how the target and audio work together.
              </p>
              
              <div className="flex flex-col space-y-3">
                {/* Target motion control */}
                <div>
                  <label className="text-white text-sm block mb-1">Target Motion:</label>
                  <select
                    value={targetMotionType}
                    onChange={(e) => setTargetMotionType(e.target.value)}
                    className="w-full bg-gray-700 text-white text-sm p-1 rounded"
                    disabled={isActive}
                  >
                    <option value="auto">Follow audio panning</option>
                    <option value="controlled">Controlled motion</option>
                  </select>
                </div>
                
                {/* Audio panning toggle */}
                <div className="flex items-center">
                  <input
                    id="audioPanning"
                    type="checkbox"
                    checked={audioPanningEnabled}
                    onChange={(e) => setAudioPanningEnabled(e.target.checked)}
                    className="mr-2 h-4 w-4"
                    aria-checked={audioPanningEnabled}
                  />
                  <label htmlFor="audioPanning" className="text-white text-sm">
                    Enable audio panning effect
                  </label>
                </div>
                
                {!audioPanningEnabled && (
                  <p className="text-xs text-blue-200">
                    Audio panning disabled - sound will remain centered
                  </p>
                )}
                
                {/* Motion amplitude control */}
                <div>
                  <label htmlFor="motionAmplitude" className="text-white text-sm block mb-1">
                    Motion Width: {motionAmplitude}%
                  </label>
                  <input
                    id="motionAmplitude"
                    type="range"
                    min={20}
                    max={90}
                    step={5}
                    value={motionAmplitude}
                    onChange={(e) => setMotionAmplitude(Number(e.target.value))}
                    className="w-full"
                    aria-valuemin={20}
                    aria-valuemax={90}
                    aria-valuenow={motionAmplitude}
                  />
                </div>
              </div>
            </div>
          )}
          
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