/**
 * Audio Context Manager
 * Handles initialization and management of the Web Audio API context
 */

class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  /**
   * Initialize the audio context with proper error handling
   */
  public async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        // Check if AudioContext is supported
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          throw new Error('Web Audio API is not supported in this browser');
        }

        // Create audio context
        this.audioContext = new AudioContext();
        
        // Resume context if suspended (browser policy)
        if (this.audioContext.state === 'suspended') {
          await this.resumeContext();
        }

        this.isInitialized = true;
        resolve();
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  /**
   * Resume the audio context if suspended
   */
  public async resumeContext(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        throw error;
      }
    }
  }

  /**
   * Get the audio context instance
   */
  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Check if the audio context is initialized
   */
  public isContextInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    if (this.audioContext) {
      try {
        await this.audioContext.close();
        this.audioContext = null;
        this.isInitialized = false;
        this.initializationPromise = null;
      } catch (error) {
        console.error('Failed to cleanup audio context:', error);
        throw error;
      }
    }
  }
}

export const audioContextManager = AudioContextManager.getInstance(); 