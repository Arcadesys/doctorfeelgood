'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  AudioEngine, 
  AudioMode,
  ContactSoundConfig,
  AudioTrackConfig
} from '../lib/audioEngine';
import UnifiedSettings from './UnifiedSettings';
import VisualTarget from './VisualTarget';
import EMDRTarget from './EMDRTarget';
import { getAudioContext, getMediaElementSource, resumeAudioContext } from '../utils/audioUtils';
import { decimalToPercentage, percentageToDecimal, clampDecimalIntensity } from '@/utils/intensityUtils';
import { formatTime } from '@/utils/timeUtils';
import { audioContextManager } from '@/utils/audioContextManager';
import { 
  AudioFile, 
  AudioMetadata
} from '@/types/audio';

// Audio context interfaces
interface AudioContextState {
  context: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  panner: StereoPannerNode | null;
  gainNode: GainNode | null;
}

interface EMDRTrackConfig {
  bpm: number;
  sessionDuration: number;
  oscillatorType: OscillatorType;
  volume: number;
}

// Remove empty interface and unused WebkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Update the VisualTarget component props
interface VisualTargetProps {
  isActive: boolean;
  visualIntensity: number;
  targetShape: 'square' | 'triangle' | 'circle' | 'diamond' | 'star';
  targetColor: string;
  targetHasGlow: boolean;
}

