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
  useEffect(() => {
    document.documentElement.style.setProperty('--target-size', `${size}px`);
    document.documentElement.style.setProperty('--target-color', color);
  }, [size, color]);

  return (
    <div
      className="visual-target"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
      }}
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