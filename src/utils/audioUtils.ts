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

  // Check if the URL is a direct YouTube watch URL
  // If so, we need to use a different approach since browser security won't allow direct embedding
  if (audioUrl.includes('youtube.com/watch')) {
    console.log('Direct YouTube URL detected, using audio element with proxy');
    
    // Create a proxy URL that goes through our backend for YouTube embeds
    // This helps avoid CORS issues
    const videoId = new URL(audioUrl).searchParams.get('v');
    if (!videoId) {
      throw new Error('Invalid YouTube URL: could not extract video ID');
    }
    
    // Use an audio element that will work with YouTube content
    const audioElement = document.createElement('audio');
    audioElement.crossOrigin = 'anonymous';
    
    // Try to use YouTube iframe API approach
    const iframeContainer = document.createElement('div');
    iframeContainer.style.display = 'none';
    document.body.appendChild(iframeContainer);
    
    // Use YouTube's embed URL which allows audio playback
    const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
    iframeContainer.innerHTML = `<iframe id="youtube-frame-${videoId}" 
                                      src="${embedSrc}" 
                                      allow="autoplay" 
                                      style="display:none">
                                </iframe>`;
    
    // Create stub audio context nodes since we can't directly connect to the iframe
    const gainNode = ctx.createGain();
    const pannerNode = ctx.createStereoPanner();
    
    // Connect these nodes even though we won't use them directly
    pannerNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Default values
    pannerNode.pan.value = 0;
    gainNode.gain.value = 1.0;
    
    let isCurrentlyPlaying = false;
    let endedCallback: (() => void) | null = null;
    
    return {
      play: async () => {
        await resumeAudioContext();
        console.log('Playing YouTube audio via iframe');
        isCurrentlyPlaying = true;
        // The iframe will auto-play
      },
      pause: () => {
        console.log('Pausing YouTube audio');
        // We can't directly control the iframe, but we can try to post messages
        try {
          const frame = document.getElementById(`youtube-frame-${videoId}`) as HTMLIFrameElement;
          if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          }
        } catch (e) {
          console.error('Error pausing YouTube iframe:', e);
        }
        isCurrentlyPlaying = false;
      },
      stop: () => {
        console.log('Stopping YouTube audio');
        // Try to stop the iframe
        try {
          const frame = document.getElementById(`youtube-frame-${videoId}`) as HTMLIFrameElement;
          if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
          }
        } catch (e) {
          console.error('Error stopping YouTube iframe:', e);
        }
        isCurrentlyPlaying = false;
      },
      setPan: (value: number) => {
        // Store the pan value even though we can't apply it directly to YouTube iframe
        pannerNode.pan.value = Math.max(-1, Math.min(1, value));
        console.log('Setting pan value:', value);
      },
      setVolume: (value: number) => {
        // Try to control volume via iframe
        try {
          const frame = document.getElementById(`youtube-frame-${videoId}`) as HTMLIFrameElement;
          if (frame && frame.contentWindow) {
            // Convert dB to percentage (0-100)
            const volumePercent = Math.min(100, Math.max(0, 
              value <= -40 ? 0 : Math.round((value + 40) * 2.5)
            ));
            frame.contentWindow.postMessage(
              `{"event":"command","func":"setVolume","args":[${volumePercent}]}`, '*'
            );
          }
        } catch (e) {
          console.error('Error setting YouTube volume:', e);
        }
      },
      isPlaying: () => isCurrentlyPlaying,
      getTitle: () => title,
      onEnded: (callback: () => void) => {
        endedCallback = callback;
      }
    };
  }

  // For non-YouTube URLs or direct audio URLs, use the original implementation
  console.log('Using standard audio implementation for URL:', audioUrl);
  
  // Create audio element for streaming
  const audioElement = new Audio();
  audioElement.crossOrigin = 'anonymous';
  audioElement.src = audioUrl;
  audioElement.preload = 'auto';

  // Wait for audio metadata to load
  await new Promise<void>((resolve) => {
    audioElement.addEventListener('loadedmetadata', () => resolve());
    audioElement.addEventListener('error', (e) => {
      console.error('Error loading audio:', audioElement.error, e);
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
      console.log('Playing audio element');
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