import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  duration: number;
  onComplete: () => void;
  isDarkMode?: boolean;
}

const SessionTimer: React.FC<SessionTimerProps> = ({ 
  isActive,
  duration,
  onComplete,
  isDarkMode = false
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (isActive && timeRemaining === null) {
      setTimeRemaining(duration);
    }

    if (timeRemaining !== null && timeRemaining > 0 && isActive) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 0) {
            return prev - 1;
          }
          return 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }

    if (timeRemaining === 0) {
      onComplete();
    }
  }, [isActive, duration, timeRemaining, onComplete]);

  useEffect(() => {
    if (!isActive) {
      setTimeRemaining(null);
    }
  }, [isActive]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isActive || timeRemaining === null) {
    return null;
  }

  return (
    <div 
      role="timer" 
      aria-label="Session duration"
      className={`text-2xl font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
    >
      {formatTime(timeRemaining)}
    </div>
  );
};

export default SessionTimer; 