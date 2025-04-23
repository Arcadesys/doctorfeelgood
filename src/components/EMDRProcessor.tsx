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
import UnifiedSettings from './UnifiedSettings';

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
  
  // Visual settings state
  const [targetSize, setTargetSize] = useState(50); // Default size in pixels
  const [targetColor, setTargetColor] = useState('#ff0000'); // Default red
  const [targetShape, setTargetShape] = useState<'circle' | 'square'>('circle');
  const [targetHasGlow, setTargetHasGlow] = useState(true);
  const [visualIntensity, setVisualIntensity] = useState(0.8); // Default 80%
  const [targetMovementPattern, setTargetMovementPattern] = useState<'ping-pong' | 'sine'>('ping-pong');
  
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
      setA11yMessage(`Audio mode changed to ${audioMode === 'track' ? 'audio track' : 'click'}`);
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
  
  // Initialize audio context
  useEffect(() => {
    // Create new audio context if needed
    if (!audioContextRef.current.context) {
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
    }

    return () => {
      const ctx = audioContextRef.current.context;
      if (ctx && ctx.state !== 'closed') {
        ctx.close();
        audioContextRef.current = {
          context: null,
          source: null,
          panner: null,
          gainNode: null
        };
      }
    };
  }, []); // Only run once on mount

  // Connect audio element to context
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
  }, []);

  // Handle pan value changes
  useEffect(() => {
    if (audioContextRef.current.panner) {
      audioContextRef.current.panner.pan.value = panValue;
    }
  }, [panValue]);

  // Draw target helper function
  const drawTarget = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Apply visual intensity to color
    ctx.fillStyle = targetColor;
    
    // Set up shadow/glow if enabled
    if (targetHasGlow) {
      ctx.shadowBlur = targetSize * 0.5;
      ctx.shadowColor = targetColor;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowBlur = 0;
    }
    
    // Draw shape based on targetShape
    if (targetShape === 'circle') {
      ctx.beginPath();
      ctx.arc(x, y, targetSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Square
      const halfSize = targetSize / 2;
      ctx.fillRect(x - halfSize, y - halfSize, targetSize, targetSize);
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }, [targetColor, targetHasGlow, targetShape, targetSize]);

  // Animation function
  const animate = useCallback((timestamp: number) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate position based on movement pattern
    const cycleTime = 60000 / bpm; // Time for one complete cycle in ms
    const progress = (timestamp % cycleTime) / cycleTime;
    
    let x;
    if (targetMovementPattern === 'ping-pong') {
      // Ping-pong pattern
      const normalizedProgress = progress < 0.5 ? progress * 2 : 2 - (progress * 2);
      x = canvas.width * 0.1 + (canvas.width * 0.8 * normalizedProgress);
    } else {
      // Sine pattern
      const amplitude = canvas.width * 0.4; // 40% of screen width
      const frequency = 2 * Math.PI; // One complete sine wave per cycle
      x = (canvas.width / 2) + amplitude * Math.sin(frequency * progress);
    }
    
    const y = canvas.height / 2;
    
    // Draw the target
    drawTarget(ctx, x, y);
    
    // Update pan value for audio
    const normalizedPan = ((x / canvas.width) * 2) - 1;
    setPanValue(normalizedPan);
    
    // Request next frame if still playing
    if (isPlaying) {
      animationIdRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, bpm, targetMovementPattern, drawTarget]);

  // Animation effect
  useEffect(() => {
    if (isPlaying && canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      animationIdRef.current = requestAnimationFrame(animate);
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
  }, [isPlaying, animate, drawTarget]);
  
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
      drawTarget(ctx, canvasRef.current.width / 2, canvasRef.current.height / 2);
      
      // Request next frame
      const frameId = requestAnimationFrame(animate);
      setAnimationFrameId(frameId);
    };
    
    animate();
  }, [panWidthPercent, drawTarget]);

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

  // Current settings for the unified settings component
  const currentSettings = {
    speed: 1000, // Default speed
    freqLeft: 440, // A4
    freqRight: 480, // Higher tone
    targetSize: 50, // Default size in pixels
    visualIntensity: 0.8, // Default to 80%
    sessionDuration: timeRemaining ? Math.ceil(timeRemaining / 60) : 30, // Convert seconds to minutes
    oscillatorType: 'sine' as const,
    targetColor: '#ff0000', // Default red
    targetShape: 'circle' as const,
    targetHasGlow: true,
    targetMovementPattern: 'ping-pong' as const,
    isDarkMode,
    audioMode,
    bpm,
    panWidthPercent,
  };

  // Handle setting changes
  const handleSettingChange = (settingName: string, value: number | string | boolean) => {
    switch (settingName) {
      case 'isDarkMode':
        setIsDarkMode(value as boolean);
        break;
      case 'audioMode':
        setAudioMode(value as 'click' | 'track');
        if (audioEngineRef.current) {
          audioEngineRef.current.setAudioMode(value as 'click' | 'track');
        }
        break;
      case 'bpm':
        setBpm(value as number);
        break;
      case 'panWidthPercent':
        setPanWidthPercent(value as number);
        break;
      case 'sessionDuration':
        setSessionDuration(value as number);
        setTimeRemaining((value as number) * 60);
        break;
      case 'targetSize':
        setTargetSize(value as number);
        drawVisualTarget(); // Redraw with new size
        break;
      case 'targetColor':
        setTargetColor(value as string);
        drawVisualTarget(); // Redraw with new color
        break;
      case 'targetShape':
        setTargetShape(value as 'circle' | 'square');
        drawVisualTarget(); // Redraw with new shape
        break;
      case 'targetHasGlow':
        setTargetHasGlow(value as boolean);
        drawVisualTarget(); // Redraw with updated glow effect
        break;
      case 'visualIntensity':
        setVisualIntensity(value as number);
        drawVisualTarget(); // Redraw with new intensity
        break;
      case 'targetMovementPattern':
        setTargetMovementPattern(value as 'ping-pong' | 'sine');
        // Pattern will be applied on next animation frame
        break;
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background layer */}
      <div className={`fixed inset-0 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`} />
      
      {/* Canvas layer */}
      <canvas 
        ref={canvasRef}
        className="fixed inset-0 z-10"
        aria-label="EMDR visual target canvas"
        role="img"
        aria-live="polite"
        style={{ pointerEvents: 'none' }}
      />

      {/* Content layer */}
      <div className="relative z-20">
        {/* Audio elements */}
        <audio ref={menuOpenSoundRef} src="/sounds/menu-open.mp3" preload="auto" />
        <audio ref={menuCloseSoundRef} src="/sounds/menu-close.mp3" preload="auto" />
        <audio ref={playStatusSoundRef} src="/sounds/status-change.mp3" preload="auto" />
        <audio ref={audioPlayerRef} loop={true}>
          <source src="/audio/sine-440hz.mp3" type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>

        {/* Header */}
        <div className="flex justify-between items-center p-4">
          <button 
            className={`${isDarkMode ? 'text-white' : 'text-gray-800'}`}
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
          settings={currentSettings}
          onSettingChange={handleSettingChange}
        />

        {/* Controls - z-20 to be above canvas but below menu */}
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} bg-opacity-80 p-4 rounded-full shadow-lg`}>
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

        {/* Screen reader announcements */}
        <div className="sr-only" aria-live="polite">
          {a11yMessage}
        </div>
      </div>
    </div>
  );
} 