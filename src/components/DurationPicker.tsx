import React from 'react';

type Props = {
  value: number; // seconds
  onChange: (sec: number) => void;
};

export default function DurationPicker({ value, onChange }: Props) {
  const options = Array.from({ length: 20 }, (_, i) => (i + 1) * 15); // 15..300
  return (
    <label className="row" aria-label="Session duration">
      <span className="label">Duration</span>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      >
        {options.map((s) => (
          <option key={s} value={s}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</option>
        ))}
      </select>
    </label>
  );
}

