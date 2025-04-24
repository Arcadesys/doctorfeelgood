// Audio Engine for EMDR Processor

import { getAudioContext, getMediaElementSource, resumeAudioContext } from '../utils/audioUtils';

export type AudioMode = 'click' | 'track';

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
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private clickBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private currentMode: AudioMode = 'click';
  private audioElementConnected = false;
  
  // Oscillators for frequency control
  private oscillator: OscillatorNode | null = null;
  private oscillatorRight: OscillatorNode | null = null;
  
  // Sample buffers for contact sounds
  private leftClickBuffer: AudioBuffer | null = null;
  private rightClickBuffer: AudioBuffer | null = null;
  
  // Configuration
  private contactSoundConfig: ContactSoundConfig = {
    leftSamplePath: '/sounds/click-left.wav',
    rightSamplePath: '/sounds/click-right.wav',
    volume: 0.5,
    enabled: true
  };
  
  private audioTrackConfig: AudioTrackConfig = {
    volume: 0.7,
    loop: true,
    filePath: '/audio/sine-440hz.mp3'
  };

  async initialize(audioElement?: HTMLAudioElement): Promise<void> {
    try {
      // Get the singleton audio context
      this.audioContext = getAudioContext();
      
      // Create gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      if (audioElement) {
        this.audioElement = audioElement;
        // Get or create the MediaElementSource
        this.mediaElementSource = getMediaElementSource(audioElement);
        this.mediaElementSource.connect(this.gainNode);
        console.log('Audio element connected successfully');
      }

      // Load click samples
      await this.loadClickSamples();
      
      // Resume audio context
      await resumeAudioContext();
      
      console.log('AudioEngine initialized successfully');
    } catch (error) {
      console.error('Error initializing AudioEngine:', error);
      throw error;
    }
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
  
  // Clean up and release resources
  public dispose(): void {
    this.stopAll();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.gainNode = null;
    this.mediaElementSource = null;
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
    if (!this.audioContext || !this.contactSoundConfig.enabled || this.currentMode !== 'click') {
      console.log('Cannot play contact sound:', {
        hasContext: !!this.audioContext,
        contextState: this.audioContext?.state,
        enabled: this.contactSoundConfig.enabled,
        mode: this.currentMode
      });
      return;
    }
    
    try {
      const buffer = isRightSide ? this.rightClickBuffer : this.leftClickBuffer;
      if (!buffer) {
        console.warn('No sound buffer available');
        return;
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Create a gain node for this sound
      const soundGain = this.audioContext.createGain();
      soundGain.gain.value = this.contactSoundConfig.volume;
      
      // Connect through main gain and panner nodes
      source.connect(soundGain);
      soundGain.connect(this.gainNode!);
      
      console.log('Playing contact sound:', {
        side: isRightSide ? 'right' : 'left',
        volume: this.contactSoundConfig.volume,
        bufferDuration: buffer.duration,
        contextState: this.audioContext.state
      });
      
      // Start playback
      source.start();
      
      // Clean up
      source.onended = () => {
        source.disconnect();
        soundGain.disconnect();
      };
      
    } catch (error) {
      console.error('Error playing contact sound:', error);
    }
  }
  
  // Start playing based on current mode
  public async startPlayback(): Promise<boolean> {
    if (!this.audioContext) {
      console.error('No audio context available');
      return false;
    }

    try {
      // Make sure context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.currentMode === 'click') {
        console.log('Starting click mode playback');
        this.isPlaying = true;
        return true;
      } else if (this.currentMode === 'track') {
        console.log('Starting track mode playback');
        await this.startAudioTrack();
        return true;
      }

      console.warn('Unknown audio mode:', this.currentMode);
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
    } else if (this.currentMode === 'track') {
      this.stopAudioTrack();
    }
  }
  
  // Start playing audio track
  private async startAudioTrack(): Promise<void> {
    if (!this.audioContext || this.isPlaying || this.currentMode !== 'track' || !this.audioElement) {
      console.log('Cannot start audio track:', {
        hasContext: !!this.audioContext,
        isPlaying: this.isPlaying,
        mode: this.currentMode,
        hasAudioElement: !!this.audioElement
      });
      return;
    }
    
    try {
      if (!this.audioElementConnected && this.mediaElementSource === null) {
        console.error('Audio element not properly connected');
        return;
      }
      
      this.audioElement.loop = this.audioTrackConfig.loop;
      
      // Set volume through gain node
      if (this.gainNode) {
        this.gainNode.gain.value = this.audioTrackConfig.volume;
        console.log('Set audio track volume:', this.audioTrackConfig.volume);
      }
      
      // Play the audio
      try {
        await this.audioElement.play();
        console.log('Audio track playback started');
        this.isPlaying = true;
      } catch (playError) {
        console.error('Error playing audio track:', playError);
        throw playError;
      }
    } catch (error) {
      console.error('Error in startAudioTrack:', error);
      throw error;
    }
  }
  
  // Stop playing audio track
  private stopAudioTrack(): void {
    if (!this.isPlaying || this.currentMode !== 'track' || !this.audioElement) return;
    
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
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(value, this.audioContext?.currentTime ?? 0);
    }
  }

  // Update frequencies for the audio engine
  public updateFrequencies(leftFreq: number, rightFreq: number): void {
    // Update the frequencies in the audio engine
    if (this.audioContext) {
      // If we have an active oscillator, update its frequency
      if (this.oscillator) {
        this.oscillator.frequency.value = leftFreq;
      }
      
      // If we have a second oscillator for stereo, update its frequency
      if (this.oscillatorRight) {
        this.oscillatorRight.frequency.value = rightFreq;
      }
    }
  }

  // Resume audio context if suspended
  public async resumeContext(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
} 