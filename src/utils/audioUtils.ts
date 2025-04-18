// Audio context singleton to ensure we only create one
let audioContext: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const resumeAudioContext = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
};

export interface AudioProcessor {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setPan: (value: number) => void;
  setVolume: (value: number) => void;
  isPlaying: () => boolean;
  getTitle: () => string;
  onEnded: (callback: () => void) => void;
}

export const createYouTubeAudioProcessor = async (
  audioUrl: string, 
  title: string
): Promise<AudioProcessor> => {
  const ctx = getAudioContext();
  await resumeAudioContext();

  // Create audio element for streaming
  const audioElement = new Audio();
  audioElement.crossOrigin = 'anonymous';
  audioElement.src = audioUrl;
  audioElement.preload = 'auto';

  // Wait for audio metadata to load
  await new Promise<void>((resolve) => {
    audioElement.addEventListener('loadedmetadata', () => resolve());
    audioElement.addEventListener('error', () => {
      console.error('Error loading audio:', audioElement.error);
      resolve();
    });
  });

  // Create Web Audio nodes
  const source = ctx.createMediaElementSource(audioElement);
  const gainNode = ctx.createGain();
  const pannerNode = ctx.createStereoPanner();
  
  // Connect the audio graph
  source.connect(pannerNode);
  pannerNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Default values
  pannerNode.pan.value = 0;
  gainNode.gain.value = 1.0;
  
  let isCurrentlyPlaying = false;
  let endedCallback: (() => void) | null = null;

  // Handle ended event
  audioElement.addEventListener('ended', () => {
    isCurrentlyPlaying = false;
    if (endedCallback) endedCallback();
  });

  return {
    play: async () => {
      await resumeAudioContext();
      await audioElement.play();
      isCurrentlyPlaying = true;
    },
    pause: () => {
      audioElement.pause();
      isCurrentlyPlaying = false;
    },
    stop: () => {
      audioElement.pause();
      audioElement.currentTime = 0;
      isCurrentlyPlaying = false;
    },
    setPan: (value: number) => {
      // Ensure value is between -1 and 1
      pannerNode.pan.value = Math.max(-1, Math.min(1, value));
    },
    setVolume: (value: number) => {
      // Convert dB to linear
      if (value <= -100) {
        gainNode.gain.value = 0;
      } else {
        gainNode.gain.value = Math.pow(10, value / 20);
      }
    },
    isPlaying: () => isCurrentlyPlaying,
    getTitle: () => title,
    onEnded: (callback: () => void) => {
      endedCallback = callback;
    }
  };
}; 