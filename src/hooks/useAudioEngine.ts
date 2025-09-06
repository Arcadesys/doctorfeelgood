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
  audioMode: 'click' | 'beep' | 'hiss' | 'chirp' | 'pulse' | 'file' = 'click',
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
        console.log('Loading audio file:', fileUrl);
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio file: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('Audio file loaded, size:', arrayBuffer.byteLength, 'bytes');
        
        if (!ctxRef.current) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          ctxRef.current = ctx;
        }

        const audioBuffer = await ctxRef.current.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        console.log('Audio file decoded successfully, duration:', audioBuffer.duration, 'seconds');
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

        const playGeneratedSound = () => {
          const now = ctx.currentTime;
          
          switch (audioMode) {
            case 'click': {
              // Short tick sound
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = waveform;
              osc.frequency.value = 950;
              oscGain.gain.value = 0.5;
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.03);
              break;
            }
            
            case 'beep': {
              // Classic beep sound
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = 800;
              oscGain.gain.setValueAtTime(0, now);
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
              oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.15);
              break;
            }
            
            case 'hiss': {
              // White noise burst
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
              filter.frequency.value = 3000;
              source.buffer = buffer;
              hissGain.gain.setValueAtTime(0, now);
              hissGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
              hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
              source.connect(filter);
              filter.connect(hissGain);
              hissGain.connect(pan);
              source.start(now);
              break;
            }
            
            case 'chirp': {
              // Frequency sweep
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(200, now);
              osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
              oscGain.gain.setValueAtTime(0, now);
              oscGain.gain.linearRampToValueAtTime(0.25, now + 0.01);
              oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.12);
              break;
            }
            
            case 'pulse': {
              // Rhythmic pulse
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = 'square';
              osc.frequency.value = 150;
              oscGain.gain.setValueAtTime(0, now);
              // Create pulse pattern: on-off-on-off
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
              oscGain.gain.linearRampToValueAtTime(0, now + 0.06);
              oscGain.gain.linearRampToValueAtTime(0, now + 0.08);
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.09);
              oscGain.gain.linearRampToValueAtTime(0.3, now + 0.13);
              oscGain.gain.linearRampToValueAtTime(0, now + 0.14);
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.2);
              break;
            }
            
            default:
              // Fallback to click
              const osc = ctx.createOscillator();
              const oscGain = ctx.createGain();
              osc.type = waveform;
              osc.frequency.value = 950;
              oscGain.gain.value = 0.5;
              osc.connect(oscGain);
              oscGain.connect(pan);
              osc.start(now);
              osc.stop(now + 0.03);
          }
        };

        if (audioMode === 'file' && audioBufferRef.current) {
          // Play custom audio file
          try {
            const source = ctx.createBufferSource();
            source.buffer = audioBufferRef.current;
            source.connect(pan);
            const now = ctx.currentTime;
            source.start(now);
            console.log('Playing custom audio file');
          } catch (error) {
            console.error('Failed to play custom audio:', error);
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
  }, [enabled, volume, waveform, audioMode, fileUrl]);
}
