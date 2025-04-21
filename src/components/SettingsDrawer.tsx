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
  };
  onSettingChange: (settingName: string, value: number | string) => void;
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
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
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
                className={`flex-1 py-3 px-4 text-center transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'general'
                    ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('general')}
                aria-selected={activeTab === 'general'}
                role="tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                General
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'auditory'
                    ? 'border-b-2 border-purple-500 font-medium text-purple-600 dark:text-purple-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('auditory')}
                aria-selected={activeTab === 'auditory'}
                role="tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414-7.072m-2.828 9.9a9 9 0 010-12.728" />
                </svg>
                Auditory
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'visual'
                    ? 'border-b-2 border-green-500 font-medium text-green-600 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
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
            
            {/* Tab content */}
            <div className="p-4">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="speed" className="block mb-2 text-sm font-medium">
                      Speed: <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2">{Math.round(60000/settings.speed)} BPM</span>
                    </label>
                    <input
                      id="speed"
                      type="range"
                      min="6"
                      max="60"
                      step="1"
                      value={Math.round(60000/settings.speed)}
                      onChange={(e) => {
                        const bpm = Number(e.target.value);
                        const speedMs = Math.round(60000 / bpm);
                        onSettingChange('speed', speedMs);
                      }}
                      className="w-full"
                      aria-label="Adjust speed in beats per minute"
                      disabled={isSessionActive}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[6, 12, 24, 30, 45, 60].map(bpm => (
                        <button
                          key={bpm}
                          onClick={() => onSettingChange('speed', Math.round(60000 / bpm))}
                          className={`px-2 py-1 text-xs rounded ${
                            Math.round(60000/settings.speed) === bpm
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                          disabled={isSessionActive}
                        >
                          {bpm} BPM
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Speed of movement in beats per minute (6-60 BPM). Standard EMDR typically uses 24-30 BPM.
                    </p>
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

              {activeTab === 'auditory' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="oscillatorType" className="block mb-2 text-sm font-medium">
                      Sound Type:
                    </label>
                    <select
                      id="oscillatorType"
                      value={settings.oscillatorType}
                      onChange={handleChange('oscillatorType')}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                      disabled={isSessionActive}
                      aria-label="Select sound type"
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

              {activeTab === 'visual' && (
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

                  <div>
                    <label htmlFor="targetColor" className="block mb-2 text-sm font-medium">
                      Target Color:
                    </label>
                    <input
                      id="targetColor"
                      type="color"
                      value={settings.targetColor}
                      onChange={handleChange('targetColor')}
                      className="w-full h-10 p-1 rounded border border-gray-300 dark:border-gray-600"
                      aria-label="Choose target color"
                      disabled={isSessionActive}
                    />
                  </div>

                  <div>
                    <label htmlFor="backgroundColor" className="block mb-2 text-sm font-medium">
                      Background Color:
                    </label>
                    <input
                      id="backgroundColor"
                      type="color"
                      value={settings.backgroundColor}
                      onChange={handleChange('backgroundColor')}
                      className="w-full h-10 p-1 rounded border border-gray-300 dark:border-gray-600"
                      aria-label="Choose background color"
                      disabled={isSessionActive}
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