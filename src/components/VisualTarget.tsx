import React, { useEffect } from 'react';
import '../styles/VisualTarget.css';

interface VisualTargetProps {
  x: number;
  y: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
  isActive?: boolean;
  isGlowing?: boolean;
  onTargetClick: () => void;
}

const VisualTarget: React.FC<VisualTargetProps> = ({
  x,
  y,
  size,
  color,
  shape,
  isActive = false,
  isGlowing = false,
  onTargetClick,
}) => {
  // Set CSS variables on the element itself for proper scoping
  const styleVars = {
    '--target-size': `${size}px`,
    '--target-color': color,
    left: `${x}px`,
    top: `${y}px`,
    width: `var(--target-size)`,
    height: `var(--target-size)`,
    background: 'var(--target-color)',
  } as React.CSSProperties;

  return (
    <div
      className="visual-target"
      style={styleVars}
      data-shape={shape}
      data-active={isActive}
      data-glow={isGlowing}
      onClick={onTargetClick}
      role="button"
      tabIndex={0}
      aria-label={`${shape} target${isActive ? ' active' : ''}${isGlowing ? ' glowing' : ''}`}
    />
  );
};

export default VisualTarget;