export default function EMDRProcessor() {
  // State variables
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visualIntensity, setVisualIntensity] = useState(clampDecimalIntensity(0.5));
  const [targetShape, setTargetShape] = useState<'circle' | 'square' | 'triangle' | 'diamond' | 'star'>('circle');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [audioMode, setAudioMode] = useState<'click' | 'track'>('click');
  const [bpm, setBpm] = useState(60);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [visualGuideEnabled, setVisualGuideEnabled] = useState(true);
  const [movementGuideEnabled, setMovementGuideEnabled] = useState(true);
  const [a11yMessage, setA11yMessage] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  const [panValue, setPanValue] = useState(0);
  const [targetHasGlow, setTargetHasGlow] = useState(true); // Make this toggleable
  const [targetSize] = useState(50); // Fixed size
  const [targetColor, setTargetColor] = useState('#ffffff'); // Add targetColor state

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasSizedRef = useRef<boolean>(false);
  const animationIdRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOpenSoundRef = useRef<HTMLAudioElement>(null);
  const menuCloseSoundRef = useRef<HTMLAudioElement>(null);
  const playStatusSoundRef = useRef<HTMLAudioElement>(null);

  // Convert BPM to milliseconds for animation speed
  const speed = Math.round(60000 / bpm); // 60000ms = 1 minute
  
  // Audio track config with simplified options
  const [audioTrackConfig, setAudioTrackConfig] = useState<EMDRTrackConfig>({
    bpm: 60,
    sessionDuration: 60, // 1 minute default
    oscillatorType: 'sine',
    volume: 0.7
  });

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  
  // Audio engine settings
  const [contactSoundConfig] = useState<ContactSoundConfig>({
    leftSamplePath: '/sounds/click-left.mp3',
    rightSamplePath: '/sounds/click-right.mp3',
    volume: 0.5,
    enabled: true
  });
  
  // Audio context state
  const audioContextRef = useRef<AudioContextState>({
    context: null,
    source: null,
    panner: null,
    gainNode: null
  });
  
  // Draw visual target helper function
  const drawVisualTarget = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate center position
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Apply visual intensity to color
    const color = targetColor;
    ctx.fillStyle = color;
    
    // Set up shadow/glow if enabled
    if (targetHasGlow) {
      ctx.shadowBlur = targetSize * 0.5;
      ctx.shadowColor = color;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowBlur = 0;
    }
    
    // Draw shape based on targetShape
    if (targetShape === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, targetSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Square
      const halfSize = targetSize / 2;
      ctx.fillRect(centerX - halfSize, centerY - halfSize, targetSize, targetSize);
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }, [targetSize, targetColor, targetShape, targetHasGlow]);

  // Initialize canvas when component mounts
  useEffect(() => {
    if (canvasRef.current && !canvasSizedRef.current) {
      console.log("Initial canvas sizing");
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      canvasSizedRef.current = true;
      drawVisualTarget();
    }
  }, [drawVisualTarget]);
  
  // Initialize Audio Engine
  useEffect(() => {
    let mounted = true;
    let initializationAttempted = false;
    let initializationInProgress = false;

    const init = async () => {
      if (initializationAttempted || initializationInProgress) return;
      initializationInProgress = true;

      if (!audioPlayerRef.current) {
        console.error('Audio player element not found');
        setAudioError('Audio player element not found');
        initializationInProgress = false;
        return;
      }

      try {
        // Create and initialize the audio engine
        const audioEngine = new AudioEngine();
        console.log('Created new AudioEngine instance');

        // Initialize with our audio element
        await audioEngine.initialize(audioPlayerRef.current);
        if (!mounted) return;

        console.log('AudioEngine initialized successfully');
        
        // Set initial configurations
        audioEngine.updateContactSoundConfig(contactSoundConfig);
        audioEngine.setAudioMode(audioMode);
        
        // Store in ref
        audioEngineRef.current = audioEngine;
        
        // Set initial audio source and ensure it's loaded
        if (audioMode === 'track' && selectedAudio?.path && audioPlayerRef.current) {
          // Reset the audio element
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0;
          
          // Set new source
          audioPlayerRef.current.src = selectedAudio.path;
          
          // Wait for the audio to be loaded
          await new Promise<void>((resolve, reject) => {
            const handleCanPlay = () => {
              console.log('Audio can play');
              audioPlayerRef.current?.removeEventListener('canplay', handleCanPlay);
              audioPlayerRef.current?.removeEventListener('error', handleError);
              resolve();
            };
            
            const handleError = (e: Event) => {
              const error = audioPlayerRef.current?.error;
              console.error('Audio loading error:', {
                code: error?.code,
                message: error?.message,
                networkState: audioPlayerRef.current?.networkState,
                readyState: audioPlayerRef.current?.readyState
              });
              audioPlayerRef.current?.removeEventListener('canplay', handleCanPlay);
              audioPlayerRef.current?.removeEventListener('error', handleError);
              reject(new Error(`Failed to load audio: ${error?.message || 'Unknown error'}`));
            };

            audioPlayerRef.current?.addEventListener('canplay', handleCanPlay);
            audioPlayerRef.current?.addEventListener('error', handleError);
            
            // Start loading
            audioPlayerRef.current?.load();
          });
          
          console.log('Audio track loaded successfully:', selectedAudio.path);
        }

        // Clear any previous errors
        setAudioError(null);
      } catch (error) {
        console.error('Error initializing audio:', error);
        setAudioError(error instanceof Error ? error.message : 'Failed to initialize audio');
      } finally {
        initializationInProgress = false;
        initializationAttempted = true;
      }
    };

    init();

    return () => {
      mounted = false;
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
      setA11yMessage(`Audio mode changed to ${audioMode === 'track' ? 'audio track' : 'click'}`);
    }
  }, [audioMode, isPlaying, setA11yMessage]);
  
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
        audioPlayerRef.current.onerror = () => {
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
  
  // Initialize audio context on first user interaction
  const initializeAudio = useCallback(async () => {
    if (!audioPlayerRef.current) {
      console.error('Audio player element not found');
      return;
    }

    try {
      // Get the singleton audio context
      const audioContext = getAudioContext();
      
      // Get or create the MediaElementSource
      const mediaElementSource = getMediaElementSource(audioPlayerRef.current);
      
      // Create gain node
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      
      // Connect the media element source to the gain node
      mediaElementSource.connect(gainNode);
      
      // Resume audio context
      await resumeAudioContext();
      
      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeAudio();
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };
    init();
  }, [initializeAudio]);

  // Handle first user interaction
  const handleFirstInteraction = useCallback(() => {
    initializeAudio();
    // Remove the event listener after first interaction
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
  }, [initializeAudio]);

  // Add event listeners for first interaction
  useEffect(() => {
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [handleFirstInteraction]);

  // Handle pan value changes
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setPan(panValue);
    }
  }, [panValue]);

  // Draw target helper function
  const drawTarget = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Apply visual intensity to color
    const color = targetColor;
    const opacity = visualIntensity; // Use visualIntensity directly as it's already in 0-1 range
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    
    // Set up shadow/glow if enabled
    if (targetHasGlow) {
      ctx.shadowBlur = targetSize * 0.5;
      ctx.shadowColor = color;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowBlur = 0;
    }
    
    // Draw shape based on targetShape
    const halfSize = targetSize / 2;
    
    switch (targetShape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, halfSize, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'square':
        ctx.fillRect(x - halfSize, y - halfSize, targetSize, targetSize);
        break;
        
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(x, y - halfSize);
        ctx.lineTo(x + halfSize, y + halfSize);
        ctx.lineTo(x - halfSize, y + halfSize);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x, y - halfSize);
        ctx.lineTo(x + halfSize, y);
        ctx.lineTo(x, y + halfSize);
        ctx.lineTo(x - halfSize, y);
        ctx.closePath();
        ctx.fill();
        break;
    }
    
    // Reset shadow and opacity
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }, [targetColor, targetHasGlow, targetShape, targetSize, visualIntensity]);

  // Animation function
  const animate = useCallback((timestamp: number) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate position based on movement pattern and speed
    const progress = (timestamp % speed) / speed;
    
    let x;
    if (targetShape === 'circle') {
      // Circle
      x = canvas.width * 0.5 + canvas.width * 0.5 * Math.cos(2 * Math.PI * progress);
    } else {
      // Square
      x = canvas.width * 0.5 + canvas.width * 0.5 * Math.cos(2 * Math.PI * progress);
    }
    
    const y = canvas.height / 2;
    
    // Draw the target
    drawTarget(ctx, x, y);
    
    // Update pan value for audio
    const normalizedPan = ((x / canvas.width) * 2) - 1;
    setPanValue(normalizedPan);
    
    // Play click sound at extreme points
    if (audioEngineRef.current && audioMode === 'click') {
      const centerX = canvas.width / 2;
      const halfWidth = canvas.width * 0.5;
      const threshold = 5; // pixels from the edge to trigger sound
      
      // Check if we're at the extreme left or right
      if (Math.abs(x - (centerX - halfWidth)) < threshold) {
        audioEngineRef.current.playContactSound(false); // Left click
      } else if (Math.abs(x - (centerX + halfWidth)) < threshold) {
        audioEngineRef.current.playContactSound(true); // Right click
      }
    }
    
    // Request next frame if still playing
    if (isPlaying) {
      animationIdRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, speed, targetShape, drawTarget, audioMode]);

  // Animation control functions
  const startAnimation = useCallback(() => {
    if (animationFrameId) return;
    animationIdRef.current = requestAnimationFrame(animate);
  }, [animate, animationFrameId]);

  const stopAnimation = useCallback(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      setAnimationFrameId(null);
    }
  }, [animationFrameId]);

  // Animation effect
  useEffect(() => {
    if (isPlaying && canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      startAnimation();
    } else if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
      
      // Reset pan to center when animation stops
      setPanValue(0);
      
      // Clear canvas and draw static target
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          drawTarget(ctx, canvasRef.current.width / 2, canvasRef.current.height / 2);
        }
      }
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [isPlaying, startAnimation, drawTarget]);
  
  // Handle menu open/close with sound effects
  const toggleMenu = () => {
    if (!isMenuOpen) {
      menuOpenSoundRef.current?.play();
    } else {
      menuCloseSoundRef.current?.play();
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle click outside menu
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
  
  // Handle timer countdown
  useEffect(() => {
    if (isPlaying && timeRemaining === null) {
      // Start new session
      setTimeRemaining(audioTrackConfig.sessionDuration);
    }

    if (timeRemaining !== null && timeRemaining > 0 && isPlaying) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 0) {
            // Play warning sound when 30 seconds remaining
            if (prev === 31) {
              if (playStatusSoundRef.current) {
                playStatusSoundRef.current.play();
                setA11yMessage('30 seconds remaining in session');
              }
            }
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
  }, [timeRemaining, isPlaying, audioTrackConfig.sessionDuration]);

  // Handle audio mode changes
  const handleAudioModeChange = async (mode: 'click' | 'track') => {
    try {
      if (audioEngineRef.current) {
        audioEngineRef.current.setAudioMode(mode);
        setAudioMode(mode);
      }
    } catch (error) {
      console.error('Error changing audio mode:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to change audio mode');
    }
  };

  // Effect to handle audio mode changes
  useEffect(() => {
    const loadAudio = async () => {
      if (audioMode === 'track' && selectedAudio && audioPlayerRef.current) {
        try {
          // Reset the audio element
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0;
          
          // Only use path property, not objectUrl which may be stale
          const audioSource = selectedAudio.path;
          if (!audioSource) {
            console.error('No audio source available');
            setAudioError('No audio source available');
            return;
          }
          
          // Set new source
          audioPlayerRef.current.src = audioSource;
          
          // Wait for the audio to be loaded
          await new Promise<void>((resolve, reject) => {
            const handleCanPlay = () => {
              console.log('Audio can play');
              audioPlayerRef.current?.removeEventListener('canplay', handleCanPlay);
              audioPlayerRef.current?.removeEventListener('error', handleError);
              resolve();
            };
            
            const handleError = (e: Event) => {
              const error = audioPlayerRef.current?.error;
              console.error('Audio loading error:', {
                code: error?.code,
                message: error?.message,
                networkState: audioPlayerRef.current?.networkState,
                readyState: audioPlayerRef.current?.readyState
              });
              audioPlayerRef.current?.removeEventListener('canplay', handleCanPlay);
              audioPlayerRef.current?.removeEventListener('error', handleError);
              reject(new Error(`Failed to load audio: ${error?.message || 'Unknown error'}`));
            };

            audioPlayerRef.current?.addEventListener('canplay', handleCanPlay);
            audioPlayerRef.current?.addEventListener('error', handleError);
            
            // Start loading
            audioPlayerRef.current?.load();
          });
          
          setAudioError(null);
        } catch (error) {
          console.error('Error loading audio:', error);
          setAudioError(error instanceof Error ? error.message : 'Failed to load audio');
        }
      }
    };
    
    loadAudio();
  }, [audioMode, selectedAudio]);

  // Handle setting changes
  const handleSettingChange = async (setting: string, value: unknown) => {
    switch (setting) {
      case 'visualIntensity':
        setVisualIntensity(clampDecimalIntensity(percentageToDecimal(value as number)));
        break;
      case 'targetShape':
        setTargetShape(value as 'circle' | 'square' | 'triangle' | 'diamond' | 'star');
        break;
      case 'isDarkMode':
        setIsDarkMode(value as boolean);
        break;
      case 'audioMode':
        await handleAudioModeChange(value as 'click' | 'track');
        break;
      case 'bpm':
        handleBpmChange(value as number);
        break;
      case 'audioFeedbackEnabled':
        setAudioFeedbackEnabled(value as boolean);
        break;
      case 'visualGuideEnabled':
        setVisualGuideEnabled(value as boolean);
        break;
      case 'movementGuideEnabled':
        setMovementGuideEnabled(value as boolean);
        break;
      case 'targetHasGlow':
        setTargetHasGlow(value as boolean);
        break;
      case 'targetColor':
        setTargetColor(value as string);
        break;
      case 'sessionDuration':
        // Update the session duration in the audio track config
        setAudioTrackConfig(prev => ({
          ...prev,
          sessionDuration: value as number
        }));
        break;
      default:
        console.log(`Setting ${setting} changed to ${value}`);
    }
  };

  // Load saved custom click sounds on mount
  useEffect(() => {
    try {
      const savedSounds = JSON.parse(localStorage.getItem('customClickSounds') || '{}');
      
      if (audioEngineRef.current && (savedSounds.leftClickSound || savedSounds.rightClickSound)) {
        const config = { ...contactSoundConfig };
        
        if (savedSounds.leftClickSound) {
          config.leftSamplePath = savedSounds.leftClickSound.objectUrl;
        }
        if (savedSounds.rightClickSound) {
          config.rightSamplePath = savedSounds.rightClickSound.objectUrl;
        }
        
        audioEngineRef.current.updateContactSoundConfig(config);
      }
    } catch (error) {
      console.error('Error loading saved click sounds:', error);
    }
  }, []);

  // Load saved audio tracks on mount
  useEffect(() => {
    try {
      const savedTracks = JSON.parse(localStorage.getItem('audioTracks') || '[]');
      if (savedTracks.length > 0) {
        // Set the most recently used track as selected
        const mostRecent = savedTracks.reduce((prev: AudioFile, curr: AudioFile) => {
          return new Date(prev.lastUsed) > new Date(curr.lastUsed) ? prev : curr;
        });
        
        // Don't use objectUrl from localStorage as it's no longer valid
        // Only use the path property which points to a static file
        if (mostRecent.path) {
          setSelectedAudio({
            ...mostRecent,
            objectUrl: undefined // Clear any stale objectUrl
          });
          
          // Load the audio metadata using the path instead of objectUrl
          const audio = new Audio(mostRecent.path);
          audio.addEventListener('loadedmetadata', () => {
            setAudioMetadata({
              duration: audio.duration,
              sampleRate: 44100
            });
          });
        } else {
          console.warn('Audio file has no path property, cannot load');
        }
      }
    } catch (error) {
      console.error('Error loading saved audio tracks:', error);
    }
  }, []);

  // Clean up object URLs on unmount and mode changes
  useEffect(() => {
    return () => {
      try {
        // Clean up selected audio
        if (selectedAudio?.objectUrl) {
          URL.revokeObjectURL(selectedAudio.objectUrl);
        }
        
        // Clean up saved tracks
        const savedTracks = JSON.parse(localStorage.getItem('audioTracks') || '[]');
        savedTracks.forEach((track: AudioFile) => {
          if (track.objectUrl) {
            URL.revokeObjectURL(track.objectUrl);
          }
        });
        
        // Clean up saved sounds
        const savedSounds = JSON.parse(localStorage.getItem('customClickSounds') || '{}');
        Object.values(savedSounds).forEach((sound: any) => {
          if (sound.objectUrl) {
            URL.revokeObjectURL(sound.objectUrl);
          }
        });
      } catch (error) {
        console.error('Error cleaning up object URLs:', error);
      }
    };
  }, [selectedAudio]);

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    if (audioEngineRef.current) {
      audioEngineRef.current.updateAudioTrackConfig({ volume: audioTrackConfig.volume });
    }
  };

  // Update togglePlayPause to handle audio context resumption
  const togglePlayPause = async () => {
    try {
      // Initialize audio context manager first
      await audioContextManager.initialize();
      
      // Check if AudioEngine is initialized
      if (!audioEngineRef.current) {
        if (!audioPlayerRef.current) {
          console.error('Audio player element not found');
          setAudioError('Audio player element not found');
          return;
        }
        
        console.log('Initializing AudioEngine on demand');
        const audioEngine = new AudioEngine();
        await audioEngine.initialize(audioPlayerRef.current);
        audioEngineRef.current = audioEngine;
        
        // Set initial configurations
        audioEngine.updateContactSoundConfig(contactSoundConfig);
        audioEngine.setAudioMode(audioMode);
      }

      // Ensure audio context is running
      if (audioEngineRef.current.getContext()?.state === 'suspended') {
        await audioEngineRef.current.resumeContext();
        console.log('Audio context resumed');
      }

      if (isPlaying) {
        audioEngineRef.current.stopAll();
        setIsPlaying(false);
        setA11yMessage('Playback stopped');
      } else {
        // Ensure audio element is ready
        if (audioPlayerRef.current && audioPlayerRef.current.readyState < 2) {
          await new Promise<void>((resolve, reject) => {
            const handleCanPlay = () => {
              audioPlayerRef.current?.removeEventListener('canplay', handleCanPlay);
              audioPlayerRef.current?.removeEventListener('error', handleError);
              resolve();
            };
            
            const handleError = (e: Event) => {
              const error = audioPlayerRef.current?.error;
              console.error('Audio loading error:', error);
              audioPlayerRef.current?.removeEventListener('canplay', handleCanPlay);
              audioPlayerRef.current?.removeEventListener('error', handleError);
              reject(new Error(`Failed to load audio: ${error?.message || 'Unknown error'}`));
            };

            audioPlayerRef.current?.addEventListener('canplay', handleCanPlay);
            audioPlayerRef.current?.addEventListener('error', handleError);
          });
        }

        // Start playback
        const success = await audioEngineRef.current.startPlayback();
        console.log('Playback start result:', success);

        if (!success) {
          console.warn('Failed to start audio playback, but continuing with visual target');
          setAudioError('Failed to start audio playback');
        } else {
          setAudioError(null);
          setIsPlaying(true);
          setA11yMessage('Playback started');
        }
      }
    } catch (error) {
      console.error('Error in togglePlayPause:', error);
      setAudioError('Failed to control audio playback');
      setA11yMessage('Error controlling playback');
    }
  };

  return (
    <div className={`relative w-full h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Background layer */}
      <div className={`fixed inset-0 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`} />
      
      {/* Content layer - increase z-index to be above canvas */}
      <div className="relative z-20">
        {/* Audio elements */}
        <audio ref={menuOpenSoundRef} src="/sounds/menu-open.mp3" preload="auto" />
        <audio ref={menuCloseSoundRef} src="/sounds/menu-close.mp3" preload="auto" />
        <audio ref={playStatusSoundRef} src="/sounds/status-change.mp3" preload="auto" />
        <audio 
          ref={audioPlayerRef} 
          preload="auto"
          onError={(e) => {
            const error = e.currentTarget.error;
            console.error('Audio element error:', {
              code: error?.code,
              message: error?.message,
              currentSrc: e.currentTarget.currentSrc,
              readyState: e.currentTarget.readyState,
              networkState: e.currentTarget.networkState
            });
            setAudioError(`Audio loading error: ${error?.message || 'Unknown error'}`);
          }}
        >
          <source src="/audio/sine-440hz.mp3" type="audio/mpeg" />
          <source src="/audio/sine-440hz.ogg" type="audio/ogg" />
          Your browser does not support the audio element.
        </audio>

        {/* Header */}
        <div className="flex justify-between items-center p-4">
          <button 
            className={`${isDarkMode ? 'text-white' : 'text-gray-800'} z-30`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            EMDR Therapy
          </h1>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Settings Menu - z-30 to be above everything */}
        <UnifiedSettings
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          isSessionActive={isPlaying}
          settings={{
            visualIntensity: decimalToPercentage(visualIntensity),
            targetShape,
            audioMode,
            isDarkMode,
            bpm,
            audioFeedbackEnabled,
            visualGuideEnabled,
            movementGuideEnabled,
            targetHasGlow,
            targetColor,
            sessionDuration: audioTrackConfig.sessionDuration,
          }}
          onSettingChange={handleSettingChange}
          audioMode={audioMode}
          onAudioModeChange={handleAudioModeChange}
          bpm={bpm}
          onBpmChange={handleBpmChange}
          onAudioSelect={(audio) => {
            // Handle audio selection
          }}
          selectedAudio={selectedAudio?.name || ''}
          audioMetadata={audioMetadata}
        />

        {/* Controls - z-20 to be above canvas */}
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} bg-opacity-80 p-4 rounded-full shadow-lg z-20`}>
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
          } px-6 py-3 rounded-full text-2xl font-bold z-20 flex flex-col items-center ${
            timeRemaining <= 30 ? 'animate-pulse' : ''
          }`}>
            <div className="text-3xl">{formatTime(timeRemaining)}</div>
            <div className="text-xs mt-1">Session Time Remaining</div>
            <div className="w-full h-1 bg-gray-600 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full ${timeRemaining <= 30 ? 'bg-red-500' : isDarkMode ? 'bg-blue-500' : 'bg-blue-600'}`} 
                style={{ 
                  width: `${(timeRemaining / audioTrackConfig.sessionDuration) * 100}%`,
                  transition: 'width 1s linear'
                }}
                aria-valuenow={timeRemaining}
                aria-valuemin={0}
                aria-valuemax={audioTrackConfig.sessionDuration}
                role="progressbar"
              ></div>
            </div>
          </div>
        )}

        {/* Screen reader announcements */}
        <div className="sr-only" aria-live="polite">
          {a11yMessage}
        </div>

        {/* Show either the VisualTarget or EMDRTarget, but not both */}
        {isPlaying ? (
          <EMDRTarget
            isActive={true}
            speed={speed}
            size={targetSize}
            color={targetColor}
            shape={targetShape}
            hasGlow={targetHasGlow}
            movementPattern="ping-pong"
            intensity={1}
            visualIntensity={visualIntensity}
          />
        ) : (
          <VisualTarget
            x={0}
            y={0}
            size={50}
            color={targetColor}
            shape={targetShape}
            isActive={false}
            isGlowing={targetHasGlow}
            onTargetClick={() => {}}
          />
        )}
      </div>
    </div>
  );
}