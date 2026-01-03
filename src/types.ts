export type AudioMode = 'click' | 'beep' | 'hiss' | 'chirp' | 'pulse' | 'file';
export type AudioWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type PitchPreset = 'low' | 'medium' | 'high';
export type BuiltinShape = 'circle' | 'square' | 'diamond' | 'smiley' | 'triangle' | 'star' | 'hexagon' | 'ring' | 'bullseye' | 'cross' | 'heart';

// Common calming emoji options for EMDR
export const EMOJI_OPTIONS = [
  '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', // colored circles
  '⭐', '🌟', '✨', '💫',              // stars
  '🌸', '🌺', '🌻', '🌷', '🪷',        // flowers
  '🦋', '🐦', '🕊️', '🐬',             // calming animals
  '☀️', '🌙', '⭕', '💎',              // celestial/shapes
  '🍀', '🌿', '🌊', '❤️',              // nature/heart
] as const;

export interface AppConfig {
  durationSec: number; // multiples of 15
  target: {
    sizePx: number;
    color: string;
    shape?: BuiltinShape | 'emoji' | 'custom'; // 'emoji' uses emoji field, 'custom' uses customIconUrl
    emoji?: string; // emoji character when shape is 'emoji'
    customIconUrl?: string; // data URL for custom uploaded icon
    customIconName?: string; // original filename for display
    rotate?: boolean; // spin while moving
    speedPxPerSec: number;
    edgePaddingPx: number; // min distance from left/right edges
    edgePauseMs: number; // hold at edges before reversing
    startPosition: 'center' | 'left' | 'right';
  };
  audio: {
    mode: AudioMode;
    fileUrl?: string;
    fileName?: string;
    volume: number; // 0..1 (capped at 0.8 with warning)
    muted: boolean;
    waveform?: AudioWaveform; // oscillator waveform for generated clicks
    pitch?: PitchPreset; // low/medium/high frequency
    panDepth?: number; // 0..1 how far L/R the sound pans
    fadeInMs?: number; // optional fade-in duration
  };
}
