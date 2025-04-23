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
    targetColor: string;
    backgroundColor: string;
    audioMode: boolean;
    volume: number;
  };
  onSettingChange: (settingName: string, value: number | string | boolean) => void;
  onPresetSelect: (preset: EMDRPreset) => void;
}

type SettingsTab = 'general' | 'auditory' | 'visual';

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  isSessionActive,
  settings,
  onSettingChange,
  onPresetSelect,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Drawer animation variants
  const drawerVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  // Handle setting changes
  const handleChange = (settingName: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' || e.target.type === 'range' 
      ? Number(e.target.value) 
      : e.target.value;
    onSettingChange(settingName, value);
    
    // Play feedback tones for changes during active session
    if (isSessionActive) {
      playGuideTone('info', { duration: 0.05, volume: 0.2 });
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
            className="fixed right-0 top-0 h-full w-full sm:w-80 bg-white dark:bg-gray-800 shadow-xl z-40 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Settings menu"
            data-testid="settings-drawer"
          >
            {/* Drawer header */}
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Main tab navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`flex-1 py-3 px-4 text-center transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'general'
                    ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('general')}
                aria-selected={activeTab === 'general'}
                role="tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.608-.996.07-2.296-1.065-2.572z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                General
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'auditory'
                    ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('auditory')}
                aria-selected={activeTab === 'auditory'}
                role="tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Audio
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'visual'
                    ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('visual')}
                aria-selected={activeTab === 'visual'}
                role="tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visual
              </button>
            </div>
            
            {/* Settings content */}
            <div className="p-4" role="tabpanel">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="speed" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Speed (BPM)
                    </label>
                    <input
                      type="number"
                      id="speed"
                      name="speed"
                      min="30"
                      max="120"
                      value={settings.speed}
                      onChange={handleChange('speed')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Session Duration (minutes)
                    </label>
                    <input
                      type="number"
                      id="sessionDuration"
                      name="sessionDuration"
                      min="1"
                      max="60"
                      value={settings.sessionDuration}
                      onChange={handleChange('sessionDuration')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'auditory' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="audioMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Audio Mode
                    </label>
                    <div className="mt-2">
                      <button
                        role="switch"
                        aria-checked={settings.audioMode}
                        onClick={() => onSettingChange('audioMode', !settings.audioMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                          settings.audioMode ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        aria-label="Audio mode"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            settings.audioMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="volume" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Volume
                    </label>
                    <input
                      type="range"
                      id="volume"
                      name="volume"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.volume}
                      onChange={handleChange('volume')}
                      className="mt-1 block w-full"
                      role="slider"
                      aria-label="Volume"
                      aria-valuemin={0}
                      aria-valuemax={1}
                      aria-valuenow={settings.volume}
                    />
                  </div>

                  <div>
                    <label htmlFor="oscillatorType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Oscillator Type
                    </label>
                    <select
                      id="oscillatorType"
                      name="oscillatorType"
                      value={settings.oscillatorType}
                      onChange={handleChange('oscillatorType')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="sine">Sine Wave</option>
                      <option value="square">Square Wave</option>
                      <option value="triangle">Triangle Wave</option>
                      <option value="sawtooth">Sawtooth Wave</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="freqLeft" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Left Contact Frequency
                    </label>
                    <input
                      type="number"
                      id="freqLeft"
                      name="freqLeft"
                      min="20"
                      max="2000"
                      value={settings.freqLeft}
                      onChange={handleChange('freqLeft')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="freqRight" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Right Contact Frequency
                    </label>
                    <input
                      type="number"
                      id="freqRight"
                      name="freqRight"
                      min="20"
                      max="2000"
                      value={settings.freqRight}
                      onChange={handleChange('freqRight')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'visual' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="targetSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Target Size
                    </label>
                    <input
                      type="number"
                      id="targetSize"
                      name="targetSize"
                      min="10"
                      max="100"
                      value={settings.targetSize}
                      onChange={handleChange('targetSize')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="targetColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Target Color
                    </label>
                    <input
                      type="color"
                      id="targetColor"
                      name="targetColor"
                      value={settings.targetColor}
                      onChange={handleChange('targetColor')}
                      className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Background Color
                    </label>
                    <input
                      type="color"
                      id="backgroundColor"
                      name="backgroundColor"
                      value={settings.backgroundColor}
                      onChange={handleChange('backgroundColor')}
                      className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer; 