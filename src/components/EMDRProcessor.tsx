'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Simple version without the File System Access API
type AudioFile = {
  id: string;
  name: string;
  lastUsed: string;
  path?: string;
};

export function EMDRProcessor() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [folderPath, setFolderPath] = useState<string>('');
  const [a11yMessage, setA11yMessage] = useState<string>('Visual target ready. Audio controls available at bottom of screen.');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Animation state
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOpenSoundRef = useRef<HTMLAudioElement>(null);
  const menuCloseSoundRef = useRef<HTMLAudioElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playStatusSoundRef = useRef<HTMLAudioElement>(null);
  
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
  
  // Handle canvas animation based on play state
  useEffect(() => {
    if (isPlaying && canvasRef.current) {
      // Position and properties of the visual target
      let x = window.innerWidth / 2;
      let direction = 1; // 1 = right, -1 = left
      const ballRadius = 20;
      const moveSpeed = 3;
      const maxX = window.innerWidth - ballRadius;
      const minX = ballRadius;
      
      // Animation function
      const animate = () => {
        if (!canvasRef.current) return;
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Move ball
        x += moveSpeed * direction;
        
        // Reverse direction if hitting edge
        if (x > maxX || x < minX) {
          direction *= -1;
          // Play a gentle tone when direction changes
          const oscillator = new AudioContext().createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(direction > 0 ? 440 : 330, 0);
          oscillator.connect(new AudioContext().destination);
          oscillator.start();
          oscillator.stop(0.1); // Short beep
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
      animationIdRef.current = requestAnimationFrame(animate);
      setAnimationFrameId(animationIdRef.current);
    } else {
      // Stop animation and clear canvas when paused
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
        setAnimationFrameId(null);
        
        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }
    }
    
    // Cleanup animation frame on component unmount
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
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
        audioPlayerRef.current.src = '/audio/sine-440hz.mp3';
        audioPlayerRef.current.load();
      }
      return;
    }
    
    // Play the audio file
    if (audioPlayerRef.current) {
      // For all files, use the placeholder if not in development with default file
      audioPlayerRef.current.src = '/sounds/menu-open.mp3'; 
      
      console.log(`Playing audio: ${audioPlayerRef.current.src}`);
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
    if (!selectedAudio || !audioPlayerRef.current) return;
    
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setA11yMessage('Paused. Visual target stopped.');
      // Play pause status sound (if available)
      playStatusSoundRef.current?.play().catch(e => console.error('Error playing status sound:', e));
    } else {
      audioPlayerRef.current.play()
        .then(() => {
          setA11yMessage(`Playing ${selectedAudio.name}. Visual target active.`);
          // Play play status sound (if available)
          playStatusSoundRef.current?.play().catch(e => console.error('Error playing status sound:', e));
        })
        .catch(error => console.error("Error playing audio:", error));
    }
    
    setIsPlaying(!isPlaying);
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
      const oscillator = new AudioContext().createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(220, 0);
      oscillator.connect(new AudioContext().destination);
      oscillator.start();
      oscillator.stop(0.2);
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      // Play a higher tone for light mode
      const oscillator = new AudioContext().createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, 0);
      oscillator.connect(new AudioContext().destination);
      oscillator.start();
      oscillator.stop(0.2);
    }
    
    // Announce for screen readers
    setA11yMessage(`${newDarkMode ? 'Dark' : 'Light'} mode activated`);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-4 relative`}>
      {/* Audio elements for sound effects and playback */}
      <audio ref={menuOpenSoundRef} src="/sounds/menu-open.mp3" preload="auto" />
      <audio ref={menuCloseSoundRef} src="/sounds/menu-close.mp3" preload="auto" />
      <audio ref={playStatusSoundRef} src="/sounds/status-change.mp3" preload="auto" />
      <audio 
        ref={audioPlayerRef}
        onEnded={() => {
          setIsPlaying(false);
          setA11yMessage('Audio ended. Visual target stopped.');
        }}
        onError={() => {
          setIsPlaying(false);
          setA11yMessage('Error playing audio. Visual target stopped.');
        }}
      />
      
      {/* Hamburger Menu Button */}
      <button 
        className="absolute top-4 right-4 text-white z-20"
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
        
        {/* Audio Selection Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Audio Selection</h3>
          
          {/* Upload Audio */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className="font-bold mb-2">Upload Your Audio</h4>
            <input 
              type="file" 
              accept="audio/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            <button 
              className="w-full mt-3 bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded flex items-center justify-center"
              onClick={() => {}}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Show Your Song Library (0)
            </button>
          </div>
          
          {/* Sample Audio */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className="font-bold mb-2">Sample Audio</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-gray-100 p-3 rounded text-sm text-left hover:bg-gray-200">
                White noise for focus and relaxation
              </button>
              <button className="bg-gray-100 p-3 rounded text-sm text-left hover:bg-gray-200">
                Clean 440Hz sine wave tone
              </button>
              <button className="bg-gray-100 p-3 rounded text-sm text-left hover:bg-gray-200">
                Deeper 220Hz sine wave tone
              </button>
              <button className="bg-gray-100 p-3 rounded text-sm text-left hover:bg-gray-200">
                Soft triangle wave for gentle stimulation
              </button>
              <button className="bg-gray-100 p-3 rounded text-sm text-left hover:bg-gray-200">
                Gentle pink noise for relaxation
              </button>
            </div>
          </div>
        </div>
        
        {/* Session Controls */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white dark:text-white text-gray-800 mb-4">Session Controls</h3>
          
          {/* Session Timing */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className="font-bold mb-2">Session Timing</h4>
            
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className="text-sm">Start Time: 0:00</label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">Position in the audio to start playback</p>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className="text-sm">Session Duration: 1:00</label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">How long the session should last before fading out</p>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              <button className="bg-gray-100 p-2 rounded text-xs hover:bg-gray-200">1:00</button>
              <button className="bg-gray-100 p-2 rounded text-xs hover:bg-gray-200">3:00</button>
              <button className="bg-gray-100 p-2 rounded text-xs hover:bg-gray-200">5:00</button>
              <button className="bg-gray-100 p-2 rounded text-xs hover:bg-gray-200">10:00</button>
              <button className="bg-gray-100 p-2 rounded text-xs hover:bg-gray-200">Full</button>
            </div>
          </div>
          
          {/* Pan Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className="font-bold mb-2">Current Pan: 0.50 (Audio API: 0.00)</h4>
            <div className="flex items-center mb-1">
              <span className="text-xs">L</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="flex-1 mx-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs">R</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Manual control overrides sine wave while adjusting</p>
          </div>
          
          {/* Volume Control */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className="font-bold mb-2">Volume: 70%</h4>
            <input 
              type="range" 
              min="0" 
              max="100" 
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
        className="fixed top-0 left-0 w-screen h-screen -z-10"
        aria-label="EMDR visual target canvas"
        role="img"
        aria-live="polite"
      />
      
      {/* Accessibility announcement for screen readers */}
      <div className="sr-only" aria-live="polite">
        {a11yMessage}
      </div>
      
      {/* Minimalist Audio Player Controls */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-80 p-4 rounded-full shadow-lg z-10">
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
            
            <div className="text-white text-center">
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