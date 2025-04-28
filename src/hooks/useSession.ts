import { useState, useEffect, useRef, useCallback } from 'react';

// Placeholder state and functions based on manifest §3
type SessionStatus = 'idle' | 'running' | 'paused';

interface SessionState {
  status: SessionStatus;
  remainingTimeSec: number;
  // Add more state later (e.g., current set count, target position)
}

// Placeholder hook signature - will need config/engine hooks later
export const useSession = (initialDurationSec: number = 120) => {
  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'idle',
    remainingTimeSec: initialDurationSec,
  });
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetPositionRef = useRef<number>(0); // Example: 0=center, -1=left, 1=right

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startSession = () => {
    if (sessionState.status === 'running') return;

    console.log('Starting session...');
    setSessionState((prev) => ({
      ...prev,
      status: 'running',
      // Reset time if starting from idle/finished
      remainingTimeSec: prev.status === 'idle' ? initialDurationSec : prev.remainingTimeSec,
    }));

    stopTimer(); // Ensure no duplicate timers
    timerIntervalRef.current = setInterval(() => {
      setSessionState((prev) => {
        const newTime = prev.remainingTimeSec - 1;
        if (newTime <= 0) {
          stopTimer();
          console.log('Session finished.');
          return { ...prev, status: 'idle', remainingTimeSec: 0 };
        }

        // Placeholder: Update target position based on time/speed
        // This logic will become much more complex
        targetPositionRef.current = Math.sin(Date.now() / 1000); // Simple oscillation example

        return { ...prev, remainingTimeSec: newTime };
      });
    }, 1000);
  };

  const pauseSession = () => {
    if (sessionState.status !== 'running') return;
    console.log('Pausing session...');
    stopTimer();
    setSessionState((prev) => ({ ...prev, status: 'paused' }));
  };

  const resetSession = () => {
    console.log('Resetting session...');
    stopTimer();
    setSessionState({
      status: 'idle',
      remainingTimeSec: initialDurationSec,
    });
    targetPositionRef.current = 0; // Reset target position
  };

  // Effect to handle cleanup
  useEffect(() => {
    return () => stopTimer(); // Cleanup timer on unmount
  }, [stopTimer]);

  // Effect to update initial duration if it changes externally
   useEffect(() => {
    if (sessionState.status === 'idle') {
      setSessionState(prev => ({ ...prev, remainingTimeSec: initialDurationSec }));
    }
  }, [initialDurationSec, sessionState.status]);


  return {
    sessionState,
    targetPosition: targetPositionRef.current, // Expose target position (will update)
    startSession,
    pauseSession,
    resetSession,
  };
};
