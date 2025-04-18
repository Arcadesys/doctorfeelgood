import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PresetManager from './PresetManager';
import { EMDRPreset } from '../hooks/usePresets';
import { playGuideTone } from '../utils/soundUtils';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isSessionActive: boolean;
  settings: {
    speed: number;
    freqLeft: number;
    freqRight: number;
    targetSize: number;
    visualIntensity: number;
    sessionDuration: number;
    oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  };
  onSettingChange: (settingName: string, value: number | string) => void;
  onPresetSelect: (preset: EMDRPreset) => void;
}

// Type for sub-menu tabs
type ControlsSubTab = 'visual' | 'auditory' | 'kinesthetic';

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  isSessionActive,
  settings,
  onSettingChange,
  onPresetSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'presets'>('controls');
  const [activeSubTab, setActiveSubTab] = useState<ControlsSubTab>('visual');

  // Drawer animation variants
  const drawerVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  // Handle setting changes
  const handleChange = (settingName: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (settingName === 'oscillatorType') {
      const value = e.target.value as 'sine' | 'square' | 'triangle' | 'sawtooth';
      onSettingChange(settingName, value);
      
      // Play feedback tones for changes during active session
      if (isSessionActive) {
        playGuideTone('info', { duration: 0.05, volume: 0.2 });
      }
    } else {
      const value = Number(e.target.value);
      onSettingChange(settingName, value);
      
      // Play feedback tones for changes during active session
      if (isSessionActive) {
        if (settingName.includes('freq')) {
          // For frequency changes, play the actual frequency
          const freq = value;
          const synth = new window.Tone.Synth().toDestination();
          synth.triggerAttackRelease(freq, 0.1);
          setTimeout(() => synth.dispose(), 200);
        } else {
          playGuideTone('info', { duration: 0.05, volume: 0.2 });
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-30"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Drawer panel */}
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={drawerVariants}
            className="fixed left-0 top-0 h-full w-full sm:w-80 bg-white dark:bg-gray-800 shadow-xl z-40 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Settings menu"
          >
            {/* Drawer header */}
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close settings menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Main tab navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`flex-1 py-3 px-4 text-center transition-colors ${
                  activeTab === 'controls'
                    ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('controls')}
                aria-selected={activeTab === 'controls'}
                role="tab"
              >
                Controls
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center transition-colors ${
                  activeTab === 'presets'
                    ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('presets')}
                aria-selected={activeTab === 'presets'}
                role="tab"
              >
                Presets
              </button>
            </div>
            
            {/* Tab content */}
            <div className="p-4">
              {activeTab === 'controls' ? (
                <div className="space-y-6">
                  {/* Sub-tab navigation for Controls */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                      className={`flex-1 py-2 px-2 text-center transition-colors text-sm ${
                        activeSubTab === 'visual'
                          ? 'border-b-2 border-green-500 font-medium text-green-600 dark:text-green-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setActiveSubTab('visual')}
                      aria-selected={activeSubTab === 'visual'}
                      role="tab"
                    >
                      Visual
                    </button>
                    <button
                      className={`flex-1 py-2 px-2 text-center transition-colors text-sm ${
                        activeSubTab === 'auditory'
                          ? 'border-b-2 border-purple-500 font-medium text-purple-600 dark:text-purple-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setActiveSubTab('auditory')}
                      aria-selected={activeSubTab === 'auditory'}
                      role="tab"
                    >
                      Auditory
                    </button>
                    <button
                      className={`flex-1 py-2 px-2 text-center transition-colors text-sm ${
                        activeSubTab === 'kinesthetic'
                          ? 'border-b-2 border-amber-500 font-medium text-amber-600 dark:text-amber-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setActiveSubTab('kinesthetic')}
                      aria-selected={activeSubTab === 'kinesthetic'}
                      role="tab"
                    >
                      Kinesthetic
                    </button>
                  </div>

                  {/* Visual Settings */}
                  {activeSubTab === 'visual' && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="targetSize" className="block mb-2 text-sm font-medium">
                          Target Size: <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2">{settings.targetSize}px</span>
                        </label>
                        <input
                          id="targetSize"
                          type="range"
                          min="20"
                          max="100"
                          step="5"
                          value={settings.targetSize}
                          onChange={handleChange('targetSize')}
                          className="w-full"
                          aria-label="Adjust size of the visual target"
                          disabled={isSessionActive}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="visualIntensity" className="block mb-2 text-sm font-medium">
                          Visual Intensity: <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2">{Math.round(settings.visualIntensity * 100)}%</span>
                        </label>
                        <input
                          id="visualIntensity"
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.visualIntensity}
                          onChange={handleChange('visualIntensity')}
                          className="w-full"
                          aria-label="Adjust intensity of the visual target"
                          disabled={isSessionActive}
                        />
                      </div>
                    </div>
                  )}

                  {/* Auditory Settings */}
                  {activeSubTab === 'auditory' && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="oscillatorType" className="block mb-2 text-sm font-medium">
                          Tone Type:
                        </label>
                        <select
                          id="oscillatorType"
                          value={settings.oscillatorType}
                          onChange={handleChange('oscillatorType')}
                          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                          disabled={isSessionActive}
                          aria-label="Select oscillator type"
                        >
                          <option value="sine">Sine (Smooth)</option>
                          <option value="square">Square (Sharp)</option>
                          <option value="triangle">Triangle (Medium)</option>
                          <option value="sawtooth">Sawtooth (Buzzy)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="freqLeft" className="block mb-2 text-sm font-medium">
                          Left Tone: <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2">{settings.freqLeft}Hz</span>
                        </label>
                        <input
                          id="freqLeft"
                          type="range"
                          min="220"
                          max="880"
                          step="20"
                          value={settings.freqLeft}
                          onChange={handleChange('freqLeft')}
                          className="w-full"
                          aria-label="Adjust frequency of left tone"
                          disabled={isSessionActive}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="freqRight" className="block mb-2 text-sm font-medium">
                          Right Tone: <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2">{settings.freqRight}Hz</span>
                        </label>
                        <input
                          id="freqRight"
                          type="range"
                          min="220"
                          max="880"
                          step="20"
                          value={settings.freqRight}
                          onChange={handleChange('freqRight')}
                          className="w-full"
                          aria-label="Adjust frequency of right tone"
                          disabled={isSessionActive}
                        />
                      </div>
                    </div>
                  )}

                  {/* Kinesthetic Settings */}
                  {activeSubTab === 'kinesthetic' && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="speed" className="block mb-2 text-sm font-medium">
                          Speed: <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2">{settings.speed}ms</span>
                        </label>
                        <input
                          id="speed"
                          type="range"
                          min="500"
                          max="3000"
                          step="100"
                          value={settings.speed}
                          onChange={handleChange('speed')}
                          className="w-full"
                          aria-label="Adjust speed of target movement"
                          disabled={isSessionActive}
                        />
                      </div>

                      <div>
                        <label htmlFor="sessionDuration" className="block mb-2 text-sm font-medium">
                          Session Duration:
                        </label>
                        <select
                          id="sessionDuration"
                          value={settings.sessionDuration}
                          onChange={handleChange('sessionDuration')}
                          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                          disabled={isSessionActive}
                          aria-label="Session duration in minutes"
                        >
                          <option value="1">1 minute</option>
                          <option value="3">3 minutes</option>
                          <option value="5">5 minutes</option>
                          <option value="10">10 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="20">20 minutes</option>
                          <option value="30">30 minutes</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <PresetManager
                  onSelectPreset={onPresetSelect}
                  currentSettings={{
                    speed: settings.speed,
                    freqLeft: settings.freqLeft,
                    freqRight: settings.freqRight,
                    targetSize: settings.targetSize,
                    visualIntensity: settings.visualIntensity,
                    sessionDuration: settings.sessionDuration,
                    oscillatorType: settings.oscillatorType,
                  }}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer; 