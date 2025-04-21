'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  AudioEngine, 
  OscillatorType, 
  ContactSoundConfig, 
  ConstantToneConfig,
  AudioTrackConfig,
  AudioMode
} from '../lib/audioEngine';
import { useRouter } from 'next/navigation';
import CustomKnob from './CustomKnob';

// Simple version without the File System Access API
type AudioFile = {
  id: string;
  name: string;
  lastUsed: string;
  path?: string;
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
  const [audioMode, setAudioMode] = useState<AudioMode>('synthesizer');
  
  // Audio engine settings
  const [constantToneConfig, setConstantToneConfig] = useState<ConstantToneConfig>({
    isOscillator: true,
    oscillatorType: 'sine',
    frequency: 0.4, // 24 BPM
    volume: 0.7,
    envelope: {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.7,
      release: 0.5
    },
    enabled: true
  });
  
  const [contactSoundConfig, setContactSoundConfig] = useState<ContactSoundConfig>({
    leftFrequency: 330,
    rightFrequency: 440,
    duration: 0.1,
    oscillatorType: 'sine',
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
    // Create audio engine instance
    const audioEngine = new AudioEngine();
    
    // Initialize with our audio element
    if (audioPlayerRef.current) {
      const success = audioEngine.initialize(audioPlayerRef.current);
      
      if (success) {
        console.log('AudioEngine initialized with audio element');
        
        // Set initial configurations
        audioEngine.updateConstantToneConfig(constantToneConfig);
        audioEngine.updateContactSoundConfig(contactSoundConfig);
        
        // Set initial audio mode
        audioEngine.setAudioMode(audioMode);
        
        // Store in ref
        audioEngineRef.current = audioEngine;
      } else {
        console.error('Failed to initialize AudioEngine');
      }
    }
    
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
      audioEngineRef.current.updateConstantToneConfig(constantToneConfig);
    }
  }, [constantToneConfig]);
  
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
      setA11yMessage(`Audio mode changed to ${audioMode === 'synthesizer' ? 'synthesizer' : 'audio track'}`);
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
      const startTime = Date.now(); // Keep track of when animation started
      
      // Animation function
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
        const bpm = constantToneConfig.frequency * 60; // Convert Hz to BPM
        const cycleTimeInSeconds = 60 / bpm; // Time for one complete cycle
        const elapsedTime = (Date.now() - startTime) / 1000;
        const positionInCycle = (elapsedTime % cycleTimeInSeconds) / cycleTimeInSeconds; // 0 to 1 within cycle
        
        // Convert to a sine wave position -1 to 1
        const sineValue = Math.sin(positionInCycle * Math.PI * 2);
        
        // Scale based on canvas width
        const centerX = window.innerWidth / 2;
        const fullAmplitude = (maxX - minX) / 2 - ballRadius; // Maximum possible distance from center
        const maxAmplitude = fullAmplitude * (panWidthPercent / 100); // Scale by user's pan width setting
        
        // Calculate new x position
        x = centerX + (sineValue * maxAmplitude);
        
        // Calculate normalized position for panning (-1 to 1)
        const normalizedX = sineValue;
        setPanValue(normalizedX);
        
        // Update audio engine panning
        if (audioEngineRef.current) {
          audioEngineRef.current.setPan(normalizedX);
        }
        
        // Check if we're at the peaks of the sine wave (when abs(sine) is near 1)
        // We use a small threshold to avoid triggering multiple times
        const peakThreshold = 0.95; // Trigger when within 5% of peak
        if (Math.abs(sineValue) >= peakThreshold) {
          // Only trigger if we haven't recently triggered for this peak
          // We can determine left/right based on the sign of the sine value
          const isRightPeak = sineValue > 0;
          
          // Play contact sound using audio engine
          if (audioEngineRef.current) {
            audioEngineRef.current.playContactSound(!isRightPeak);
          }
        }
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(x, window.innerHeight / 2, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode ? '#3b82f6' : '#1d4ed8'; // Blue for dark mode, darker blue for light mode
        ctx.fill();
        ctx.closePath();
        
        // Request next animation frame
        animationIdRef.current = requestAnimationFrame(animate);
      };
      
      // Start animation
      console.log("Initiating animation frame");
      animationIdRef.current = requestAnimationFrame(animate);
      setAnimationFrameId(animationIdRef.current);
      
      // Start constant tone
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
  }, [isPlaying, isDarkMode]);
  
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
  
  // Handle audio playback controls
  const togglePlayPause = () => {
    console.log("togglePlayPause: Current isPlaying state:", isPlaying);
    
    if (isPlaying) {
      // Stop playback through audio engine
      if (audioEngineRef.current) {
        audioEngineRef.current.stopAll();
      }
      
      setA11yMessage('Paused. Visual target stopped.');
      // Play pause status sound (if available)
      playStatusSoundRef.current?.play().catch(e => console.error('Error playing status sound:', e));
      console.log("Setting isPlaying to false");
      setIsPlaying(false);
    } else {
      // Start through audio engine
      let success = false;
      if (audioEngineRef.current) {
        success = audioEngineRef.current.startPlayback();
      }
      
      if (success) {
        // Update message based on mode
        const mode = audioEngineRef.current?.getAudioMode() || 'synthesizer';
        setA11yMessage(`Playing ${mode === 'synthesizer' ? 'synthesizer' : 'audio track'}. Visual target active.`);
        
        // Play status sound
          playStatusSoundRef.current?.play().catch(e => console.error('Error playing status sound:', e));
        console.log("Setting isPlaying to true");
          setIsPlaying(true);
      } else {
        console.error("Failed to start playback");
      }
    }
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

  // Handle oscillator type change
  const handleOscillatorTypeChange = (type: OscillatorType) => {
    setConstantToneConfig(prev => ({
      ...prev,
      oscillatorType: type
    }));
  };
  
  // Handle contact sound frequency change
  const handleContactFrequencyChange = (isRight: boolean, frequency: number) => {
    setContactSoundConfig(prev => ({
      ...prev,
      [isRight ? 'rightFrequency' : 'leftFrequency']: frequency
    }));
  };
  
  // Handle ADSR envelope change
  const handleEnvelopeChange = (
    parameter: 'attack' | 'decay' | 'sustain' | 'release', 
    value: number
  ) => {
    setConstantToneConfig(prev => ({
      ...prev,
      envelope: {
        ...prev.envelope,
        [parameter]: value
      }
    }));
  };

  // Handle audio mode change
  const handleAudioModeChange = (mode: AudioMode) => {
    setAudioMode(mode);
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
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleAudioModeChange('synthesizer')}
                className={`p-4 rounded text-center ${
                  audioMode === 'synthesizer' 
                  ? 'bg-blue-600 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-pressed={audioMode === 'synthesizer'}
              >
                <div className="font-bold mb-1">Synthesizer</div>
                <div className="text-xs">Oscillator tone with contact beeps</div>
              </button>
              
              <button 
                onClick={() => handleAudioModeChange('audioTrack')}
                className={`p-4 rounded text-center ${
                  audioMode === 'audioTrack' 
                  ? 'bg-blue-600 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-pressed={audioMode === 'audioTrack'}
              >
                <div className="font-bold mb-1">Audio Track</div>
                <div className="text-xs">Play your music or audio file</div>
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
                  Frequency: {Math.round(constantToneConfig.frequency * 60)} BPM
                </label>
              </div>
              <input 
                type="range" 
                min="6" 
                max="120" 
                step="1"
                value={Math.round(constantToneConfig.frequency * 60)}
                onChange={(e) => setConstantToneConfig(prev => ({
                  ...prev,
                  frequency: Number(e.target.value) / 60
                }))}
                className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                aria-label="Panning frequency in BPM"
              />
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Speed of panning in beats per minute (lower = slower)
              </p>
            </div>
            
            {/* Common BPM presets */}
            <div className="flex flex-wrap gap-2 mt-3 mb-4">
              {[6, 12, 24, 40, 60, 90].map(bpm => (
                <button
                  key={bpm}
                  onClick={() => setConstantToneConfig(prev => ({
                    ...prev,
                    frequency: bpm / 60
                  }))}
                  className={`px-2 py-1 text-xs ${
                    Math.round(constantToneConfig.frequency * 60) === bpm
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } rounded`}
                >
                  {bpm} BPM
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
        
        {/* Synthesizer Mode Settings */}
        {audioMode === 'synthesizer' && (
          <>
            {/* Contact Sounds Section */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Contact Sounds</h3>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                {/* Enable/disable toggle */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Enable Contact Sounds</span>
                  <button 
                    onClick={() => setContactSoundConfig(prev => ({...prev, enabled: !prev.enabled}))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${contactSoundConfig.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={contactSoundConfig.enabled}
                  >
                    <span 
                      className={`${contactSoundConfig.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
                
                {contactSoundConfig.enabled && (
                  <>
                    <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sound Character</h4>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button 
                        onClick={() => setContactSoundConfig(prev => ({...prev, oscillatorType: 'sine'}))}
                        className={`p-2 rounded text-sm ${
                          contactSoundConfig.oscillatorType === 'sine' 
                          ? 'bg-blue-600 text-white' 
                          : isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        aria-label="Soft, warm tone"
                        aria-pressed={contactSoundConfig.oscillatorType === 'sine'}
                      >
                        Soft & Warm
                      </button>
                      <button 
                        onClick={() => setContactSoundConfig(prev => ({...prev, oscillatorType: 'triangle'}))}
                        className={`p-2 rounded text-sm ${
                          contactSoundConfig.oscillatorType === 'triangle' 
                          ? 'bg-blue-600 text-white' 
                          : isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        aria-label="Gentle, clear tone"
                        aria-pressed={contactSoundConfig.oscillatorType === 'triangle'}
                      >
                        Gentle & Clear
                      </button>
                      <button 
                        onClick={() => setContactSoundConfig(prev => ({...prev, oscillatorType: 'square'}))}
                        className={`p-2 rounded text-sm ${
                          contactSoundConfig.oscillatorType === 'square' 
                          ? 'bg-blue-600 text-white' 
                          : isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        aria-label="Sharp, buzzy tone"
                        aria-pressed={contactSoundConfig.oscillatorType === 'square'}
                      >
                        Sharp & Buzzy
                      </button>
                      <button 
                        onClick={() => setContactSoundConfig(prev => ({...prev, oscillatorType: 'sawtooth'}))}
                        className={`p-2 rounded text-sm ${
                          contactSoundConfig.oscillatorType === 'sawtooth' 
                          ? 'bg-blue-600 text-white' 
                          : isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        aria-label="Bright, metallic tone"
                        aria-pressed={contactSoundConfig.oscillatorType === 'sawtooth'}
                      >
                        Bright & Metallic
                      </button>
                    </div>
                    
                    <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Left Contact Pitch
                    </h4>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">Deep</span>
                      <input 
                        type="range" 
                        min="220" 
                        max="880" 
                        step="1"
                        value={contactSoundConfig.leftFrequency}
                        onChange={(e) => handleContactFrequencyChange(false, Number(e.target.value))}
                        className={`flex-grow h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                        aria-label="Left contact pitch"
                      />
                      <span className="text-sm text-gray-500">High</span>
                    </div>
                    
                    <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Right Contact Pitch
                    </h4>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">Deep</span>
                      <input 
                        type="range" 
                        min="220" 
                        max="880" 
                        step="1"
                        value={contactSoundConfig.rightFrequency}
                        onChange={(e) => handleContactFrequencyChange(true, Number(e.target.value))}
                        className={`flex-grow h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                        aria-label="Right contact pitch"
                      />
                      <span className="text-sm text-gray-500">High</span>
                    </div>
                    
                    <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Sound Length
                    </h4>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">Quick</span>
                      <input 
                        type="range" 
                        min="0.05" 
                        max="0.5" 
                        step="0.01"
                        value={contactSoundConfig.duration}
                        onChange={(e) => setContactSoundConfig(prev => ({
                          ...prev,
                          duration: Number(e.target.value)
                        }))}
                        className={`flex-grow h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                        aria-label="Contact sound length"
                      />
                      <span className="text-sm text-gray-500">Long</span>
                    </div>
                    
                    <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Volume
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Soft</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01"
                        value={contactSoundConfig.volume}
                        onChange={(e) => setContactSoundConfig(prev => ({
                          ...prev,
                          volume: Number(e.target.value)
                        }))}
                        className={`flex-grow h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                        aria-label="Contact sound volume"
                      />
                      <span className="text-sm text-gray-500">Loud</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
        
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
                <input 
                  type="file" 
                  accept="audio/*"
                  className={`hidden`}
                  id="audio-upload"
                  onChange={(e) => {
                    // Handle file upload here
                    const file = e.target.files?.[0];
                    if (file) {
                      // Process the file...
                    }
                  }}
                />
                <label 
                  htmlFor="audio-upload"
                  className={`inline-block px-6 py-3 ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                  } rounded-lg cursor-pointer transition-colors duration-200`}
                >
                  Choose File
                </label>
                <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No file chosen
                </p>
              </div>
              
              <button 
                className={`w-full mt-4 ${
                  isDarkMode 
                    ? 'bg-blue-900 hover:bg-blue-800 text-blue-200' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                } py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200`}
                onClick={() => {}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Your Song Library ({audioFiles.length})
              </button>
            </div>
          </div>
        )}
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
        {audioMode === 'synthesizer' ? (
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
    </div>
  );
} 