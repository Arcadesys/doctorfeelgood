// Audio Engine for EMDR Processor

// Types for audio engine
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type AudioMode = 'synthesizer' | 'audioTrack';

export interface ADSREnvelope {
  attack: number;  // Time in seconds
  decay: number;   // Time in seconds
  sustain: number; // Level 0-1
  release: number; // Time in seconds
}

export interface ContactSoundConfig {
  leftFrequency: number;
  rightFrequency: number;
  duration: number;
  oscillatorType: OscillatorType;
  volume: number;
  enabled: boolean;
}

export interface ConstantToneConfig {
  isOscillator: boolean;
  oscillatorType: OscillatorType;
  frequency: number;
  audioPath?: string;
  volume: number;
  envelope: ADSREnvelope;
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
  private constantToneNode: OscillatorNode | null = null;
  private audioTrackNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private currentMode: AudioMode = 'synthesizer';
  private audioElementConnected = false; // Track if the audio element has been connected
  
  // Configuration
  private contactSoundConfig: ContactSoundConfig = {
    leftFrequency: 330,
    rightFrequency: 440,
    duration: 0.1,
    oscillatorType: 'sine',
    volume: 0.5,
    enabled: true
  };
  
  private constantToneConfig: ConstantToneConfig = {
    isOscillator: true,
    oscillatorType: 'sine',
    frequency: 440,
    volume: 0.7,
    envelope: {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.7,
      release: 0.5
    },
    enabled: true
  };
  
  private audioTrackConfig: AudioTrackConfig = {
    volume: 0.7,
    loop: true,
    filePath: '/audio/sine-440hz.mp3'
  };

  // Initialize the audio engine
  public initialize(audioElement?: HTMLAudioElement): boolean {
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
        
        // Create a MediaElementSourceNode right away and keep it for the lifetime
        // of the audio engine instance
        this.audioTrackNode = this.context.createMediaElementSource(audioElement);
        this.audioTrackNode.connect(this.gainNode);
        this.audioElementConnected = true;
      }
      
