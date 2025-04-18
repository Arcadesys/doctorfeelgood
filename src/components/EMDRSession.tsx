'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import EMDRTarget from './EMDRTarget';
import SessionTimer from './SessionTimer';
import SettingsDrawer from './SettingsDrawer';
import { useAudioSynthesis } from '../hooks/useAudioSynthesis';
import { playGuideTone } from '../utils/soundUtils';
import { EMDRPreset } from '../hooks/usePresets';

interface EMDRSessionProps {
  defaultSpeed?: number; // milliseconds for one complete cycle
  defaultFrequencyLeft?: number;
  defaultFrequencyRight?: number;
}

const EMDRSession: React.FC<EMDRSessionProps> = ({
  defaultSpeed = 1000,
  defaultFrequencyLeft = 440, // A4
  defaultFrequencyRight = 480, // Higher tone
}) => {
  const [isActive, setIsActive] = useState(false);
  const [speed, setSpeed] = useState(defaultSpeed);
  const [freqLeft, setFreqLeft] = useState(defaultFrequencyLeft);
  const [freqRight, setFreqRight] = useState(defaultFrequencyRight);
  const [oscillatorType, setOscillatorType] = useState<'sine' | 'square' | 'triangle' | 'sawtooth'>('sine');
  const [cleanupPingPong, setCleanupPingPong] = useState<(() => void) | null>(null);
  const [cleanupPanningOsc, setCleanupPanningOsc] = useState<(() => void) | null>(null);
  const [visualIntensity, setVisualIntensity] = useState(0.8); // default to 80%
  const [targetSize, setTargetSize] = useState(50); // default size in pixels
  const [sessionDuration, setSessionDuration] = useState(5); // default 5 minutes
  const [useConstantPanning, setUseConstantPanning] = useState(true); // Toggle for panning vs ping-pong
  
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { isPlaying, stopTone, playPingPongEffect, playPanningOscillator } = useAudioSynthesis();

  const startSession = useCallback(async () => {
    // Close settings drawer if open
    setIsSettingsOpen(false);
    
    // Play start guide tone for accessibility
    await playGuideTone('start', { duration: 0.3 });
    
    setIsActive(true);
    
    if (useConstantPanning) {
      // Start constant panning oscillator
      const cleanup = await playPanningOscillator(
        freqLeft, 
        1 / (speed / 1000), // Convert ms to frequency (Hz)
        oscillatorType
      );
      if (cleanup) {
        setCleanupPanningOsc(() => cleanup);
      }
    } else {
      // Start audio ping-pong effect and get cleanup function
      const cleanup = await playPingPongEffect(freqLeft, freqRight, speed / 2);
      if (cleanup) {
        setCleanupPingPong(() => cleanup);
      }
    }
  }, [playPingPongEffect, playPanningOscillator, freqLeft, freqRight, speed, oscillatorType, useConstantPanning]);

  const stopSession = useCallback(async () => {
    // Play stop guide tone for accessibility
    await playGuideTone('stop', { duration: 0.3 });
    
    setIsActive(false);
    
    // Clean up audio effects
    if (cleanupPingPong) {
      cleanupPingPong();
      setCleanupPingPong(null);
    }
    
    if (cleanupPanningOsc) {
      cleanupPanningOsc();
      setCleanupPanningOsc(null);
    }
    
    // Ensure tone is stopped
    stopTone();
  }, [cleanupPingPong, cleanupPanningOsc, stopTone]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cleanupPingPong) cleanupPingPong();
      if (cleanupPanningOsc) cleanupPanningOsc();
      stopTone();
    };
  }, [cleanupPingPong, cleanupPanningOsc, stopTone]);
  
  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    // Automatically stop the session when timer completes
    if (isActive) {
      stopSession();
    }
  }, [isActive, stopSession]);
  
  // Handle setting changes
  const handleSettingChange = useCallback((settingName: string, value: number | string) => {
    switch (settingName) {
      case 'speed':
        setSpeed(value as number);
        break;
      case 'freqLeft':
        setFreqLeft(value as number);
        break;
      case 'freqRight':
        setFreqRight(value as number);
        break;
      case 'oscillatorType':
        setOscillatorType(value as 'sine' | 'square' | 'triangle' | 'sawtooth');
        break;
      case 'targetSize':
        setTargetSize(value as number);
        break;
      case 'visualIntensity':
        setVisualIntensity(value as number);
        break;
      case 'sessionDuration':
        setSessionDuration(value as number);
        break;
    }
  }, []);
  
  // Handle preset selection
  const handlePresetSelect = useCallback((preset: EMDRPreset) => {
    if (isActive) {
      // Don't change settings while active
      window.alert('Please stop the current session before changing presets.');
      return;
    }
    
    setSpeed(preset.speed);
    setFreqLeft(preset.freqLeft);
    setFreqRight(preset.freqRight);
    setTargetSize(preset.targetSize);
    setVisualIntensity(preset.visualIntensity);
    setSessionDuration(preset.sessionDuration);
    
    // Handle oscillatorType if it exists in the preset
    if ('oscillatorType' in preset) {
      setOscillatorType(preset.oscillatorType as 'sine' | 'square' | 'triangle' | 'sawtooth');
    }
    
    playGuideTone('success', { duration: 0.2 });
  }, [isActive]);
  
  // Current settings for preset saving
  const currentSettings = {
    speed,
    freqLeft,
    freqRight,
    targetSize,
    visualIntensity,
    sessionDuration,
    oscillatorType,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">EMDR Therapy Session</h1>
        
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          aria-label="Open settings menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <EMDRTarget 
            isActive={isActive} 
            speed={speed} 
            size={targetSize} 
            color="#ff0000" 
            intensity={visualIntensity}
          />
        </div>
        
        <div className="mb-6">
          <SessionTimer 
            isActive={isActive}
            onTimerComplete={handleTimerComplete}
            defaultDuration={sessionDuration}
          />
        </div>

        <div className="flex justify-center items-center mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useConstantPanning}
              onChange={() => setUseConstantPanning(!useConstantPanning)}
              disabled={isActive}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">Use constant panning</span>
          </label>
        </div>
        
        <div className="flex justify-center mt-8">
          <button
            onClick={isActive ? stopSession : startSession}
            className={`px-8 py-4 rounded-lg font-medium text-xl focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isActive 
                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white' 
                : 'bg-green-500 hover:bg-green-600 focus:ring-green-500 text-white'
            }`}
            aria-label={isActive ? "Stop EMDR session" : "Start EMDR session"}
          >
            {isActive ? 'Stop' : 'Start'} Session
          </button>
        </div>
      </div>
      
      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isSessionActive={isActive}
        settings={currentSettings}
        onSettingChange={handleSettingChange}
        onPresetSelect={handlePresetSelect}
      />
    </div>
  );
};

export default EMDRSession; 