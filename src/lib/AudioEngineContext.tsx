import React, { createContext, useContext, useRef } from 'react';
import { AudioEngine } from '@/lib/audioEngine';

// Singleton instance
let audioEngineSingleton: AudioEngine | null = null;

export function getAudioEngineSingleton(): AudioEngine {
  if (!audioEngineSingleton) {
    audioEngineSingleton = new AudioEngine();
  }
  return audioEngineSingleton;
}

// React context
const AudioEngineContext = createContext<AudioEngine | null>(null);

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use ref to persist the instance
  const engineRef = useRef<AudioEngine>(getAudioEngineSingleton());
  return (
    <AudioEngineContext.Provider value={engineRef.current}>
      {children}
    </AudioEngineContext.Provider>
  );
};

export function useAudioEngine(): AudioEngine {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) throw new Error('useAudioEngine must be used within AudioEngineProvider');
  return ctx;
}
