/**
 * Audio-related type definitions
 */

/**
 * Audio file metadata
 */
export interface AudioMetadata {
  duration: number;
  sampleRate: number;
}

/**
 * Audio file representation
 */
export interface AudioFile {
  id: string;
  name: string;
  lastUsed: string;
  path?: string;
  objectUrl?: string;
}

/**
 * Audio track configuration
 */
export interface AudioTrackConfig {
  volume: number;
  loop: boolean;
  filePath: string;
  bpm?: number;
  sessionDuration?: number;
  oscillatorType?: 'sine' | 'square' | 'triangle' | 'sawtooth';
}

/**
 * Contact sound configuration
 */
export interface ContactSoundConfig {
  leftSamplePath: string;
  rightSamplePath: string;
  volume: number;
  enabled: boolean;
}

/**
 * Audio mode type
 */
export type AudioMode = 'click' | 'track'; 