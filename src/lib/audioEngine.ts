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
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioTrackNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElementConnected = false;
  private disposed = false;
  private isPlaying = false;
  private currentMode: AudioMode = 'click';
  
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

  async initialize(audioElement: HTMLAudioElement): Promise<boolean> {
    console.log('AudioEngine: Starting initialization');
    
    if (this.disposed) {
      console.warn('AudioEngine: Cannot initialize - instance has been disposed');
      return false;
    }

    try {
      if (!this.audioContext) {
        console.log('AudioEngine: Creating new AudioContext');
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        console.log('AudioEngine: Resuming suspended AudioContext');
        await this.audioContext.resume();
      }

      // Create and connect gain node
      console.log('AudioEngine: Creating gain node');
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      this.audioElement = audioElement;

      // Wait for the audio element to be ready
      if (!audioElement.readyState) {
        console.log('AudioEngine: Waiting for audio element to be ready');
        await new Promise((resolve) => {
          const handleCanPlay = () => {
            console.log('AudioEngine: Audio element is ready');
            audioElement.removeEventListener('canplay', handleCanPlay);
            resolve(true);
          };
          audioElement.addEventListener('canplay', handleCanPlay);
        });
      }

      // Disconnect any existing connections
      if (this.audioTrackNode) {
        console.log('AudioEngine: Disconnecting existing audio track node');
        try {
          this.audioTrackNode.disconnect();
        } catch (error) {
          console.warn('AudioEngine: Error disconnecting existing node:', error);
        }
        this.audioTrackNode = null;
        this.audioElementConnected = false;
      }

      // Check if the audio element is already connected to a MediaElementSourceNode
      try {
        console.log('AudioEngine: Creating new MediaElementSource');
        this.audioTrackNode = this.audioContext.createMediaElementSource(audioElement);
        this.audioElementConnected = true;

        console.log('AudioEngine: Connecting audio track to gain node');
        this.audioTrackNode.connect(this.gainNode);
      } catch (error) {
        if (error instanceof Error && error.name === 'InvalidStateError') {
          console.warn('AudioEngine: Audio element already connected, attempting to reuse connection');
          // If the element is already connected, we'll try to work with the existing connection
          this.audioElementConnected = true;
        } else {
          throw error;
        }
      }

      console.log('AudioEngine: Initialization complete');
      return true;
    } catch (error) {
      console.error('AudioEngine: Initialization failed:', error);
      this.cleanup();
      return false;
    }
  }

  private cleanup() {
    console.log('AudioEngine: Starting cleanup');
    
    if (this.audioTrackNode) {
      try {
        console.log('AudioEngine: Disconnecting audio track node');
        this.audioTrackNode.disconnect();
      } catch (error) {
        console.warn('AudioEngine: Error during track node disconnection:', error);
      }
      this.audioTrackNode = null;
    }

    this.audioElementConnected = false;
    this.audioElement = null;
    
    console.log('AudioEngine: Cleanup complete');
  }

  dispose() {
    console.log('AudioEngine: Disposing audio engine');
    
    this.cleanup();
    
    if (this.audioContext) {
      console.log('AudioEngine: Closing audio context');
      this.audioContext.close().catch(error => {
        console.warn('AudioEngine: Error closing audio context:', error);
      });
      this.audioContext = null;
    }
    
    this.disposed = true;
    console.log('AudioEngine: Disposal complete');
  }
  
  // Load click samples
  private async loadClickSamples(): Promise<void> {
    if (!this.audioContext) return;
    
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
        this.leftClickBuffer = await this.audioContext.decodeAudioData(leftArrayBuffer);
        this.rightClickBuffer = await this.audioContext.decodeAudioData(rightArrayBuffer);
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
    if (!this.audioContext) return;
    
    // Create simple sine wave buffers as fallback
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1; // 100ms
    const frequency = 440; // A4 note
    
    const leftBuffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const rightBuffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    
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
    if (!this.audioContext || !this.contactSoundConfig.enabled || this.currentMode !== 'click') return;
    
    try {
      const buffer = isRightSide ? this.rightClickBuffer : this.leftClickBuffer;
      if (!buffer) return;
      
      const source = this.audioContext.createBufferSource();
      const soundGain = this.audioContext.createGain();
      const soundPanner = this.audioContext.createStereoPanner();
      
      source.buffer = buffer;
      soundGain.gain.value = this.contactSoundConfig.volume;
      soundPanner.pan.value = isRightSide ? 1 : -1;
      
      source.connect(soundGain);
      soundGain.connect(soundPanner);
      soundPanner.connect(this.audioContext.destination);
      
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
    if (!this.audioContext) return false;
    
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
    if (!this.audioContext || this.isPlaying || this.currentMode !== 'audioTrack' || !this.audioElement) {
      console.log('AudioEngine: Cannot start audio track - conditions not met:', {
        hasContext: !!this.audioContext,
        isPlaying: this.isPlaying,
        currentMode: this.currentMode,
        hasAudioElement: !!this.audioElement
      });
      return;
    }
    
    try {
      console.log('AudioEngine: Starting audio track playback');
      console.log('AudioEngine: Audio element state:', {
        readyState: this.audioElement.readyState,
        paused: this.audioElement.paused,
        volume: this.audioElement.volume,
        src: this.audioElement.src
      });
      
      // Ensure the audio element has a source
      if (!this.audioElement.src) {
        console.log('AudioEngine: Setting default audio source');
        this.audioElement.src = this.audioTrackConfig.filePath;
      }
      
      // Set volume
      if (this.gainNode) {
        console.log('AudioEngine: Setting gain node volume to', this.audioTrackConfig.volume);
        this.gainNode.gain.value = this.audioTrackConfig.volume;
      }
      
      // Set loop state
      this.audioElement.loop = this.audioTrackConfig.loop;
      
      // Start playback
      console.log('AudioEngine: Attempting to play audio');
      this.audioElement.play()
        .then(() => {
          console.log('AudioEngine: Playback started successfully');
          this.isPlaying = true;
        })
        .catch(error => {
          console.error('AudioEngine: Failed to start audio playback:', error);
          this.isPlaying = false;
        });
    } catch (error) {
      console.error('AudioEngine: Error in startAudioTrack:', error);
      this.isPlaying = false;
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
      console.log('AudioEngine: Setting volume to', value);
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
      
      // Also update the audio element volume
      if (this.audioElement) {
        console.log('AudioEngine: Setting audio element volume to', value);
        this.audioElement.volume = value;
      }
    } else {
      console.warn('AudioEngine: Cannot set volume - gain node not initialized');
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
    if (this.audioContext) {
      this.audioContext.createStereoPanner().pan.setValueAtTime(value, this.audioContext.currentTime ?? 0);
    }
  }
} 