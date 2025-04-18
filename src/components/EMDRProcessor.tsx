'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type AudioFile = {
  id: string;
  name: string;
  lastUsed: string;
};

export function EMDRProcessor() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([
    { id: '1', name: 'Outer Wilds.m4a', lastUsed: '4/18/2025 08:51 AM' }
  ]);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOpenSoundRef = useRef<HTMLAudioElement>(null);
  const menuCloseSoundRef = useRef<HTMLAudioElement>(null);
  
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
  
  // Handle audio file selection
  const selectAudioFile = (file: AudioFile) => {
    setSelectedAudio(file);
    // Play a selection sound if you want
  };
  
  // Handle audio file deletion
  const deleteAudioFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the file when clicking delete
    setAudioFiles(audioFiles.filter(file => file.id !== id));
    if (selectedAudio?.id === id) {
      setSelectedAudio(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 relative">
      {/* Audio elements for sound effects */}
      <audio ref={menuOpenSoundRef} src="/sounds/menu-open.mp3" preload="auto" />
      <audio ref={menuCloseSoundRef} src="/sounds/menu-close.mp3" preload="auto" />
      
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
          <h3 className="text-xl font-bold mb-4 text-white">Your Song Library ({audioFiles.length})</h3>
          
          <div className="bg-white rounded-lg overflow-hidden">
            {audioFiles.map(file => (
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
            ))}
          </div>
          
          {/* Upload Button */}
          <div className="mt-4">
            <label className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Music
              <input type="file" accept="audio/*" className="hidden" />
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
      
      <p className="text-white text-center text-sm">
        Use the menu in the top right to select your preferred EMDR mode
        {selectedAudio && <span> | Playing: {selectedAudio.name}</span>}
      </p>
    </div>
  );
} 