import { useState, useEffect, useCallback } from 'react';

export interface EMDRPreset {
  id: string;
  name: string;
  speed: number;
  freqLeft: number;
  freqRight: number;
  targetSize: number;
  visualIntensity: number;
  sessionDuration: number;
  oscillatorType?: 'sine' | 'square' | 'triangle' | 'sawtooth';
}

export type PresetSaveCallback = (preset: Omit<EMDRPreset, 'id'>) => void;

const DEFAULT_PRESETS: EMDRPreset[] = [
  {
    id: 'default-slow',
    name: 'Slow & Gentle',
    speed: 2000,
    freqLeft: 400,
    freqRight: 440,
    targetSize: 40,
    visualIntensity: 0.6,
    sessionDuration: 5,
    oscillatorType: 'sine',
  },
  {
    id: 'default-medium',
    name: 'Medium Pace',
    speed: 1200,
    freqLeft: 440,
    freqRight: 480,
    targetSize: 50,
    visualIntensity: 0.8,
    sessionDuration: 10,
    oscillatorType: 'triangle',
  },
  {
    id: 'default-fast',
    name: 'Fast Processing',
    speed: 700,
    freqLeft: 480,
    freqRight: 520,
    targetSize: 60,
    visualIntensity: 1.0,
    sessionDuration: 15,
    oscillatorType: 'sawtooth',
  },
];

const STORAGE_KEY = 'doctorfeelgood-emdr-presets';

export function usePresets() {
  const [presets, setPresets] = useState<EMDRPreset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load presets from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPresets = localStorage.getItem(STORAGE_KEY);
        if (savedPresets) {
          const parsedPresets = JSON.parse(savedPresets) as EMDRPreset[];
          setPresets(parsedPresets);
        } else {
          // Initialize with default presets if nothing is saved
          setPresets(DEFAULT_PRESETS);
        }
      } catch (error) {
        console.error('Error loading presets:', error);
        setPresets(DEFAULT_PRESETS);
      }
      
      setIsLoaded(true);
    }
  }, []);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      } catch (error) {
        console.error('Error saving presets:', error);
      }
    }
  }, [presets, isLoaded]);

  // Add a new preset
  const savePreset = useCallback((preset: Omit<EMDRPreset, 'id'>) => {
    const newId = `preset-${Date.now()}`;
    const newPreset: EMDRPreset = {
      ...preset,
      id: newId,
    };
    
    setPresets(prevPresets => [...prevPresets, newPreset]);
    return newId;
  }, []);

  // Update an existing preset
  const updatePreset = useCallback((id: string, updates: Partial<Omit<EMDRPreset, 'id'>>) => {
    setPresets(prevPresets => 
      prevPresets.map(preset => 
        preset.id === id ? { ...preset, ...updates } : preset
      )
    );
  }, []);

  // Delete a preset
  const deletePreset = useCallback((id: string) => {
    // Don't allow deletion of default presets
    if (id.startsWith('default-')) return false;
    
    setPresets(prevPresets => prevPresets.filter(preset => preset.id !== id));
    return true;
  }, []);

  // Reset all presets to defaults
  const resetToDefaults = useCallback(() => {
    setPresets(DEFAULT_PRESETS);
  }, []);

  return {
    presets,
    isLoaded,
    savePreset,
    updatePreset,
    deletePreset,
    resetToDefaults,
  };
} 