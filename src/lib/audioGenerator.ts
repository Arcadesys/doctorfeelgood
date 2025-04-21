import * as Tone from 'tone';

export function generateClickSound(isRight: boolean): Buffer {
  // WAV file parameters
  const sampleRate = 44100;
  const duration = 0.15; // 150ms for smoother fade
  const numSamples = Math.floor(sampleRate * duration);
  const frequency = isRight ? 880 : 440; // A5 for right, A4 for left
  
  // Create WAV header
  const headerLength = 44;
  const dataLength = numSamples * 2; // 16-bit samples
  const fileLength = headerLength + dataLength;
  const header = Buffer.alloc(headerLength);
  
  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(fileLength - 8, 4);
  header.write('WAVE', 8);
  
  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24); // sample rate
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  
  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  
  // Create audio data with smoother envelope
  const data = Buffer.alloc(dataLength);
  
  // Envelope parameters
  const attackTime = 0.005; // 5ms attack
  const decayTime = 0.145; // Rest is decay
  const attackSamples = Math.floor(sampleRate * attackTime);
  const decaySamples = numSamples - attackSamples;
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Generate sine wave with anti-aliasing
    const sample = Math.sin(2 * Math.PI * frequency * t);
    
    // Apply smoother envelope
    let envelope;
    if (i < attackSamples) {
      // Smooth attack using quarter sine wave shape
      envelope = Math.sin((i / attackSamples) * Math.PI / 2);
    } else {
      // Exponential decay
      const decayProgress = (i - attackSamples) / decaySamples;
      envelope = Math.exp(-4 * decayProgress);
    }
    
    // Apply envelope and scale
    const value = Math.floor(sample * envelope * 32767 * 0.5);
    data.writeInt16LE(value, i * 2);
  }
  
  // Combine header and data
  return Buffer.concat([header, data]);
}

// Helper function to convert AudioBuffer to WAV format
function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2;
  const buffer16Bit = new Int16Array(length);
  const data = buffer.getChannelData(0);
  const sample = 0x7FFF;
  
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    buffer16Bit[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const wav = new Blob([createWavHeader(buffer16Bit.length, buffer.sampleRate), buffer16Bit], {
    type: 'audio/wav'
  });
  
  return Promise.resolve(wav);
}

// Helper function to create WAV header
function createWavHeader(length: number, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);
  
  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
} 