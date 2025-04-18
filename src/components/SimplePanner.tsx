'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sampleAudioFiles } from '@/utils/sampleAudio';

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
  const [panValue, setPanValue] = useState(0); // -1 (left) to 1 (right)
  const [volume, setVolume] = useState(0.7); // 0 to 1
  const [oscillationEnabled, setOscillationEnabled] = useState(true);
  const [oscillationSpeed, setOscillationSpeed] = useState(0.01);
  
  // References for the audio elements
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const pannerNode = useRef<StereoPannerNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Function to handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
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
    
    audioElement.current.src = objectUrl;
    audioElement.current.load();
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
    
    audioElement.current.src = sample.url;
    audioElement.current.crossOrigin = 'anonymous'; // Important for CORS
    audioElement.current.load();
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
      
      // Start playback
      console.log("Starting playback");
      await audioElement.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error starting playback:", error);
      
      // Fallback: try direct playback if Web Audio API fails
      try {
        if (audioElement.current) {
          console.log("Trying fallback direct playback");
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
      audioElement.current.currentTime = 0;
    }
    setIsPlaying(false);
  };
  
  // Effect to update pan value when it changes
  useEffect(() => {
    if (pannerNode.current) {
      pannerNode.current.pan.value = panValue;
    }
  }, [panValue]);
  
  // Effect to update volume when it changes
  useEffect(() => {
    if (gainNode.current) {
      gainNode.current.gain.value = volume;
    }
  }, [volume]);
  
  // Oscillation effect - the real meat of the application
  useEffect(() => {
    if (!isPlaying || !oscillationEnabled) return;
    
    // Create oscillation between left and right
    let direction = 1; // 1 = right, -1 = left
    let currentPosition = panValue;
    
    const interval = setInterval(() => {
      // Move the pan position
      currentPosition += oscillationSpeed * direction;
      
      // Reverse direction if we hit the edges
      if (currentPosition >= 1) {
        currentPosition = 1;
        direction = -1;
      } else if (currentPosition <= -1) {
        currentPosition = -1;
        direction = 1;
      }
      
      // Update the pan value state
      setPanValue(currentPosition);
    }, 30); // Update every 30ms for smooth movement
    
    return () => clearInterval(interval);
  }, [isPlaying, panValue, oscillationEnabled, oscillationSpeed]);
  
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
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
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
          </div>
        )}
        
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
        
        {/* Pan control */}
        <div className="mb-4">
          <label htmlFor="panControl" className="block text-sm font-medium text-gray-700 mb-2">
            Pan: {panValue.toFixed(2)} ({panValue < 0 ? 'Left' : panValue > 0 ? 'Right' : 'Center'})
          </label>
          <input
            id="panControl"
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={panValue}
            onChange={(e) => setPanValue(parseFloat(e.target.value))}
            className="w-full"
          />
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
              Enable automatic panning
            </label>
          </div>
          
          {oscillationEnabled && (
            <div>
              <label htmlFor="speed" className="block text-sm font-medium text-gray-700 mb-2">
                Speed: {oscillationSpeed.toFixed(3)}
              </label>
              <input
                id="speed"
                type="range"
                min="0.001"
                max="0.05"
                step="0.001"
                value={oscillationSpeed}
                onChange={(e) => setOscillationSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="mt-6 flex items-center justify-center w-full max-w-md">
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`}
            style={{ 
              width: '10px', 
              marginLeft: `${((panValue + 1) / 2) * 100}%`, // Map -1...1 to 0%...100%
              transition: 'margin-left 0.1s ease-out'
            }}
          />
        </div>
      </div>
      
      {/* Status text */}
      <div className="mt-2 text-sm text-gray-500">
        {isPlaying ? 'Playing' : 'Stopped'} - 
        Pan position: {panValue.toFixed(2)} ({panValue < 0 ? 'Left' : panValue > 0 ? 'Right' : 'Center'})
      </div>
      
      {/* Accessibility info */}
      <div className="sr-only" aria-live="polite">
        {isPlaying ? 'Audio is playing' : 'Audio is stopped'}. 
        Pan position: {panValue < 0 ? 'Left' : panValue > 0 ? 'Right' : 'Center'}.
      </div>
    </div>
  );
} 