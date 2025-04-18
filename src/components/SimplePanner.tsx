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
  const [panValue, setPanValue] = useState(0.5); // Start at center
  const [volume, setVolume] = useState(0.7); // 0 to 1
  
  // Oscillation parameters
  const [oscillationEnabled, setOscillationEnabled] = useState(true);
  const [frequency, setFrequency] = useState(0.5); // Hz - cycles per second
  const [amplitude, setAmplitude] = useState(0.5); // 0 to 1 - how wide the pan goes
  const [offset, setOffset] = useState(0.5); // 0 to 1 - center position of the wave
  
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
  
  // Oscillation effect using sine wave
  useEffect(() => {
    if (!isPlaying || !oscillationEnabled) return;
    
    // Track animation time
    let startTime = Date.now();
    
    const interval = setInterval(() => {
      // Calculate elapsed time in seconds
      const elapsedTime = (Date.now() - startTime) / 1000;
      
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
            {/* Show attribution for sample sounds */}
            {!audioFile && audioUrl && sampleAudioFiles.find(s => s.url === audioUrl)?.attribution && (
              <div className="text-xs text-gray-500 mt-1">
                {sampleAudioFiles.find(s => s.url === audioUrl)?.attribution}
              </div>
            )}
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
            Current Pan: {panValue.toFixed(2)}
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
              {/* Frequency control */}
              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency: {frequency.toFixed(2)} Hz
                </label>
                <input
                  id="frequency"
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.01"
                  value={frequency}
                  onChange={(e) => setFrequency(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Speed of oscillation - higher values = faster panning
                </div>
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
              marginLeft: `${panValue * 100}%`, // Map 0...1 to 0%...100%
              transition: 'margin-left 0.1s ease-out'
            }}
          />
        </div>
      </div>
      
      {/* Status text */}
      <div className="mt-2 text-sm text-gray-500">
        {isPlaying ? 'Playing' : 'Stopped'} - 
        Pan: {panValue.toFixed(2)} &nbsp;
        {oscillationEnabled ? 
          `(Sine wave: ${frequency.toFixed(1)}Hz, amplitude: ${amplitude.toFixed(2)})` : 
          '(Manual control)'
        }
      </div>
      
      {/* Accessibility info */}
      <div className="sr-only" aria-live="polite">
        {isPlaying ? 'Audio is playing' : 'Audio is stopped'}. 
        Pan position: {panValue.toFixed(2)}.
        {oscillationEnabled ? 
          `Using sine wave oscillation with frequency ${frequency} Hertz and amplitude ${amplitude}.` : 
          'Using manual panning control.'
        }
      </div>
    </div>
  );
} 