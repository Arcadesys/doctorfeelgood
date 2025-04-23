import { useState, useEffect, useCallback } from 'react';

interface AudioEngineState {
  isPlaying: boolean;
  volume: number;
  audioMode: boolean;
}

export const useAudioEngine = () => {
  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    volume: 0.5,
    audioMode: true,
  });

  const togglePlayback = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  const toggleAudioMode = useCallback(() => {
    setState(prev => ({ ...prev, audioMode: !prev.audioMode }));
  }, []);

  useEffect(() => {
    // Cleanup audio resources when component unmounts
    return () => {
      // Add any cleanup logic here
    };
  }, []);

  return {
    ...state,
    togglePlayback,
    setVolume,
    toggleAudioMode,
  };
}; 