'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  AudioEngine, 
  AudioMode,
  ContactSoundConfig, 
  AudioTrackConfig
} from '../lib/audioEngine';
import { useRouter } from 'next/navigation';
import CustomKnob from './CustomKnob';

// Simple version without the File System Access API
type AudioFile = {
  id: string;
  name: string;
  lastUsed: string;
  path?: string;
  objectUrl?: string;
};

// Audio context interfaces
interface AudioContextState {
  context: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  panner: StereoPannerNode | null;
  gainNode: GainNode | null;
}

// Update the audio mode type
// type AudioMode = 'click' | 'audioTrack';

export function EMDRProcessor() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [folderPath, setFolderPath] = useState<string>('');
  const [a11yMessage, setA11yMessage] = useState<string>('Visual target ready. Audio controls available at bottom of screen.');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [panValue, setPanValue] = useState(0); // -1 (left) to 1 (right)
  const [panWidthPercent, setPanWidthPercent] = useState(80); // Percentage of maximum pan width
  const [audioMode, setAudioMode] = useState<AudioMode>('click');
  const [showLibrary, setShowLibrary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio engine settings
  const [contactSoundConfig, setContactSoundConfig] = useState<ContactSoundConfig>({
    leftSamplePath: '/sounds/click-left.mp3',
    rightSamplePath: '/sounds/click-right.mp3',
    volume: 0.5,
    enabled: true
  });
  
  const [audioTrackConfig, setAudioTrackConfig] = useState<AudioTrackConfig>({
    volume: 0.7,
    loop: true,
    filePath: '/audio/sine-440hz.mp3'
  });
  
  // Animation state
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const canvasSizedRef = useRef<boolean>(false);
  const lastTriggerTimeRef = useRef<number>(0);
  const lastTriggerSideRef = useRef<'left' | 'right' | null>(null);
  
  // Audio context state
  const audioContextRef = useRef<AudioContextState>({
    context: null,
    source: null,
    panner: null,
    gainNode: null
  });
  
  // Audio engine reference
  const audioEngineRef = useRef<AudioEngine | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOpenSoundRef = useRef<HTMLAudioElement>(null);
  const menuCloseSoundRef = useRef<HTMLAudioElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playStatusSoundRef = useRef<HTMLAudioElement>(null);
  
  // Add BPM state
  const [bpm, setBpm] = useState(60); // Default to 60 BPM
  
  // Add timer states
  const [sessionDuration, setSessionDuration] = useState(30); // Default 30 seconds
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize canvas when component mounts
  useEffect(() => {
    if (canvasRef.current && !canvasSizedRef.current) {
      console.log("Initial canvas sizing");
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      canvasSizedRef.current = true;
      drawVisualTarget();
    }
  }, []);
  
  // Initialize Audio Engine
  useEffect(() => {
    // IIFE to handle async initialization
    (async () => {
      // Initialize with our audio element
      if (audioPlayerRef.current) {
        try {
          const audioEngine = new AudioEngine();
          const success = await audioEngine.initialize(audioPlayerRef.current);
          
          if (success) {
            console.log('AudioEngine initialized with audio element');
            
            // Set initial configurations
            audioEngine.updateContactSoundConfig(contactSoundConfig);
            
            // Set initial audio mode
            audioEngine.setAudioMode(audioMode);
            
            // Store in ref
            audioEngineRef.current = audioEngine;
          } else {
            console.error('Failed to initialize AudioEngine');
          }
        } catch (error) {
          console.error('Error initializing AudioEngine:', error);
        }
      }
    })();
    
    // Clean up on unmount
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
        audioEngineRef.current = null;
      }
    };
  }, []);
  
  // Sync configurations with audio engine when they change
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.updateContactSoundConfig(contactSoundConfig);
    }
  }, [contactSoundConfig]);
  
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.updateAudioTrackConfig(audioTrackConfig);
    }
  }, [audioTrackConfig]);
  
  // Sync audio mode when it changes
  useEffect(() => {
    if (audioEngineRef.current && audioEngineRef.current.getAudioMode() !== audioMode) {
      // Stop any current playback
      if (isPlaying) {
        audioEngineRef.current.stopAll();
        setIsPlaying(false);
      }
      
      // Set new mode
      audioEngineRef.current.setAudioMode(audioMode);
      
      // Update accessibility message
      setA11yMessage(`Audio mode changed to ${audioMode === 'audioTrack' ? 'audio track' : 'click'}`);
    }
  }, [audioMode, isPlaying]);
  
  // Load audio metadata on mount
  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      // Default to dark mode
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Check if we're in development mode and create an entry for the Outer Wilds file
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode detected, setting up audio file');
      
      const defaultFiles = [
        { 
          id: '1', 
          name: 'Sine Wave 440Hz', 
          lastUsed: new Date().toLocaleString(), 
          // File is in the audio directory
          path: '/audio/sine-440hz.mp3'
        }
      ];
      setAudioFiles(defaultFiles);
      
      // We'll also select it by default in dev mode
      setSelectedAudio(defaultFiles[0]);
      
      // Set up the audio source but don't autoplay
      if (audioPlayerRef.current) {
        console.log('Setting audio source to sine-440hz.mp3');
        
        // Add event listeners to track loading process
        audioPlayerRef.current.onloadstart = () => console.log('Audio loading started');
        audioPlayerRef.current.onloadeddata = () => console.log('Audio data loaded');
        audioPlayerRef.current.oncanplay = () => console.log('Audio can play');
        audioPlayerRef.current.onerror = (e) => {
          const error = audioPlayerRef.current?.error;
          console.error('Audio loading error:', {
            code: error?.code,
            message: error?.message,
            details: error
          });
        };
        
        // Use absolute path to the file in the public directory
        audioPlayerRef.current.src = '/audio/sine-440hz.mp3';
        audioPlayerRef.current.load();
      }
      
      return;
    } else {
      console.log('Production mode detected');
    }
    
    // For production, use localStorage as before
    const storedFiles = localStorage.getItem('audioFilesMeta');
    if (storedFiles) {
      setAudioFiles(JSON.parse(storedFiles));
    } else {
      // Default sample files
      const defaultFiles = [
        { id: '1', name: 'Sine Wave 440Hz', lastUsed: '4/18/2023 08:58 AM', path: '/audio/sine-440hz.mp3' }
      ];
      setAudioFiles(defaultFiles);
      localStorage.setItem('audioFilesMeta', JSON.stringify(defaultFiles));
    }
    
    // Load last selected audio
    const lastSelectedAudio = localStorage.getItem('selectedAudio');
    if (lastSelectedAudio) {
      setSelectedAudio(JSON.parse(lastSelectedAudio));
    }
    
    // Load saved folder path
    const savedFolderPath = localStorage.getItem('folderPath');
    if (savedFolderPath) {
      setFolderPath(savedFolderPath);
    }
  }, []);
  
  // Save audio metadata to localStorage when they change
  useEffect(() => {
    localStorage.setItem('audioFilesMeta', JSON.stringify(audioFiles));
  }, [audioFiles]);
  
  // Save selected audio to localStorage when it changes
  useEffect(() => {
    if (selectedAudio) {
      localStorage.setItem('selectedAudio', JSON.stringify(selectedAudio));
    }
  }, [selectedAudio]);
  
  // Draw visual target (non-animated state)
  const drawVisualTarget = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Only draw if not playing (static state)
    if (!isPlaying) {
      // Draw static ball in the center
      ctx.beginPath();
      ctx.arc(window.innerWidth / 2, window.innerHeight / 2, 20, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? '#6b7280' : '#374151'; // Gray for dark mode, darker gray for light mode
      ctx.fill();
      ctx.closePath();
    }
  }, [isPlaying, isDarkMode]);
  
  // Setup canvas and handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        
        // Re-draw canvas content
        drawVisualTarget();
      }
    };
    
    // Initial setup
    handleResize();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Announce for screen readers that the canvas is ready
    setA11yMessage('Visual target ready. Audio controls available at bottom of screen.');
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [drawVisualTarget]); // Use drawVisualTarget as dependency (which internally depends on isPlaying)
  
  // Set up audio context for panning
  useEffect(() => {
    // Clean up previous audio context
    if (audioContextRef.current.context) {
      return;
    }
    
    // Create new audio context
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContext();
      const gainNode = context.createGain();
      const panner = context.createStereoPanner();
      
      gainNode.connect(panner);
      panner.connect(context.destination);
      
      audioContextRef.current = {
        context,
        source: null,
        panner,
        gainNode
      };
      
      console.log('Audio context created successfully');
    } catch (error) {
      console.error('Failed to create audio context:', error);
    }
    
    // Clean up on component unmount
    return () => {
      if (audioContextRef.current.context) {
        audioContextRef.current.context.close();
      }
    };
  }, []);
  
  // Connect audio element to audio context when it's available
  useEffect(() => {
    if (!audioPlayerRef.current || !audioContextRef.current.context || audioContextRef.current.source) {
      return;
    }
    
    try {
      const source = audioContextRef.current.context.createMediaElementSource(audioPlayerRef.current);
      source.connect(audioContextRef.current.gainNode!);
      audioContextRef.current.source = source;
      console.log('Audio source connected to context');
    } catch (error) {
      console.error('Failed to connect audio to context:', error);
    }
  }, [isPlaying]);
  
  // Update audio pan value when it changes
  useEffect(() => {
    if (audioContextRef.current.panner && audioContextRef.current.panner.pan) {
      audioContextRef.current.panner.pan.value = panValue;
      console.log(`Pan value updated to: ${panValue}`);
    }
  }, [panValue]);
  
  // Handle canvas animation based on play state
  useEffect(() => {
    console.log("Animation useEffect triggered. isPlaying:", isPlaying);
    
    if (isPlaying && canvasRef.current) {
      console.log("Starting animation, canvas:", canvasRef.current.width, "x", canvasRef.current.height);
      
      // Make sure canvas is properly sized
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      
      // Position and properties of the visual target
      let x = window.innerWidth / 2;
      const ballRadius = 20;
      const maxX = window.innerWidth - ballRadius;
      const minX = ballRadius;
      const startTime = Date.now();
      
      const animate = () => {
        if (!canvasRef.current) {
          console.log("Canvas ref is null during animation");
          return;
        }
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) {
          console.log("Could not get 2d context");
          return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Calculate position based on time and BPM
        const cycleTimeInSeconds = 60 / bpm; // Time for one complete cycle in seconds
        const elapsedTime = (Date.now() - startTime) / 1000;
        const positionInCycle = (elapsedTime % cycleTimeInSeconds) / cycleTimeInSeconds;
        
        // Convert to a sine wave position -1 to 1
        const sineValue = Math.sin(positionInCycle * Math.PI * 2);
        
        // Scale based on canvas width and pan width setting
        const centerX = window.innerWidth / 2;
        const fullAmplitude = (maxX - minX) / 2 - ballRadius;
        const maxAmplitude = fullAmplitude * (panWidthPercent / 100);
        
        // Calculate new x position
        x = centerX + (sineValue * maxAmplitude);
        
        // Calculate normalized position for panning (-1 to 1)
        const normalizedX = sineValue * (panWidthPercent / 100);
        setPanValue(normalizedX);
        
        // Update audio engine panning
        if (audioEngineRef.current) {
          audioEngineRef.current.setPan(normalizedX);
        }
        
        // Check peaks for contact sounds
        const peakThreshold = 0.98;
        const now = Date.now();
        const minTimeBetweenTriggers = 200;
        
        if (Math.abs(sineValue) >= peakThreshold) {
          const isRightPeak = sineValue > 0;
          const currentSide = isRightPeak ? 'right' : 'left';
          
          if (
            now - lastTriggerTimeRef.current >= minTimeBetweenTriggers &&
            lastTriggerSideRef.current !== currentSide
          ) {
            if (audioEngineRef.current) {
              audioEngineRef.current.playContactSound(!isRightPeak);
              lastTriggerTimeRef.current = now;
              lastTriggerSideRef.current = currentSide;
            }
          }
        } else if (Math.abs(sineValue) < 0.5) {
          lastTriggerSideRef.current = null;
        }
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(x, window.innerHeight / 2, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode ? '#3b82f6' : '#1d4ed8';
        ctx.fill();
        ctx.closePath();
        
        animationIdRef.current = requestAnimationFrame(animate);
      };
      
      animationIdRef.current = requestAnimationFrame(animate);
      setAnimationFrameId(animationIdRef.current);
      
      if (audioEngineRef.current && !audioEngineRef.current.getIsPlaying()) {
        audioEngineRef.current.startPlayback();
      }
    } else {
      // Stop animation and clear canvas when paused
      if (animationIdRef.current) {
        console.log("Canceling animation frame:", animationIdRef.current);
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
        setAnimationFrameId(null);
        
        // Reset pan to center when animation stops
        setPanValue(0);
        
        // Stop constant tone
        if (audioEngineRef.current && audioEngineRef.current.getIsPlaying()) {
          audioEngineRef.current.stopAll();
        }
        
        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      } else {
        console.log("No animation frame to cancel");
      }
      
      // Draw static ball after stopping animation
      setTimeout(() => {
        drawVisualTarget();
      }, 50);
    }
    
    // Cleanup animation frame on component unmount
    return () => {
      if (animationIdRef.current) {
        console.log("Cleanup: canceling animation frame");
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
        
        // Stop constant tone
        if (audioEngineRef.current && audioEngineRef.current.getIsPlaying()) {
          audioEngineRef.current.stopAll();
        }
      }
    };
  }, [isPlaying, isDarkMode, bpm, panWidthPercent]); // Add bpm and panWidthPercent to dependencies
  
  // Handle menu open/close with sound effects
  const toggleMenu = () => {
    if (!isMenuOpen) {
      menuOpenSoundRef.current?.play();
    } else {
      menuCloseSoundRef.current?.play();
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (isMenuOpen) {
          menuCloseSoundRef.current?.play();
          setIsMenuOpen(false);
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);
  
  // Select folder path (this would normally open a native file picker)
  const selectMusicFolder = () => {
    // In a real app, this would show a native folder picker dialog
    // and store the selected path
    const mockPath = prompt('Enter your music folder path:', folderPath || '/Users/Music');
    
    if (mockPath) {
      setFolderPath(mockPath);
      localStorage.setItem('folderPath', mockPath);
      
      // This would normally trigger a scan of the directory
      // In this mock implementation, we'll just add a sample file
      if (!audioFiles.some(file => file.id === '2')) {
        const newFile = {
          id: '2',
          name: 'Sample Song.mp3',
          lastUsed: new Date().toLocaleString(),
          path: `${mockPath}/Sample Song.mp3`
        };
        
        setAudioFiles(prev => [...prev, newFile]);
      }
    }
  };
  
  // Handle audio file selection 
  const selectAudioFile = (file: AudioFile) => {
    setSelectedAudio(file);
    
    // Update lastUsed date
    const updatedFiles = audioFiles.map(f => {
      if (f.id === file.id) {
        return { ...f, lastUsed: new Date().toLocaleString() };
      }
      return f;
    });
    
    setAudioFiles(updatedFiles);
    
    // If in development mode using our default file, use the direct path
    if (process.env.NODE_ENV === 'development' && file.name === 'Sine Wave 440Hz') {
      // To ensure audio reloads when selected repeatedly
      if (audioPlayerRef.current) {
        console.log('Selecting Sine Wave 440Hz for playback');
        audioPlayerRef.current.pause();
        audioPlayerRef.current.onloadstart = () => console.log('Audio loading started');
        audioPlayerRef.current.onloadeddata = () => console.log('Audio data loaded');
        audioPlayerRef.current.oncanplay = () => console.log('Audio can play');
        audioPlayerRef.current.onerror = (e) => {
          const error = audioPlayerRef.current?.error;
          console.error('Audio loading error:', {
            code: error?.code,
            message: error?.message,
            details: error
          });
        };
        
        // Create and append a new source element to guarantee reload
        const sourceElement = document.createElement('source');
        sourceElement.src = '/audio/sine-440hz.mp3';
        sourceElement.type = 'audio/mpeg';
        
        // Clear existing source elements
        while (audioPlayerRef.current.firstChild) {
          audioPlayerRef.current.removeChild(audioPlayerRef.current.firstChild);
        }
        
        // Add the new source element
        audioPlayerRef.current.appendChild(sourceElement);
        audioPlayerRef.current.load();
      }
      return;
    }
    
    // Play the audio file
    if (audioPlayerRef.current) {
      // For all files, use the placeholder if not in development with default file
      const sourceElement = document.createElement('source');
      sourceElement.src = '/sounds/menu-open.mp3';
      sourceElement.type = 'audio/mpeg';
      
      // Clear existing source elements
      while (audioPlayerRef.current.firstChild) {
        audioPlayerRef.current.removeChild(audioPlayerRef.current.firstChild);
      }
      
      // Add the new source element
      audioPlayerRef.current.appendChild(sourceElement);
      
      console.log(`Playing audio: ${sourceElement.src}`);
      audioPlayerRef.current.load();
      audioPlayerRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('Playback started successfully');
        })
        .catch(error => {
          console.error("Error playing audio:", error);
          // Try loading without autoplay
          if (audioPlayerRef.current) {
            audioPlayerRef.current.load();
          }
        });
    }
  };
  
  // Animation control functions
  const startAnimation = useCallback(() => {
    if (animationFrameId) return;
    
    const animate = () => {
      if (!canvasRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Update pan value
      const newPanValue = Math.sin(Date.now() / 1000) * panWidthPercent / 100;
      setPanValue(newPanValue);
      
      // Draw target
      drawVisualTarget();
      
      // Request next frame
      const frameId = requestAnimationFrame(animate);
      setAnimationFrameId(frameId);
    };
    
    animate();
  }, [panWidthPercent]);

  const stopAnimation = useCallback(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      setAnimationFrameId(null);
    }
  }, [animationFrameId]);

  // Handle timer countdown
  useEffect(() => {
    if (isPlaying && timeRemaining === null) {
      // Start new session
      setTimeRemaining(sessionDuration);
    }

    if (timeRemaining !== null && timeRemaining > 0 && isPlaying) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 0) {
            return prev - 1;
          }
          return null;
        });
      }, 1000);
    }

    if (timeRemaining === 0) {
      // Session complete
      setIsPlaying(false);
      setTimeRemaining(null);
      if (audioEngineRef.current) {
        audioEngineRef.current.stopAll();
      }
      // Play completion sound
      if (playStatusSoundRef.current) {
        playStatusSoundRef.current.play();
      }
      setA11yMessage('Session complete');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, isPlaying, sessionDuration]);

  // Update togglePlayPause to handle timer
  const togglePlayPause = async () => {
    try {
      if (!isPlaying) {
        if (audioEngineRef.current) {
          const success = await audioEngineRef.current.startPlayback();
          if (!success) {
            console.warn('Failed to start audio playback, but continuing with visual target');
          }
        }
        setIsPlaying(true);
        setTimeRemaining(sessionDuration); // Start the timer
        setA11yMessage('Session started. Visual target moving.');
        startAnimation();
      } else {
        if (audioEngineRef.current) {
          audioEngineRef.current.stopAll();
        }
        setIsPlaying(false);
        setTimeRemaining(null); // Reset the timer
        setA11yMessage('Session paused. Visual target stopped.');
        stopAnimation();
      }
    } catch (error) {
      console.warn('Error in audio playback:', error);
      setIsPlaying(false);
      setTimeRemaining(null);
    }
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio file deletion
  const deleteAudioFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the file when clicking delete
    
    // Stop playback if the deleted file is currently playing
    if (selectedAudio?.id === id && isPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
    
    // Remove the file from state (but not from file system)
    setAudioFiles(audioFiles.filter(file => file.id !== id));
    
    // Clear selected audio if it's the one being deleted
    if (selectedAudio?.id === id) {
      setSelectedAudio(null);
      localStorage.removeItem('selectedAudio');
    }
  };
  
  // Generate an MD5 hash (mock implementation)
  const generateMD5Hash = (input: string) => {
    // This is a simplified mock implementation
    // In a real app, you'd use a proper MD5 implementation
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  };

  // Toggle between dark and light mode
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      // Play a deeper tone for dark mode - use the menu close sound
      if (menuCloseSoundRef.current) {
        menuCloseSoundRef.current.play().catch(e => console.error('Error playing sound:', e));
      }
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      // Play a higher tone for light mode - use the menu open sound
      if (menuOpenSoundRef.current) {
        menuOpenSoundRef.current.play().catch(e => console.error('Error playing sound:', e));
      }
    }
    
    // Announce for screen readers
    setA11yMessage(`${newDarkMode ? 'Dark' : 'Light'} mode activated`);
  };

  // Function to navigate to a panner with an audio cue for accessibility
  const navigateToPanner = (path: string) => {
    // Play success tone
    if (audioContextRef.current && audioContextRef.current.context) {
      const ctx = audioContextRef.current.context;
      const successOsc = ctx.createOscillator();
      const successGain = ctx.createGain();
        
      // Success sound - rising pitch
      successOsc.frequency.value = 440;
      successOsc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
      successGain.gain.value = 0.1;
        
      // Quick fade out
      successGain.gain.setValueAtTime(0.1, ctx.currentTime);
      successGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
      // Connect and play
      successOsc.connect(successGain);
      successGain.connect(ctx.destination);
        
      successOsc.start();
      successOsc.stop(ctx.currentTime + 0.3);
        
      // Navigate after a slight delay to hear the tone
      setTimeout(() => {
        window.location.href = path;
      }, 350);
    } else {
      // Fallback if audio context is not available
      window.location.href = path;
    }
  };

  const handlePanChange = (event: Event, newValue: number | number[]) => {
    const value = typeof newValue === 'number' ? newValue : newValue[0];
    setPanValue(value);
    if (audioEngineRef.current) {
      audioEngineRef.current.setPan(value);
    }
  };

  // Initialize audio player
  useEffect(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.preload = 'auto';
    }
  }, []);
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any object URLs we created
      audioFiles.forEach(file => {
        if (file.path?.startsWith('blob:')) {
          URL.revokeObjectURL(file.path);
        }
      });
    };
  }, [audioFiles]);

  // Function to handle audio loading errors
  const handleAudioError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    
    // Show error message for screen readers
    setA11yMessage(`Error: ${errorMessage}`);
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  };
  
  // Update file upload handler
  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create object URL for the audio
      const objectUrl = URL.createObjectURL(file);
      
      // Create new audio file entry
      const newAudioFile: AudioFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        lastUsed: new Date().toLocaleString(),
        path: objectUrl,
        objectUrl: objectUrl
      };
      
      // Set up audio player and wait for it to load
      if (audioPlayerRef.current) {
        return new Promise<void>((resolve, reject) => {
          if (!audioPlayerRef.current) return reject('Audio player not initialized');
          
          audioPlayerRef.current.onloadeddata = () => {
            console.log('Audio data loaded');
            resolve();
          };
          
          audioPlayerRef.current.onerror = () => {
            const error = audioPlayerRef.current?.error;
            reject(error?.message || 'Failed to load audio file');
          };
          
          audioPlayerRef.current.src = objectUrl;
          audioPlayerRef.current.load();
        })
        .then(() => {
          // Update audio files list
          setAudioFiles(prev => [...prev, newAudioFile]);
          setSelectedAudio(newAudioFile);
          
          // Update audio track config
          setAudioTrackConfig(prev => ({
            ...prev,
            filePath: objectUrl
          }));
          
          // Show success message for screen readers
          setA11yMessage(`File ${file.name} uploaded successfully`);
          setIsLoading(false);
        })
        .catch(error => {
          handleAudioError(error.toString());
          URL.revokeObjectURL(objectUrl);
        });
      }
    } catch (error) {
      handleAudioError(error instanceof Error ? error.message : 'Failed to process audio file');
    }
  };
  
  // Update the file input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    handleFileUpload(file);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-4 relative`}>
      {/* Audio elements for sound effects and playback */}
      <audio ref={menuOpenSoundRef} src="/sounds/menu-open.mp3" preload="auto" />
      <audio ref={menuCloseSoundRef} src="/sounds/menu-close.mp3" preload="auto" />
      <audio ref={playStatusSoundRef} src="/sounds/status-change.mp3" preload="auto" />
      <audio 
        ref={audioPlayerRef}
        loop={true} 
        onPlay={() => {
          console.log("Audio play event triggered");
          setIsPlaying(true);
        }}
        onPause={() => {
          console.log("Audio pause event triggered");
          setIsPlaying(false);
        }}
        onEnded={() => {
          console.log("Audio ended event triggered");
          // Don't stop the animation if the audio is set to loop
          if (audioPlayerRef.current && !audioPlayerRef.current.loop) {
          setIsPlaying(false);
          setA11yMessage('Audio ended. Visual target stopped.');
          }
        }}
        onError={(e) => {
          console.error("Audio error:", audioPlayerRef.current?.error);
          // Try to recover from error by reloading the audio
          if (audioPlayerRef.current && selectedAudio) {
            console.log("Attempting to recover from audio error");
            audioPlayerRef.current.load();
            audioPlayerRef.current.play().catch(err => {
              console.error("Recovery failed:", err);
          setIsPlaying(false);
          setA11yMessage('Error playing audio. Visual target stopped.');
            });
          } else {
            setIsPlaying(false);
            setA11yMessage('Error playing audio. Visual target stopped.');
          }
        }}
      >
        {/* Provide explicit source with type for better browser compatibility */}
        <source src="/audio/sine-440hz.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      
      {/* Hamburger Menu Button */}
      <button 
        className={`absolute top-4 right-4 ${isDarkMode ? 'text-white' : 'text-gray-800'} z-20`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Sliding Menu */}
      <div 
        ref={menuRef}
        className={`fixed top-0 right-0 h-full bg-gray-900 dark:bg-gray-900 bg-gray-100 w-80 p-6 shadow-lg z-10 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}
        aria-hidden={!isMenuOpen}
      >
        <h2 className="text-2xl font-bold mb-6 text-white dark:text-white text-gray-800">EMDR Settings</h2>
        
        {/* Display Mode Toggle */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Display Mode</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 flex items-center justify-between">
            <span className={`font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-900'} flex items-center`}>
              {/* Sun icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              Light
            </span>
            
            {/* Toggle Switch */}
            <button 
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={isDarkMode}
              aria-label="Toggle dark mode"
            >
              <span 
                className={`${isDarkMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
            
            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-500'} flex items-center`}>
              {/* Moon icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dark
            </span>
          </div>
        </div>
        
        {/* Audio Mode Selection */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Audio Mode</h3>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Audio Mode</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setAudioMode('click');
                  audioEngineRef.current?.setAudioMode('click');
                }}
                className={`px-4 py-2 rounded ${
                  audioMode === 'click'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Click Mode
              </button>
              <button
                onClick={() => {
                  setAudioMode('audioTrack');
                  audioEngineRef.current?.setAudioMode('audioTrack');
                }}
                className={`px-4 py-2 rounded ${
                  audioMode === 'audioTrack'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Audio Track Mode
              </button>
            </div>
          </div>
        </div>
        
        {/* Common Settings - shown for all modes */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Session Settings</h3>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Panning Parameters</h4>
            
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Frequency: {bpm} BPM
                </label>
              </div>
              <input 
                type="range" 
                min="6" 
                max="120" 
                step="1"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                aria-label="Panning frequency in BPM"
              />
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Speed of panning in beats per minute (lower = slower)
              </p>
            </div>
            
            {/* BPM presets */}
            <div className="flex flex-wrap gap-2 mt-3 mb-4">
              {[6, 12, 24, 40, 60, 90].map(presetBpm => (
                <button
                  key={presetBpm}
                  onClick={() => setBpm(presetBpm)}
                  className={`px-2 py-1 text-xs ${
                    bpm === presetBpm
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } rounded`}
                >
                  {presetBpm} BPM
                </button>
              ))}
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Pan Width: {panWidthPercent}%
                </label>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={panWidthPercent}
                onChange={(e) => setPanWidthPercent(Number(e.target.value))}
                className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                aria-label="Pan width percentage"
              />
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Percentage of complete left-right panning
              </p>
            </div>
          </div>
        </div>
        
        {/* Audio Track Settings */}
        {audioMode === 'audioTrack' && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Audio Track</h3>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
              <div className="text-center p-6 border-2 border-dashed rounded-lg border-gray-400 dark:border-gray-600">
                <h4 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upload Your Audio</h4>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Upload an MP3 file to create a bilateral stimulation track
                </p>
                
                {/* Error message */}
                {error && (
                  <div className={`mb-4 p-3 rounded ${isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`} role="alert">
                    {error}
                  </div>
                )}
                
                <input 
                  type="file" 
                  accept="audio/*"
                  className={`hidden`}
                  id="audio-upload"
                  onChange={handleFileInputChange}
                  disabled={isLoading}
                  aria-label="Upload audio file"
                />
                <label 
                  htmlFor="audio-upload"
                  className={`inline-block px-6 py-3 ${
                    isLoading
                      ? isDarkMode ? 'bg-gray-700 cursor-wait' : 'bg-gray-200 cursor-wait'
                      : isDarkMode 
                        ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer' 
                        : 'bg-blue-100 hover:bg-blue-200 cursor-pointer'
                  } text-${isDarkMode ? 'white' : 'blue-800'} rounded-lg transition-colors duration-200`}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      document.getElementById('audio-upload')?.click();
                    }
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    'Choose File'
                  )}
                </label>
                <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedAudio ? selectedAudio.name : 'No file chosen'}
                </p>
              </div>
              
              {/* Song Library Button */}
              <button 
                className={`w-full mt-4 ${
                  isDarkMode 
                    ? 'bg-blue-900 hover:bg-blue-800 text-blue-200' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                } py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200`}
                onClick={() => setShowLibrary(!showLibrary)}
                aria-expanded={showLibrary}
                aria-label="Toggle song library"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Your Song Library ({audioFiles.length})
              </button>
              
              {/* Song Library Panel */}
              {showLibrary && (
                <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h5 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Songs
                  </h5>
                  {audioFiles.length === 0 ? (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No songs in library yet
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {audioFiles
                        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
                        .map(file => (
                          <li 
                            key={file.id}
                            className={`flex items-center justify-between p-2 rounded ${
                              selectedAudio?.id === file.id
                                ? isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                                : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                            } cursor-pointer`}
                            onClick={() => selectAudioFile(file)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                selectAudioFile(file);
                              }
                            }}
                          >
                            <div>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {file.name}
                              </div>
                              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Last used: {file.lastUsed}
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteAudioFile(file.id, e)}
                              className={`p-1 rounded-full ${
                                isDarkMode 
                                  ? 'hover:bg-red-900 text-red-400' 
                                  : 'hover:bg-red-100 text-red-600'
                              }`}
                              aria-label={`Delete ${file.name}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              </svg>
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                  
                  {/* Volume Control */}
                  <div className="mt-4">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Volume
                    </label>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                      </svg>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        value={audioTrackConfig.volume}
                        onChange={(e) => {
                          const newVolume = parseFloat(e.target.value);
                          setAudioTrackConfig(prev => ({
                            ...prev,
                            volume: newVolume
                          }));
                          
                          // Update audio player volume
                          if (audioPlayerRef.current) {
                            audioPlayerRef.current.volume = newVolume;
                          }
                        }}
                        className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                        aria-label="Audio volume"
                      />
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {Math.round(audioTrackConfig.volume * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Loop Toggle */}
                  <div className="mt-4 flex items-center justify-between">
                    <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Loop Audio
                    </label>
                    <button
                      role="switch"
                      aria-checked={audioTrackConfig.loop}
                      onClick={() => {
                        setAudioTrackConfig(prev => ({
                          ...prev,
                          loop: !prev.loop
                        }));
                        
                        // Update audio player loop setting
                        if (audioPlayerRef.current) {
                          audioPlayerRef.current.loop = !audioTrackConfig.loop;
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        audioTrackConfig.loop
                          ? isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                          : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          audioTrackConfig.loop ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session Timer Settings */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Session Timer</h3>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Duration: {sessionDuration} seconds
                </label>
              </div>
              <input 
                type="range" 
                min="10" 
                max="120" 
                step="5"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
                className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                aria-label="Session duration in seconds"
              />
            </div>
            
            {/* Duration presets */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[10, 30, 60, 90, 120].map(duration => (
                <button
                  key={duration}
                  onClick={() => setSessionDuration(duration)}
                  className={`px-2 py-1 text-xs ${
                    sessionDuration === duration
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } rounded`}
                >
                  {duration}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Canvas */}
      <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>EMDR Therapy</h1>
      
      {/* Full viewport canvas for visual target */}
      <canvas 
        ref={canvasRef}
        className={`fixed top-0 left-0 w-screen h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} z-0`}
        aria-label="EMDR visual target canvas"
        role="img"
        aria-live="polite"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Accessibility announcement for screen readers */}
      <div className="sr-only" aria-live="polite">
        {a11yMessage}
      </div>
      
      {/* Minimalist Audio Player Controls */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} bg-opacity-80 p-4 rounded-full shadow-lg z-10`}>
        {audioMode === 'click' ? (
          <button
            onClick={togglePlayPause}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-4 flex items-center justify-center"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>
        ) : selectedAudio ? (
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayPause}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-4 flex items-center justify-center"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>
            
            <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-center`}>
              <div className="font-medium">{selectedAudio.name}</div>
            </div>
          </div>
        ) : (
          <button 
            onClick={toggleMenu}
            className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
            </svg>
            Select Audio
          </button>
        )}
      </div>

      {/* Session Timer Display */}
      {timeRemaining !== null && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'
        } px-6 py-3 rounded-full text-2xl font-bold z-20`}>
          {formatTime(timeRemaining)}
        </div>
      )}
    </div>
  );
} 