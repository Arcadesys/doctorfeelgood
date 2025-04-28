import React from 'react';

interface ControlsProps {
  // Placeholder props for session control functions
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  // Add props for displaying time later
}

const Controls: React.FC<ControlsProps> = ({ onPlay, onPause, onReset }) => {
  return (
    <div className="p-4 flex space-x-2 justify-center">
      {/* Basic Tailwind styled buttons */}
      <button
        onClick={onPlay}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Play
      </button>
      <button
        onClick={onPause}
        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
      >
        Pause
      </button>
      <button
        onClick={onReset}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      >
        Reset
      </button>
      {/* Placeholder for time display */}
      <div className="text-lg font-mono ml-4">00:00</div>
    </div>
  );
};

export default Controls;
