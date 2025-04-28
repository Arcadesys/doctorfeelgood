import { useState, useCallback, useEffect } from 'react';
import * as Tone from 'tone';

interface AudioSynthesisOptions {
  frequency?: number; // Hz
  oscillatorType?: 'sine' | 'square' | 'triangle' | 'sawtooth';
  volume?: number; // 0 to 1
}

export function useAudioSynthesis() {
  const [synth, setSynth] = useState<Tone.Synth | null>(null);
  const [panner, setPanner] = useState<Tone.Panner | null>(null);
  const [lfoPane, setLfoPane] = useState<Tone.LFO | null>(null);  
  const [isPlaying, setIsPlaying] = useState(false);
  const [options, setOptions] = useState<AudioSynthesisOptions>({
    frequency: 440, // A4 note by default
    oscillatorType: 'sine',
    volume: 0.5,
  });

  // Initialize the synth on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newSynth = new Tone.Synth({
        oscillator: { type: options.oscillatorType },
        volume: Tone.gainToDb(options.volume || 0.5),
      });
      
      const newPanner = new Tone.Panner(0).toDestination();
      newSynth.connect(newPanner);
      
      setSynth(newSynth);
      setPanner(newPanner);
      
      return () => {
        newSynth.dispose();
        newPanner.dispose();
        if (lfoPane) {
          lfoPane.dispose();
        }
      };
    }
  }, []);

  // Update synth when options change
  useEffect(() => {
    if (synth) {
      synth.oscillator.type = options.oscillatorType || 'sine';
      synth.volume.value = Tone.gainToDb(options.volume || 0.5);
    }
  }, [synth, options.oscillatorType, options.volume]);

  const startTone = useCallback(() => {
    if (synth && Tone.context.state !== 'running') {
      Tone.start();
    }
    
    if (synth && !isPlaying) {
      const frequency = options.frequency ?? 440; // Default to A4 if frequency is undefined
      synth.triggerAttack(frequency);
      setIsPlaying(true);
    }
  }, [synth, isPlaying, options.frequency]);

  const stopTone = useCallback(() => {
    if (synth && isPlaying) {
      synth.triggerRelease();
      setIsPlaying(false);
    }
  }, [synth, isPlaying]);

  const toggleTone = useCallback(() => {
    if (isPlaying) {
      stopTone();
    } else {
      startTone();
    }
  }, [isPlaying, startTone, stopTone]);

  const updateOptions = useCallback((newOptions: Partial<AudioSynthesisOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
    
    // If currently playing, update the frequency immediately
    if (synth && isPlaying && newOptions.frequency) {
      synth.frequency.value = newOptions.frequency;
    }
  }, [synth, isPlaying]);

  const playPanningOscillator = useCallback(async (frequency = 440, panRate = 1, oscillatorType = 'sine') => {
    if (!synth || !panner) return null;
    
    // Make sure audio context is running
    await Tone.start();

    // Disconnect any existing LFO
    if (lfoPane) {
      lfoPane.stop();
      lfoPane.disconnect();
    }
    
    // Set oscillator type
    synth.oscillator.type = oscillatorType as any;
    
    // Set up LFO for panning (oscillates between -1 and 1)
    const lfo = new Tone.LFO({
      frequency: panRate,
      min: -1,
      max: 1,
      type: 'sine'
    });
    
    // Connect LFO to panner
    lfo.connect(panner.pan);
    lfo.start();
    
    // Set frequency and trigger attack
    synth.frequency.value = frequency;
    synth.triggerAttack(frequency);
    
    setLfoPane(lfo);
    setIsPlaying(true);
    
    return () => {
      lfo.stop();
      lfo.dispose();
      synth.triggerRelease();
      setIsPlaying(false);
      setLfoPane(null);
    };
  }, [synth, panner, lfoPane]);

  const playPingPongEffect = useCallback(async (leftFreq = 440, rightFreq = 480, intervalMs = 1000) => {
    if (!synth) return;
    
    // Make sure audio context is running
    await Tone.start();
    
    // Setup ping pong panner
    const panner = new Tone.Panner().toDestination();
    synth.disconnect();
    synth.connect(panner);
    
    let isLeft = true;
    setIsPlaying(true);
    
    const interval = setInterval(() => {
      // Switch sides
      panner.pan.value = isLeft ? -1 : 1;
      // Switch frequencies
      synth.frequency.value = isLeft ? leftFreq : rightFreq;
      // Play the tone
      if (!isPlaying) {
        synth.triggerAttack(isLeft ? leftFreq : rightFreq);
      }
      isLeft = !isLeft;
    }, intervalMs);
    
    return () => {
      clearInterval(interval);
      synth.triggerRelease();
      setIsPlaying(false);
      // Reconnect synth directly to destination
      synth.disconnect();
      synth.toDestination();
      panner.dispose();
    };
  }, [synth, isPlaying]);

  return {
    isPlaying,
    startTone,
    stopTone,
    toggleTone,
    updateOptions,
    options,
    playPingPongEffect,
    playPanningOscillator,
  };
} 