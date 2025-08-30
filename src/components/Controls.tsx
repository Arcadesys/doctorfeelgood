import React from 'react';
import DurationPicker from './DurationPicker';
import { AppConfig } from '../types';

type Props = {
  playing: boolean;
  remainingSec: number;
  onPlayPause: () => void;
  onReset: () => void;
  config: AppConfig;
  onConfigChange: (c: AppConfig) => void;
};

export default function Controls({ playing, remainingSec, onPlayPause, onReset, config, onConfigChange }: Props) {
  const time = `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`;

  return (
    <div className="controls" role="region" aria-label="Session controls">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row" role="group" aria-label="Transport">
          <button className="btn primary" onClick={onPlayPause} aria-pressed={playing} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button className="btn" onClick={onReset} aria-label="Reset session">Reset</button>
        </div>
        <div className="row">
          <span className="label">Remaining</span>
          <span className="time" aria-live="polite">{time}</span>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <DurationPicker
          value={config.durationSec}
          onChange={(sec) => onConfigChange({ ...config, durationSec: sec })}
        />

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Speed</span>
          <input
            className="input"
            type="range"
            min={60}
            max={600}
            step={10}
            value={config.target.speedPxPerSec}
            onChange={(e) => onConfigChange({
              ...config,
              target: { ...config.target, speedPxPerSec: parseInt(e.target.value, 10) },
            })}
          />
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Edge padding</span>
          <input
            className="input"
            type="number"
            min={0}
            max={200}
            value={config.target.edgePaddingPx}
            onChange={(e) => onConfigChange({
              ...config,
              target: { ...config.target, edgePaddingPx: Math.max(0, parseInt(e.target.value, 10) || 0) },
            })}
          />
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Pause @ edges (ms)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={2000}
            step={50}
            value={config.target.edgePauseMs}
            onChange={(e) => onConfigChange({
              ...config,
              target: { ...config.target, edgePauseMs: Math.max(0, parseInt(e.target.value, 10) || 0) },
            })}
          />
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Start</span>
          <select
            className="select"
            value={config.target.startPosition}
            onChange={(e) => onConfigChange({
              ...config,
              target: { ...config.target, startPosition: e.target.value as any },
            })}
          >
            <option value="center">Center</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Size</span>
          <input
            className="input"
            style={{ width: 120 }}
            type="number"
            min={8}
            max={120}
            value={config.target.sizePx}
            onChange={(e) => onConfigChange({
              ...config,
              target: { ...config.target, sizePx: parseInt(e.target.value, 10) || 0 },
            })}
          />
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Color</span>
          <input
            className="input"
            type="color"
            value={config.target.color}
            onChange={(e) => onConfigChange({
              ...config,
              target: { ...config.target, color: e.target.value },
            })}
          />
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Volume</span>
          <input
            className="input"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={config.audio.volume}
            onChange={(e) => onConfigChange({
              ...config,
              audio: { ...config.audio, volume: parseFloat(e.target.value) },
            })}
          />
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="label">Audio</span>
          <select
            className="select"
            value={config.audio.mode}
            onChange={(e) => onConfigChange({ ...config, audio: { ...config.audio, mode: e.target.value as any } })}
          >
            <option value="click">Click</option>
            <option value="file">File (coming soon)</option>
          </select>
        </label>
      </div>
    </div>
  );
}
