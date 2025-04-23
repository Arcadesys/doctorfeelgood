import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playGuideTone } from '../utils/soundUtils';

export interface UnifiedSettingsProps {
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
    targetShape: 'circle' | 'square';
    targetHasGlow: boolean;
    targetMovementPattern: 'ping-pong' | 'sine';
    isDarkMode: boolean;
    audioMode: 'click' | 'track';
    bpm: number;
    panWidthPercent: number;
  };
  onSettingChange: (settingName: string, value: number | string | boolean) => void;
}

type SettingsTab = 'visual' | 'audio' | 'session';

const UnifiedSettings: React.FC<UnifiedSettingsProps> = ({
  isOpen,
  onClose,
  isSessionActive,
  settings,
  onSettingChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('visual');

  // Drawer animation variants
  const drawerVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  // Handle setting changes with audio feedback
  const handleChange = (settingName: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (settingName === 'oscillatorType') {
      const value = e.target.value as 'sine' | 'square' | 'triangle' | 'sawtooth';
      onSettingChange(settingName, value);
      if (isSessionActive) playGuideTone('info', { duration: 0.05, volume: 0.2 });
    } else {
      const value = Number(e.target.value);
      onSettingChange(settingName, value);
      if (isSessionActive) playGuideTone('info', { duration: 0.05, volume: 0.2 });
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
            className="fixed inset-0 bg-black z-50"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Settings panel */}
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={drawerVariants}
            className="fixed left-0 top-0 h-full w-full sm:w-96 bg-gray-900 text-white shadow-xl z-51 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Settings menu"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                aria-label="Close settings menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 py-4 border-b border-gray-800">
              <nav className="flex space-x-4" role="tablist">
                {(['visual', 'audio', 'session'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`${tab}-panel`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Settings Content */}
            <div className="p-6">
              {/* Visual Settings Panel */}
              <div
                id="visual-panel"
                role="tabpanel"
                aria-labelledby="visual-tab"
                className={activeTab === 'visual' ? 'block' : 'hidden'}
              >
                <div className="space-y-6">
                  {/* Display Mode */}
                  <section>
                    <h3 className="text-xl mb-4">Display Mode</h3>
                    <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                        </svg>
                        Light
                      </span>
                      <button
                        onClick={() => onSettingChange('isDarkMode', !settings.isDarkMode)}
                        className={`relative w-12 h-6 transition-colors duration-200 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          settings.isDarkMode ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={settings.isDarkMode}
                      >
                        <span
                          className={`absolute left-0 inline-block w-5 h-5 transition-transform duration-200 ease-in-out transform bg-white rounded-full ${
                            settings.isDarkMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                        Dark
                      </span>
                    </div>
                  </section>

                  {/* Visual Target Settings */}
                  <section>
                    <h3 className="text-xl mb-4">Visual Target</h3>
                    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                      <div>
                        <label htmlFor="targetSize" className="block mb-2 text-sm">
                          Size: <span className="font-mono bg-gray-700 px-2 py-1 rounded ml-2">{settings.targetSize}px</span>
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
                          disabled={isSessionActive}
                          aria-label="Target size in pixels"
                        />
                      </div>

                      <div>
                        <label htmlFor="targetColor" className="block mb-2 text-sm">Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            id="targetColor"
                            type="color"
                            value={settings.targetColor}
                            onChange={(e) => onSettingChange('targetColor', e.target.value)}
                            className="w-12 h-8 rounded cursor-pointer"
                            disabled={isSessionActive}
                            aria-label="Target color"
                          />
                          <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                            {settings.targetColor}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="targetShape" className="block mb-2 text-sm">Shape</label>
                        <select
                          id="targetShape"
                          value={settings.targetShape}
                          onChange={(e) => onSettingChange('targetShape', e.target.value)}
                          className="w-full p-2 rounded bg-gray-700 border-gray-600"
                          disabled={isSessionActive}
                          aria-label="Target shape"
                        >
                          <option value="circle">Circle</option>
                          <option value="square">Square</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <label htmlFor="targetHasGlow" className="text-sm">Glow Effect</label>
                        <button
                          onClick={() => onSettingChange('targetHasGlow', !settings.targetHasGlow)}
                          className={`relative w-12 h-6 transition-colors duration-200 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            settings.targetHasGlow ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                          role="switch"
                          aria-checked={settings.targetHasGlow}
                          disabled={isSessionActive}
                        >
                          <span
                            className={`absolute left-0 inline-block w-5 h-5 transition-transform duration-200 ease-in-out transform bg-white rounded-full ${
                              settings.targetHasGlow ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <label htmlFor="visualIntensity" className="block mb-2 text-sm">
                          Visual Intensity: <span className="font-mono bg-gray-700 px-2 py-1 rounded ml-2">{Math.round(settings.visualIntensity * 100)}%</span>
                        </label>
                        <input
                          id="visualIntensity"
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.visualIntensity}
                          onChange={(e) => onSettingChange('visualIntensity', Number(e.target.value))}
                          className="w-full"
                          disabled={isSessionActive}
                          aria-label="Visual intensity percentage"
                        />
                      </div>

                      <div>
                        <label htmlFor="targetMovementPattern" className="block mb-2 text-sm">Movement Pattern</label>
                        <select
                          id="targetMovementPattern"
                          value={settings.targetMovementPattern}
                          onChange={(e) => onSettingChange('targetMovementPattern', e.target.value)}
                          className="w-full p-2 rounded bg-gray-700 border-gray-600"
                          disabled={isSessionActive}
                          aria-label="Target movement pattern"
                        >
                          <option value="ping-pong">Ping Pong</option>
                          <option value="sine">Sine Wave</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Audio Settings Panel */}
              <div
                id="audio-panel"
                role="tabpanel"
                aria-labelledby="audio-tab"
                className={activeTab === 'audio' ? 'block' : 'hidden'}
              >
                <div className="space-y-6">
                  {/* Audio Mode */}
                  <section>
                    <h3 className="text-xl mb-4">Audio Mode</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => onSettingChange('audioMode', 'click')}
                        className={`p-4 rounded-lg text-center transition-colors ${
                          settings.audioMode === 'click'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        aria-pressed={settings.audioMode === 'click'}
                      >
                        Click Mode
                      </button>
                      <button
                        onClick={() => onSettingChange('audioMode', 'track')}
                        className={`p-4 rounded-lg text-center transition-colors ${
                          settings.audioMode === 'track'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        aria-pressed={settings.audioMode === 'track'}
                      >
                        Audio Track Mode
                      </button>
                    </div>
                  </section>

                  {/* Oscillator Settings */}
                  <section>
                    <h3 className="text-xl mb-4">Oscillator Settings</h3>
                    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                      <div>
                        <label htmlFor="oscillatorType" className="block mb-2 text-sm">Waveform</label>
                        <select
                          id="oscillatorType"
                          value={settings.oscillatorType}
                          onChange={handleChange('oscillatorType')}
                          className="w-full p-2 rounded bg-gray-700 border-gray-600"
                          disabled={isSessionActive}
                          aria-label="Oscillator waveform type"
                        >
                          <option value="sine">Sine</option>
                          <option value="square">Square</option>
                          <option value="triangle">Triangle</option>
                          <option value="sawtooth">Sawtooth</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Session Settings Panel */}
              <div
                id="session-panel"
                role="tabpanel"
                aria-labelledby="session-tab"
                className={activeTab === 'session' ? 'block' : 'hidden'}
              >
                <div className="space-y-6">
                  {/* Panning Parameters */}
                  <section>
                    <h3 className="text-xl mb-4">Panning Parameters</h3>
                    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                      <div>
                        <label htmlFor="bpm" className="block mb-2 text-sm">
                          Frequency: <span className="font-mono bg-gray-700 px-2 py-1 rounded ml-2">{settings.bpm} BPM</span>
                        </label>
                        <input
                          id="bpm"
                          type="range"
                          min="6"
                          max="120"
                          step="1"
                          value={settings.bpm}
                          onChange={handleChange('bpm')}
                          className="w-full"
                          disabled={isSessionActive}
                          aria-label="Panning frequency in BPM"
                        />
                        <p className="text-sm text-gray-400 mt-1">Speed of panning in beats per minute (lower = slower)</p>
                      </div>

                      <div>
                        <label htmlFor="panWidthPercent" className="block mb-2 text-sm">
                          Pan Width: <span className="font-mono bg-gray-700 px-2 py-1 rounded ml-2">{settings.panWidthPercent}%</span>
                        </label>
                        <input
                          id="panWidthPercent"
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={settings.panWidthPercent}
                          onChange={handleChange('panWidthPercent')}
                          className="w-full"
                          disabled={isSessionActive}
                          aria-label="Pan width percentage"
                        />
                        <p className="text-sm text-gray-400 mt-1">Percentage of complete left-right panning</p>
                      </div>
                    </div>
                  </section>

                  {/* Session Duration */}
                  <section>
                    <h3 className="text-xl mb-4">Session Duration</h3>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div>
                        <label htmlFor="sessionDuration" className="block mb-2 text-sm">
                          Duration: <span className="font-mono bg-gray-700 px-2 py-1 rounded ml-2">{settings.sessionDuration} minutes</span>
                        </label>
                        <input
                          id="sessionDuration"
                          type="range"
                          min="1"
                          max="60"
                          step="1"
                          value={settings.sessionDuration}
                          onChange={handleChange('sessionDuration')}
                          className="w-full"
                          disabled={isSessionActive}
                          aria-label="Session duration in minutes"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UnifiedSettings; 