import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface EMDRTargetProps {
  isActive: boolean;
  speed?: number; // time in ms for one full cycle
  size?: number; // size in pixels
  color?: string;
  shape?: 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
  hasGlow?: boolean;
  movementPattern?: 'ping-pong' | 'sine';
  pingPong?: boolean;
  intensity?: number; // 0 to 1 for opacity
  visualIntensity?: number; // 0 to 100 for visual intensity
}

export const EMDRTarget: React.FC<EMDRTargetProps> = ({
  isActive = false,
  speed = 1000,
  size = 40,
  color = '#ff0000',
  shape = 'circle',
  hasGlow = true,
  movementPattern = 'ping-pong',
  intensity = 1,
  visualIntensity = 100,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [glowIntensity, setGlowIntensity] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawShape = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply visual intensity to color opacity
      const [r, g, b] = color.match(/\d+/g)?.map(Number) || [255, 255, 255];
      const opacity = visualIntensity / 100;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      if (hasGlow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glowIntensity;
      }

      ctx.beginPath();
      switch (shape) {
        case 'circle':
          ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(position.x - size / 2, position.y - size / 2, size, size);
          break;
        case 'triangle':
          ctx.moveTo(position.x, position.y - size / 2);
          ctx.lineTo(position.x + size / 2, position.y + size / 2);
          ctx.lineTo(position.x - size / 2, position.y + size / 2);
          ctx.closePath();
          break;
        case 'diamond':
          ctx.moveTo(position.x, position.y - size / 2);
          ctx.lineTo(position.x + size / 2, position.y);
          ctx.lineTo(position.x, position.y + size / 2);
          ctx.lineTo(position.x - size / 2, position.y);
          ctx.closePath();
          break;
        case 'star':
          const spikes = 5;
          const outerRadius = size / 2;
          const innerRadius = size / 4;
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = position.x + Math.cos(angle) * radius;
            const y = position.y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          break;
      }
      ctx.fill();
      ctx.stroke();
    };

    drawShape();
  }, [size, color, shape, hasGlow, glowIntensity, position, visualIntensity]);

  return (
    <canvas
      ref={canvasRef}
      width={size * 2}
      height={size * 2}
      style={{ position: 'absolute', top: 0, left: 0 }}
      role="img"
      aria-label={`EMDR target: ${shape} shape`}
    />
  );
};

export default EMDRTarget; 