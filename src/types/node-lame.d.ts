declare module 'node-lame' {
  export interface LameOptions {
    output?: string | 'buffer';
    bitrate?: number;
    raw?: boolean;
    sfreq?: number;
    signed?: boolean;
    bitwidth?: number;
    channels?: number;
    mode?: string;
  }

  export class Lame {
    constructor(options: LameOptions);
    setBuffer(buffer: Buffer): Promise<void>;
    encode(): Promise<void>;
    getBuffer(): Buffer;
  }
} 