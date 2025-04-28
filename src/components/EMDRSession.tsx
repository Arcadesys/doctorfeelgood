'use client';

import React, { useState, useEffect, useCallback } from 'react';
import EMDRTarget from './EMDRTarget';
import SessionTimer from './SessionTimer';
import UnifiedSettings from './UnifiedSettings';
import { useAudioSynthesis } from '../hooks/useAudioSynthesis';
import { playGuideTone } from '../utils/soundUtils';
import { AudioTrackConfig, AudioFile, AudioMetadata } from '@/types/audio';

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
  const [targetColor, setTargetColor] = useState('#ff0000'); // default red
  const [targetShape, setTargetShape] = useState<'circle' | 'square' | 'triangle' | 'diamond' | 'star'>('circle');
  const [targetHasGlow, setTargetHasGlow] = useState(true);
  const [targetMovementPattern, setTargetMovementPattern] = useState<'ping-pong' | 'sine'>('ping-pong');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [useConstantPanning, setUseConstantPanning] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // default to dark mode
  const [audioMode, setAudioMode] = useState<'click' | 'track'>('click'); // default to click mode
  const [bpm, setBpm] = useState(60);
  const [audioTrackConfig, setAudioTrackConfig] = useState<AudioTrackConfig>({
    volume: 0.5,
    loop: true,
    filePath: '/audio/sine-440hz.mp3',
    bpm: 60,
    sessionDuration: 60
  });
  
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { isPlaying, stopTone, playPingPongEffect, playPanningOscillator } = useAudioSynthesis();

  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);

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
  const handleSettingChange = useCallback((settingName: string, value: unknown) => {
    switch (settingName) {
      case 'speed':
        if (typeof value === 'number') setSpeed(value);
        break;
      case 'freqLeft':
        if (typeof value === 'number') setFreqLeft(value);
        break;
      case 'freqRight':
        if (typeof value === 'number') setFreqRight(value);
        break;
      case 'oscillatorType':
        if (typeof value === 'string' && ['sine', 'square', 'triangle', 'sawtooth'].includes(value)) {
          setOscillatorType(value as 'sine' | 'square' | 'triangle' | 'sawtooth');
        }
        break;
      case 'targetSize':
        if (typeof value === 'number') setTargetSize(value);
        break;
      case 'visualIntensity':
        if (typeof value === 'number') setVisualIntensity(value);
        break;
      case 'targetColor':
        if (typeof value === 'string') setTargetColor(value);
        break;
      case 'targetShape':
        if (typeof value === 'string' && ['circle', 'square', 'triangle', 'diamond', 'star'].includes(value)) {
          setTargetShape(value as 'circle' | 'square' | 'triangle' | 'diamond' | 'star');
        }
        break;
      case 'targetHasGlow':
        if (typeof value === 'boolean') setTargetHasGlow(value);
        break;
      case 'targetMovementPattern':
        if (typeof value === 'string' && ['ping-pong', 'sine'].includes(value)) {
          setTargetMovementPattern(value as 'ping-pong' | 'sine');
        }
        break;
      case 'sessionDuration':
        if (typeof value === 'number') setSessionDuration(value);
        break;
      case 'isDarkMode':
        if (typeof value === 'boolean') setIsDarkMode(value);
        break;
      case 'audioMode':
        if (typeof value === 'string' && ['click', 'track'].includes(value)) {
          setAudioMode(value as 'click' | 'track');
        }
        break;
    }
  }, []);

  // Handle audio mode change
  const handleAudioModeChange = useCallback((mode: 'click' | 'track') => {
    setAudioMode(mode);
  }, []);

  // Handle BPM change
  const handleBpmChange = useCallback((newBpm: number) => {
    setBpm(newBpm);
    setSpeed(Math.round(60000 / newBpm)); // Convert BPM to milliseconds
  }, []);

  // Handle audio selection
  const handleAudioSelect = useCallback((audio: AudioFile | null) => {
    if (audio) {
      setSelectedAudio(audio.id);
      setAudioTrackConfig(prev => ({
        ...prev,
        filePath: audio.path || audio.objectUrl || '/audio/sine-440hz.mp3',
        bpm: prev.bpm
      }));
    } else {
      setSelectedAudio('');
      setAudioTrackConfig(prev => ({
        ...prev,
        filePath: '/audio/sine-440hz.mp3'
      }));
    }
  }, []);

  // Current settings for the settings drawer
  const currentSettings = {
    speed,
    freqLeft,
    freqRight,
    targetSize,
    visualIntensity,
    sessionDuration,
    oscillatorType,
    targetColor,
    targetShape,
    targetHasGlow,
    targetMovementPattern,
    isDarkMode,
    audioMode,
    bpm: Math.round(60000 / speed), // Convert speed to BPM
    panWidthPercent: 80, // Default pan width
    audioFeedbackEnabled: true,
    visualGuideEnabled: true,
    movementGuideEnabled: true,
    audioVolume: 0.5,
    visualGuideColor: '#ffffff',
    movementGuideColor: '#ffffff'
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="p-6 max-w-5xl mx-auto">
        <UnifiedSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isSessionActive={isActive}
          settings={currentSettings}
          onSettingChange={handleSettingChange}
          audioMode={audioMode}
          onAudioModeChange={handleAudioModeChange}
          bpm={bpm}
          onBpmChange={handleBpmChange}
          onAudioSelect={handleAudioSelect}
          selectedAudio={selectedAudio}
          audioMetadata={audioMetadata}
          audioFiles={audioFiles}
        />
      </div>
    </div>
  );
};

export default EMDRSession;