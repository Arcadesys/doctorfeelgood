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

export const createAudioProcessor = async (
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

  console.log('Creating audio processor for:', audioUrl);

  // Wait for audio metadata to load
  await new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      console.log('Audio metadata loaded for:', title);
      resolve();
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error('Error loading audio:', audioElement.error, e);
      // Still resolve to avoid blocking, but log the error
      resolve();
    };
    
    audioElement.addEventListener('loadedmetadata', handleLoad);
    audioElement.addEventListener('canplaythrough', handleLoad);
    audioElement.addEventListener('error', handleError);
    
    // Set a timeout in case the audio doesn't load
    const timeout = setTimeout(() => {
      console.warn('Audio load timeout for:', title);
      resolve();
    }, 5000);
    
    // Clean up event listeners on resolve/reject
    const cleanup = () => {
      clearTimeout(timeout);
      audioElement.removeEventListener('loadedmetadata', handleLoad);
      audioElement.removeEventListener('canplaythrough', handleLoad);
      audioElement.removeEventListener('error', handleError);
    };
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
      console.log('Playing audio:', title);
      try {
        await audioElement.play();
        isCurrentlyPlaying = true;
      } catch (e) {
        console.error('Error playing audio:', e);
        throw e;
      }
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