      console.log('AudioEngine initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      return false;
    }
  }
  
  // Clean up and release resources
  public dispose(): void {
    this.stopAll();
    
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    
    this.gainNode = null;
    this.pannerNode = null;
    this.constantToneNode = null;
    this.audioTrackNode = null;
  }
  
  // Set audio mode and stop any conflicting playback
  public setAudioMode(mode: AudioMode): void {
    if (this.currentMode === mode) return;
    
    // Stop current playback
    this.stopAll();
    
    this.currentMode = mode;
    console.log(`Audio mode changed to: ${mode}`);
  }
  
  // Get current audio mode
  public getAudioMode(): AudioMode {
    return this.currentMode;
  }
  
  // Play a contact sound with panning (only in synthesizer mode)
  public playContactSound(isRightSide: boolean): void {
    if (!this.context || !this.contactSoundConfig.enabled || this.currentMode !== 'synthesizer') return;
    
    try {
      // Create oscillator for contact sound
      const oscillator = this.context.createOscillator();
      const soundGain = this.context.createGain();
      const soundPanner = this.context.createStereoPanner();
      
      // Configure oscillator
      oscillator.type = this.contactSoundConfig.oscillatorType;
      const frequency = isRightSide 
        ? this.contactSoundConfig.rightFrequency 
        : this.contactSoundConfig.leftFrequency;
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      
      // Configure panning (force full left or right)
      soundPanner.pan.value = isRightSide ? 1 : -1;
      
      // Configure gain
      soundGain.gain.value = this.contactSoundConfig.volume;
      
      // Connect nodes
      oscillator.connect(soundGain);
      soundGain.connect(soundPanner);
      soundPanner.connect(this.context.destination);
      
      // Play the sound
      oscillator.start();
      oscillator.stop(this.context.currentTime + this.contactSoundConfig.duration);
      
      // Clean up
      setTimeout(() => {
        oscillator.disconnect();
        soundGain.disconnect();
        soundPanner.disconnect();
      }, this.contactSoundConfig.duration * 1000 + 100);
      
    } catch (error) {
      console.error('Error playing contact sound:', error);
    }
  }
  
  // Start playing based on current mode
  public startPlayback(): boolean {
    if (!this.context) return false;
    
    try {
      if (this.currentMode === 'synthesizer') {
        return this.startConstantTone();
      } else if (this.currentMode === 'audioTrack') {
        // Handle the promise-based audio track start differently
        this.startAudioTrack();
        return true; // Return true immediately, state will be updated by the promise
      }
      return false;
    } catch (error) {
      console.error('Error starting playback:', error);
      return false;
    }
  }
  
  // Stop all audio playback
  public stopAll(): void {
    if (this.currentMode === 'synthesizer') {
      this.stopConstantTone();
    } else if (this.currentMode === 'audioTrack') {
      this.stopAudioTrack();
    }
  }
  
  // Start playing constant tone (synthesizer mode)
  private startConstantTone(): boolean {
    if (!this.context || this.isPlaying || !this.constantToneConfig.enabled || this.currentMode !== 'synthesizer') return false;
    
    try {
      // Create and configure oscillator
      const oscillator = this.context.createOscillator();
      oscillator.type = this.constantToneConfig.oscillatorType;
      oscillator.frequency.value = this.constantToneConfig.frequency;
      
      // Apply ADSR envelope
      const envelope = this.constantToneConfig.envelope;
      const currentTime = this.context.currentTime;
      
      // Initial gain to 0
      if (this.gainNode) {
        this.gainNode.gain.setValueAtTime(0, currentTime);
        
        // Attack
        this.gainNode.gain.linearRampToValueAtTime(
          this.constantToneConfig.volume, 
          currentTime + envelope.attack
        );
        
        // Decay and sustain
        this.gainNode.gain.linearRampToValueAtTime(
          this.constantToneConfig.volume * envelope.sustain, 
          currentTime + envelope.attack + envelope.decay
        );
      }
      
      // Connect and start
      if (this.gainNode) {
        oscillator.connect(this.gainNode);
        oscillator.start();
        
        this.constantToneNode = oscillator;
        this.isPlaying = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error starting oscillator:', error);
      return false;
    }
  }
  
  // Stop playing constant tone
  private stopConstantTone(): void {
    if (!this.isPlaying || this.currentMode !== 'synthesizer') return;
    
    try {
      if (this.constantToneNode) {
        const oscillator = this.constantToneNode;
        
        // Apply release envelope
        if (this.gainNode && this.context) {
          const releaseTime = this.constantToneConfig.envelope.release;
          this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.context.currentTime);
          this.gainNode.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + releaseTime);
          
          // Stop oscillator after release
          setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            this.constantToneNode = null;
          }, releaseTime * 1000 + 100);
        } else {
          oscillator.stop();
          oscillator.disconnect();
          this.constantToneNode = null;
        }
      }
      
      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping constant tone:', error);
    }
  }
  
  // Start playing audio track
  private startAudioTrack(): void {
    if (!this.context || this.isPlaying || this.currentMode !== 'audioTrack' || !this.audioElement) return;
    
    try {
      // No need to create a new MediaElementSourceNode - we already did this in initialize()
      if (!this.audioElementConnected && this.audioTrackNode === null) {
        console.error('Audio element not properly connected');
        return;
      }
      
      // Configure audio element
      this.audioElement.loop = this.audioTrackConfig.loop;
      this.audioElement.src = this.audioTrackConfig.filePath;
      
      // Set volume
      if (this.gainNode) {
        this.gainNode.gain.value = this.audioTrackConfig.volume;
      }
      
      // Add one-time event listeners for success and failure
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
      
      // Start playback
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
      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping audio track:', error);
    }
  }
  
  // Set the pan value (-1 to 1)
  public setPan(value: number): void {
    if (this.pannerNode) {
      this.pannerNode.pan.value = Math.max(-1, Math.min(1, value));
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
  }
  
  // Update constant tone configuration
  public updateConstantToneConfig(config: Partial<ConstantToneConfig>): void {
    const newConfig = { ...this.constantToneConfig, ...config };
    
    // If oscillator type changed while playing, restart with new type
    const restartNeeded = this.isPlaying && 
      this.currentMode === 'synthesizer' &&
      (this.constantToneConfig.oscillatorType !== newConfig.oscillatorType ||
       this.constantToneConfig.frequency !== newConfig.frequency);
       
    this.constantToneConfig = newConfig;
    
    if (restartNeeded) {
      this.stopConstantTone();
      this.startConstantTone();
    }
  }
  
  // Update audio track configuration
  public updateAudioTrackConfig(config: Partial<AudioTrackConfig>): void {
    const newConfig = { ...this.audioTrackConfig, ...config };
    
    // If file path changed while playing, restart with new file
    const restartNeeded = this.isPlaying && 
      this.currentMode === 'audioTrack' &&
      this.audioTrackConfig.filePath !== newConfig.filePath;
      
    this.audioTrackConfig = newConfig;
    
    if (restartNeeded && this.audioElement) {
      const currentTime = this.audioElement.currentTime;
      this.stopAudioTrack();
      this.audioElement.src = newConfig.filePath;
      this.startAudioTrack();
      
      // Try to restore position after a short delay to ensure track has loaded
      if (this.audioElement) {
        setTimeout(() => {
          if (this.audioElement) {
            this.audioElement.currentTime = currentTime;
          }
        }, 100);
      }
    }
    
    // Update loop setting even if not playing
    if (this.audioElement && this.audioTrackConfig.loop !== newConfig.loop) {
      this.audioElement.loop = newConfig.loop;
    }
  }
  
  // Get current configs (for UI)
  public getContactSoundConfig(): ContactSoundConfig {
    return { ...this.contactSoundConfig };
  }
  
  public getConstantToneConfig(): ConstantToneConfig {
    return { ...this.constantToneConfig };
  }
  
  public getAudioTrackConfig(): AudioTrackConfig {
    return { ...this.audioTrackConfig };
  }
  
  // Check if audio is currently playing
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
} 