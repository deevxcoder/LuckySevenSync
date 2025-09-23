interface CountdownTimerProps {
  time: number;
  isActive: boolean;
}

export default function CountdownTimer({ time, isActive }: CountdownTimerProps) {
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
