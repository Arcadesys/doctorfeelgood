import React from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  size?: number;
  isDarkMode: boolean;
  label?: string;
}

// Helper function to create SVG arc path for knobs
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  
  return [
    "M", start.x, start.y, 
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): {x: number, y: number} {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

export default function CustomKnob({ 
  value, 
  min, 
  max, 
  step, 
  onChange, 
  size = 80, 
  isDarkMode,
  label
}: KnobProps) {
  // Calculate normalized value between 0 and 1
  const normalizedValue = (value - min) / (max - min);
  
  // Calculate the angle for the arc (135° to 405° = 270° of travel)
  const startAngle = 135;
  const endAngle = startAngle + (normalizedValue * 270);
  
  return (
    <div className="flex flex-col items-center">
      {label && (
        <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
          {label}
        </label>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            fill={isDarkMode ? '#374151' : '#F3F4F6'} 
            stroke={isDarkMode ? '#4B5563' : '#E5E7EB'} 
            strokeWidth="2"
          />
          
          {/* Progress arc */}
          <path 
            d={describeArc(50, 50, 40, startAngle, endAngle)} 
            fill="none" 
            stroke="#3B82F6" 
            strokeWidth="8" 
            strokeLinecap="round"
          />
          
          {/* Indicator line */}
          <line 
            x1="50" 
            y1="50" 
            x2={50 + 30 * Math.cos(endAngle * Math.PI / 180)} 
            y2={50 + 30 * Math.sin(endAngle * Math.PI / 180)} 
            stroke="#3B82F6" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          
          {/* Value text */}
          <text 
            x="50" 
            y="55" 
            textAnchor="middle" 
            fill={isDarkMode ? '#F9FAFB' : '#111827'} 
            fontSize="12"
          >
            {value.toFixed(2)}
          </text>
        </svg>
        
        {/* Invisible input for interactions */}
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label || "Knob control"}
        />
      </div>
    </div>
  );
} 