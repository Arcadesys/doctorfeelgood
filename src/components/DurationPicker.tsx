import React from 'react';

interface DurationPickerProps {
  // Placeholder props
  currentDurationSec?: number;
  onDurationChange?: (duration: number) => void;
}

const DurationPicker: React.FC<DurationPickerProps> = ({
  currentDurationSec = 120, // Default from manifest §7
  onDurationChange,
}) => {
  // Example durations based on manifest §3 (15 sec steps, up to 5 min)
  const durations = Array.from({ length: 20 }, (_, i) => (i + 1) * 15); // 15s to 300s (5 min)

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onDurationChange) {
      onDurationChange(parseInt(event.target.value, 10));
    }
  };

  return (
    <div className="p-4 flex items-center space-x-2">
      <label htmlFor="duration-select" className="font-medium">
        Session Duration:
      </label>
      <select
        id="duration-select"
        value={currentDurationSec}
        onChange={handleChange}
        className="border border-gray-300 rounded px-2 py-1"
      >
        {durations.map((sec) => (
          <option key={sec} value={sec}>
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DurationPicker;
