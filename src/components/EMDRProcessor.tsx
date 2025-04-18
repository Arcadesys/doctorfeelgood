'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type AudioFile = {
  id: string;
  name: string;
  lastUsed: string;
  url?: string; // For locally stored files
  data?: string; // For base64 encoded audio data
};

export function EMDRProcessor() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUploadTip, setShowUploadTip] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOpenSoundRef = useRef<HTMLAudioElement>(null);
  const menuCloseSoundRef = useRef<HTMLAudioElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  
  // Load audio files from localStorage on component mount
  useEffect(() => {
    const storedFiles = localStorage.getItem('audioFiles');
    if (storedFiles) {
      setAudioFiles(JSON.parse(storedFiles));
    } else {
      // Default sample file
      const defaultFiles = [
        { id: '1', name: 'Outer Wilds.m4a', lastUsed: '4/18/2025 08:51 AM' }
      ];
      setAudioFiles(defaultFiles);
      localStorage.setItem('audioFiles', JSON.stringify(defaultFiles));
    }
    
    // Load last selected audio
    const lastSelectedAudio = localStorage.getItem('selectedAudio');
    if (lastSelectedAudio) {
      setSelectedAudio(JSON.parse(lastSelectedAudio));
    }

    // Show upload tip if no files have been uploaded yet
    if (!localStorage.getItem('uploadTipShown')) {
      setShowUploadTip(true);
      // Set a timeout to hide the tip after 5 seconds
      setTimeout(() => {
        setShowUploadTip(false);
        localStorage.setItem('uploadTipShown', 'true');
      }, 5000);
    }
  }, []);
  
  // Save audio files to localStorage when they change
  useEffect(() => {
    localStorage.setItem('audioFiles', JSON.stringify(audioFiles));
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
  
  // Handle audio file selection and playback
  const selectAudioFile = (file: AudioFile) => {
    setSelectedAudio(file);
    
    // Play the selected audio if it has data
    if (file.data && audioPlayerRef.current) {
      audioPlayerRef.current.src = file.data;
      audioPlayerRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error("Error playing audio:", error));
    } else if (file.url && audioPlayerRef.current) {
      audioPlayerRef.current.src = file.url;
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
    
    // Remove the file from state
    setAudioFiles(audioFiles.filter(file => file.id !== id));
    
    // Clear selected audio if it's the one being deleted
    if (selectedAudio?.id === id) {
      setSelectedAudio(null);
      localStorage.removeItem('selectedAudio');
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        // Create a new audio file entry
        const newFile: AudioFile = {
          id: Date.now().toString(),
          name: file.name,
          lastUsed: new Date().toLocaleString(),
          data: event.target.result as string
        };
        
        // Add to audio files list
        const updatedFiles = [...audioFiles, newFile];
        setAudioFiles(updatedFiles);
        
        // Select the newly uploaded file
        selectAudioFile(newFile);
        
        // Play a success sound
        const successSound = new Audio('/sounds/upload-success.mp3');
        successSound.play().catch(e => console.log('Could not play success sound', e));
        
        // Show the menu to see the uploaded file
        if (!isMenuOpen) {
          toggleMenu();
        }
      }
    };
    
    reader.readAsDataURL(file);
    
    // Reset the file input
    if (e.target === fileInputRef.current) {
      fileInputRef.current.value = '';
    } else if (e.target === mainFileInputRef.current) {
      mainFileInputRef.current.value = '';
    }
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
      
      {/* Main Upload Button (always visible) */}
      <div className="fixed bottom-6 right-6 z-10">
        <label className="bg-green-600 hover:bg-green-500 text-white rounded-full p-4 shadow-lg flex items-center justify-center cursor-pointer transform hover:scale-105 transition-transform duration-200" aria-label="Upload Music">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <input 
            ref={mainFileInputRef}
            type="file" 
            accept="audio/*" 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </label>
        
        {/* Upload Tip */}
        {showUploadTip && (
          <div className="absolute bottom-16 right-0 bg-white text-black p-3 rounded-lg shadow-lg text-sm w-48 animate-pulse">
            Click here to upload your music!
            <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-8 border-l-transparent border-t-8 border-t-white border-r-8 border-r-transparent"></div>
          </div>
        )}
      </div>

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
          <h3 className="text-xl font-bold mb-4 text-white">Your Song Library ({audioFiles.length})</h3>
          
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
                  </div>
                  <button 
                    className="text-red-500 hover:text-red-700" 
                    onClick={(e) => deleteAudioFile(file.id, e)}
                    aria-label={`Delete ${file.name}`}
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
                No audio files available. Upload some music!
              </div>
            )}
          </div>
          
          {/* Upload Button in Menu */}
          <div className="mt-4">
            <label className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Music
              <input 
                ref={fileInputRef}
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
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
              <li>Upload your favorite songs</li>
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
      {selectedAudio && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg w-full max-w-2xl flex items-center justify-between">
          <div className="text-white">
            <div className="font-medium">{selectedAudio.name}</div>
            <div className="text-xs text-gray-400">Selected from library</div>
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
      )}
      
      <p className="text-white text-center text-sm">
        Use the menu in the top right to select your preferred EMDR mode
        {selectedAudio && isPlaying && <span> | Now playing: {selectedAudio.name}</span>}
      </p>
    </div>
  );
} 