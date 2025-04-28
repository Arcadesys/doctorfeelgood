import React, { useState } from 'react';
import Target from './components/Target';
import Controls from './components/Controls';
import DurationPicker from './components/DurationPicker';
// Import hooks later when they are functional
// import { useSession } from './hooks/useSession';
// import { useAudioEngine } from './hooks/useAudioEngine';
import './index.css'; // Assuming Tailwind base styles are imported here

function App() {
  // Placeholder state - will be replaced by Zustand store later
  const [duration, setDuration] = useState(120); // Default from manifest §7
  const [targetConfig, setTargetConfig] = useState({
    sizePx: 24, // Default from manifest §7
    color: '#00FF88', // Default from manifest §7
    speedPxPerSec: 300, // Default from manifest §7
  });
  // Placeholder session state
  const [isRunning, setIsRunning] = useState(false);

  // Placeholder handlers - will connect to useSession hook later
  const handlePlay = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => setIsRunning(false); // Simplified reset

  return (
    // Basic layout container - adjust styling as needed
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Visual Area - Target will be positioned absolutely within this */}
      <div className="flex-grow relative overflow-hidden bg-gray-800">
        {/* Render Target only when session might be active or configured */}
        <Target sizePx={targetConfig.sizePx} color={targetConfig.color} />
      </div>

      {/* Controls Area */}
      <div className="p-4 bg-gray-200 border-t border-gray-300">
        <Controls
          onPlay={handlePlay}
          onPause={handlePause}
          onReset={handleReset}
        />
        <DurationPicker
          currentDurationSec={duration}
          onDurationChange={setDuration}
        />
        {/* Placeholder for other config inputs (target size/color/speed, audio) */}
        <div className="text-center text-sm text-gray-600 mt-2">
          Config inputs will go here...
        </div>
      </div>
    </div>
  );
}

export default App;
