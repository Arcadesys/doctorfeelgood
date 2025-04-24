import React from 'react';
import '../styles/VisualTarget.css';

interface VisualTargetProps {
  isActive: boolean;
  settings: {
    visualIntensity: number;
    targetShape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
    targetColor: string;
  };
}

const VisualTarget: React.FC<VisualTargetProps> = ({ isActive, settings }) => {
  const { visualIntensity, targetShape, targetColor } = settings;
  
  const getShape = () => {
    switch (targetShape) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded';
      case 'triangle':
        return 'clip-path-triangle';
      case 'diamond':
        return 'clip-path-diamond';
      case 'star':
        return 'clip-path-star';
      default:
        return 'rounded-full';
    }
  };

  const size = 20 + (visualIntensity / 100) * 30; // Size ranges from 20px to 50px
  const opacity = 0.3 + (visualIntensity / 100) * 0.7; // Opacity ranges from 0.3 to 1

  return (
    <div
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${getShape()}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: isActive ? targetColor : targetColor.replace(')', ', 0.3)').replace('rgb', 'rgba'),
        opacity: isActive ? opacity : opacity * 0.5,
        boxShadow: isActive ? `0 0 20px ${targetColor}` : 'none',
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
};

export default VisualTarget; 