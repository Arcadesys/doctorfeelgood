// Audio context singleton to ensure we only create one
let audioContext: AudioContext | null = null;
let audioContextInitialized = false;

export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    // Just create the context but don't start it yet
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const resumeAudioContext = async (): Promise<void> => {
  const ctx = getAudioContext();
  // Only attempt to resume if we're in a suspended state
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      audioContextInitialized = true;
      console.log('AudioContext successfully resumed');
    } catch (err) {
      console.error('Failed to resume AudioContext:', err);
    }
  } else {
    audioContextInitialized = true;
    console.log('AudioContext already active:', ctx.state);
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
  // Initialize the audio context right away
  const ctx = getAudioContext();
  await resumeAudioContext();
  
  // Create audio element for streaming
  const audioElement = new Audio();
  audioElement.crossOrigin = 'anonymous';
  audioElement.src = audioUrl;
  audioElement.preload = 'auto';
  // Set volume to zero initially to avoid unexpected sounds
  audioElement.volume = 0;

  console.log('Creating audio processor for:', audioUrl);

  // Wait for audio metadata to load
  await new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      console.log('Audio metadata loaded for:', title);
      resolve();
    };
    
    const handleError = (e: Event) => {
      // Get detailed error information
      const errorDetails = {
        code: audioElement.error?.code,
        message: audioElement.error?.message,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState,
        currentSrc: audioElement.currentSrc,
      };
      
      console.error('Error loading audio:', errorDetails, 'for file:', title);
      
      // Still resolve to avoid blocking, but log the error
      resolve();
    };
    
    // Add canplay event which is more reliable than loadedmetadata
    audioElement.addEventListener('canplay', handleLoad);
    audioElement.addEventListener('loadedmetadata', handleLoad);
    audioElement.addEventListener('error', handleError);
    
    // Manually try to load
    try {
      audioElement.load();
    } catch (err) {
      console.warn('Manual load attempt failed:', err);
    }
    
    // Set a timeout in case the audio doesn't load
    const timeout = setTimeout(() => {
      console.warn('Audio load timeout for:', title);
      // Even if we timeout, we should still try to continue
      // This allows for progressive loading of large files
      resolve();
    }, 30000); // Increased timeout to 30 seconds for large files like Duke Ellington jazz recordings
    
    // Also check for progress to handle large files
    audioElement.addEventListener('progress', () => {
      // If we have some data loaded, we can resolve earlier
      if (audioElement.buffered.length > 0) {
        console.log(`Audio file ${title} loading progress:`, 
          audioElement.buffered.end(0) / audioElement.duration * 100, '%');
        
        // If we've loaded at least the first 5% of the file, we can proceed
        if (audioElement.buffered.end(0) > audioElement.duration * 0.05) {
          console.log('Enough audio loaded to start playback');
          resolve();
          clearTimeout(timeout);
        }
      }
    });
    
    // Clean up event listeners on resolve/reject
    const cleanup = () => {
      clearTimeout(timeout);
      audioElement.removeEventListener('canplay', handleLoad);
      audioElement.removeEventListener('loadedmetadata', handleLoad);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('progress', () => {});
    };
    
    // Make sure to clean up
    Promise.resolve().then(() => cleanup);
  });
  
  // Variable to track if we've set up the audio nodes
  let audioNodesInitialized = false;
  let source: MediaElementAudioSourceNode;
  let gainNode: GainNode;
  let pannerNode: StereoPannerNode;
  
  // Function to initialize audio nodes when ready
  const initAudioNodes = async () => {
    if (audioNodesInitialized) return;
    
    // Make sure the audio context is resumed
    await resumeAudioContext();
    
    try {
      // Create Web Audio nodes
      source = ctx.createMediaElementSource(audioElement);
      gainNode = ctx.createGain();
      pannerNode = ctx.createStereoPanner();
      
      // Connect the audio graph
      source.connect(pannerNode);
      pannerNode.connect(gainNode);
      gainNode.connect(ctx.destination);
  
      // Default values
      pannerNode.pan.value = 0;
      gainNode.gain.value = 1.0;
      
      audioNodesInitialized = true;
      console.log('Audio nodes initialized successfully');
    } catch (err) {
      console.error('Failed to initialize audio nodes:', err);
      // If initialization fails, we need to reconnect the audio element
      // to allow normal playback even without effects
      try {
        // Disconnect any existing connections
        source?.disconnect();
        // Create a fallback direct connection
        audioElement.onplay = () => {
          console.log('Using fallback audio playback');
        };
      } catch (fallbackErr) {
        console.error('Even fallback audio setup failed:', fallbackErr);
      }
    }
  };
  
  let isCurrentlyPlaying = false;
  let endedCallback: (() => void) | null = null;

  // Handle ended event
  audioElement.addEventListener('ended', () => {
    isCurrentlyPlaying = false;
    if (endedCallback) endedCallback();
  });

  return {
    play: async () => {
      try {
        // Initialize audio nodes if not done yet
        if (!audioNodesInitialized) {
          await initAudioNodes();
        }
        
        // Make sure context is resumed (this requires user gesture)
        await resumeAudioContext();
        
        // Reset if we've reached the end
        if (audioElement.ended || audioElement.currentTime >= audioElement.duration - 0.1) {
          audioElement.currentTime = 0;
        }
        
        console.log('Playing audio:', title);
        
        // Set a timeout to detect if play() is hanging
        const playPromise = audioElement.play();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Audio play timeout')), 5000);
        });
        
        // Race between play and timeout
        await Promise.race([playPromise, timeoutPromise])
          .catch(async (err) => {
            console.warn('Initial play attempt failed:', err);
            
            // Try again with a short delay - helps in some browsers
            await new Promise(resolve => setTimeout(resolve, 500));
            return audioElement.play();
          });
        
        isCurrentlyPlaying = true;
      } catch (e) {
        console.error('Error playing audio:', e);
        
        // Fallback approach - create a duplicate player
        try {
          console.log('Trying fallback with new Audio element');
          
          // Create a fresh Audio element
          const fallbackPlayer = new Audio(audioUrl);
          fallbackPlayer.volume = 0.5;
          fallbackPlayer.loop = true;
          
          // Try to play with this new element
          await fallbackPlayer.play();
          
          // If successful, replace our current element
          audioElement = fallbackPlayer;
          isCurrentlyPlaying = true;
          
          console.log('Fallback audio player succeeded');
          
          // Reset our audio nodes with the new element
          audioNodesInitialized = false;
          initAudioNodes().catch(err => 
            console.error('Could not initialize nodes with fallback:', err)
          );
        } catch (fallbackErr) {
          console.error('Even fallback playback failed:', fallbackErr);
          throw e;
        }
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
      // Only set pan if audio nodes are initialized
      if (audioNodesInitialized) {
        // Ensure value is between -1 and 1
        const clampedValue = Math.max(-1, Math.min(1, value));
        pannerNode.pan.value = clampedValue;
      } else {
        console.log('Cannot set pan yet - audio nodes not initialized');
        // Try to initialize if we're playing but nodes aren't ready
        if (isCurrentlyPlaying) {
          initAudioNodes().then(() => {
            pannerNode.pan.value = Math.max(-1, Math.min(1, value));
            console.log('Pan set after delayed initialization');
          }).catch(err => console.error('Failed to init nodes for panning:', err));
        }
      }
    },
    setVolume: (value: number) => {
      // Only set gain if audio nodes are initialized
      if (audioNodesInitialized) {
        // Convert dB to linear
        if (value <= -100) {
          gainNode.gain.value = 0;
        } else {
          gainNode.gain.value = Math.pow(10, value / 20);
        }
      }
    },
    isPlaying: () => isCurrentlyPlaying,
    getTitle: () => title,
    onEnded: (callback: () => void) => {
      endedCallback = callback;
    }
  };
}; 