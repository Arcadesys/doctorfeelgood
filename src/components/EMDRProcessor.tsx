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
  const [audioMode, setAudioMode] = useState<AudioMode>('synthesizer');
  
  // Audio engine settings
  const [constantToneConfig, setConstantToneConfig] = useState<ConstantToneConfig>({
    isOscillator: true,
    oscillatorType: 'sine',
    frequency: 440,
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
      let direction = 1; // 1 = right, -1 = left
      const ballRadius = 20;
      const moveSpeed = 3;
      const maxX = window.innerWidth - ballRadius;
      const minX = ballRadius;
      
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
        
        // Move ball
        x += moveSpeed * direction;
        
        // Calculate normalized position for panning (-1 to 1)
        // -1 = far left, 0 = center, 1 = far right
        const normalizedX = (2 * (x - minX) / (maxX - minX)) - 1;
        setPanValue(normalizedX);
        
        // Update audio engine panning
        if (audioEngineRef.current) {
          audioEngineRef.current.setPan(normalizedX);
        }
        
        // Reverse direction if hitting edge
        if (x > maxX || x < minX) {
          const hitRightWall = x > maxX;
          direction *= -1;
          console.log(`Reversing direction at ${hitRightWall ? 'right' : 'left'} wall, now:`, direction);
          
          // Play contact sound using audio engine
          if (audioEngineRef.current) {
            audioEngineRef.current.playContactSound(hitRightWall);
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
      // Play a deeper tone for dark mode
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(220, 0);
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(0.2);
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      // Play a higher tone for light mode
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, 0);
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(0.2);
    }
    
    // Announce for screen readers
    setA11yMessage(`${newDarkMode ? 'Dark' : 'Light'} mode activated`);
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
        
        {/* Synthesizer Mode Settings - only shown when in synthesizer mode */}
        {audioMode === 'synthesizer' && (
          <>
            {/* Constant Tone Section */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Constant Tone</h3>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                {/* Enable/disable toggle */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Enable Constant Tone</span>
                  <button 
                    onClick={() => setConstantToneConfig(prev => ({...prev, enabled: !prev.enabled}))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${constantToneConfig.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={constantToneConfig.enabled}
                  >
                    <span 
                      className={`${constantToneConfig.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Oscillator Type</h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map(type => (
                    <button 
                      key={type}
                      onClick={() => handleOscillatorTypeChange(type)}
                      className={`p-2 rounded text-sm ${
                        constantToneConfig.oscillatorType === type 
                        ? 'bg-blue-600 text-white' 
                        : isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                      aria-label={`Oscillator type ${type}`}
                      aria-pressed={constantToneConfig.oscillatorType === type}
                      disabled={!constantToneConfig.enabled}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Frequency: {constantToneConfig.frequency} Hz
                </h4>
                <input 
                  type="range" 
                  min="220" 
                  max="880" 
                  step="1"
                  value={constantToneConfig.frequency}
                  onChange={(e) => setConstantToneConfig(prev => ({
                    ...prev,
                    frequency: Number(e.target.value)
                  }))}
                  className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer mb-4`}
                  aria-label="Frequency"
                />
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>ADSR Envelope</h4>
                
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Attack: {constantToneConfig.envelope.attack.toFixed(2)}s
                    </label>
                  </div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="2" 
                    step="0.01"
                    value={constantToneConfig.envelope.attack}
                    onChange={(e) => handleEnvelopeChange('attack', Number(e.target.value))}
                    className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                    aria-label="Attack"
                  />
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Decay: {constantToneConfig.envelope.decay.toFixed(2)}s
                    </label>
                  </div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="2" 
                    step="0.01"
                    value={constantToneConfig.envelope.decay}
                    onChange={(e) => handleEnvelopeChange('decay', Number(e.target.value))}
                    className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                    aria-label="Decay"
                  />
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Sustain: {constantToneConfig.envelope.sustain.toFixed(2)}
                    </label>
                  </div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="1" 
                    step="0.01"
                    value={constantToneConfig.envelope.sustain}
                    onChange={(e) => handleEnvelopeChange('sustain', Number(e.target.value))}
                    className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                    aria-label="Sustain"
                  />
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Release: {constantToneConfig.envelope.release.toFixed(2)}s
                    </label>
                  </div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="3" 
                    step="0.01"
                    value={constantToneConfig.envelope.release}
                    onChange={(e) => handleEnvelopeChange('release', Number(e.target.value))}
                    className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                    aria-label="Release"
                  />
                </div>
              </div>
            </div>
            
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
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sound Type</h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map(type => (
                    <button 
                      key={type}
                      onClick={() => setContactSoundConfig(prev => ({...prev, oscillatorType: type}))}
                      className={`p-2 rounded text-sm ${
                        contactSoundConfig.oscillatorType === type 
                        ? 'bg-blue-600 text-white' 
                        : isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                      aria-label={`Contact sound type ${type}`}
                      aria-pressed={contactSoundConfig.oscillatorType === type}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Left Contact: {contactSoundConfig.leftFrequency} Hz
                </h4>
                <input 
                  type="range" 
                  min="220" 
                  max="880" 
                  step="1"
                  value={contactSoundConfig.leftFrequency}
                  onChange={(e) => handleContactFrequencyChange(false, Number(e.target.value))}
                  className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer mb-4`}
                  aria-label="Left contact frequency"
                />
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Right Contact: {contactSoundConfig.rightFrequency} Hz
                </h4>
                <input 
                  type="range" 
                  min="220" 
                  max="880" 
                  step="1"
                  value={contactSoundConfig.rightFrequency}
                  onChange={(e) => handleContactFrequencyChange(true, Number(e.target.value))}
                  className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer mb-4`}
                  aria-label="Right contact frequency"
                />
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Duration: {contactSoundConfig.duration.toFixed(2)}s
                </h4>
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
                  className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer mb-4`}
                  aria-label="Contact sound duration"
                />
                
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Volume: {Math.round(contactSoundConfig.volume * 100)}%
                </h4>
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
                  className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                  aria-label="Contact sound volume"
                />
              </div>
            </div>
          </>
        )}
        
        {/* Audio Track Settings - only shown when in audioTrack mode */}
        {audioMode === 'audioTrack' && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Audio Track</h3>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Selected File</h4>
              <div className={`p-3 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-4`}>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {selectedAudio?.name || 'No audio file selected'}
                </p>
              </div>
              
              {/* Audio File Management */}
              <div className="mb-4">
                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Audio Files</h4>
                
                {/* Upload New Audio */}
                <div className="mb-4">
                  <label className={`flex items-center justify-center p-3 border-2 border-dashed ${isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'} rounded-lg cursor-pointer transition-colors`}>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Create a unique ID for the file
                          const newId = generateMD5Hash(file.name + new Date().toISOString());
                          
                          // Create an object URL (this would normally save to server in a real app)
                          const objectUrl = URL.createObjectURL(file);
                          
                          // Create new audio file entry
                          const newAudio: AudioFile = {
                            id: newId,
                            name: file.name,
                            lastUsed: new Date().toLocaleString(),
                            path: objectUrl
                          };
                          
                          // Add to list and select
                          setAudioFiles(prev => [...prev, newAudio]);
                          setSelectedAudio(newAudio);
                          
                          // Update audio track config
                          setAudioTrackConfig(prev => ({
                            ...prev,
                            filePath: objectUrl
                          }));
                          
                          // Clear the input value
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`mx-auto h-8 w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className={`mt-2 block text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Upload audio file
                      </span>
                    </div>
                  </label>
                </div>
                
                {/* Audio Files List */}
                <div className={`rounded-lg overflow-hidden mb-2 ${audioFiles.length === 0 ? 'hidden' : 'block'}`}>
                  <div className={`max-h-48 overflow-y-auto`}>
                    {audioFiles.map(file => (
                      <div 
                        key={file.id}
                        className={`flex items-center justify-between p-3 ${
                          selectedAudio?.id === file.id 
                            ? 'bg-blue-600 text-white' 
                            : isDarkMode 
                              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} cursor-pointer`}
                        onClick={() => {
                          setSelectedAudio(file);
                          // Update audio track config with the file path
                          setAudioTrackConfig(prev => ({
                            ...prev,
                            filePath: file.path || '/audio/sine-440hz.mp3'
                          }));
                        }}
                      >
                        <div className="flex items-center overflow-hidden">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="truncate">{file.name}</span>
                        </div>
                        <button 
                          className={`ml-2 p-1 rounded-full ${
                            selectedAudio?.id === file.id 
                              ? 'hover:bg-blue-700' 
                              : isDarkMode 
                                ? 'hover:bg-gray-500' 
                                : 'hover:bg-gray-300'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAudioFile(file.id, e as React.MouseEvent);
                            
                            // If the deleted file was selected for the audio track, reset
                            if (selectedAudio?.id === file.id) {
                              // Find another file to use as default, or use the built-in sine wave
                              const nextFile = audioFiles.find(f => f.id !== file.id);
                              if (nextFile) {
                                setAudioTrackConfig(prev => ({
                                  ...prev,
                                  filePath: nextFile.path || '/audio/sine-440hz.mp3'
                                }));
                              } else {
                                setAudioTrackConfig(prev => ({
                                  ...prev,
                                  filePath: '/audio/sine-440hz.mp3'
                                }));
                              }
                            }
                          }}
                          aria-label={`Delete ${file.name}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {audioFiles.length === 0 && (
                  <div className={`p-4 text-center rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'} italic`}>
                    No audio files yet. Upload your first file!
                  </div>
                )}
              </div>
              
              {/* Audio Playback Controls */}
              <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Playback Settings</h4>
              
              <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loop Audio</h4>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Repeat track when finished</span>
                <button 
                  onClick={() => setAudioTrackConfig(prev => ({...prev, loop: !prev.loop}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${audioTrackConfig.loop ? 'bg-blue-600' : 'bg-gray-200'}`}
                  role="switch"
                  aria-checked={audioTrackConfig.loop}
                >
                  <span 
                    className={`${audioTrackConfig.loop ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
              
              <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Volume: {Math.round(audioTrackConfig.volume * 100)}%
              </h4>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={audioTrackConfig.volume}
                onChange={(e) => setAudioTrackConfig(prev => ({
                  ...prev,
                  volume: Number(e.target.value)
                }))}
                className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer mb-4`}
                aria-label="Audio track volume"
              />
              
              {/* Test/preview button */}
              <button
                className={`w-full ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                    : 'bg-blue-500 hover:bg-blue-400 text-white'
                } py-2 px-4 rounded-lg flex items-center justify-center`}
                onClick={() => {
                  // Preview the audio without starting the animation
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.src = audioTrackConfig.filePath;
                    audioPlayerRef.current.volume = audioTrackConfig.volume;
                    audioPlayerRef.current.loop = false; // Just a preview
                    
                    // Play a short preview
                    audioPlayerRef.current.currentTime = 0;
                    audioPlayerRef.current.play()
                      .then(() => {
                        // Set a timeout to stop after 5 seconds
                        setTimeout(() => {
                          if (audioPlayerRef.current && !isPlaying) {
                            audioPlayerRef.current.pause();
                          }
                        }, 5000);
                      })
                      .catch(err => console.error("Preview error:", err));
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preview (5s)
              </button>
            </div>
          </div>
        )}
        
        {/* Only show audio selection section in Audio Track mode */}
        {audioMode !== 'audioTrack' && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Audio Selection</h3>
            
            {/* Upload Audio */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upload Your Audio</h4>
              <input 
                type="file" 
                accept="audio/*"
                className={`w-full text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDarkMode ? 'file:bg-blue-900 file:text-blue-200' : 'file:bg-blue-50 file:text-blue-700'} ${isDarkMode ? 'hover:file:bg-blue-800' : 'hover:file:bg-blue-100'}`}
              />
              
              <button 
                className={`w-full mt-3 ${isDarkMode ? 'bg-blue-900 hover:bg-blue-800 text-blue-200' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'} py-2 px-4 rounded flex items-center justify-center`}
                onClick={() => {}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Show Your Song Library ({audioFiles.length})
              </button>
            </div>
            
            {/* Sample Audio */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sample Audio</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-3 rounded text-sm text-left ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  White noise for focus and relaxation
                </button>
                <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-3 rounded text-sm text-left ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Clean 440Hz sine wave tone
                </button>
                <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-3 rounded text-sm text-left ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Deeper 220Hz sine wave tone
                </button>
                <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-3 rounded text-sm text-left ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Soft triangle wave for gentle stimulation
                </button>
                <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-3 rounded text-sm text-left ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Gentle pink noise for relaxation
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Session Controls */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Session Controls</h3>
          
          {/* Session Timing */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Session Timing</h4>
            
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Start Time: 0:00</label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Position in the audio to start playback</p>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Session Duration: 1:00</label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>How long the session should last before fading out</p>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-2 rounded text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>1:00</button>
              <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-2 rounded text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>3:00</button>
              <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-2 rounded text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>5:00</button>
              <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-2 rounded text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>10:00</button>
              <button className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} p-2 rounded text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Full</button>
            </div>
          </div>
          
          {/* Pan Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Pan: {(panValue + 1)/2 * 100}% (Audio API: {panValue.toFixed(2)})</h4>
            <div className="flex items-center mb-1">
              <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>L</span>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={panValue * 100}
                onChange={(e) => setPanValue(Number(e.target.value) / 100)}
                className={`flex-1 mx-2 h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
              />
              <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>R</span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Manual control overrides sine wave while adjusting</p>
          </div>
          
          {/* Volume Control */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Volume: 70%</h4>
            <input 
              type="range" 
              min="0" 
              max="100" 
              className={`w-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <Link href="/" passHref className="w-full">
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold py-3 px-6 rounded">
              Simple Panner
            </button>
          </Link>
          
          <Link href="/beat-sync" passHref className="w-full">
            <button className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xl font-bold py-3 px-6 rounded relative group">
              Beat-Sync Panner
              <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold transform group-hover:scale-110 transition-transform">NEW</span>
            </button>
          </Link>
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
        {selectedAudio ? (
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