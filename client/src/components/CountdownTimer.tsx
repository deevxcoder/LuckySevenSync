import { useEffect, useRef } from 'react';
import { useAudio } from '../lib/stores/useAudio';

interface CountdownTimerProps {
  time: number;
  isActive: boolean;
}

export default function CountdownTimer({ time, isActive }: CountdownTimerProps) {
  const { playCountdownTick, playHeartbeat } = useAudio();
  const lastPlayedTime = useRef<number>(-1);
  
  // Play dramatic heartbeat for final 5 seconds, regular tick for 6-10 seconds
  useEffect(() => {
    if (isActive && time > 0 && time <= 10 && time !== lastPlayedTime.current) {
      if (time <= 5) {
        // Dramatic heartbeat for final countdown (5, 4, 3, 2, 1)
        playHeartbeat();
        console.log(`💓 Heartbeat at ${time} seconds`);
      } else {
        // Regular tick for 6-10 seconds
        playCountdownTick();
      }
      lastPlayedTime.current = time;
    } else if (!isActive) {
      lastPlayedTime.current = -1; // Reset for next countdown
    }
  }, [time, isActive, playCountdownTick, playHeartbeat]);
  
  const getTimerColor = () => {
    if (time <= 3) return 'text-casino-red';
    if (time <= 5) return 'text-casino-gold';
    return 'text-white';
  };

  const getTimerSize = () => {
    if (time <= 3) return 'text-8xl md:text-9xl';
    return 'text-6xl md:text-8xl';
  };

  if (!isActive) return null;

  return (
    <div className="text-center">
      <div className="mb-4">
        <p className="text-casino-gold text-xl mb-2">Card revealing in...</p>
      </div>
      
      <div className={`font-bold ${getTimerSize()} ${getTimerColor()} ${
        time <= 3 ? 'pulse-gold animate-pulse' : ''
      }`}>
        {time}
      </div>
      
      {time <= 3 && (
        <div className="mt-4 text-casino-red text-lg font-semibold">
          GET READY! 🎯
        </div>
      )}
    </div>
  );
}
