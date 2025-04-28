import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
  isRunning?: boolean;
  reset?: boolean;
}

const SessionTimer: React.FC<SessionTimerProps> = ({ 
  isRunning = false,
  reset = false
}) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (reset) {
      setSeconds(0);
    }
  }, [reset]);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      role="timer" 
      aria-label="Session duration"
      className="text-2xl font-mono"
    >
      {formatTime(seconds)}
    </div>
  );
};

export default SessionTimer; 