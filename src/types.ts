export type AudioMode = 'click' | 'file';

export interface AppConfig {
  durationSec: number; // multiples of 15
  target: {
    sizePx: number;
    color: string;
    speedPxPerSec: number;
    edgePaddingPx: number; // min distance from left/right edges
    edgePauseMs: number; // hold at edges before reversing
    startPosition: 'center' | 'left' | 'right';
  };
  audio: {
    mode: AudioMode;
    fileUrl?: string;
    volume: number; // 0..1
  };
}
