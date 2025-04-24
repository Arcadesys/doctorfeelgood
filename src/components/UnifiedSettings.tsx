import React from 'react';

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
  };
  onSettingChange: (setting: string, value: unknown) => void;
  onAudioUpload?: (file: File) => void;
  audioMode: 'click' | 'track';
  onAudioModeChange: (mode: 'click' | 'track') => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onAudioSelect: (audio: AudioFile | null) => void;
  selectedAudio: AudioFile | null;
  audioMetadata: AudioMetadata | null;
}

const SHAPES = [
  { id: 'circle', icon: '⭕', label: 'Circle' },
  { id: 'square', icon: '⬛', label: 'Square' },
  { id: 'triangle', icon: '🔺', label: 'Triangle' },
  { id: 'diamond', icon: '💠', label: 'Diamond' },
] as const;

const INTENSITIES = [
  { id: 'low', value: 0.3, label: 'Low' },
  { id: 'medium', value: 0.6, label: 'Medium' },
  { id: 'high', value: 1, label: 'High' },
] as const;

export default function UnifiedSettings({
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
}: UnifiedSettingsProps) {
  if (!isOpen) return null;

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAudioUpload) {
      onAudioUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-start justify-center overflow-hidden p-4">
      <div className="bg-gray-800 text-white rounded-lg w-full max-w-md mt-4 max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* Visual Intensity */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Visual Intensity</h3>
            <div className="flex gap-2">
              {INTENSITIES.map((intensity) => (
                <button
                  key={intensity.id}
                  onClick={() => onSettingChange('visualIntensity', intensity.value)}
                  className={`flex-1 py-2 px-4 rounded ${
                    settings.visualIntensity === intensity.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  aria-pressed={settings.visualIntensity === intensity.value}
                >
                  {intensity.label}
                </button>
              ))}
            </div>
          </section>

          {/* Shape Selection */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Target Shape</h3>
            <div className="grid grid-cols-2 gap-2">
              {SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => onSettingChange('targetShape', shape.id)}
                  className={`py-3 px-4 rounded flex items-center justify-center gap-2 ${
                    settings.targetShape === shape.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  aria-pressed={settings.targetShape === shape.id}
                >
                  <span className="text-2xl">{shape.icon}</span>
                  <span>{shape.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Audio Settings */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Audio Settings</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onAudioModeChange('click')}
                className={`px-4 py-2 rounded ${
                  audioMode === 'click'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
                aria-pressed={audioMode === 'click'}
              >
                Click Sounds
              </button>
              <button
                onClick={() => onAudioModeChange('track')}
                className={`px-4 py-2 rounded ${
                  audioMode === 'track'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
                aria-pressed={audioMode === 'track'}
              >
                Audio Track
              </button>
            </div>

            {/* Custom Click Sound Upload */}
            {audioMode === 'click' && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Custom Click Sounds</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm mb-1">Left Click Sound</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onSettingChange('leftClickSound', file);
                        }
                      }}
                      className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      aria-label="Upload left click sound"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Right Click Sound</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onSettingChange('rightClickSound', file);
                        }
                      }}
                      className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      aria-label="Upload right click sound"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Audio Track Upload */}
            {audioMode === 'track' && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Audio Track</h4>
                <div className="space-y-4">
                  {selectedAudio && (
                    <div className="text-sm">
                      <p className="font-medium">Current Track:</p>
                      <p className="text-gray-300">{selectedAudio.name}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm mb-1">Upload New Track</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onSettingChange('audioTrack', file);
                        }
                      }}
                      className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      aria-label="Upload audio track"
                    />
                  </div>
                  {audioMetadata && (
                    <div className="text-sm text-gray-300">
                      <p>Duration: {Math.round(audioMetadata.duration)}s</p>
                      <p>Sample Rate: {audioMetadata.sampleRate}Hz</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* BPM Settings */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Speed (BPM)</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="30"
                  max="120"
                  step="5"
                  value={settings.bpm}
                  onChange={(e) => onSettingChange('bpm', parseInt(e.target.value))}
                  className="w-full"
                  aria-label="Adjust BPM"
                />
                <span className="text-sm font-medium min-w-[4rem] text-right">{settings.bpm} BPM</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSettingChange('bpm', 60)}
                  className={`px-4 py-2 rounded ${
                    settings.bpm === 60
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  Slow
                </button>
                <button
                  onClick={() => onSettingChange('bpm', 90)}
                  className={`px-4 py-2 rounded ${
                    settings.bpm === 90
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => onSettingChange('bpm', 120)}
                  className={`px-4 py-2 rounded ${
                    settings.bpm === 120
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  Fast
                </button>
              </div>
            </div>
          </section>

          {/* Theme Toggle */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Theme</h3>
            <button
              onClick={() => onSettingChange('isDarkMode', !settings.isDarkMode)}
              className="w-full py-2 px-4 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center gap-2"
            >
              <span>{settings.isDarkMode ? '🌙' : '☀️'}</span>
              <span>{settings.isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
} 