// Audio Engine for EMDR Processor

export type AudioMode = 'click' | 'audioTrack';

export interface ContactSoundConfig {
  leftSamplePath: string;
  rightSamplePath: string;
  volume: number;
  enabled: boolean;
}

export interface AudioTrackConfig {
  volume: number;
  loop: boolean;
  filePath: string;
}

// Main Audio Engine Class
export class AudioEngine {
  private context: AudioContext | null = null;
  private audioTrackNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private currentMode: AudioMode = 'click';
  private audioElementConnected = false;
  
  // Sample buffers for contact sounds
  private leftClickBuffer: AudioBuffer | null = null;
  private rightClickBuffer: AudioBuffer | null = null;
  
  // Configuration
  private contactSoundConfig: ContactSoundConfig = {
    leftSamplePath: '/sounds/click-left.mp3',
    rightSamplePath: '/sounds/click-right.mp3',
    volume: 0.5,
    enabled: true
  };
  
  private audioTrackConfig: AudioTrackConfig = {
    volume: 0.7,
    loop: true,
    filePath: '/audio/sine-440hz.mp3'
  };

  // Initialize the audio engine
  public async initialize(audioElement?: HTMLAudioElement): Promise<boolean> {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioCtx();
      
      // Create main nodes
      this.gainNode = this.context.createGain();
      this.pannerNode = this.context.createStereoPanner();
      
      // Connect nodes
      this.gainNode.connect(this.pannerNode);
      this.pannerNode.connect(this.context.destination);
      
      // Set audio element if provided
      if (audioElement) {
        this.audioElement = audioElement;
        
        // Wait for the audio element to be ready
        if (audioElement.readyState < 2) { // HAVE_CURRENT_DATA
          await new Promise<void>((resolve, reject) => {
            const handleCanPlay = () => {
              audioElement.removeEventListener('canplay', handleCanPlay);
              audioElement.removeEventListener('error', handleError);
              resolve();
            };
            const handleError = (e: Event) => {
              audioElement.removeEventListener('canplay', handleCanPlay);
              audioElement.removeEventListener('error', handleError);
              console.error('Audio failed to load:', e);
              reject(new Error('Audio failed to load'));
            };
            audioElement.addEventListener('canplay', handleCanPlay);
            audioElement.addEventListener('error', handleError);
          });
        }
        
        try {
          // Disconnect any existing connections first
          try {
            const existingSource = this.context.createMediaElementSource(audioElement);
            existingSource.disconnect();
          } catch (err) {
            // Ignore errors here as they likely mean no existing connection
          }
          
          // Now create our new connection
          this.audioTrackNode = this.context.createMediaElementSource(audioElement);
          this.audioTrackNode.connect(this.gainNode);
          this.audioElementConnected = true;
        } catch (err) {
          console.error('Failed to create media element source:', err);
          // Create fallback oscillator
          this.createFallbackTones();
          return true; // Still return true as we have a fallback
        }
      }
      
      // Load click samples
      await this.loadClickSamples();
      
      // Resume context if suspended (needed for some browsers)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      
      console.log('AudioEngine initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      // Try to create fallback tones even if initialization fails
      try {
        this.createFallbackTones();
        return true;
      } catch (fallbackError) {
        console.error('Failed to create fallback tones:', fallbackError);
        return false;
      }
    }
  }
  
  // Load click samples
  private async loadClickSamples(): Promise<void> {
    if (!this.context) return;
    
    try {
      const [leftResponse, rightResponse] = await Promise.all([
        fetch(this.contactSoundConfig.leftSamplePath),
        fetch(this.contactSoundConfig.rightSamplePath)
      ]);
      
      if (!leftResponse.ok || !rightResponse.ok) {
        console.warn('Click samples not found, using fallback tones');
        // Create simple fallback tones instead of failing
        this.createFallbackTones();
        return;
      }
      
      const [leftArrayBuffer, rightArrayBuffer] = await Promise.all([
        leftResponse.arrayBuffer(),
        rightResponse.arrayBuffer()
      ]);
      
      try {
        this.leftClickBuffer = await this.context.decodeAudioData(leftArrayBuffer);
        this.rightClickBuffer = await this.context.decodeAudioData(rightArrayBuffer);
        console.log('Click samples loaded successfully');
      } catch (decodeError) {
        console.warn('Failed to decode audio samples, using fallback tones:', decodeError);
        this.createFallbackTones();
      }
    } catch (error) {
      console.warn('Error loading click samples, using fallback tones:', error);
      this.createFallbackTones();
    }
  }
  
  private createFallbackTones(): void {
    if (!this.context) return;
    
    // Create simple sine wave buffers as fallback
    const sampleRate = this.context.sampleRate;
    const duration = 0.1; // 100ms
    const frequency = 440; // A4 note
    
    const leftBuffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const rightBuffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    
    const leftData = leftBuffer.getChannelData(0);
    const rightData = rightBuffer.getChannelData(0);
    
    for (let i = 0; i < leftBuffer.length; i++) {
      const t = i / sampleRate;
      leftData[i] = Math.sin(2 * Math.PI * frequency * t) * 0.5;
      rightData[i] = Math.sin(2 * Math.PI * (frequency * 1.1) * t) * 0.5; // Slightly higher frequency for right
    }
    
    this.leftClickBuffer = leftBuffer;
    this.rightClickBuffer = rightBuffer;
  }
  
  // Clean up and release resources
  public dispose(): void {
    this.stopAll();
    
    // Disconnect audio track node if it exists
    if (this.audioTrackNode) {
      try {
        this.audioTrackNode.disconnect();
      } catch (err) {
        console.warn('Error disconnecting audio track node:', err);
      }
      this.audioTrackNode = null;
    }
    
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    
    this.gainNode = null;
    this.pannerNode = null;
    this.audioElement = null;
    this.audioElementConnected = false;
    this.leftClickBuffer = null;
    this.rightClickBuffer = null;
  }
  
  // Set audio mode
  public setAudioMode(mode: AudioMode): void {
    if (this.currentMode === mode) return;
    this.stopAll();
    this.currentMode = mode;
    console.log(`Audio mode changed to: ${mode}`);
  }
  
  // Get current audio mode
  public getAudioMode(): AudioMode {
    return this.currentMode;
  }
  
  // Play a contact sound with panning
  public playContactSound(isRightSide: boolean): void {
    if (!this.context || !this.contactSoundConfig.enabled || this.currentMode !== 'click') return;
    
    try {
      const buffer = isRightSide ? this.rightClickBuffer : this.leftClickBuffer;
      if (!buffer) return;
      
      const source = this.context.createBufferSource();
      const soundGain = this.context.createGain();
      const soundPanner = this.context.createStereoPanner();
      
      source.buffer = buffer;
      soundGain.gain.value = this.contactSoundConfig.volume;
      soundPanner.pan.value = isRightSide ? 1 : -1;
      
      source.connect(soundGain);
      soundGain.connect(soundPanner);
      soundPanner.connect(this.context.destination);
      
      source.start();
      
      // Clean up
      source.onended = () => {
        source.disconnect();
        soundGain.disconnect();
        soundPanner.disconnect();
      };
      
    } catch (error) {
      console.error('Error playing contact sound:', error);
    }
  }
  
  // Start playing based on current mode
  public startPlayback(): boolean {
    if (!this.context) return false;
    
    try {
      if (this.currentMode === 'click') {
        this.isPlaying = true;
        return true;
      } else if (this.currentMode === 'audioTrack') {
        this.startAudioTrack();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error starting playback:', error);
      return false;
    }
  }
  
  // Stop all audio playback
  public stopAll(): void {
    if (this.currentMode === 'click') {
      this.isPlaying = false;
    } else if (this.currentMode === 'audioTrack') {
      this.stopAudioTrack();
    }
  }
  
  // Start playing audio track
  private startAudioTrack(): void {
    if (!this.context || this.isPlaying || this.currentMode !== 'audioTrack' || !this.audioElement) return;
    
    try {
      if (!this.audioElementConnected && this.audioTrackNode === null) {
        console.error('Audio element not properly connected');
        return;
      }
      
      this.audioElement.loop = this.audioTrackConfig.loop;
      this.audioElement.src = this.audioTrackConfig.filePath;
      
      if (this.gainNode) {
        this.gainNode.gain.value = this.audioTrackConfig.volume;
      }
      
      const onPlay = () => {
        this.isPlaying = true;
        this.audioElement?.removeEventListener('play', onPlay);
      };
      
      const onError = () => {
        console.error('Error playing audio track');
        this.audioElement?.removeEventListener('error', onError);
      };
      
      this.audioElement.addEventListener('play', onPlay);
      this.audioElement.addEventListener('error', onError);
      
      this.audioElement.play();
    } catch (error) {
      console.error('Error starting audio track:', error);
    }
  }
  
  // Stop playing audio track
  private stopAudioTrack(): void {
    if (!this.isPlaying || this.currentMode !== 'audioTrack' || !this.audioElement) return;
    
    try {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping audio track:', error);
    }
  }
  
  // Set the main volume (0 to 1)
  public setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }
  
  // Update contact sound configuration
  public updateContactSoundConfig(config: Partial<ContactSoundConfig>): void {
    this.contactSoundConfig = { ...this.contactSoundConfig, ...config };
    // Reload samples if paths changed
    if (config.leftSamplePath || config.rightSamplePath) {
      this.loadClickSamples();
    }
  }
  
  // Update audio track configuration
  public updateAudioTrackConfig(config: Partial<AudioTrackConfig>): void {
    this.audioTrackConfig = { ...this.audioTrackConfig, ...config };
  }
  
  // Get current configs (for UI)
  public getContactSoundConfig(): ContactSoundConfig {
    return { ...this.contactSoundConfig };
  }
  
  public getAudioTrackConfig(): AudioTrackConfig {
    return { ...this.audioTrackConfig };
  }
  
  // Check if audio is currently playing
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setPan(value: number): void {
    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(value, this.context?.currentTime ?? 0);
    }
  }
} 