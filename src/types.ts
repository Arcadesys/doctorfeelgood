export type AudioMode = 'click' | 'beep' | 'hiss' | 'chirp' | 'pulse' | 'file';
export type AudioWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface AppConfig {
  durationSec: number; // multiples of 15
  target: {
    sizePx: number;
    color: string;
    shape?: 'circle' | 'square' | 'diamond' | 'smiley' | 'triangle' | 'star' | 'hexagon' | 'ring' | 'bullseye' | 'cross' | 'heart';
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
    volume: number; // 0..1
    waveform?: AudioWaveform; // oscillator waveform for generated clicks
  };
}
