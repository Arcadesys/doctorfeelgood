import React from 'react';
import { Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, VStack, Box, Heading, FormControl, FormLabel, Select, Slider, SliderTrack, SliderThumb, SliderFilledTrack, useColorMode, Switch } from '@chakra-ui/react';

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
  };
  onSettingChange: (setting: string, value: unknown) => void;
  onAudioUpload?: (file: File) => void;
  audioMode: 'click' | 'track';
  onAudioModeChange: (mode: 'click' | 'track') => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onAudioSelect: (audio: string) => void;
  selectedAudio: string;
  audioMetadata: AudioMetadata | null;
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
  audioMetadata
}) => {
  const { colorMode, toggleColorMode } = useColorMode();

  if (!isOpen) return null;

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAudioUpload) {
      onAudioUpload(file);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="right"
      size="md"
      aria-label="Settings drawer"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Settings</DrawerHeader>
        <DrawerBody>
          <VStack spacing={4} align="stretch">
            {/* Visual Target Settings */}
            <Box>
              <Heading size="sm" mb={2}>Visual Target</Heading>
              <VStack spacing={3} align="stretch">
                <FormControl>
                  <FormLabel>Target Shape</FormLabel>
                  <Select
                    value={settings.targetShape}
                    onChange={(e) => onSettingChange('targetShape', e.target.value)}
                    aria-label="Select target shape"
                  >
                    <option value="circle">Circle</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                    <option value="diamond">Diamond</option>
                    <option value="star">Star</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Visual Intensity</FormLabel>
                  <Slider
                    value={settings.visualIntensity}
                    onChange={(v) => onSettingChange('visualIntensity', v)}
                    min={0}
                    max={100}
                    step={1}
                    aria-label="Adjust visual intensity"
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
                <FormControl>
                  <FormLabel>Target Color</FormLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.targetColor || '#ffffff'}
                      onChange={(e) => onSettingChange('targetColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                      aria-label="Select target color"
                    />
                    <span className="text-sm">{settings.targetColor || '#ffffff'}</span>
                  </div>
                </FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel mb="0">Glow Effect</FormLabel>
                  <Switch
                    isChecked={settings.targetHasGlow}
                    onChange={(e) => onSettingChange('targetHasGlow', e.target.checked)}
                    colorScheme="blue"
                  />
                </FormControl>
              </VStack>
            </Box>

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
                        <p className="text-gray-300">{selectedAudio}</p>
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

            {/* Accessibility Guides */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Accessibility Guides</h3>
              <div className="space-y-4">
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="audioFeedback" mb="0">Audio Feedback</FormLabel>
                  <Switch
                    id="audioFeedback"
                    isChecked={settings.audioFeedbackEnabled}
                    onChange={(e) => onSettingChange('audioFeedbackEnabled', e.target.checked)}
                    colorScheme="blue"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="visualGuide" mb="0">Visual Intensity Guide</FormLabel>
                  <Switch
                    id="visualGuide"
                    isChecked={settings.visualGuideEnabled}
                    onChange={(e) => onSettingChange('visualGuideEnabled', e.target.checked)}
                    colorScheme="blue"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel htmlFor="movementGuide" mb="0">Movement Pattern Guide</FormLabel>
                  <Switch
                    id="movementGuide"
                    isChecked={settings.movementGuideEnabled}
                    onChange={(e) => onSettingChange('movementGuideEnabled', e.target.checked)}
                    colorScheme="blue"
                  />
                </FormControl>
              </div>
            </section>

            {/* Theme Toggle */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Theme</h3>
              <button
                onClick={toggleColorMode}
                className="w-full py-2 px-4 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center gap-2"
              >
                <span>{colorMode === 'dark' ? '🌙' : '☀️'}</span>
                <span>{colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </section>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default UnifiedSettings; 