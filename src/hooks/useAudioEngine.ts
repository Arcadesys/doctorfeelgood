import { useEffect, useMemo, useRef } from 'react';
import type { PitchPreset } from '../types';

interface AudioEngineAPI {
  start: () => void;
  stop: () => void;
  setPan: (p: number) => void; // -1..1
  setVolume: (v: number) => void; // 0..1
  click: () => void; // short audible click
}

const PITCH_HZ: Record<PitchPreset, number> = {
  low: 300,
  medium: 600,
  high: 950,
};

export function useAudioEngine(
  enabled: boolean, 
  volume: number, 
  waveform: OscillatorType = 'sine',
  audioMode: 'click' | 'beep' | 'hiss' | 'chirp' | 'pulse' | 'file' = 'click',
  fileUrl?: string,
  pitch: PitchPreset = 'medium',
  panDepth: number = 1,
  fadeInMs: number = 0
): AudioEngineAPI {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const panRef = useRef<StereoPannerNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const loadingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;
    if (!ctxRef.current) return;
    const g = gainRef.current;
    if (g) g.gain.value = volume;
  }, [enabled, volume]);

  // Load audio file when fileUrl changes
  useEffect(() => {
    if (audioMode !== 'file' || !fileUrl || !enabled) {
      audioBufferRef.current = null;
      return;
    }

    const loadAudio = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio file: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (!ctxRef.current) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          ctxRef.current = ctx;
        }

        const audioBuffer = await ctxRef.current.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
      } catch {
        audioBufferRef.current = null;
      } finally {
        loadingRef.current = false;
      }
    };

    loadAudio();
  }, [audioMode, fileUrl, enabled]);

  return useMemo(() => {
    const ensure = async () => {
      if (!ctxRef.current) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        gain.gain.value = Math.max(0, Math.min(1, volume));
        pan.pan.value = 0;
        pan.connect(gain);
        gain.connect(ctx.destination);
        ctxRef.current = ctx;
        gainRef.current = gain;
        panRef.current = pan;
      }
      if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume();
    };

    const api: AudioEngineAPI = {
      start: () => { if (enabled) ensure(); },
      stop: () => { ctxRef.current?.suspend(); },
      setPan: (p: number) => {
        // Apply panDepth to scale the stereo spread
        const scaled = p * Math.max(0, Math.min(1, panDepth));
        const clamped = Math.max(-1, Math.min(1, scaled));
        if (!enabled) return;
        if (!panRef.current) return;
        panRef.current.pan.value = clamped;
      },
      setVolume: (v: number) => {
        if (!enabled) return;
        if (!gainRef.current) return;
        gainRef.current.gain.value = Math.max(0, Math.min(1, v));
      },
      click: () => {
        if (!enabled) return;
        const ctx = ctxRef.current;
        const pan = panRef.current;
        const gain = gainRef.current;
        if (!ctx || !pan || !gain) return;

        const fadeInSec = Math.max(0, fadeInMs) / 1000;
        const baseFreq = PITCH_HZ[pitch] || PITCH_HZ.medium;

        const playGeneratedSound = () => {
          const now = ctx.currentTime;
          
          switch (audioMode) {
            case 'click': {
              // Short tick sound using pitch preset
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = waveform;
              osc.frequency.value = baseFreq;
              // Apply fade-in if configured
              if (fadeInSec > 0) {
                oscGain.gain.setValueAtTime(0, now);
                oscGain.gain.linearRampToValueAtTime(0.5, now + Math.min(fadeInSec, 0.02));
              } else {
                oscGain.gain.value = 0.5;
              }
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.03 + fadeInSec);
              break;
            }
            
            case 'beep': {
              // Classic beep sound using pitch preset
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = baseFreq;
              oscGain.gain.setValueAtTime(0, now);
              oscGain.gain.linearRampToValueAtTime(0.3, now + Math.max(0.01, fadeInSec));
              oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + fadeInSec);
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.15 + fadeInSec);
              break;
            }
            
            case 'hiss': {
              // White noise burst with fade-in
              const bufferSize = ctx.sampleRate * 0.1; // 100ms
              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.3;
              }
              const source = ctx.createBufferSource();
              const hissGain = ctx.createGain();
              const filter = ctx.createBiquadFilter();
              filter.type = 'highpass';
              filter.frequency.value = baseFreq * 3; // Scale with pitch
              source.buffer = buffer;
              hissGain.gain.setValueAtTime(0, now);
              hissGain.gain.linearRampToValueAtTime(0.4, now + Math.max(0.01, fadeInSec));
              hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + fadeInSec);
              source.connect(filter);
              filter.connect(hissGain);
              hissGain.connect(pan);
              source.start(now);
              break;
            }
            
            case 'chirp': {
              // Frequency sweep based on pitch preset
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = 'sine';
              const startFreq = baseFreq * 0.3;
              const endFreq = baseFreq * 2;
              osc.frequency.setValueAtTime(startFreq, now);
              osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12 + fadeInSec);
              oscGain.gain.setValueAtTime(0, now);
              oscGain.gain.linearRampToValueAtTime(0.25, now + Math.max(0.01, fadeInSec));
              oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + fadeInSec);
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.12 + fadeInSec);
              break;
            }
            
            case 'pulse': {
              // Rhythmic pulse using pitch preset
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = 'square';
              osc.frequency.value = baseFreq * 0.25;
              oscGain.gain.setValueAtTime(0, now);
              // Create pulse pattern with fade-in
              const attackTime = Math.max(0.01, fadeInSec);
              oscGain.gain.linearRampToValueAtTime(0.3, now + attackTime);
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
              oscGain.gain.linearRampToValueAtTime(0, now + 0.06);
              oscGain.gain.linearRampToValueAtTime(0, now + 0.08);
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.09);
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.13);
              oscGain.gain.linearRampToValueAtTime(0, now + 0.14);
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.2 + fadeInSec);
              break;
            }
            
            default: {
              // Fallback to click using pitch
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = waveform;
              osc.frequency.value = baseFreq;
              if (fadeInSec > 0) {
                oscGain.gain.setValueAtTime(0, now);
                oscGain.gain.linearRampToValueAtTime(0.5, now + Math.min(fadeInSec, 0.02));
              } else {
                oscGain.gain.value = 0.5;
              }
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.03 + fadeInSec);
            }
          }
        };

        if (audioMode === 'file' && audioBufferRef.current) {
          // Play custom audio file
          try {
            const source = ctx.createBufferSource();
            source.buffer = audioBufferRef.current;
            source.connect(pan);
            source.start(ctx.currentTime);
          } catch {
            // Fallback to generated click if custom audio fails
            playGeneratedSound();
          }
        } else {
          // Play generated sound
          playGeneratedSound();
        }
      },
    };
    return api;
  }, [enabled, volume, waveform, audioMode, fileUrl, pitch, panDepth, fadeInMs]);
}
