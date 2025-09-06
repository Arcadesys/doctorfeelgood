import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Target from './components/Target';
import Controls from './components/Controls';
import { AppConfig } from './types';
import { loadJSON, saveJSON } from './lib/storage';
import { useAudioEngine } from './hooks/useAudioEngine';

const DEFAULTS: AppConfig = {
  durationSec: 120,
  target: {
    sizePx: 24,
    color: '#00FF88',
    shape: 'circle',
    rotate: false,
    speedPxPerSec: 400,
    edgePaddingPx: 16,
    edgePauseMs: 0,
    startPosition: 'center',
  },
  audio: {
    mode: 'click',
    volume: 0.8,
    waveform: 'square',
  },
};

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = loadJSON<AppConfig>();
    if (!saved) return DEFAULTS;
    // shallow migration for newly added fields
    return {
      ...DEFAULTS,
      ...saved,
      target: { ...DEFAULTS.target, ...saved.target },
      audio: { ...DEFAULTS.audio, ...saved.audio },
    };
  });
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(config.durationSec);

  useEffect(() => saveJSON(config), [config]);
  useEffect(() => setRemaining(config.durationSec), [config.durationSec]);

  const audio = useAudioEngine(
    true, 
    config.audio.volume, 
    config.audio.waveform ?? 'square',
    config.audio.mode,
    config.audio.fileUrl
  );

  // Ensure audio engine suspends when not playing
  useEffect(() => {
    if (!playing) audio.stop();
  }, [playing, audio]);

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
