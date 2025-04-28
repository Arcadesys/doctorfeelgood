import { AudioFile, AudioMetadata } from '@/types/audio';

interface AudioSettingsProps {
  audioMode: 'bilateral' | 'binaural';
  onAudioModeChange: (mode: 'bilateral' | 'binaural') => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onAudioSelect: (audio: AudioFile | null) => void;
  selectedAudio: AudioFile | null;
  audioMetadata: AudioMetadata | null;
}

export function AudioSettings({
  audioMode,
  onAudioModeChange,
  bpm,
  onBpmChange,
  onAudioSelect,
  selectedAudio,
  audioMetadata,
}: AudioSettingsProps) {
  return (
    <div className="audio-settings" role="region" aria-label="Audio Settings">
      <div className="audio-mode-selector">
        <label htmlFor="audioMode">Audio Mode:</label>
        <select
          id="audioMode"
          value={audioMode}
          onChange={(e) => onAudioModeChange(e.target.value as 'bilateral' | 'binaural')}
          aria-label="Select audio mode"
        >
          <option value="bilateral">Bilateral</option>
          <option value="binaural">Binaural</option>
        </select>
      </div>

      <div className="bpm-control">
        <label htmlFor="bpm">BPM:</label>
        <input
          type="range"
          id="bpm"
          min="30"
          max="180"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          aria-label="Adjust BPM"
          aria-valuemin={30}
          aria-valuemax={180}
          aria-valuenow={bpm}
        />
        <span className="bpm-value">{bpm} BPM</span>
      </div>

      <div className="audio-file-selector">
        <label htmlFor="audioFile">Audio File:</label>
        <select
          id="audioFile"
          value={selectedAudio?.id || ''}
          onChange={(e) => {
            const audio = audioFiles.find((a) => a.id === e.target.value);
            onAudioSelect(audio || null);
          }}
          aria-label="Select audio file"
        >
          <option value="">Select an audio file</option>
          {audioFiles.map((audio) => (
            <option key={audio.id} value={audio.id}>
              {audio.name}
            </option>
          ))}
        </select>
      </div>

      {audioMetadata && (
        <div className="audio-metadata" role="status">
          <h3>Audio Metadata</h3>
          <p>Duration: {audioMetadata.duration}s</p>
          <p>Sample Rate: {audioMetadata.sampleRate}Hz</p>
        </div>
      )}
    </div>
  );
} 