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
  visualIntensity?: number; // 0 to 1 for visual intensity
  isDarkMode?: boolean; // Whether dark mode is enabled
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
  visualIntensity = 1,
  isDarkMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [glowIntensity, setGlowIntensity] = useState(0);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Animation effect
  useEffect(() => {
    if (!isActive || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const elapsed = timestamp - startTimeRef.current;
      const progress = (elapsed % speed) / speed;

      // Calculate new position
      const width = canvas.width;
      // Center the movement around the middle of the screen
      const x = width * 0.5 + (width * 0.3 * Math.cos(2 * Math.PI * progress));
      setPosition(prev => ({ ...prev, x }));

      // Request next frame if still active
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      startTimeRef.current = undefined;
    };
  }, [isActive, speed]);

  // Drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawShape = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Parse color properly whether it's hex or rgb
      let r, g, b;
      if (color.startsWith('#')) {
        // Handle hex color
        const hex = color.replace('#', '');
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else {
        // Handle rgb/rgba color
        [r, g, b] = color.match(/\d+/g)?.map(Number) || [255, 255, 255];
      }
      
      // Use visualIntensity directly as it's already in 0-1 range
      const opacity = visualIntensity;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      if (hasGlow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowBlur = 0;
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
      
      // Fill and stroke with same color
      ctx.fill();
      ctx.stroke();
    };

    drawShape();
  }, [size, color, shape, hasGlow, position, visualIntensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Allow clicking through the canvas
        zIndex: 10
      }}
      role="img"
      aria-label={`EMDR target: ${shape} shape`}
    />
  );
};

export default EMDRTarget; 