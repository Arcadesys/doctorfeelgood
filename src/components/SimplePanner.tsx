'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sampleAudioFiles } from '@/utils/sampleAudio';

// Interface for song library items
interface SongLibraryItem {
  id: string;
  title: string;
  lastUsed: number; // timestamp
  objectUrl?: string; // For current session only
}

/**
 * A simple audio panner component that just does stereo panning
 * Designed to work with a minimum of dependencies and browser quirks
 */
export function SimplePanner() {
  // State for the audio elements and controls
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioTitle, setAudioTitle] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [panValue, setPanValue] = useState(0.5); // Start at center
  const [volume, setVolume] = useState(0.7); // 0 to 1
  
  // Song library state
  const [songLibrary, setSongLibrary] = useState<SongLibraryItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Oscillation parameters
  const [oscillationEnabled, setOscillationEnabled] = useState(true);
  const [frequency, setFrequency] = useState(0.5); // Hz - cycles per second
  const [amplitude, setAmplitude] = useState(0.5); // 0 to 1 - how wide the pan goes
  const [offset, setOffset] = useState(0.5); // 0 to 1 - center position of the wave
  
  // Session timing parameters
  const [startTime, setStartTime] = useState(0); // Start position in seconds
  const [sessionDuration, setSessionDuration] = useState(60); // Duration in seconds
  const [remainingTime, setRemainingTime] = useState(sessionDuration); // Countdown timer
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  // Song-specific preset system
  const [savedSettings, setSavedSettings] = useState<{[songTitle: string]: {
    frequency: number;
    amplitude: number;
    offset: number;
    startTime: number;
    sessionDuration: number;
  }}>({});
  
  // References for the audio elements
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const pannerNode = useRef<StereoPannerNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioDuration = useRef<number>(0);
  
  // Load saved settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('audio-panner-song-settings');
      if (savedData) {
        setSavedSettings(JSON.parse(savedData));
      }
      
      // Load song library
      const libraryData = localStorage.getItem('audio-panner-song-library');
      if (libraryData) {
        setSongLibrary(JSON.parse(libraryData));
      }
    } catch (error) {
      console.error('Failed to load saved settings:', error);
    }
  }, []);
  
  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('audio-panner-song-settings', JSON.stringify(savedSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [savedSettings]);
  
  // Save song library to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('audio-panner-song-library', JSON.stringify(songLibrary));
    } catch (error) {
      console.error('Failed to save song library:', error);
    }
  }, [songLibrary]);
  
  // Function to save an uploaded file to IndexedDB
  const saveFileToStorage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Create a unique ID for the song
      const songId = `song-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      // Open IndexedDB
      const request = window.indexedDB.open('audio-panner-songs', 1);
      
      request.onerror = () => {
        console.error('Error opening IndexedDB');
        reject('Failed to open song storage');
      };
      
      // Create object store if needed
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBRequest).result;
        const transaction = db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        // Store the file as a blob
        const saveRequest = store.put(file, songId);
        
        saveRequest.onsuccess = () => {
          resolve(songId);
        };
        
        saveRequest.onerror = () => {
          reject('Failed to save song');
        };
      };
    });
  };
  
  // Function to load a file from IndexedDB
  const loadFileFromStorage = async (songId: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Open IndexedDB
      const request = window.indexedDB.open('audio-panner-songs', 1);
      
      request.onerror = () => {
        console.error('Error opening IndexedDB');
        reject('Failed to open song storage');
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBRequest).result;
        const transaction = db.transaction(['songs'], 'readonly');
        const store = transaction.objectStore('songs');
        
        // Get the file blob
        const getRequest = store.get(songId);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result);
          } else {
            reject('Song not found');
          }
        };
        
        getRequest.onerror = () => {
          reject('Failed to load song');
        };
      };
    });
  };
  
  // Function to delete a file from IndexedDB
  const deleteFileFromStorage = async (songId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Open IndexedDB
      const request = window.indexedDB.open('audio-panner-songs', 1);
      
      request.onerror = () => {
        console.error('Error opening IndexedDB');
        reject('Failed to open song storage');
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBRequest).result;
        const transaction = db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        // Delete the file
        const deleteRequest = store.delete(songId);
        
        deleteRequest.onsuccess = () => {
          resolve();
        };
        
        deleteRequest.onerror = () => {
          reject('Failed to delete song');
        };
      };
    });
  };
  
  // Function to handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      // Use the first file
      const file = files[0];
      setAudioFile(file);
      setAudioTitle(file.name);
      
      // Reset audio if it's already playing
      if (isPlaying) {
        handleStop();
      }
      
      // Create object URL for the audio element
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);
      
      if (!audioElement.current) {
        audioElement.current = new Audio();
      }
      
      // Setup metadata listener to get duration
      audioElement.current.onloadedmetadata = () => {
        if (audioElement.current) {
          audioDuration.current = audioElement.current.duration;
          console.log(`Audio duration: ${audioDuration.current}s`);
        }
      };
      
      audioElement.current.src = objectUrl;
      audioElement.current.load();
      
      // Save to song library
      try {
        const songId = await saveFileToStorage(file);
        
        // Update song library
        setSongLibrary(prev => {
          // Check if song already exists
          const existingIndex = prev.findIndex(s => s.title === file.name);
          if (existingIndex >= 0) {
            // Update existing entry
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              lastUsed: Date.now(),
              objectUrl
            };
            return updated;
          } else {
            // Add new entry
            return [...prev, {
              id: songId,
              title: file.name,
              lastUsed: Date.now(),
              objectUrl
            }];
          }
        });
        
        // Show success toast
        const toast = document.getElementById('song-saved-toast');
        if (toast) {
          toast.classList.remove('hidden');
          setTimeout(() => toast.classList.add('hidden'), 3000);
        }
      } catch (error) {
        console.error('Failed to save song to library:', error);
      }
      
      // Apply saved settings for this song if available
      applySettingsForSong(file.name);
    } catch (error) {
      console.error('Error handling file upload:', error);
    }
  };
  
  // Function to load a song from the library
  const loadSongFromLibrary = async (song: SongLibraryItem) => {
    try {
      // Stop current playback if any
      if (isPlaying) {
        handleStop();
      }
      
      // If the object URL is still valid (current session)
      if (song.objectUrl) {
        setAudioUrl(song.objectUrl);
        setAudioTitle(song.title);
        setAudioFile(null);
        
        if (!audioElement.current) {
          audioElement.current = new Audio();
        }
        
        audioElement.current.src = song.objectUrl;
        audioElement.current.load();
      } else {
        // Need to load from IndexedDB
        try {
          const file = await loadFileFromStorage(song.id);
          setAudioFile(file);
          setAudioTitle(song.title);
          
          // Create new object URL
          const objectUrl = URL.createObjectURL(file);
          setAudioUrl(objectUrl);
          
          if (!audioElement.current) {
            audioElement.current = new Audio();
          }
          
          audioElement.current.src = objectUrl;
          audioElement.current.load();
          
          // Update object URL in library
          setSongLibrary(prev => 
            prev.map(s => 
              s.id === song.id ? { ...s, objectUrl, lastUsed: Date.now() } : s
            )
          );
        } catch (error) {
          console.error('Failed to load song from storage:', error);
          alert('Failed to load song. It may have been deleted or is corrupted.');
          
          // Remove from library if can't be loaded
          handleDeleteSong(song.id);
          return;
        }
      }
      
      // Apply saved settings for this song if available
      applySettingsForSong(song.title);
      
      // Update last used timestamp
      setSongLibrary(prev => 
        prev.map(s => 
          s.id === song.id ? { ...s, lastUsed: Date.now() } : s
        )
      );
    } catch (error) {
      console.error('Error loading song from library:', error);
    }
  };
  
  // Function to delete a song from the library
  const handleDeleteSong = async (songId: string) => {
    try {
      // Get song info before deletion
      const song = songLibrary.find(s => s.id === songId);
      
      // Delete from IndexedDB
      await deleteFileFromStorage(songId);
      
      // Delete from song library state
      setSongLibrary(prev => prev.filter(s => s.id !== songId));
      
      // If this is the currently loaded song, clear it
      if (song && song.title === audioTitle) {
        if (isPlaying) {
          handleStop();
        }
        setAudioFile(null);
        setAudioUrl('');
        setAudioTitle('');
      }
      
      // Show success toast
      const toast = document.getElementById('song-deleted-toast');
      if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
      }
    } catch (error) {
      console.error('Failed to delete song:', error);
    }
  };
  
  // Function to load a sample audio
  const loadSampleAudio = (sampleId: string) => {
    // Find the sample
    const sample = sampleAudioFiles.find(s => s.id === sampleId);
    if (!sample) return;
    
    // Stop current playback if any
    if (isPlaying) {
      handleStop();
    }
    
    // Clear any uploaded file
    setAudioFile(null);
    const fileInput = document.getElementById('audioFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    // Set the sample
    setAudioUrl(sample.url);
    setAudioTitle(sample.title);
    
    if (!audioElement.current) {
      audioElement.current = new Audio();
    }
    
    // Setup metadata listener to get duration
    audioElement.current.onloadedmetadata = () => {
      if (audioElement.current) {
        audioDuration.current = audioElement.current.duration;
        console.log(`Audio duration: ${audioDuration.current}s`);
      }
    };
    
    audioElement.current.src = sample.url;
    audioElement.current.crossOrigin = 'anonymous'; // Important for CORS
    audioElement.current.load();
    
    // Apply saved settings for this song if available
    applySettingsForSong(sample.title);
  };
  
  // Apply settings for a specific song
  const applySettingsForSong = (songTitle: string) => {
    if (savedSettings[songTitle]) {
      setFrequency(savedSettings[songTitle].frequency);
      setAmplitude(savedSettings[songTitle].amplitude);
      setOffset(savedSettings[songTitle].offset);
      
      // Apply timing settings if available
      if (savedSettings[songTitle].startTime !== undefined) {
        setStartTime(savedSettings[songTitle].startTime);
      }
      
      if (savedSettings[songTitle].sessionDuration !== undefined) {
        setSessionDuration(savedSettings[songTitle].sessionDuration);
        setRemainingTime(savedSettings[songTitle].sessionDuration);
      }
    }
  };
  
  // Save current settings for the current song
  const saveSettingsForCurrentSong = () => {
    if (!audioTitle) return;
    
    const newSettings = {
      ...savedSettings,
      [audioTitle]: {
        frequency,
        amplitude,
        offset,
        startTime,
        sessionDuration,
      }
    };
    
    setSavedSettings(newSettings);
    
    // Show a temporary toast notification
    const toast = document.getElementById('settings-saved-toast');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    }
  };
  
  // Function to start playback with panning
  const handlePlay = async () => {
    try {
      if (!audioUrl || !audioElement.current) {
        console.error("No audio loaded");
        return;
      }
      
      console.log("Starting audio playback for:", audioUrl);
      
      // Create audio context if it doesn't exist
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || 
          (window as any).webkitAudioContext)();
        console.log("Created audio context");
      }
      
      // If the context is suspended (autoplay policy), resume it
      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
        console.log("Resumed audio context");
      }
      
      // Create nodes if they don't exist yet
      if (!sourceNode.current) {
        console.log("Creating audio nodes");
        sourceNode.current = audioContext.current.createMediaElementSource(audioElement.current);
        pannerNode.current = audioContext.current.createStereoPanner();
        gainNode.current = audioContext.current.createGain();
        
        // Connect the nodes
        sourceNode.current.connect(pannerNode.current);
        pannerNode.current.connect(gainNode.current);
        gainNode.current.connect(audioContext.current.destination);
        
        // Set initial values
        pannerNode.current.pan.value = panValue;
        gainNode.current.gain.value = volume;
      }
      
      // Set the starting position
      audioElement.current.currentTime = startTime;
      
      // Reset the session timer
      setRemainingTime(sessionDuration);
      setIsFadingOut(false);
      
      // Start the session timer
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      
      sessionTimerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          // Start fading out during the last 5 seconds
          if (prev <= 5 && !isFadingOut) {
            setIsFadingOut(true);
          }
          
          // Stop when timer reaches zero
          if (prev <= 1) {
            handleStop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Start playback
      console.log("Starting playback from", startTime, "seconds");
      await audioElement.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error starting playback:", error);
      
      // Fallback: try direct playback if Web Audio API fails
      try {
        if (audioElement.current) {
          console.log("Trying fallback direct playback");
          audioElement.current.currentTime = startTime;
          await audioElement.current.play();
          setIsPlaying(true);
        }
      } catch (fallbackError) {
        console.error("Fallback playback also failed:", fallbackError);
        alert("Could not play audio. Please try again or use a different browser.");
      }
    }
  };
  
  // Function to stop playback
  const handleStop = () => {
    if (audioElement.current) {
      audioElement.current.pause();
      audioElement.current.currentTime = startTime;
    }
    
    // Clear the session timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    setIsPlaying(false);
    setIsFadingOut(false);
  };
  
  // Effect to update pan value when it changes
  useEffect(() => {
    if (pannerNode.current) {
      // Map from UI range (0-1) to audio API range (-1 to 1)
      pannerNode.current.pan.value = (panValue * 2) - 1;
    }
  }, [panValue]);
  
  // Effect to update volume when it changes
  useEffect(() => {
    if (gainNode.current) {
      gainNode.current.gain.value = volume;
    }
  }, [volume]);
  
  // Effect to handle fade-out
  useEffect(() => {
    if (isFadingOut && gainNode.current) {
      // Calculate fade volume based on remaining time (0-5 seconds)
      const fadeVolume = Math.max(0, Math.min(1, remainingTime / 5)) * volume;
      gainNode.current.gain.value = fadeVolume;
      
      // Also slow down the frequency as we fade out
      if (remainingTime < 5 && remainingTime > 0) {
        const slowdownFactor = Math.max(0.2, remainingTime / 5);
        setFrequency(prev => prev * slowdownFactor);
      }
    }
  }, [isFadingOut, remainingTime, volume]);
  
  // Oscillation effect using sine wave
  useEffect(() => {
    if (!isPlaying || !oscillationEnabled) return;
    
    // Track animation time
    let startAnimTime = Date.now();
    
    const interval = setInterval(() => {
      // Calculate elapsed time in seconds
      const elapsedTime = (Date.now() - startAnimTime) / 1000;
      
      // Calculate sine wave: offset + amplitude * sin(2π * frequency * time)
      // This creates a wave centered at 'offset' with amplitude 'amplitude'
      // that completes 'frequency' cycles per second
      const newPanValue = offset + amplitude * Math.sin(2 * Math.PI * frequency * elapsedTime);
      
      // Clamp between 0 and 1 to ensure it's a valid pan value
      const clampedPanValue = Math.max(0, Math.min(1, newPanValue));
      
      // Update pan value
      setPanValue(clampedPanValue);
    }, 16); // ~60fps for smooth visual updates
    
    return () => clearInterval(interval);
  }, [isPlaying, oscillationEnabled, frequency, amplitude, offset]);
  
  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Convert Hz to BPM (60 * Hz)
  const frequencyToBpm = (hz: number) => Math.round(hz * 60);
  const bpmToFrequency = (bpm: number) => bpm / 60;
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">Simple Audio Panner</h1>
      
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        {/* File upload */}
        <div className="mb-4">
          <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Your Audio
          </label>
          <input
            id="audioFile"
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        {/* Song library button */}
        <div className="mb-4">
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 px-3 rounded flex items-center justify-center"
            aria-expanded={showLibrary}
          >
            <span className="mr-2">
              {showLibrary ? 'Hide' : 'Show'} Your Song Library ({songLibrary.length})
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${showLibrary ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Song library */}
        {showLibrary && (
          <div className="mb-4 border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-gray-50 py-2 px-3 border-b border-gray-200 text-sm font-medium">
              Your Song Library ({songLibrary.length})
            </div>
            
            {songLibrary.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Your library is empty. Upload songs to save them here.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                {songLibrary.sort((a, b) => b.lastUsed - a.lastUsed).map(song => (
                  <li key={song.id} className="hover:bg-gray-50">
                    <div className="flex items-center justify-between p-3">
                      <button
                        onClick={() => loadSongFromLibrary(song)}
                        className="flex-1 text-left flex flex-col"
                      >
                        <span className="font-medium truncate" title={song.title}>
                          {song.title.length > 25 ? song.title.substring(0, 25) + '...' : song.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          Last used: {formatDate(song.lastUsed)}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${song.title}" from your library?`)) {
                            handleDeleteSong(song.id);
                          }
                        }}
                        className="ml-2 text-red-500 hover:text-red-700 p-1"
                        aria-label={`Delete ${song.title}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {/* Sample audio options */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Audio</h3>
          <div className="grid grid-cols-2 gap-2">
            {sampleAudioFiles.map(sample => (
              <button
                key={sample.id}
                onClick={() => loadSampleAudio(sample.id)}
                className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-left"
              >
                <div className="font-medium">{sample.title}</div>
                <div className="text-xs text-gray-500">{sample.description}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Currently loaded audio */}
        {audioTitle && (
          <div className="mb-4 p-2 bg-blue-50 rounded">
            <div className="text-sm font-medium">Currently loaded:</div>
            <div className="text-xs">{audioTitle}</div>
            {/* Show attribution for sample sounds */}
            {!audioFile && audioUrl && sampleAudioFiles.find(s => s.url === audioUrl)?.attribution && (
              <div className="text-xs text-gray-500 mt-1">
                {sampleAudioFiles.find(s => s.url === audioUrl)?.attribution}
              </div>
            )}
          </div>
        )}
        
        {/* Session timing controls */}
        <div className="mb-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Session Timing</h3>
          
          <div className="space-y-3">
            {/* Start time control */}
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time: {formatTime(startTime)}
              </label>
              <input
                id="startTime"
                type="range"
                min="0"
                max={audioDuration.current > 0 ? audioDuration.current - 10 : 600}
                step="1"
                value={startTime}
                onChange={(e) => setStartTime(parseFloat(e.target.value))}
                className="w-full"
                disabled={isPlaying}
              />
              <div className="text-xs text-gray-500 mt-1">
                Position in the audio to start playback
              </div>
            </div>
            
            {/* Session duration control */}
            <div>
              <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700 mb-1">
                Session Duration: {formatTime(sessionDuration)}
              </label>
              <input
                id="sessionDuration"
                type="range"
                min="10"
                max="1800" // 30 minutes max
                step="10"
                value={sessionDuration}
                onChange={(e) => {
                  setSessionDuration(parseFloat(e.target.value));
                  setRemainingTime(parseFloat(e.target.value));
                }}
                className="w-full"
                disabled={isPlaying}
              />
              <div className="text-xs text-gray-500 mt-1">
                How long the session should last before fading out
              </div>
            </div>
            
            {/* Common duration presets */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[30, 60, 120, 300, 600].map(seconds => (
                <button
                  key={seconds}
                  onClick={() => {
                    setSessionDuration(seconds);
                    setRemainingTime(seconds);
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={isPlaying}
                >
                  {formatTime(seconds)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Playback controls */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={handlePlay}
            disabled={!audioUrl || isPlaying}
            className={`px-4 py-2 rounded ${
              !audioUrl || isPlaying
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Play
          </button>
          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className={`px-4 py-2 rounded ${
              !isPlaying
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Stop
          </button>
        </div>
        
        {/* Timer display when playing */}
        {isPlaying && (
          <div className="mb-4 text-center">
            <div className="text-xl font-mono font-bold">
              {formatTime(remainingTime)}
            </div>
            <div className="text-xs text-gray-500">
              {isFadingOut ? "Fading out..." : "Time remaining"}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(remainingTime / sessionDuration) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Pan control */}
        <div className="mb-4">
          <label htmlFor="panControl" className="block text-sm font-medium text-gray-700 mb-2">
            Current Pan: {panValue.toFixed(2)} (Audio API: {((panValue * 2) - 1).toFixed(2)})
            <span className="ml-2 text-xs text-gray-500">
              {panValue < 0.4 ? 'Left' : panValue > 0.6 ? 'Right' : 'Center'}
            </span>
          </label>
          <input
            id="panControl"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={panValue}
            onChange={(e) => setPanValue(parseFloat(e.target.value))}
            className="w-full"
            aria-label={`Pan position: ${panValue.toFixed(2)}`}
          />
          <div className="text-xs text-gray-500 mt-1">
            (Manual control overrides sine wave while adjusting)
          </div>
        </div>
        
        {/* Volume control */}
        <div className="mb-4">
          <label htmlFor="volumeControl" className="block text-sm font-medium text-gray-700 mb-2">
            Volume: {Math.round(volume * 100)}%
          </label>
          <input
            id="volumeControl"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        {/* Oscillation controls */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <input
              id="oscillation"
              type="checkbox"
              checked={oscillationEnabled}
              onChange={(e) => setOscillationEnabled(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="oscillation" className="text-sm font-medium text-gray-700">
              Enable sine wave panning
            </label>
          </div>
          
          {oscillationEnabled && (
            <div className="space-y-3">
              {/* Frequency control - now displayed as BPM */}
              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency: {frequency.toFixed(2)} Hz ({frequencyToBpm(frequency)} BPM)
                </label>
                <input
                  id="frequency"
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.01"
                  value={frequency}
                  onChange={(e) => setFrequency(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Speed of oscillation - higher values = faster panning
                </div>
              </div>
              
              {/* Direct BPM input */}
              <div>
                <label htmlFor="bpm" className="block text-sm font-medium text-gray-700 mb-1">
                  Or enter BPM directly:
                </label>
                <input
                  id="bpm"
                  type="number"
                  min="6"
                  max="120"
                  value={frequencyToBpm(frequency)}
                  onChange={(e) => setFrequency(bpmToFrequency(parseInt(e.target.value) || 60))}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              {/* Amplitude control */}
              <div>
                <label htmlFor="amplitude" className="block text-sm font-medium text-gray-700 mb-1">
                  Amplitude: {amplitude.toFixed(2)}
                </label>
                <input
                  id="amplitude"
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={amplitude}
                  onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Width of panning - how far sound moves from center
                </div>
              </div>
              
              {/* Offset control */}
              <div>
                <label htmlFor="offset" className="block text-sm font-medium text-gray-700 mb-1">
                  Center position: {offset.toFixed(2)}
                </label>
                <input
                  id="offset"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={offset}
                  onChange={(e) => setOffset(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Center position of the wave - 0 = left, 0.5 = center, 1 = right
                </div>
              </div>
              
              {/* Save settings for current song */}
              {audioTitle && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={saveSettingsForCurrentSong}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-3 rounded"
                  >
                    Save Settings for "{audioTitle.length > 20 ? audioTitle.substring(0, 20) + '...' : audioTitle}"
                  </button>
                  <div className="text-xs text-gray-500 mt-1">
                    These settings will be automatically applied when you load this song again
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="mt-6 flex items-center justify-center w-full max-w-md">
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${isPlaying ? (isFadingOut ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-400'}`}
            style={{ 
              width: '10px', 
              marginLeft: `${panValue * 100}%`, // Map 0...1 to 0%...100%
              transition: 'margin-left 0.1s ease-out'
            }}
          />
        </div>
      </div>
      
      {/* Status text */}
      <div className="mt-2 text-sm text-gray-500">
        {isPlaying ? (isFadingOut ? 'Fading out' : 'Playing') : 'Stopped'} - 
        Pan: {panValue.toFixed(2)} (API: {((panValue * 2) - 1).toFixed(2)}) &nbsp;
        {oscillationEnabled ? 
          `(Sine wave: ${frequency.toFixed(1)}Hz, ${frequencyToBpm(frequency)} BPM, amplitude: ${amplitude.toFixed(2)})` : 
          '(Manual control)'
        }
      </div>
      
      {/* Accessibility info */}
      <div className="sr-only" aria-live="polite">
        {isPlaying ? (
          isFadingOut ? 
            `Audio is fading out. ${formatTime(remainingTime)} remaining.` : 
            `Audio is playing. ${formatTime(remainingTime)} remaining.`
        ) : 'Audio is stopped'}. 
        Pan position: {panValue.toFixed(2)}.
        {oscillationEnabled ? 
          `Using sine wave oscillation with frequency ${frequency} Hertz, ${frequencyToBpm(frequency)} BPM, and amplitude ${amplitude}.` : 
          'Using manual panning control.'
        }
      </div>
      
      {/* Toast notifications */}
      <div id="settings-saved-toast" className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md hidden">
        Settings saved successfully!
      </div>
      
      <div id="song-saved-toast" className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md hidden">
        Song added to your library!
      </div>
      
      <div id="song-deleted-toast" className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-md hidden">
        Song removed from your library
      </div>
    </div>
  );
} 