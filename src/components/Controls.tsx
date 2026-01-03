import React, { useState } from 'react';
import DurationPicker from './DurationPicker';
import FileUpload from './FileUpload';
import { AppConfig, PitchPreset, EMOJI_OPTIONS } from '../types';

type Props = {
  playing: boolean;
  remainingSec: number;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
  config: AppConfig;
  onConfigChange: (c: AppConfig) => void;
};

// Volume threshold for warning
const VOLUME_WARNING_THRESHOLD = 0.7;

export default function Controls({ playing, remainingSec, onPlay, onStop, onReset, config, onConfigChange }: Props) {
  const time = `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`;
  const showVolumeWarning = config.audio.volume > VOLUME_WARNING_THRESHOLD && !config.audio.muted;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="controls" role="region" aria-label="Session controls">
      {/* Transport Row */}
      <div className="controls-row controls-transport">
        <div className="row" role="group" aria-label="Transport">
          <button className="btn primary" onClick={onPlay} aria-label="Play (Space)" disabled={playing}>
            ▶ Play
          </button>
          <button className="btn" onClick={onStop} aria-label="Stop (Space)" disabled={!playing}>
            ⏹ Stop
          </button>
          <button className="btn" onClick={onReset} aria-label="Reset session (Esc)">↺ Reset</button>
        </div>
        <div className="row">
          <span className="label">Remaining</span>
          <span className="time" aria-live="polite">{time}</span>
        </div>
        <DurationPicker
          value={config.durationSec}
          onChange={(sec) => onConfigChange({ ...config, durationSec: sec })}
        />
      </div>

      {/* Visual Settings Section */}
      <fieldset className="controls-section">
        <legend className="section-legend">Visual</legend>
        <div className="controls-grid">
          <label className="control-item">
            <span className="label">Shape</span>
            <select
              className="select"
              value={config.target.shape ?? 'circle'}
              onChange={(e) => onConfigChange({
                ...config,
                target: { ...config.target, shape: e.target.value as any },
              })}
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="diamond">Diamond</option>
              <option value="smiley">Smiley</option>
              <option value="triangle">Triangle</option>
              <option value="star">Star</option>
              <option value="hexagon">Hexagon</option>
              <option value="ring">Ring</option>
              <option value="bullseye">Bullseye</option>
              <option value="cross">Cross</option>
              <option value="heart">Heart</option>
              <option value="emoji">Emoji</option>
            </select>
          </label>

          {config.target.shape === 'emoji' && (
            <div className="control-item">
              <span className="label">Emoji</span>
              <div className="emoji-picker-container">
                <button
                  type="button"
                  className="btn emoji-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  aria-label="Choose emoji"
                >
                  {config.target.emoji || '🔵'}
                </button>
                {showEmojiPicker && (
                  <div className="emoji-picker" role="listbox" aria-label="Emoji options">
                    {EMOJI_OPTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className={`emoji-option ${config.target.emoji === em ? 'selected' : ''}`}
                        onClick={() => {
                          onConfigChange({
                            ...config,
                            target: { ...config.target, emoji: em },
                          });
                          setShowEmojiPicker(false);
                        }}
                        role="option"
                        aria-selected={config.target.emoji === em}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <label className="control-item">
            <span className="label">Color</span>
            <input
              type="color"
              value={config.target.color}
              onChange={(e) => onConfigChange({
                ...config,
                target: { ...config.target, color: e.target.value },
              })}
            />
          </label>

          <label className="control-item">
            <span className="label">Size</span>
            <div className="range-with-value">
              <input
                className="input"
                type="range"
                min={8}
                max={120}
                step={1}
                value={config.target.sizePx}
                onChange={(e) => onConfigChange({
                  ...config,
                  target: { ...config.target, sizePx: parseInt(e.target.value, 10) || 0 },
                })}
              />
              <span className="value">{config.target.sizePx}px</span>
            </div>
          </label>

          <label className="control-item">
            <span className="label">Speed</span>
            <div className="range-with-value">
              <input
                className="input"
                type="range"
                min={60}
                max={2400}
                step={50}
                value={config.target.speedPxPerSec}
                onChange={(e) => onConfigChange({
                  ...config,
                  target: { ...config.target, speedPxPerSec: parseInt(e.target.value, 10) },
                })}
              />
              <span className="value">~{Math.round((config.target.speedPxPerSec / 2400) * 60)} BPM</span>
            </div>
          </label>

          <label className="control-item control-item-checkbox">
            <input
              type="checkbox"
              checked={config.target.rotate ?? false}
              onChange={(e) => onConfigChange({
                ...config,
                target: { ...config.target, rotate: e.target.checked },
              })}
            />
            <span className="label">Rotate</span>
          </label>

          <label className="control-item">
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

          <label className="control-item">
            <span className="label">Edge padding</span>
            <input
              className="input input-number"
              type="number"
              min={0}
              max={200}
              value={config.target.edgePaddingPx}
              onChange={(e) => onConfigChange({
                ...config,
                target: { ...config.target, edgePaddingPx: Math.max(0, Math.min(200, parseInt(e.target.value, 10) || 0)) },
              })}
            />
          </label>

          <label className="control-item">
            <span className="label">Edge pause</span>
            <div className="range-with-value">
              <input
                className="input input-number"
                type="number"
                min={0}
                max={2000}
                step={50}
                value={config.target.edgePauseMs}
                onChange={(e) => onConfigChange({
                  ...config,
                  target: { ...config.target, edgePauseMs: Math.max(0, Math.min(2000, parseInt(e.target.value, 10) || 0)) },
                })}
              />
              <span className="value">ms</span>
            </div>
          </label>
        </div>
      </fieldset>

      {/* Audio Settings Section */}
      <fieldset className="controls-section">
        <legend className="section-legend">Audio</legend>
        <div className="controls-grid">
          <label className="control-item control-item-checkbox">
            <input
              type="checkbox"
              checked={config.audio.muted}
              onChange={(e) => onConfigChange({
                ...config,
                audio: { ...config.audio, muted: e.target.checked },
              })}
              aria-label="Mute audio"
            />
            <span className="label">Mute</span>
          </label>

          <label className="control-item">
            <span className="label">
              Volume
              {showVolumeWarning && <span className="warning" title="High volume">⚠</span>}
            </span>
            <div className="range-with-value">
              <input
                className="input"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={config.audio.volume}
                disabled={config.audio.muted}
                onChange={(e) => onConfigChange({
                  ...config,
                  audio: { ...config.audio, volume: parseFloat(e.target.value) },
                })}
              />
              <span className="value">{Math.round(config.audio.volume * 100)}%</span>
            </div>
          </label>

          <label className="control-item">
            <span className="label">Sound</span>
            <select
              className="select"
              value={config.audio.mode}
              onChange={(e) => onConfigChange({ ...config, audio: { ...config.audio, mode: e.target.value as any } })}
            >
              <option value="click">Click</option>
              <option value="beep">Beep</option>
              <option value="hiss">Hiss</option>
              <option value="chirp">Chirp</option>
              <option value="pulse">Pulse</option>
              <option value="file">Custom File</option>
            </select>
          </label>

          {config.audio.mode === 'click' && (
            <label className="control-item">
              <span className="label">Waveform</span>
              <select
                className="select"
                value={config.audio.waveform ?? 'sine'}
                onChange={(e) => onConfigChange({
                  ...config,
                  audio: { ...config.audio, waveform: e.target.value as any },
                })}
              >
                <option value="sine">Sine (soft)</option>
                <option value="triangle">Triangle</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
              </select>
            </label>
          )}

          <label className="control-item">
            <span className="label">Pitch</span>
            <select
              className="select"
              value={config.audio.pitch ?? 'medium'}
              onChange={(e) => onConfigChange({
                ...config,
                audio: { ...config.audio, pitch: e.target.value as PitchPreset },
              })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="control-item">
            <span className="label">Pan depth</span>
            <div className="range-with-value">
              <input
                className="input"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={config.audio.panDepth ?? 1}
                onChange={(e) => onConfigChange({
                  ...config,
                  audio: { ...config.audio, panDepth: parseFloat(e.target.value) },
                })}
              />
              <span className="value">{Math.round((config.audio.panDepth ?? 1) * 100)}%</span>
            </div>
          </label>

          <label className="control-item">
            <span className="label">Fade in</span>
            <div className="range-with-value">
              <input
                className="input"
                type="range"
                min={0}
                max={100}
                step={5}
                value={config.audio.fadeInMs ?? 0}
                onChange={(e) => onConfigChange({
                  ...config,
                  audio: { ...config.audio, fadeInMs: parseInt(e.target.value, 10) },
                })}
              />
              <span className="value">{config.audio.fadeInMs ?? 0}ms</span>
            </div>
          </label>

          {config.audio.mode === 'file' && (
            <label className="control-item control-item-wide">
              <span className="label">Sound file</span>
              <FileUpload
                onFileSelect={(fileUrl, fileName) => onConfigChange({
                  ...config,
                  audio: { ...config.audio, fileUrl, fileName }
                })}
                currentFileName={config.audio.fileName}
                currentFileUrl={config.audio.fileUrl}
                accept="audio/*"
              />
            </label>
          )}
        </div>
      </fieldset>

      {/* Keyboard shortcut hint */}
      <div className="controls-hint">
        <span className="hint">Space: play/stop · Esc: reset</span>
      </div>
    </div>
  );
}
