declare module 'web-audio-api' {
  export class AudioContext {
    constructor();
    destination: AudioDestinationNode;
    sampleRate: number;
    currentTime: number;
    createGain(): GainNode;
    createOscillator(): OscillatorNode;
    createStereoPanner(): StereoPannerNode;
    createBuffer(numChannels: number, length: number, sampleRate: number): AudioBuffer;
    decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer>;
  }

  export class OfflineAudioContext extends AudioContext {
    constructor(numChannels: number, length: number, sampleRate: number);
    startRendering(): Promise<AudioBuffer>;
  }
} 