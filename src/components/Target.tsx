import React from 'react';

interface TargetProps {
  // Placeholder props based on manifest §7 & §11
  sizePx?: number;
  color?: string;
  // Add position/state props later as needed
}

const Target: React.FC<TargetProps> = ({
  sizePx = 24, // Default from manifest §11
  color = '#00FF88', // Default from manifest §11
}) => {
  // Basic styling using props - motion logic will come later
  const style = {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    backgroundColor: color,
    borderRadius: '50%',
    position: 'absolute' as const, // Needed for positioning
    // Initial position (centered vertically, will be moved horizontally later)
    top: '50%',
    left: '50%', // Start centered, animation will handle movement
    transform: 'translate(-50%, -50%)', // Center the dot precisely
  };

  return <div style={style} data-testid="visual-target"></div>;
};

export default Target;
