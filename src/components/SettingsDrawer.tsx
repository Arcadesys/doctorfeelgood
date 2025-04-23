import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tone from 'tone';
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
    targetShape: 'circle' | 'square';
    targetHasGlow: boolean;
    targetMovementPattern: 'ping-pong' | 'sine';
    isDarkMode: boolean;
    audioMode: 'click' | 'track';
  };
  onSettingChange: (settingName: string, value: number | string | boolean) => void;
}

// Type for sub-menu tabs
type ControlsSubTab = 'visual' | 'auditory' | 'kinesthetic';

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  isSessionActive,
  settings,
  onSettingChange,
}) => {
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
          const synth = new Tone.Synth().toDestination();
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
            className="fixed left-0 top-0 h-full w-full sm:w-80 bg-gray-900 text-white shadow-xl z-40 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Settings menu"
          >
            {/* Drawer header */}
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-2xl font-semibold">EMDR Settings</h2>
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
            
            {/* Settings content */}
            <div className="p-6 space-y-8">
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
                  <div className="relative inline-flex">
                    <button
                      onClick={() => onSettingChange('isDarkMode', !settings.isDarkMode)}
                      className={`w-12 h-6 transition-colors duration-200 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        settings.isDarkMode ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={settings.isDarkMode}
                    >
                      <span
                        className={`inline-block w-5 h-5 transition-transform duration-200 ease-in-out transform bg-white rounded-full ${
                          settings.isDarkMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                    Dark
                  </span>
                </div>
              </section>

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
                  >
                    Audio Track Mode
                  </button>
                </div>
              </section>

              {/* Session Settings */}
              <section>
                <h3 className="text-xl mb-4">Session Settings</h3>
                <div className="bg-gray-800 p-4 rounded-lg space-y-6">
                  {/* Panning Parameters */}
                  <div>
                    <h4 className="text-lg mb-2">Panning Parameters</h4>
                    <div>
                      <label htmlFor="speed" className="block mb-2 text-sm">
                        Frequency: <span className="font-mono bg-gray-700 px-2 py-1 rounded ml-2">{Math.round(60000 / settings.speed)} BPM</span>
                      </label>
                      <input
                        id="speed"
                        type="range"
                        min="500"
                        max="2000"
                        step="100"
                        value={settings.speed}
                        onChange={(e) => onSettingChange('speed', Number(e.target.value))}
                        className="w-full"
                        aria-label="Adjust movement speed"
                        disabled={isSessionActive}
                      />
                      <p className="text-sm text-gray-400 mt-1">Speed of panning in beats per minute (lower = slower)</p>
                    </div>
                  </div>

                  {/* Visual Target Settings */}
                  <div>
                    <h4 className="text-lg mb-2">Visual Target</h4>
                    <div className="space-y-4">
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
                          onChange={(e) => onSettingChange('targetSize', Number(e.target.value))}
                          className="w-full"
                          disabled={isSessionActive}
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
                        >
                          <option value="circle">Circle</option>
                          <option value="square">Square</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <label htmlFor="targetHasGlow" className="text-sm">Glow Effect</label>
                        <div className="relative inline-flex">
                          <button
                            onClick={() => onSettingChange('targetHasGlow', !settings.targetHasGlow)}
                            className={`w-12 h-6 transition-colors duration-200 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              settings.targetHasGlow ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                            role="switch"
                            aria-checked={settings.targetHasGlow}
                            disabled={isSessionActive}
                          >
                            <span
                              className={`inline-block w-5 h-5 transition-transform duration-200 ease-in-out transform bg-white rounded-full ${
                                settings.targetHasGlow ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer; 