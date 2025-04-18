'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOpenSoundRef = useRef<HTMLAudioElement>(null);
  const menuCloseSoundRef = useRef<HTMLAudioElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  
  // Load audio metadata on mount
  useEffect(() => {
    // In a real implementation, this would communicate with a backend service
    // that can access the filesystem directly
    const storedFiles = localStorage.getItem('audioFilesMeta');
    
    // In development, look for Outer Wilds.m4a on disk
    if (process.env.NODE_ENV === 'development') {
      try {
        // For Next.js in development, we'll look in the public directory
        const defaultFiles = [
          { 
            id: '1', 
            name: 'Outer Wilds.m4a', 
            lastUsed: new Date().toLocaleString(), 
            path: '/music/Outer Wilds.m4a' 
          }
        ];
        setAudioFiles(defaultFiles);
        console.log('Development mode: Looking for Outer Wilds.m4a in public/music directory');
        return;
      } catch (error) {
        console.error('Error accessing file in development:', error);
      }
    }
    
    if (storedFiles) {
      setAudioFiles(JSON.parse(storedFiles));
    } else {
      // Default sample files
      const defaultFiles = [
        { id: '1', name: 'Outer Wilds.m4a', lastUsed: '4/18/2025 08:58 AM', path: '/music/Outer Wilds.m4a' }
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
    
    // In a real implementation, this would access the file from the filesystem
    if (audioPlayerRef.current) {
      if (process.env.NODE_ENV === 'development' && file.name === 'Outer Wilds.m4a') {
        // In development, use the actual file path relative to the public directory
        audioPlayerRef.current.src = file.path || '/sounds/menu-open.mp3';
        console.log('Playing actual file from path:', file.path);
      } else {
        // For this mock, we'll just simulate playback with a placeholder sound
        audioPlayerRef.current.src = '/sounds/menu-open.mp3'; 
      }
      
      audioPlayerRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error("Error playing audio:", error));
    }
    
    // Update last used timestamp
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    const updatedFiles = audioFiles.map(f => 
      f.id === file.id ? {...f, lastUsed: formattedDate} : f
    );
    
    setAudioFiles(updatedFiles);
  };
  
  // Handle audio playback controls
  const togglePlayPause = () => {
    if (!selectedAudio || !audioPlayerRef.current) return;
    
    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play()
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 relative">
      {/* Audio elements for sound effects and playback */}
      <audio ref={menuOpenSoundRef} src="/sounds/menu-open.mp3" preload="auto" />
      <audio ref={menuCloseSoundRef} src="/sounds/menu-close.mp3" preload="auto" />
      <audio 
        ref={audioPlayerRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
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
        className={`fixed top-0 right-0 h-full bg-gray-900 w-80 p-6 shadow-lg z-10 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}
        aria-hidden={!isMenuOpen}
      >
        <h2 className="text-2xl font-bold mb-6 text-white">EMDR Settings</h2>
        
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
        
        {/* Audio Files Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Your Song Library ({audioFiles.length})</h3>
            <button 
              onClick={selectMusicFolder}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded flex items-center"
            >
              {folderPath ? 'Change Folder' : 'Select Folder'}
            </button>
          </div>
          
          {folderPath && (
            <div className="bg-gray-800 text-white p-2 rounded mb-2 text-xs truncate">
              <span className="font-semibold">Current folder:</span> {folderPath}
            </div>
          )}
          
          <div className="bg-white rounded-lg overflow-hidden">
            {audioFiles.length > 0 ? (
              audioFiles.map(file => (
                <div 
                  key={file.id}
                  className={`p-4 border-b border-gray-200 cursor-pointer flex justify-between items-center ${selectedAudio?.id === file.id ? 'bg-blue-50' : ''}`}
                  onClick={() => selectAudioFile(file)}
                >
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-gray-500">Last used: {file.lastUsed}</div>
                    {file.path && <div className="text-xs text-gray-400 truncate max-w-xs">{file.path}</div>}
                  </div>
                  <button 
                    className="text-red-500 hover:text-red-700" 
                    onClick={(e) => deleteAudioFile(file.id, e)}
                    aria-label={`Remove ${file.name} from library`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {folderPath 
                  ? "No audio files found in the selected folder. Try selecting a different folder." 
                  : "Select a folder containing your audio files."}
              </div>
            )}
          </div>
          
          <div className="mt-4 text-white text-sm">
            <p>
              <strong>Note:</strong> This is a mock implementation to demonstrate the concept. In a real app, 
              your music would be loaded directly from the file system.
            </p>
          </div>
        </div>
        
        <div className="w-full grid grid-cols-1 gap-4">
          <div className="bg-gray-800 p-4 rounded text-white">
            <h3 className="font-bold mb-2">Simple Panner</h3>
            <ul className="text-sm space-y-1 list-disc pl-4">
              <li>Manual control of panning speed</li>
              <li>Classic sine wave oscillation</li>
              <li>Consistent, predictable pattern</li>
              <li>Good for relaxation & meditation</li>
            </ul>
          </div>
          
          <div className="bg-purple-900 p-4 rounded text-white">
            <h3 className="font-bold mb-2">Beat-Sync Panner</h3>
            <ul className="text-sm space-y-1 list-disc pl-4">
              <li>Syncs panning with music beats</li>
              <li>Use music from your filesystem</li>
              <li>Automatic BPM detection</li>
              <li>Perfect for rhythmic processing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content with Canvas */}
      <h1 className="text-3xl font-bold mb-6 text-white">EMDR Therapy</h1>
      
      {/* Canvas for visual target */}
      <div className="w-full max-w-2xl h-64 md:h-96 bg-gray-800 rounded-lg mb-6 flex items-center justify-center" 
           aria-label="Visual target area - currently empty">
        <p className="text-gray-500">Visual target will appear here</p>
      </div>
      
      {/* Audio Player Controls */}
      {selectedAudio ? (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg w-full max-w-2xl flex items-center justify-between">
          <div className="text-white">
            <div className="font-medium">{selectedAudio.name}</div>
            <div className="text-xs text-gray-400">From: {selectedAudio.path || "Library"}</div>
          </div>
          
          <button
            onClick={togglePlayPause}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-3"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>
        </div>
      ) : (
        <div className="mb-6 w-full max-w-2xl">
          <button 
            onClick={selectMusicFolder}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            {folderPath ? 'Select a Different Music Folder' : 'Select Your Music Folder'}
          </button>
        </div>
      )}
      
      <p className="text-white text-center text-sm">
        Use the menu in the top right to select your preferred EMDR mode
        {selectedAudio && isPlaying && <span> | Now playing: {selectedAudio.name}</span>}
      </p>
    </div>
  );
} 