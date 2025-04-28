import React from 'react';
import '../styles/UnifiedSettings.css';
import { AudioMetadata, AudioFile } from '@/types/audio';
// No Chakra UI or other UI library imports needed

// Format time in seconds to MM:SS format
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface UnifiedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isSessionActive: boolean;
  settings: {
    visualIntensity: number;
    targetShape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
    audioMode: 'click' | 'track';
    isDarkMode: boolean;
    bpm: number;
    audioFeedbackEnabled: boolean;
    visualGuideEnabled: boolean;
    movementGuideEnabled: boolean;
    targetHasGlow: boolean;
    targetColor: string;
    sessionDuration?: number;
  };
  onSettingChange: (setting: string, value: unknown) => void;
  onAudioUpload?: (file: File) => void;
  audioMode: 'click' | 'track';
  onAudioModeChange: (mode: 'click' | 'track') => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onAudioSelect: (audio: AudioFile | null) => void;
  selectedAudio: string;
  audioMetadata: AudioMetadata | null;
  audioFiles: AudioFile[];
}

const UnifiedSettings: React.FC<UnifiedSettingsProps> = ({
  isOpen,
  onClose,
  isSessionActive,
  settings,
  onSettingChange,
  onAudioUpload,
  audioMode,
  onAudioModeChange,
  bpm,
  onBpmChange,
  onAudioSelect,
  selectedAudio,
  audioMetadata,
  audioFiles,
}) => {
  if (!isOpen) return null;

  return (
    <div className="unified-settings-overlay">
      <div className="unified-settings">
        <button className="close-btn" onClick={onClose} aria-label="Close settings">×</button>
        <h2>Settings</h2>
        <div className="settings-section">
          <h3>Visual Target</h3>
          <div>
            <label>Target Shape</label>
            <select
              value={settings.targetShape}
              onChange={e => onSettingChange('targetShape', e.target.value)}
              aria-label="Select target shape"
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="diamond">Diamond</option>
              <option value="star">Star</option>
            </select>
          </div>
          <div>
            <label>Visual Intensity</label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings.visualIntensity}
              onChange={e => onSettingChange('visualIntensity', Number(e.target.value))}
              aria-label="Adjust visual intensity"
            />
          </div>
          <div>
            <label>Target Color</label>
            <input
              type="color"
              value={settings.targetColor || '#ffffff'}
              onChange={e => onSettingChange('targetColor', e.target.value)}
              aria-label="Select target color"
            />
            <span>{settings.targetColor || '#ffffff'}</span>
          </div>
          <div className="switch-row">
            <label>Glow Effect</label>
            <input
              type="checkbox"
              checked={settings.targetHasGlow}
              onChange={e => onSettingChange('targetHasGlow', e.target.checked)}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Audio Settings</h3>
          <div className="mode-selector">
            <button
              className={audioMode === 'click' ? 'active' : ''}
              onClick={() => onAudioModeChange('click')}
              aria-pressed={audioMode === 'click'}
            >
              Click Sounds
            </button>
            <button
              className={audioMode === 'track' ? 'active' : ''}
              onClick={() => onAudioModeChange('track')}
              aria-pressed={audioMode === 'track'}
            >
              Audio Track
            </button>
          </div>
          {audioMode === 'click' && (
            <div className="audio-upload-group">
              <label>Left Click Sound
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onSettingChange('leftClickSound', file);
                  }}
                  aria-label="Upload left click sound"
                />
              </label>
              <label>Right Click Sound
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onSettingChange('rightClickSound', file);
                  }}
                  aria-label="Upload right click sound"
                />
              </label>
            </div>
          )}
          {audioMode === 'track' && (
            <div className="audio-upload-group">
              <label>Upload New Track
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onSettingChange('audioTrack', file);
                  }}
                  aria-label="Upload audio track"
                />
              </label>
              {selectedAudio && <div className="audio-metadata"><strong>Current Track:</strong> {selectedAudio}</div>}
              {audioMetadata && (
                <div className="audio-metadata">
                  <div>Duration: {Math.round(audioMetadata.duration)}s</div>
                  <div>Sample Rate: {audioMetadata.sampleRate}Hz</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>Speed (BPM)</h3>
          <div className="bpm-control">
            <label>BPM
              <input
                type="range"
                min={30}
                max={60}
                step={5}
                value={settings.bpm}
                onChange={e => onSettingChange('bpm', Number(e.target.value))}
                aria-label="Adjust BPM"
              />
            </label>
            <span>{settings.bpm} BPM</span>
            <div className="bpm-buttons">
              <button onClick={() => onSettingChange('bpm', 30)} className={settings.bpm === 30 ? 'active' : ''}>Slow</button>
              <button onClick={() => onSettingChange('bpm', 45)} className={settings.bpm === 45 ? 'active' : ''}>Medium</button>
              <button onClick={() => onSettingChange('bpm', 60)} className={settings.bpm === 60 ? 'active' : ''}>Fast</button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Session Length</h3>
          <label>Session Duration
            <input
              type="range"
              min={30}
              max={120}
              step={30}
              value={settings.sessionDuration || 60}
              onChange={e => onSettingChange('sessionDuration', Number(e.target.value))}
              aria-label="Adjust session duration"
              disabled={isSessionActive}
            />
          </label>
          <span>{formatTime(settings.sessionDuration || 60)}</span>
          <div className="bpm-buttons">
            <button onClick={() => onSettingChange('sessionDuration', 30)} className={(settings.sessionDuration || 60) === 30 ? 'active' : ''} disabled={isSessionActive}>30 sec</button>
            <button onClick={() => onSettingChange('sessionDuration', 60)} className={(settings.sessionDuration || 60) === 60 ? 'active' : ''} disabled={isSessionActive}>1 min</button>
            <button onClick={() => onSettingChange('sessionDuration', 120)} className={(settings.sessionDuration || 60) === 120 ? 'active' : ''} disabled={isSessionActive}>2 min</button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Accessibility Guides</h3>
          <div className="switch-row">
            <label htmlFor="audioFeedback">Audio Feedback</label>
            <input
              id="audioFeedback"
              type="checkbox"
              checked={settings.audioFeedbackEnabled}
              onChange={e => onSettingChange('audioFeedbackEnabled', e.target.checked)}
            />
          </div>
          <div className="switch-row">
            <label htmlFor="visualGuide">Visual Intensity Guide</label>
            <input
              id="visualGuide"
              type="checkbox"
              checked={settings.visualGuideEnabled}
              onChange={e => onSettingChange('visualGuideEnabled', e.target.checked)}
            />
          </div>
          <div className="switch-row">
            <label htmlFor="movementGuide">Movement Pattern Guide</label>
            <input
              id="movementGuide"
              type="checkbox"
              checked={settings.movementGuideEnabled}
              onChange={e => onSettingChange('movementGuideEnabled', e.target.checked)}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Theme</h3>
          <button className="theme-toggle" onClick={() => onSettingChange('isDarkMode', !settings.isDarkMode)}>
            <span>{settings.isDarkMode ? '🌙' : '☀️'}</span>
            <span>{settings.isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSettings;