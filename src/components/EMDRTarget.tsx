import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EMDRTargetProps {
  isActive: boolean;
  speed?: number; // time in ms for one full cycle
  size?: number; // size in pixels
  color?: string;
  pingPong?: boolean;
  intensity?: number; // 0 to 1 for opacity
}

const EMDRTarget: React.FC<EMDRTargetProps> = ({
  isActive = false,
  speed = 1000,
  size = 40,
  color = '#ff0000',
  pingPong = true,
  intensity = 1,
}) => {
  const [position, setPosition] = useState<'left' | 'center' | 'right'>('center');

  useEffect(() => {
    if (!isActive) {
      setPosition('center');
      return;
    }

    if (pingPong) {
      let currentPosition: 'left' | 'center' | 'right' = 'center';
      let direction: 'left' | 'right' = 'right';
      
      const interval = setInterval(() => {
        if (direction === 'right') {
          currentPosition = currentPosition === 'left' ? 'center' : 'right';
          if (currentPosition === 'right') direction = 'left';
        } else {
          currentPosition = currentPosition === 'right' ? 'center' : 'left';
          if (currentPosition === 'left') direction = 'right';
        }
        
        setPosition(currentPosition);
      }, speed / 2); // Divide by 2 because we have 2 movements per cycle

      return () => clearInterval(interval);
    }
  }, [isActive, speed, pingPong]);

  // Calculate x position based on state
  const getXPosition = () => {
    switch (position) {
      case 'left': return '-80%';
      case 'right': return '80%';
      default: return '0%';
    }
  };

  // Calculate opacity based on intensity
  const getOpacity = () => {
    // Ensure minimum visibility of 30% even at lowest intensity
    return 0.3 + (intensity * 0.7);
  };

  // Calculate pulsing effect for center position
  const getPulseScale = () => {
    return position === 'center' ? 1.2 : 1;
  };

  // Determine background color with appropriate opacity
  const getBackgroundColor = () => {
    // Convert hex to rgba with opacity
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${getOpacity()})`;
    }
    return color;
  };

  return (
    <div 
      className="relative w-full h-32 flex items-center justify-center" 
      role="region" 
      aria-label="EMDR visual target"
    >
      <motion.div
        animate={{
          x: getXPosition(),
          scale: getPulseScale(),
        }}
        initial={{ x: '0%' }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 15,
        }}
        className="rounded-full absolute"
        style={{
          width: size,
          height: size,
          backgroundColor: getBackgroundColor(),
          boxShadow: `0 0 ${size/4}px ${getBackgroundColor()}`,
        }}
        aria-live="polite"
        aria-label={`Target is at the ${position} position`}
      />
    </div>
  );
};

export default EMDRTarget; 