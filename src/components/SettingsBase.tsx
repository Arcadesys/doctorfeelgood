import React, { useRef, useEffect } from 'react';
import { SettingsComponentProps } from '../types/settings';
import { useAudioEngine } from '../hooks/useAudioEngine';

export const SettingsBase: React.FC<SettingsComponentProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  title = 'Settings',
  showTabs = false,
  isSessionActive = false,
  onSettingChange,
  onPresetSelect,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { isPlaying } = useAudioEngine();

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleChange = (key: keyof SettingsComponentProps['settings'], value: any) => {
    onSettingsChange({ [key]: value });
    
    // If onSettingChange is provided, call it with the setting name and value
    if (onSettingChange) {
      onSettingChange(key, value);
    }
    
    // Play feedback tone for active sessions
    if (isPlaying || isSessionActive) {
      const audio = new Audio('/sounds/feedback.mp3');
      audio.play().catch(console.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Close settings"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {showTabs && (
          <div role="tablist" className="mb-4">
            <button
              role="tab"
              aria-selected="true"
              aria-controls="general-settings"
              className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
            >
              General
            </button>
            <button
              role="tab"
              aria-selected="false"
              aria-controls="auditory-settings"
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Auditory
            </button>
            <button
              role="tab"
              aria-selected="false"
              aria-controls="visual-settings"
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Visual
            </button>
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div>
            <label htmlFor="speed" className="block text-sm font-medium text-gray-700">
              Speed
            </label>
            <input
              type="range"
              id="speed"
              min="1"
              max="10"
              value={settings.speed}
              onChange={(e) => handleChange('speed', parseInt(e.target.value))}
              className="mt-1 block w-full"
              aria-label="Speed"
            />
          </div>

          <div>
            <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700">
              Session duration in minutes
            </label>
            <input
              type="number"
              id="sessionDuration"
              min="1"
              max="60"
              value={settings.sessionDuration}
              onChange={(e) => handleChange('sessionDuration', parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              aria-label="Session duration in minutes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Audio mode</label>
            <button
              role="switch"
              aria-checked={settings.audioMode}
              onClick={() => handleChange('audioMode', !settings.audioMode)}
              className="mt-1 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {settings.audioMode ? 'Audio Track' : 'Click Sound'}
            </button>
          </div>

          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-gray-700">
              Volume
            </label>
            <input
              type="range"
              id="volume"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => handleChange('volume', parseFloat(e.target.value))}
              className="mt-1 block w-full"
              aria-label="Volume"
            />
          </div>

          {showTabs && (
            <>
              <div role="tabpanel" id="visual-settings" className="hidden space-y-4">
                <div>
                  <label htmlFor="targetSize" className="block text-sm font-medium text-gray-700">
                    Target Size
                  </label>
                  <input
                    type="range"
                    id="targetSize"
                    min="1"
                    max="10"
                    value={settings.targetSize}
                    onChange={(e) => handleChange('targetSize', Number(e.target.value))}
                    className="w-full"
                    aria-label="Target size"
                  />
                </div>

                <div>
                  <label htmlFor="targetColor" className="block text-sm font-medium text-gray-700">
                    Target Color
                  </label>
                  <input
                    type="color"
                    id="targetColor"
                    value={settings.targetColor}
                    onChange={(e) => handleChange('targetColor', e.target.value)}
                    className="w-full"
                    aria-label="Target color"
                  />
                </div>

                <div>
                  <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700">
                    Background Color
                  </label>
                  <input
                    type="color"
                    id="backgroundColor"
                    value={settings.backgroundColor}
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="w-full"
                    aria-label="Background color"
                  />
                </div>
              </div>
            </>
          )}
          
          {onPresetSelect && (
            <div className="mt-4">
              <button
                onClick={onPresetSelect}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Manage presets"
              >
                Manage Presets
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 