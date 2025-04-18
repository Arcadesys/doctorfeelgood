import React, { useState, useEffect, useRef } from 'react';
import { playGuideTone } from '../utils/soundUtils';

interface SessionTimerProps {
  isActive: boolean;
  onTimerComplete?: () => void;
  defaultDuration?: number; // in minutes
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const SessionTimer: React.FC<SessionTimerProps> = ({
  isActive,
  onTimerComplete,
  defaultDuration = 5,
}) => {
  const [duration, setDuration] = useState(defaultDuration);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset timer when duration changes
  useEffect(() => {
    setTimeLeft(duration * 60);
  }, [duration]);
  
  // Handle starting/stopping timer based on active state
  useEffect(() => {
    if (isActive && !isRunning && timeLeft > 0) {
      setIsRunning(true);
    } else if (!isActive && isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isActive, isRunning, timeLeft]);
  
  // Timer countdown logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            
            // Play completion sound and notify parent
            playGuideTone('success', { duration: 0.5 });
            if (onTimerComplete) onTimerComplete();
            
            return 0;
          }
          
          // Play a tick sound for last 5 seconds
          if (prev <= 6) {
            playGuideTone('info', { duration: 0.1, volume: 0.3 });
          }
          
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isRunning, onTimerComplete]);
  
  // Determine the status text color
  const getStatusColor = () => {
    if (isRunning) return 'text-green-500 dark:text-green-400';
    if (timeLeft === 0) return 'text-red-500 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="text-5xl font-mono font-bold mb-2" aria-live="polite" aria-atomic="true">
        {formatTime(timeLeft)}
      </div>
      
      <div className={`text-sm font-medium mb-4 ${getStatusColor()}`}>
        {isRunning ? 'Session in progress' : timeLeft === 0 ? 'Session complete' : 'Ready to start'}
      </div>
      
      {!isActive && timeLeft > 0 && timeLeft < duration * 60 && (
        <button
          onClick={() => setTimeLeft(duration * 60)}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Reset timer"
        >
          Reset Timer
        </button>
      )}
    </div>
  );
};

export default SessionTimer; 