import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Target from './components/Target';
import Controls from './components/Controls';
import { AppConfig } from './types';
import { loadJSON, saveJSON, loadCustomAudio } from './lib/storage';
import { useAudioEngine } from './hooks/useAudioEngine';

const DEFAULTS: AppConfig = {
  durationSec: 120,
  target: {
    sizePx: 24,
    color: '#00FF88',
    shape: 'circle',
    rotate: false,
    speedPxPerSec: 2400, // 60 BPM
    edgePaddingPx: 16,
    edgePauseMs: 0,
    startPosition: 'center',
  },
  audio: {
    mode: 'click',
    volume: 0.15, // Start low per AGENTS.md (10-20%)
    muted: false,
    waveform: 'sine', // Softer waveform per AGENTS.md
    pitch: 'medium',
    panDepth: 1,
    fadeInMs: 0,
  },
};

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = loadJSON<AppConfig>();
    const base = saved 
      ? {
          ...DEFAULTS,
          ...saved,
          target: { ...DEFAULTS.target, ...saved.target },
          audio: { ...DEFAULTS.audio, ...saved.audio },
        }
      : DEFAULTS;
    
    // Restore custom audio from localStorage if mode is 'file'
    if (base.audio.mode === 'file') {
      const customAudio = loadCustomAudio();
      if (customAudio) {
        base.audio.fileUrl = customAudio.dataUrl;
        base.audio.fileName = customAudio.fileName;
      } else {
        // No stored audio found, reset to default mode
        base.audio.mode = 'click';
        base.audio.fileUrl = undefined;
        base.audio.fileName = undefined;
      }
    }
    
    return base;
  });
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(config.durationSec);

  useEffect(() => saveJSON(config), [config]);
  useEffect(() => setRemaining(config.durationSec), [config.durationSec]);

  // Muted overrides volume to 0
  const effectiveVolume = config.audio.muted ? 0 : config.audio.volume;

  const audio = useAudioEngine(
    true, 
    effectiveVolume, 
    config.audio.waveform ?? 'sine',
    config.audio.mode,
    config.audio.fileUrl,
    config.audio.pitch ?? 'medium',
    config.audio.panDepth ?? 1,
    config.audio.fadeInMs ?? 0
  );

  // Ensure audio engine suspends when not playing
  useEffect(() => {
    if (!playing) audio.stop();
  }, [playing, audio]);

  // Panic stop hotkeys: Space toggles pause, Esc stops
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        setPlaying(false);
        setRemaining(config.durationSec);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.durationSec]);

  useEffect(() => {
    let raf: number | null = null;
    let anchor = performance.now();
    const tick = (ts: number) => {
      const dt = (ts - anchor) / 1000;
      anchor = ts;
      setRemaining((r) => {
        const next = Math.max(0, r - dt);
        if (next === 0) setPlaying(false);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    if (playing) {
      audio.start();
      raf = requestAnimationFrame(tick);
    }
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [playing, audio]);

  const remainingRounded = useMemo(() => Math.ceil(remaining), [remaining]);
  
  // Stable callbacks to avoid re-creating rAF in child effects
  const handlePosition = useCallback((n: number) => {
    audio.setPan(n * 2 - 1);
  }, [audio]);
  const handleEdge = useCallback(() => {
    audio.click();
  }, [audio]);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">EMDR Processor · MVP</h1>
      </header>
      <main className="stage">
        <Target
          color={config.target.color}
          sizePx={config.target.sizePx}
          shape={config.target.shape ?? 'circle'}
          emoji={config.target.emoji}
          rotate={config.target.rotate ?? false}
          speedPxPerSec={config.target.speedPxPerSec}
          edgePaddingPx={config.target.edgePaddingPx}
          edgePauseMs={config.target.edgePauseMs}
          startPosition={config.target.startPosition}
          playing={playing}
          onPosition={handlePosition}
          onEdge={handleEdge}
        />
      </main>
      <Controls
        playing={playing}
        remainingSec={remainingRounded}
        onPlay={() => setPlaying(true)}
        onStop={() => setPlaying(false)}
        onReset={() => { setPlaying(false); setRemaining(config.durationSec); }}
        config={config}
        onConfigChange={setConfig}
      />
    </div>
  );
}
