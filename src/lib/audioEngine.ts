// Audio Engine for EMDR Processor

// Types for audio engine
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

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
}

export interface ConstantToneConfig {
  isOscillator: boolean;
  oscillatorType: OscillatorType;
  frequency: number;
  audioPath?: string;
  volume: number;
  envelope: ADSREnvelope;
}

// Main Audio Engine Class
export class AudioEngine {
  private context: AudioContext | null = null;
  private constantToneNode: OscillatorNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  
  // Configuration
  private contactSoundConfig: ContactSoundConfig = {
    leftFrequency: 330,
    rightFrequency: 440,
    duration: 0.1,
    oscillatorType: 'sine',
    volume: 0.5
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
    }
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
    this.stopConstantTone();
    
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    
    this.gainNode = null;
    this.pannerNode = null;
    this.constantToneNode = null;
  }
  
  // Play a contact sound with panning
  public playContactSound(isRightSide: boolean): void {
    if (!this.context) return;
    
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
  
  // Start playing constant tone
  public startConstantTone(): boolean {
    if (!this.context || this.isPlaying) return false;
    
    try {
      if (this.constantToneConfig.isOscillator) {
        return this.startOscillator();
      } else if (this.audioElement) {
        return this.startAudioElement();
      }
      return false;
    } catch (error) {
      console.error('Error starting constant tone:', error);
      return false;
    }
  }
  
  // Stop playing constant tone
  public stopConstantTone(): void {
    if (!this.isPlaying) return;
    
    try {
      if (this.constantToneConfig.isOscillator && this.constantToneNode) {
        const oscillator = this.constantToneNode as OscillatorNode;
        
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
      } else if (this.audioElement) {
        this.audioElement.pause();
      }
      
      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping constant tone:', error);
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
      (this.constantToneConfig.isOscillator !== newConfig.isOscillator ||
       this.constantToneConfig.oscillatorType !== newConfig.oscillatorType ||
       this.constantToneConfig.frequency !== newConfig.frequency);
       
    this.constantToneConfig = newConfig;
    
    if (restartNeeded) {
      this.stopConstantTone();
      this.startConstantTone();
    }
  }
  
  // Private method to start oscillator
  private startOscillator(): boolean {
    if (!this.context || !this.gainNode) return false;
    
    try {
      // Create and configure oscillator
      const oscillator = this.context.createOscillator();
      oscillator.type = this.constantToneConfig.oscillatorType;
      oscillator.frequency.value = this.constantToneConfig.frequency;
      
      // Apply ADSR envelope
      const envelope = this.constantToneConfig.envelope;
      const currentTime = this.context.currentTime;
      
      // Initial gain to 0
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
      
      // Connect and start
      oscillator.connect(this.gainNode);
      oscillator.start();
      
      this.constantToneNode = oscillator;
      this.isPlaying = true;
      return true;
    } catch (error) {
      console.error('Error starting oscillator:', error);
      return false;
    }
  }
  
  // Private method to start audio element
  private startAudioElement(): boolean {
    if (!this.context || !this.audioElement || !this.gainNode) return false;
    
    try {
      // Create media source if needed
      if (!this.constantToneNode) {
        const source = this.context.createMediaElementSource(this.audioElement);
        source.connect(this.gainNode);
        this.constantToneNode = source;
      }
      
      // Set volume
      this.gainNode.gain.value = this.constantToneConfig.volume;
      
      // Play the audio
      this.audioElement.play().then(() => {
        this.isPlaying = true;
      }).catch(error => {
        console.error('Error playing audio element:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Error starting audio element:', error);
      return false;
    }
  }
  
  // Get current configs (for UI)
  public getContactSoundConfig(): ContactSoundConfig {
    return { ...this.contactSoundConfig };
  }
  
  public getConstantToneConfig(): ConstantToneConfig {
    return { ...this.constantToneConfig };
  }
  
  // Check if audio is currently playing
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
} 