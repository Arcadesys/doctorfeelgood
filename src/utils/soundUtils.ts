import * as Tone from 'tone';

// Types for guide tones
export type GuideToneType = 'success' | 'error' | 'warning' | 'info' | 'start' | 'stop';

interface GuideToneOptions {
  volume?: number; // 0 to 1
  duration?: number; // in seconds
}

/**
 * Safely ensures audio context is started
 * Should be called after a user interaction before playing any sounds
 */
export async function ensureAudioContextStarted(): Promise<boolean> {
  if (Tone.context.state !== 'running') {
    try {
      await Tone.start();
      console.log('Audio context started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start audio context:', error);
      return false;
    }
  }
  return true;
}

/**
 * Play a guide tone for accessibility feedback
 * @param type The type of guide tone to play
 * @param options Options for volume and duration
 */
export async function playGuideTone(
  type: GuideToneType, 
  options: GuideToneOptions = {}
): Promise<void> {
  const { volume = 0.5, duration = 0.2 } = options;
  
  // Make sure audio context is started
  const isStarted = await ensureAudioContextStarted();
  if (!isStarted) return;
  
  // Configure synth based on the type of tone
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 0.4,
    },
    volume: Tone.gainToDb(volume),
  }).toDestination();
  
  // Different tone configurations based on type
  switch (type) {
    case 'success': 
      // Rising major third
      synth.triggerAttackRelease('C5', duration / 3);
      setTimeout(() => synth.triggerAttackRelease('E5', duration / 3), duration * 333);
      break;
      
    case 'error':
      // Falling minor second
      synth.triggerAttackRelease('C5', duration / 3);
      setTimeout(() => synth.triggerAttackRelease('B4', duration / 3), duration * 333);
      break;
      
    case 'warning':
      // Repeated note
      synth.triggerAttackRelease('G4', duration / 4);
      setTimeout(() => synth.triggerAttackRelease('G4', duration / 4), duration * 250);
      setTimeout(() => synth.triggerAttackRelease('G4', duration / 4), duration * 500);
      break;
      
    case 'info':
      // Short single note
      synth.triggerAttackRelease('E5', duration);
      break;
      
    case 'start':
      // Rising perfect fifth
      synth.triggerAttackRelease('C5', duration / 2);
      setTimeout(() => synth.triggerAttackRelease('G5', duration / 2), duration * 500);
      break;
      
    case 'stop':
      // Falling perfect fifth
      synth.triggerAttackRelease('G5', duration / 2);
      setTimeout(() => synth.triggerAttackRelease('C5', duration / 2), duration * 500);
      break;
      
    default:
      synth.triggerAttackRelease('C5', duration);
  }
  
  // Clean up the synth after the tone is complete
  setTimeout(() => {
    synth.dispose();
  }, duration * 1000 + 100);
}

/**
 * Safely handles volume conversion between linear (0-1) and decibels
 * @param volume Linear volume (0 to 1)
 * @returns Volume in decibels
 */
export function safeDbConversion(volume: number): number {
  const safeVolume = Math.max(0, Math.min(1, volume));
  return Tone.gainToDb(safeVolume);
} 