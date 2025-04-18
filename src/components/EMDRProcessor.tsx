'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Tone from 'tone';

// Define the shape options with their SVG paths
const SHAPES = {
  circle: { 
    shape: 'circle',
    element: (props: any) => <circle cx="50%" cy="50%" r="40%" {...props} />
  },
  square: { 
    shape: 'rect',
    element: (props: any) => <rect x="10%" y="10%" width="80%" height="80%" {...props} />
  },
  triangle: { 
    shape: 'polygon',
    element: (props: any) => <polygon points="50,10 90,90 10,90" {...props} />
  },
  star: { 
    shape: 'polygon',
    element: (props: any) => (
      <polygon points="50,10 61,35 90,35 65,55 75,80 50,65 25,80 35,55 10,35 39,35" {...props} />
    )
  }
};

// Available colors with nice names
const COLORS = [
  { name: 'Red', value: '#ff0000' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Purple', value: '#800080' },
  { name: 'Orange', value: '#ffa500' },
  { name: 'Pink', value: '#ffc0cb' },
  { name: 'Cyan', value: '#00ffff' },
];

// Sound player setup
const setupSound = () => {
  const synth = new Tone.Synth().toDestination();
  const playTone = (note: string) => {
    synth.triggerAttackRelease(note, '0.1');
  };
  return { playTone };
};

export function EMDRProcessor() {
  // State for settings
  const [isActive, setIsActive] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per full cycle
  const [amplitude, setAmplitude] = useState(80); // % of screen width
  const [selectedShape, setSelectedShape] = useState('circle');
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [size, setSize] = useState(50); // px
  
  // Sound effects
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sound, setSound] = useState<{ playTone: (note: string) => void } | null>(null);
  
  // Initialize sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSound(setupSound());
    }
  }, []);

  // Play sound on target reaching edges
  useEffect(() => {
    if (soundEnabled && sound && isActive) {
      const interval = setInterval(() => {
        sound.playTone('C5');
      }, speed);
      return () => clearInterval(interval);
    }
  }, [soundEnabled, sound, isActive, speed]);

  // Handle start/stop
  const toggleActive = async () => {
    if (!isActive && soundEnabled) {
      // Initialize audio context on user interaction
      await Tone.start();
      sound?.playTone('G4'); // Success tone
    }
    setIsActive(!isActive);
  };

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6">
      {/* Target display area */}
      <div 
        className="relative w-full h-40 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
        role="region"
        aria-label="EMDR visual target area"
      >
        <motion.div
          animate={{
            x: isActive ? [`-${amplitude}%`, `${amplitude}%`] : 0,
          }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: speed / 1000,
            ease: "easeInOut"
          }}
          className="absolute"
          style={{ 
            width: size, 
            height: size,
          }}
          aria-live="polite"
          aria-label={isActive ? "Moving target" : "Stationary target"}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            {SHAPES[selectedShape as keyof typeof SHAPES].element({ 
              fill: selectedColor,
              stroke: "white",
              strokeWidth: "2",
            })}
          </svg>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
        {/* Start/Stop Button */}
        <button 
          onClick={toggleActive}
          className={`col-span-full py-3 rounded-lg text-white font-bold ${
            isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
          aria-pressed={isActive}
        >
          {isActive ? 'Stop' : 'Start'} Processing
        </button>
        
        {/* Speed Control */}
        <div className="flex flex-col">
          <label htmlFor="speed" className="text-white mb-1">
            Speed: {(1000 / speed).toFixed(1)} Hz
          </label>
          <input
            id="speed"
            type="range"
            min={500}
            max={3000}
            step={100}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full"
            aria-valuemin={500}
            aria-valuemax={3000}
            aria-valuenow={speed}
          />
        </div>
        
        {/* Amplitude Control */}
        <div className="flex flex-col">
          <label htmlFor="amplitude" className="text-white mb-1">
            Amplitude: {amplitude}%
          </label>
          <input
            id="amplitude"
            type="range"
            min={20}
            max={95}
            step={5}
            value={amplitude}
            onChange={(e) => setAmplitude(Number(e.target.value))}
            className="w-full"
            aria-valuemin={20}
            aria-valuemax={95}
            aria-valuenow={amplitude}
          />
        </div>
        
        {/* Size Control */}
        <div className="flex flex-col">
          <label htmlFor="size" className="text-white mb-1">
            Size: {size}px
          </label>
          <input
            id="size"
            type="range"
            min={20}
            max={100}
            step={5}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full"
            aria-valuemin={20}
            aria-valuemax={100}
            aria-valuenow={size}
          />
        </div>
        
        {/* Sound Toggle */}
        <div className="flex items-center">
          <input
            id="sound"
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="mr-2 h-4 w-4"
            aria-checked={soundEnabled}
          />
          <label htmlFor="sound" className="text-white">
            Enable sound
          </label>
        </div>
        
        {/* Shape Selector */}
        <div className="col-span-full mt-2">
          <p className="text-white mb-2">Select Shape:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(SHAPES).map((shape) => (
              <button
                key={shape}
                onClick={() => setSelectedShape(shape)}
                className={`p-2 rounded-md ${
                  selectedShape === shape ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                aria-pressed={selectedShape === shape}
                aria-label={`${shape} shape`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 100 100">
                    {SHAPES[shape as keyof typeof SHAPES].element({ 
                      fill: selectedColor,
                      stroke: "white",
                      strokeWidth: "2",
                    })}
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Color Selector */}
        <div className="col-span-full">
          <p className="text-white mb-2">Select Color:</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`p-2 rounded-md ${
                  selectedColor === color.value ? 'ring-2 ring-white' : ''
                }`}
                style={{ backgroundColor: color.value }}
                aria-pressed={selectedColor === color.value}
                aria-label={`${color.name} color`}
                title={color.name}
              >
                <span className="sr-only">{color.name}</span>
                <div className="w-6 h-6"></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 