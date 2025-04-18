'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { sampleAudioFiles } from '@/utils/sampleAudio';

/**
 * A stereo panner that synchronizes with the beat of an uploaded song
 */
export function BeatSyncPanner() {
  // State for the audio elements and controls
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioTitle, setAudioTitle] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [panValue, setPanValue] = useState(0.5); // Start at center
  const [volume, setVolume] = useState(0.7); // 0 to 1
  
  // Beat detection parameters
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [beatSyncEnabled, setBeatSyncEnabled] = useState(true);
  
  // Oscillation parameters (used when beat sync is disabled)
  const [oscillationEnabled, setOscillationEnabled] = useState(true);
  const [frequency, setFrequency] = useState(0.5); // Hz - cycles per second
  const [amplitude, setAmplitude] = useState(0.5); // 0 to 1 - how wide the pan goes
  const [offset, setOffset] = useState(0.5); // 0 to 1 - center position of the wave
  
  // Add this with the other state variables
  const [sensitivity, setSensitivity] = useState<number>(0.5); // Beat detection sensitivity - 0 to 1
  
  // References for the audio elements
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const pannerNode = useRef<StereoPannerNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Tone.js references
  const tonePlayers = useRef<Tone.Players | null>(null);
  const beatAnalyzer = useRef<any>(null);
  
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
    
    // Reset beat detection
    setBpm(null);
    setConfidence(0);
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
    
    // Reset beat detection
    setBpm(null);
    setConfidence(0);
  };
  
  // Function to analyze beats - improved version
  const analyzeBeats = async () => {
    if (!audioUrl) return;
    
    try {
      setIsAnalyzing(true);
      
      // Make sure Tone.js is ready
      await Tone.start();
      
      // Create a player for the audio
      tonePlayers.current = new Tone.Players({
        audio: audioUrl
      }).toDestination();
      
      // Wait for the player to load
      await Tone.loaded();
      
      // Create a Meyda analyzer for beat detection
      const meydaAnalyzer = new Tone.Analyser('waveform', 1024);
      tonePlayers.current.connect(meydaAnalyzer);
      
      // Use Tone.js's built-in BPM detection (primitive but lightweight)
      const player = tonePlayers.current.player('audio');
      
      // Create and configure the beat detection
      if (Tone.Transport.bpm) {
        // Process a small section of the audio to detect BPM
        const buffer = player.buffer;
        if (buffer) {
          // Get the first channel of audio data
          const audioData = buffer.getChannelData(0);
          
          // For better results, normalize the audio data
          const normalizedData = normalizeAudio(audioData);
          
          // Use the sensitivity parameter to adjust threshold
          const effectiveThreshold = 0.3 + (sensitivity * 0.4);
          
          // Improved peak finding with adaptive threshold and minimum peak distance
          const peaks = findPeaksImproved(normalizedData, buffer.sampleRate, effectiveThreshold);
          
          // Get a better BPM estimate
          const estimatedBpm = estimateBpmFromPeaks(peaks, buffer.sampleRate);
          
          // Calculate confidence based on peak consistency
          const estimatedConfidence = calculateConfidence(peaks, buffer.sampleRate, estimatedBpm);
          
          setBpm(estimatedBpm);
          setConfidence(estimatedConfidence);
          
          // Set the Tone.js transport BPM
          Tone.Transport.bpm.value = estimatedBpm;
        }
      }
      
      // Play a success sound if beats were detected (accessibility)
      if (estimatedBpm && audioContext.current) {
        // Create simple success tone
        const successOsc = audioContext.current.createOscillator();
        const successGain = audioContext.current.createGain();
        
        // Success sound - rising pitch
        successOsc.frequency.value = 440;
        successOsc.frequency.linearRampToValueAtTime(880, audioContext.current.currentTime + 0.2);
        successGain.gain.value = 0.1;
        
        // Quick fade out
        successGain.gain.setValueAtTime(0.1, audioContext.current.currentTime);
        successGain.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 0.3);
        
        // Connect and play
        successOsc.connect(successGain);
        successGain.connect(audioContext.current.destination);
        
        successOsc.start();
        successOsc.stop(audioContext.current.currentTime + 0.3);
        
        // Clean up
        setTimeout(() => {
          successOsc.disconnect();
          successGain.disconnect();
        }, 500);
      }
      
      setIsAnalyzing(false);
    } catch (err) {
      console.error('Error analyzing beats:', err);
      setIsAnalyzing(false);
      
      // Fallback - use default oscillation
      setBpm(null);
      setConfidence(0);
    }
  };
  
  // Helper function to normalize audio data
  const normalizeAudio = (audioData: Float32Array) => {
    // Find the maximum absolute value
    let max = 0;
    for (let i = 0; i < audioData.length; i++) {
      const abs = Math.abs(audioData[i]);
      if (abs > max) max = abs;
    }
    
    // If we have a non-zero maximum, normalize
    if (max > 0) {
      const normalizedData = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        normalizedData[i] = audioData[i] / max;
      }
      return normalizedData;
    }
    
    return audioData;
  };
  
  // Improved peak finding algorithm with adaptive threshold
  const findPeaksImproved = (audioData: Float32Array, sampleRate: number, threshold = 0.5) => {
    const peaks: number[] = [];
    const minPeakDistance = Math.floor(sampleRate * 0.1); // Minimum 0.1 seconds between peaks
    
    // Look at segments of the audio instead of the entire file
    // This uses just the first 30 seconds for faster analysis
    const segmentLength = Math.min(audioData.length, sampleRate * 30);
    
    // Pre-process to smooth the data slightly (basic low-pass filter)
    const smoothedData = new Float32Array(segmentLength);
    for (let i = 2; i < segmentLength - 2; i++) {
      smoothedData[i] = (audioData[i-2] + audioData[i-1] + audioData[i] + audioData[i+1] + audioData[i+2]) / 5;
    }
    
    // Store the last peak position to enforce minimum distance
    let lastPeakPos = -minPeakDistance;
    
    for (let i = 2; i < segmentLength - 2; i++) {
      // Check if this is a local maximum that exceeds the threshold
      if (smoothedData[i] > threshold && 
          smoothedData[i] > smoothedData[i-1] && 
          smoothedData[i] > smoothedData[i-2] && 
          smoothedData[i] > smoothedData[i+1] && 
          smoothedData[i] > smoothedData[i+2] &&
          i - lastPeakPos >= minPeakDistance) {
        
        // This is a peak
        peaks.push(i);
        lastPeakPos = i;
      }
    }
    
    return peaks;
  };
  
  // Calculate confidence based on consistency of intervals
  const calculateConfidence = (peaks: number[], sampleRate: number, estimatedBpm: number) => {
    if (peaks.length < 4) return 0.5; // Not enough peaks for confidence calculation
    
    // Calculate the expected interval between peaks in samples
    const expectedInterval = (60 / estimatedBpm) * sampleRate;
    
    // Calculate actual intervals
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    
    // Calculate standard deviation of intervals
    const meanInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - meanInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (lower is better)
    const cv = stdDev / meanInterval;
    
    // Convert to confidence (1 = high confidence, 0 = low confidence)
    // CV below 0.1 is excellent consistency, above 0.5 is poor
    const confidence = Math.max(0, Math.min(1, 1 - (cv * 2)));
    
    return confidence;
  };
  
  // Estimate BPM based on peak intervals
  const estimateBpmFromPeaks = (peaks: number[], sampleRate: number) => {
    if (peaks.length < 2) return 120; // Default BPM
    
    // Calculate intervals between peaks
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    
    // Get median interval
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // Convert to BPM: 60 seconds * sampleRate / interval
    const bpm = 60 * sampleRate / medianInterval;
    
    // Clamp to reasonable BPM range for music
    return Math.max(60, Math.min(180, bpm));
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
        pannerNode.current.pan.value = (panValue * 2) - 1; // Convert 0-1 to -1 to 1
        gainNode.current.gain.value = volume;
      }
      
      // Start playback
      console.log("Starting playback");
      await audioElement.current.play();
      setIsPlaying(true);
      
      // If we don't have BPM yet, analyze it
      if (bpm === null && beatSyncEnabled) {
        analyzeBeats();
      }
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
  
  // Beat-synchronized panning effect
  useEffect(() => {
    if (!isPlaying || !beatSyncEnabled || !bpm) return;
    
    // Convert BPM to interval in milliseconds
    const beatInterval = 60000 / bpm;
    let startTime = Date.now();
    
    // Reference to the beat indicators (for pulsing animation)
    const beatIndicators = document.querySelectorAll('.beat-indicator');
    
    const interval = setInterval(() => {
      // Calculate number of beats since start
      const elapsedTime = Date.now() - startTime;
      const beatNumber = Math.floor(elapsedTime / beatInterval);
      const beatFraction = (elapsedTime % beatInterval) / beatInterval;
      
      // Alternate panning left and right on each beat
      const isLeft = beatNumber % 2 === 0;
      const targetPan = isLeft ? 0 : 1; // Left or right
      
      // Update pan value
      setPanValue(targetPan);
      
      // Animate beat indicators (pulse on beat)
      beatIndicators.forEach(indicator => {
        if (beatFraction < 0.1) {
          // Show pulse at start of beat
          indicator.classList.add('beat-active');
        } else {
          indicator.classList.remove('beat-active');
        }
      });
      
      // Add a sound cue for the beat (accessibility)
      if (audioContext.current && beatFraction < 0.05) {
        const clickOsc = audioContext.current.createOscillator();
        const clickGain = audioContext.current.createGain();
        
        clickOsc.frequency.value = isLeft ? 880 : 1320; // Higher pitch on right
        clickGain.gain.value = 0.03; // Very quiet click
        
        clickOsc.connect(clickGain);
        clickGain.connect(audioContext.current.destination);
        
        clickOsc.start();
        clickOsc.stop(audioContext.current.currentTime + 0.05);
        
        // Auto-disconnect after sound is played
        setTimeout(() => {
          clickOsc.disconnect();
          clickGain.disconnect();
        }, 100);
      }
    }, 16); // Run at 60fps for smooth animation
    
    return () => clearInterval(interval);
  }, [isPlaying, beatSyncEnabled, bpm]);
  
  // Oscillation effect using sine wave (when beat sync is disabled)
  useEffect(() => {
    if (!isPlaying || !oscillationEnabled || beatSyncEnabled) return;
    
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
  }, [isPlaying, oscillationEnabled, beatSyncEnabled, frequency, amplitude, offset]);
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up audio resources
      handleStop();
      
      if (tonePlayers.current) {
        tonePlayers.current.dispose();
      }
      
      // Clean up audio context
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
      }
      
      // Clean up object URLs
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  // Global CSS styles for the beat animations
  const beatStyles = `
    @keyframes beat-pulse {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
    }
    
    .beat-active {
      animation: beat-pulse 0.1s ease-in-out;
      background-color: #ec4899 !important;
    }
  `;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-2">Beat-Synced Audio Panner</h1>
      <p className="text-sm text-gray-600 mb-6">Upload a song to synchronize panning with the beat</p>
      
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
            aria-label="Upload audio file"
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
                aria-label={`Load sample: ${sample.title}`}
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
        
        {/* Beat detection results */}
        {bpm !== null && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Detected Beat:</div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-2xl font-bold">{Math.round(bpm)}</div>
                    <div className="text-xs text-gray-600">BPM</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{(bpm / 60).toFixed(2)}</div>
                    <div className="text-xs text-gray-600">Hz</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Detection confidence: {Math.round(confidence * 100)}%
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setBpm(null);
                    setConfidence(0);
                  }} 
                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded"
                  aria-label="Reset beat detection"
                >
                  Reset
                </button>
                <span className="text-xs text-center text-gray-500">
                  {beatSyncEnabled ? "Sync active" : "Sync disabled"}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Beat detection help */}
        {!isPlaying && audioUrl && !bpm && !isAnalyzing && (
          <div className="mb-4 p-2 bg-blue-50 rounded border border-blue-200">
            <div className="text-sm">
              <span className="font-medium">Beat detection tips:</span>
              <ul className="list-disc pl-5 mt-1 text-xs text-gray-700">
                <li>Works best with songs that have clear beats</li>
                <li>May struggle with complex jazz or classical music</li>
                <li>For best results, use songs with consistent tempo</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Beat detection sensitivity control - show when not analyzing and before detection */}
        {!isPlaying && audioUrl && !bpm && (
          <div className="mb-4">
            <div className="flex justify-between">
              <label htmlFor="sensitivity" className="block text-sm font-medium text-gray-700 mb-1">
                Beat Detection Sensitivity
              </label>
              <span className="text-xs">{Math.round(sensitivity * 100)}%</span>
            </div>
            <input
              id="sensitivity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              disabled={isAnalyzing}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              aria-label="Adjust beat detection sensitivity"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Less sensitive</span>
              <span>More sensitive</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Adjust for different music types. Higher sensitivity detects more subtle beats, but may pick up false positives.
            </p>
          </div>
        )}
        
        {/* Playback controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {!isPlaying ? (
            <button 
              onClick={handlePlay} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={!audioUrl}
              aria-label="Play audio"
            >
              Play
            </button>
          ) : (
            <button 
              onClick={handleStop} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              aria-label="Stop audio"
            >
              Stop
            </button>
          )}
          
          {!isPlaying && audioUrl && !bpm && (
            <button 
              onClick={analyzeBeats} 
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              disabled={isAnalyzing}
              aria-label="Analyze beats in the audio"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Beats'}
            </button>
          )}
        </div>
        
        {/* Beat sync toggle */}
        <div className="mb-5 p-3 border rounded-lg border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label htmlFor="beatSync" className="text-sm font-medium text-gray-700">
                Beat Synchronization
              </label>
              <p className="text-xs text-gray-500">
                {beatSyncEnabled 
                  ? "Panning syncs with the beat (alternates on each beat)" 
                  : "Manual oscillation (adjustable wave)"}
              </p>
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none">
              <input 
                id="beatSync" 
                type="checkbox" 
                checked={beatSyncEnabled}
                onChange={() => setBeatSyncEnabled(!beatSyncEnabled)}
                className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                style={{
                  transform: beatSyncEnabled ? 'translateX(100%)' : 'translateX(0)',
                  borderColor: beatSyncEnabled ? 'rgb(79, 70, 229)' : 'rgb(209, 213, 219)'
                }}
                aria-label="Toggle beat synchronization"
              />
              <label 
                htmlFor="beatSync" 
                className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                style={{ backgroundColor: beatSyncEnabled ? 'rgb(79, 70, 229, 0.5)' : '' }}
              ></label>
            </div>
          </div>
          
          {bpm !== null && beatSyncEnabled && (
            <div className="p-2 bg-blue-50 rounded text-sm">
              <div className="flex justify-between">
                <span>Current sync rate:</span>
                <span className="font-medium">{Math.round(bpm)} BPM = {(bpm / 60).toFixed(2)} Hz</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Volume control */}
        <div className="mb-4">
          <label htmlFor="volume" className="block text-sm font-medium text-gray-700 mb-1">
            Volume: {Math.round(volume * 100)}%
          </label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            aria-label="Adjust volume"
          />
        </div>
        
        {/* Manual oscillation controls (when beat sync is disabled) */}
        {!beatSyncEnabled && (
          <div className="p-3 border rounded-lg border-gray-200 bg-gray-50 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Manual Oscillation Settings</h3>
            
            <div className="mb-3">
              <div className="flex justify-between">
                <label htmlFor="frequency" className="block text-xs font-medium text-gray-700 mb-1">
                  Speed
                </label>
                <div className="flex gap-2 text-xs">
                  <span>{frequency.toFixed(1)} Hz</span>
                  <span className="text-gray-500">= {Math.round(frequency * 60)} BPM</span>
                </div>
              </div>
              <input
                id="frequency"
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={frequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                aria-label="Adjust oscillation speed"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between">
                <label htmlFor="amplitude" className="block text-xs font-medium text-gray-700 mb-1">
                  Width
                </label>
                <span className="text-xs">{Math.round(amplitude * 100)}%</span>
              </div>
              <input
                id="amplitude"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                aria-label="Adjust oscillation width"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Narrow</span>
                <span>Wide</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Visual pan indicator - improved with direction and beat indicators */}
        <div className="mt-4">
          <div className="text-xs font-medium text-gray-700 mb-1 flex justify-between">
            <span>Left</span>
            <span>Pan Position</span>
            <span>Right</span>
          </div>
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden relative">
            {/* Center indicator */}
            <div className="absolute left-1/2 h-full w-px bg-gray-400 z-10"></div>
            
            {/* Beat markers - show when beat sync is enabled */}
            {beatSyncEnabled && bpm && (
              <>
                <div className="absolute left-0 h-full w-1 bg-pink-300 z-10 beat-indicator transition-all"></div>
                <div className="absolute right-0 h-full w-1 bg-pink-300 z-10 beat-indicator transition-all"></div>
              </>
            )}
            
            {/* Pan position indicator */}
            <div 
              className={`h-full transition-all flex items-center justify-center text-white text-xs font-bold ${
                panValue < 0.3 ? 'bg-blue-600' : 
                panValue > 0.7 ? 'bg-purple-600' : 
                'bg-green-600'
              }`}
              style={{ 
                width: '14%', 
                transform: `translateX(${(panValue * 600) - 40}%)`,
                transition: beatSyncEnabled ? 'transform 0.05s ease-out' : 'transform 0.1s ease-in-out'
              }}
              aria-label={`Pan position: ${panValue < 0.4 ? 'Left' : panValue > 0.6 ? 'Right' : 'Center'}`}
            >
              {panValue < 0.4 ? 'L' : panValue > 0.6 ? 'R' : 'C'}
            </div>
          </div>
          
          {/* Show current Hz when not beat-synced */}
          {!beatSyncEnabled && isPlaying && (
            <div className="text-xs text-center mt-1 text-gray-500">
              Current oscillation: {frequency.toFixed(1)} Hz = {Math.round(frequency * 60)} BPM
            </div>
          )}
          
          {/* Show beat info when beat-synced */}
          {beatSyncEnabled && bpm && isPlaying && (
            <div className="text-xs text-center mt-1 text-gray-500">
              Synced to beat: {Math.round(bpm)} BPM = {(bpm / 60).toFixed(2)} Hz
            </div>
          )}
        </div>
      </div>
      
      {/* Beat animation styles */}
      <style jsx>{beatStyles}</style>
    </div>
  );
} 