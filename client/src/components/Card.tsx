import { useState, useEffect } from 'react';

interface CardProps {
  number: number;
  color: 'red' | 'black';
  revealed: boolean;
  large?: boolean;
}

export default function Card({ number, color, revealed, large = false }: CardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (revealed) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => setIsFlipped(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
    }
  }, [revealed]);

  const sizeClasses = large 
    ? 'w-48 h-72 text-6xl' 
    : 'w-24 h-36 text-3xl';

  const getSuitSymbol = () => {
    // Return appropriate suit symbols based on color and number
    if (color === 'red') {
      return number <= 7 ? '♥' : '♦';
    } else {
      return number <= 7 ? '♠' : '♣';
    }
  };

  return (
    <div className={`${sizeClasses} relative perspective-1000`}>
      <div className={`card-flip w-full h-full relative ${isFlipped ? 'flipped' : ''}`}>
        {/* Card Back */}
        <div className="card-front absolute inset-0 bg-casino-red border-casino-gold border-2 rounded-lg flex items-center justify-center glow-red">
          <div className="text-casino-gold text-4xl">🎴</div>
        </div>
        
        {/* Card Front */}
        <div className={`card-back absolute inset-0 bg-white border-casino-gold border-2 rounded-lg flex flex-col justify-between p-2 ${
          revealed ? 'glow-gold' : ''
        }`}>
          {/* Top number and suit */}
          <div className={`text-left ${color === 'red' ? 'text-casino-red' : 'text-casino-black'}`}>
            <div className="font-bold text-lg leading-none">{number}</div>
            <div className="text-sm leading-none">{getSuitSymbol()}</div>
          </div>
          
          {/* Center number */}
          <div className={`text-center font-bold ${
            large ? 'text-8xl' : 'text-4xl'
          } ${color === 'red' ? 'text-casino-red' : 'text-casino-black'}`}>
            {number}
          </div>
          
          {/* Bottom number and suit (upside down) */}
          <div className={`text-right transform rotate-180 ${color === 'red' ? 'text-casino-red' : 'text-casino-black'}`}>
            <div className="font-bold text-lg leading-none">{number}</div>
            <div className="text-sm leading-none">{getSuitSymbol()}</div>
          </div>
        </div>
      </div>
      
      {/* Reveal animation overlay */}
      {revealed && isFlipped && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-casino-gold opacity-30 rounded-lg animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
