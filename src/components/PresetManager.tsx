import React, { useState } from 'react';
import { EMDRPreset, usePresets } from '../hooks/usePresets';
import { playGuideTone } from '../utils/soundUtils';

interface PresetManagerProps {
  onSelectPreset: (preset: EMDRPreset) => void;
  currentSettings: Omit<EMDRPreset, 'id' | 'name'>;
}

const PresetManager: React.FC<PresetManagerProps> = ({ 
  onSelectPreset,
  currentSettings
}) => {
  const { presets, savePreset, deletePreset, resetToDefaults } = usePresets();
  const [presetName, setPresetName] = useState('');
  const [isSaveFormOpen, setIsSaveFormOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    // Save current settings with the provided name
    const newPreset = {
      ...currentSettings,
      name: presetName.trim()
    };
    
    savePreset(newPreset);
    setPresetName('');
    setIsSaveFormOpen(false);
    playGuideTone('success', { duration: 0.3 });
  };
  
  const handleSelectPreset = (preset: EMDRPreset) => {
    setSelectedPresetId(preset.id);
    onSelectPreset(preset);
    playGuideTone('info', { duration: 0.2 });
  };
  
  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selection when deleting
    const wasDeleted = deletePreset(id);
    
    if (wasDeleted) {
      if (selectedPresetId === id) {
        setSelectedPresetId(null);
      }
      playGuideTone('warning', { duration: 0.3 });
    }
  };
  
  const handleResetToDefaults = () => {
    if (window.confirm('Reset all presets to defaults? This will remove any custom presets you have created.')) {
      resetToDefaults();
      setSelectedPresetId(null);
      playGuideTone('warning', { duration: 0.5 });
    }
  };

  // Function to get friendly name for oscillator type
  const getOscillatorName = (type?: string) => {
    switch(type) {
      case 'sine': return 'Sine (Smooth)';
      case 'square': return 'Square (Sharp)';
      case 'triangle': return 'Triangle (Medium)';
      case 'sawtooth': return 'Sawtooth (Buzzy)';
      default: return 'Sine (Smooth)';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg mb-3">Saved Presets</h3>
      
      <div className="grid grid-cols-1 gap-3 mb-4 max-h-64 overflow-y-auto pr-1">
        {presets.map(preset => (
          <div 
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            className={`p-3 rounded border cursor-pointer transition-colors ${
              selectedPresetId === preset.id 
                ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600' 
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            role="button"
            aria-pressed={selectedPresetId === preset.id}
            tabIndex={0}
          >
            <div className="flex justify-between items-start">
              <span className="font-medium">{preset.name}</span>
              {!preset.id.startsWith('default-') && (
                <button
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  className="text-red-500 hover:text-red-700 p-1 -mr-1"
                  aria-label={`Delete preset ${preset.name}`}
                >
                  ×
                </button>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              <div>Speed: {preset.speed}ms</div>
              <div>Target Size: {preset.targetSize}px</div>
              <div>Duration: {preset.sessionDuration} min</div>
              <div>Tone: {getOscillatorName(preset.oscillatorType)}</div>
            </div>
          </div>
        ))}
      </div>
      
      {isSaveFormOpen ? (
        <div className="p-3 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700">
          <label htmlFor="presetName" className="block mb-2 text-sm font-medium">
            Preset Name:
          </label>
          <div className="flex gap-2">
            <input
              id="presetName"
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="Enter preset name"
              aria-label="Preset name"
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="bg-green-500 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
              aria-label="Save preset"
            >
              Save
            </button>
            <button
              onClick={() => setIsSaveFormOpen(false)}
              className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded text-sm font-medium"
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => setIsSaveFormOpen(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium"
            aria-label="Save current settings as preset"
          >
            Save Current Settings
          </button>
          
          <button
            onClick={handleResetToDefaults}
            className="w-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-3 py-2 rounded text-sm font-medium"
            aria-label="Reset all presets to defaults"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
};

export default PresetManager; 