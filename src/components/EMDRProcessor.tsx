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
import { SettingsDrawer } from './SettingsDrawer';
import { EMDRSettings } from '../types/settings';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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
  const [sessionDuration, setSessionDuration] = useState(60); // Default 60 seconds
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState<EMDRSettings>({
    speed: 60,
    sessionDuration: 30,
    audioMode: false,
    volume: 0.5,
    targetSize: 5,
    targetColor: '#ffffff',
    backgroundColor: '#1a1a1a',
  });
  
  // Add reduced motion support
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Add debounce refs
  const volumeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const modeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add error display timeout
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
          console.log('EMDRProcessor: Creating new AudioEngine instance');
          const audioEngine = new AudioEngine();
          console.log('EMDRProcessor: Initializing AudioEngine with audio element');
          const success = await audioEngine.initialize(audioPlayerRef.current);
          
          if (success) {
            console.log('EMDRProcessor: AudioEngine initialized successfully');
            
            // Set initial configurations
            audioEngine.updateContactSoundConfig(contactSoundConfig);
            audioEngine.updateAudioTrackConfig(audioTrackConfig);
            
            // Set initial audio mode
            audioEngine.setAudioMode(audioMode);
            
            // Store in ref
            audioEngineRef.current = audioEngine;
            
            // Set initial volume
            audioEngine.setVolume(audioTrackConfig.volume);
          } else {
            console.error('EMDRProcessor: Failed to initialize AudioEngine');
            setError('Failed to initialize audio');
            setErrorMessage('Failed to initialize audio');
            setA11yMessage('Failed to initialize audio');
          }
        } catch (error) {
          console.error('EMDRProcessor: Error initializing AudioEngine:', error);
          setError('Failed to initialize audio');
          setErrorMessage('Failed to initialize audio');
          setA11yMessage('Failed to initialize audio');
        }
      } else {
        console.warn('EMDRProcessor: No audio element available for initialization');
        setError('No audio element available');
        setErrorMessage('No audio element available');
        setA11yMessage('No audio element available');
      }
    })();
    
    // Clean up on unmount
    return () => {
      if (audioEngineRef.current) {
        console.log('EMDRProcessor: Cleaning up AudioEngine');
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
      try {
        // Stop any current playback
        if (isPlaying) {
          audioEngineRef.current.stopAll();
          setIsPlaying(false);
        }
        
        // Set new mode
        audioEngineRef.current.setAudioMode(audioMode);
        
        // Update accessibility message
        setA11yMessage(`Audio mode changed to ${audioMode === 'audioTrack' ? 'audio track' : 'click'}`);
      } catch (error) {
        console.error('EMDRProcessor: Error switching audio mode:', error);
        setError('Failed to switch audio mode');
        setErrorMessage('Failed to switch audio mode');
        setA11yMessage('Failed to switch audio mode');
      }
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
          path: '/audio/sine-440hz.mp3'
        }
      ];
      setAudioFiles(defaultFiles);
      
      // We'll also select it by default in dev mode
      setSelectedAudio(defaultFiles[0]);
      
      // Set up the audio source but don't autoplay
      if (audioPlayerRef.current) {
        console.log('EMDRProcessor: Setting up audio element');
        
        // Add event listeners to track loading process
        audioPlayerRef.current.onloadstart = () => console.log('EMDRProcessor: Audio loading started');
        audioPlayerRef.current.onloadeddata = () => console.log('EMDRProcessor: Audio data loaded');
        audioPlayerRef.current.oncanplay = () => console.log('EMDRProcessor: Audio can play');
        audioPlayerRef.current.onerror = (e) => {
          const error = audioPlayerRef.current?.error;
          console.error('EMDRProcessor: Audio loading error:', {
            code: error?.code,
            message: error?.message,
            details: error
          });
        };
        
        // Use absolute path to the file in the public directory
        console.log('Setting audio source to sine-440hz.mp3');
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
    
    // Draw static ball in the center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const radius = settings.targetSize / 2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = settings.targetColor;
    ctx.fill();
    ctx.closePath();
  }, [isPlaying, settings.targetColor, settings.targetSize]);
  
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
        try {
          audioContextRef.current.context.close().catch(console.error);
        } catch (error) {
          console.error('Error closing audio context:', error);
        }
      }
    };
  }, []);
  
  // Connect audio element to audio context when it's available
  useEffect(() => {
    if (!audioPlayerRef.current || !audioContextRef.current.context) {
      return;
    }
    
    // Skip audio connection if we're using the AudioEngine
    if (audioEngineRef.current) {
      console.log('EMDRProcessor: Using AudioEngine for audio connection');
      return;
    }

    const connectAudioToContext = async () => {
      try {
        const audioElement = audioPlayerRef.current;
        const audioContext = audioContextRef.current.context;
        
        if (!audioElement || !audioContext) {
          throw new Error('Audio element or context not available');
        }

        // Check if we already have a source node
        if (audioContextRef.current.source) {
          console.log('EMDRProcessor: Audio source already connected');
          return;
        }

        // Create and connect the source node
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(audioContextRef.current.gainNode!);
        audioContextRef.current.source = source;
        console.log('EMDRProcessor: Audio source connected to context');
      } catch (error) {
        if (error instanceof Error && error.name === 'InvalidStateError') {
          console.warn('EMDRProcessor: Audio element already connected to another context');
        } else {
          console.error('EMDRProcessor: Failed to connect audio to context:', error);
        }
        // Try to recover by reloading the audio
        if (audioPlayerRef.current) {
          audioPlayerRef.current.load();
        }
      }
    };

    connectAudioToContext();

    // Cleanup function
    return () => {
      if (audioContextRef.current.source) {
        try {
          audioContextRef.current.source.disconnect();
          audioContextRef.current.source = null;
        } catch (error) {
          console.error('EMDRProcessor: Error disconnecting audio source:', error);
        }
      }
    };
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
  
  // Handle setting changes with debouncing
  const handleSettingChange = async (settingName: string, value: number | string | boolean) => {
    if (!audioEngineRef.current) return;

    try {
      switch (settingName) {
        case 'audioMode':
          const newMode = value ? 'audioTrack' : 'click';
          await audioEngineRef.current.setAudioMode(newMode);
          setAudioMode(newMode);
          setA11yMessage(`Audio mode changed to ${newMode === 'audioTrack' ? 'audio track' : 'click'}`);
          break;
        case 'volume':
          const volumeValue = typeof value === 'number' ? value : parseFloat(value as string);
          if (volumeDebounceRef.current) {
            clearTimeout(volumeDebounceRef.current);
          }
          volumeDebounceRef.current = setTimeout(() => {
            audioEngineRef.current?.setVolume(volumeValue);
            setA11yMessage(`Volume changed to ${Math.round(volumeValue * 100)}%`);
          }, 100);
          break;
        // ... existing code ...
      }
    } catch (error) {
      console.error('EMDRProcessor: Error changing setting:', error);
      if (settingName === 'audioMode') {
        setError('Failed to switch audio mode');
        setErrorMessage('Failed to switch audio mode');
        setA11yMessage('Failed to switch audio mode');
      }
    }
  };

  // Toggle menu with focus management
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      // When opening menu, focus will be managed by SettingsDrawer
      setA11yMessage('Settings menu opened');
    } else {
      // When closing menu, return focus to the open settings button
      setA11yMessage('Settings menu closed');
      const openSettingsButton = document.querySelector('[aria-label="Open settings"]') as HTMLButtonElement;
      if (openSettingsButton) {
        openSettingsButton.focus();
      }
    }
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

  // Handle theme toggle
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
      
      // Set up error handling
      audioPlayerRef.current.onerror = (e) => {
        const error = audioPlayerRef.current?.error;
        console.error('EMDRProcessor: Audio loading error:', {
          code: error?.code,
          message: error?.message,
          details: error
        });
        setError(`Failed to load audio: ${error?.message || 'Unknown error'}`);
      };

      // Set up loading handlers
      audioPlayerRef.current.onloadstart = () => console.log('EMDRProcessor: Audio loading started');
      audioPlayerRef.current.onloadeddata = () => console.log('EMDRProcessor: Audio data loaded');
      audioPlayerRef.current.oncanplay = () => console.log('EMDRProcessor: Audio can play');
    }

    // Set initial audio source based on environment
    if (audioPlayerRef.current && !audioPlayerRef.current.src) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode detected, setting up audio file');
        audioPlayerRef.current.src = '/audio/sine-440hz.mp3';
        console.log('Setting audio source to sine-440hz.mp3');
      } else {
        console.log('Production mode detected');
        audioPlayerRef.current.src = '/sounds/menu-open.mp3';
      }
      audioPlayerRef.current.load();
    }

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
        audioPlayerRef.current.load();
      }
    };
  }, []);
  
  // Update audio source when selected audio changes
  useEffect(() => {
    if (!audioPlayerRef.current || !selectedAudio) return;

    console.log('EMDRProcessor: Updating audio source to:', selectedAudio.path);
    
    // Stop current playback
    audioPlayerRef.current.pause();
    
    // Clear existing source elements
    while (audioPlayerRef.current.firstChild) {
      audioPlayerRef.current.removeChild(audioPlayerRef.current.firstChild);
    }
    
    // Create and append new source element
    const sourceElement = document.createElement('source');
    sourceElement.src = selectedAudio.path || (process.env.NODE_ENV === 'development' ? '/audio/sine-440hz.mp3' : '/sounds/menu-open.mp3');
    sourceElement.type = 'audio/mpeg';
    audioPlayerRef.current.appendChild(sourceElement);
    
    // Load the new audio
    audioPlayerRef.current.load();
    
    // Auto-play only in development mode
    if (isPlaying && process.env.NODE_ENV === 'development') {
      audioPlayerRef.current.play().catch(error => {
        console.error('EMDRProcessor: Error playing audio:', error);
        setError(`Failed to play audio: ${error.message}`);
      });
    }
  }, [selectedAudio, isPlaying]);

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

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
      }, 5000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  // Update error handling
  const playGuideTone = (type: 'success' | 'error' | 'warning') => {
    const audio = new Audio();
    switch (type) {
      case 'success':
        audio.src = '/sounds/success.mp3';
        break;
      case 'error':
        audio.src = '/sounds/error.mp3';
        break;
      case 'warning':
        audio.src = '/sounds/warning.mp3';
        break;
    }
    audio.play().catch(console.error);
  };

  const handleAudioError = (error: Error) => {
    setError(error.message);
    playGuideTone('error');
    setTimeout(() => setError(null), 5000);
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
            console.log('EMDRProcessor: Audio data loaded');
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
          handleAudioError(error);
          URL.revokeObjectURL(objectUrl);
        });
      }
    } catch (error: unknown) {
      handleAudioError(error instanceof Error ? error : new Error(String(error)));
    }
  };
  
  // Update the file input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    handleFileUpload(file);
  };

  // Add reduced motion support
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) {
        setA11yMessage('Reduced motion mode activated');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update animation to respect reduced motion
  useEffect(() => {
    if (prefersReducedMotion && isPlaying) {
      // In reduced motion mode, just show a static target
      drawVisualTarget();
      return;
    }

    // Rest of the animation code...
  }, [isPlaying, prefersReducedMotion]);

  // Handle play/pause toggle
  const togglePlayPause = async () => {
    if (!audioEngineRef.current) {
      setError('Audio engine not initialized');
      setErrorMessage('Failed to start playback');
      setA11yMessage('Failed to start playback');
      return;
    }

    try {
      if (isPlaying) {
        audioEngineRef.current.stopAll();
        setIsPlaying(false);
        setA11yMessage('Playback stopped');
      } else {
        const success = await audioEngineRef.current.startPlayback();
        if (success) {
          setIsPlaying(true);
          setA11yMessage('Playback started');
        } else {
          setError('Failed to start playback');
          setErrorMessage('Failed to start playback');
          setA11yMessage('Failed to start playback');
        }
      }
    } catch (error) {
      console.error('EMDRProcessor: Error toggling playback:', error);
      setError('Failed to control playback');
      setErrorMessage('Failed to start playback');
      setA11yMessage('Failed to start playback');
    }
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-4 relative`}
      role="region"
      aria-label="EMDR Visual Target"
    >
      {/* Audio elements for sound effects and playback */}
      <audio ref={menuOpenSoundRef} src="/sounds/menu-open.mp3" preload="auto" />
      <audio ref={menuCloseSoundRef} src="/sounds/menu-close.mp3" preload="auto" />
      <audio ref={playStatusSoundRef} src="/sounds/status-change.mp3" preload="auto" />
      <audio 
        ref={audioPlayerRef}
        loop={true} 
        preload="auto"
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
        onLoadStart={() => console.log("Audio load started")}
        onLoadedData={() => console.log("Audio data loaded")}
        onCanPlay={() => console.log("Audio can play")}
      >
        {/* Add multiple source formats for better browser compatibility */}
        <source src="/audio/sine-440hz.mp3" type="audio/mpeg" />
        <source src="/audio/sine-440hz.ogg" type="audio/ogg" />
        {/* Fallback to a basic sine wave if needed */}
        <source src="/audio/sine-220hz.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      
      {/* Settings Button */}
      <button 
        className={`absolute top-4 right-4 ${isDarkMode ? 'text-white' : 'text-gray-800'} z-50`}
        onClick={() => setIsMenuOpen(true)}
        aria-label="Open settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.608-.996.07-2.296-1.065-2.572z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isSessionActive={isPlaying}
        settings={settings}
        onSettingChange={handleSettingChange}
        onPresetSelect={() => {}} // We can implement preset handling later if needed
      />

      {/* Main Content with Canvas */}
      <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>EMDR Therapy</h1>
      
      {/* Full viewport canvas for visual target */}
      <canvas 
        ref={canvasRef}
        className={`fixed top-0 left-0 w-screen h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} z-10`}
        aria-label="EMDR Visual Target Canvas"
        role="img"
        aria-live="polite"
        style={{ 
          pointerEvents: 'none', 
          backgroundColor: settings.backgroundColor,
          zIndex: 10 
        }}
      />
      
      {/* Accessibility announcement for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {a11yMessage}
      </div>
      
      {/* Minimalist Audio Player Controls */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} bg-opacity-80 p-4 rounded-full shadow-lg z-10`}>
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
      </div>

      {/* Session Timer Display */}
      {timeRemaining !== null && (
        <div 
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'
          } px-6 py-3 rounded-full text-2xl font-bold z-20`}
          role="timer"
          aria-label="Session time remaining"
        >
          {formatTime(timeRemaining)}
        </div>
      )}

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`absolute top-4 left-4 ${isDarkMode ? 'text-white' : 'text-gray-800'} z-50`}
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Error message display */}
      {error && (
        <div 
          role="alert"
          aria-live="assertive"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
        >
          {errorMessage || error}
        </div>
      )}
    </div>
  );
} 