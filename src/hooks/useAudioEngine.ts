import { useEffect, useMemo, useRef } from 'react';

interface AudioEngineAPI {
  start: () => void;
  stop: () => void;
  setPan: (p: number) => void; // -1..1
  setVolume: (v: number) => void; // 0..1
  click: () => void; // short audible click
}

export function useAudioEngine(
  enabled: boolean, 
  volume: number, 
  waveform: OscillatorType = 'square',
  audioMode: 'click' | 'file' = 'click',
  fileUrl?: string
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
      } catch (error) {
        console.error('Failed to load audio file:', error);
        audioBufferRef.current = null;
        // You might want to show a user-friendly error message here
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
        const clamped = Math.max(-1, Math.min(1, p));
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

        const playGeneratedClick = () => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          // Shape of the click transient
          osc.type = waveform;
          osc.frequency.value = 950; // short tick
          oscGain.gain.value = 0.5;
          osc.connect(oscGain);
          oscGain.connect(pan);
          const now = ctx.currentTime;
          osc.start(now);
          osc.stop(now + 0.03);
        };

        if (audioMode === 'file' && audioBufferRef.current) {
          // Play custom audio file
          try {
            const source = ctx.createBufferSource();
            source.buffer = audioBufferRef.current;
            source.connect(pan);
            const now = ctx.currentTime;
            source.start(now);
          } catch (error) {
            console.error('Failed to play custom audio:', error);
            // Fallback to generated click if custom audio fails
            playGeneratedClick();
          }
        } else {
          // Play generated click sound
          playGeneratedClick();
        }
      },
    };
    return api;
  }, [enabled, volume, waveform, audioMode, fileUrl]);
}
