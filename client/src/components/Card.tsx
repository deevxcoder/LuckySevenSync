import { useState, useEffect } from 'react';
import { useAudio } from '../lib/stores/useAudio';

interface CardProps {
  number: number;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  color: 'red' | 'black';
  revealed: boolean;
  large?: boolean;
}

export default function Card({ number, suit, color, revealed, large = false }: CardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { playCardReveal } = useAudio();

  useEffect(() => {
    if (revealed) {
      // Play card reveal sound
      playCardReveal();
      // Small delay for dramatic effect
      const timer = setTimeout(() => setIsFlipped(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
    }
  }, [revealed, playCardReveal]);

  const sizeClasses = large 
    ? 'w-48 h-72' 
    : 'w-24 h-36';

  const getSuitSymbol = () => {
    switch (suit) {
      case 'spades': return '♠';
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      default: return '♠';
    }
  };

  const getDisplayNumber = () => {
    if (number === 1) return 'A';
    if (number === 11) return 'J';
    if (number === 12) return 'Q';
    if (number === 13) return 'K';
    return number.toString();
  };

  const textColor = color === 'red' ? 'text-red-600' : 'text-black';

  // Generate center suit symbols based on card number
  const getCenterSuits = () => {
    const suit = getSuitSymbol();
    const centerSuits = [];
    
    if (number === 1) {
      // Ace - single large suit in center
      return (
        <div className={`absolute inset-0 flex items-center justify-center ${textColor}`}>
          <div className={large ? 'text-6xl' : 'text-3xl'}>{suit}</div>
        </div>
      );
    }
    
    if (number >= 2 && number <= 10) {
      // Number cards - arrange suits in traditional pattern
      const positions = getCardPositions(number);
      return (
        <div className="absolute inset-0 p-3">
          {positions.map((pos, index) => (
            <div
              key={index}
              className={`absolute ${textColor} ${large ? 'text-3xl' : 'text-lg'}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) ${pos.rotate ? 'rotate(180deg)' : ''}`
              }}
            >
              {suit}
            </div>
          ))}
        </div>
      );
    }
    
    // Face cards - simplified representation
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${textColor}`}>
        <div className={`font-bold ${large ? 'text-6xl' : 'text-3xl'}`}>
          {getDisplayNumber()}
        </div>
      </div>
    );
  };

  // Traditional playing card suit positions
  const getCardPositions = (num: number) => {
    const positions = [];
    
    switch(num) {
      case 2:
        positions.push({ x: 50, y: 25, rotate: false });
        positions.push({ x: 50, y: 75, rotate: true });
        break;
      case 3:
        positions.push({ x: 50, y: 20, rotate: false });
        positions.push({ x: 50, y: 50, rotate: false });
        positions.push({ x: 50, y: 80, rotate: true });
        break;
      case 4:
        positions.push({ x: 35, y: 25, rotate: false });
        positions.push({ x: 65, y: 25, rotate: false });
        positions.push({ x: 35, y: 75, rotate: true });
        positions.push({ x: 65, y: 75, rotate: true });
        break;
      case 5:
        positions.push({ x: 35, y: 25, rotate: false });
        positions.push({ x: 65, y: 25, rotate: false });
        positions.push({ x: 50, y: 50, rotate: false });
        positions.push({ x: 35, y: 75, rotate: true });
        positions.push({ x: 65, y: 75, rotate: true });
        break;
      case 6:
        positions.push({ x: 35, y: 25, rotate: false });
        positions.push({ x: 65, y: 25, rotate: false });
        positions.push({ x: 35, y: 50, rotate: false });
        positions.push({ x: 65, y: 50, rotate: false });
        positions.push({ x: 35, y: 75, rotate: true });
        positions.push({ x: 65, y: 75, rotate: true });
        break;
      case 7:
        positions.push({ x: 35, y: 22, rotate: false });
        positions.push({ x: 65, y: 22, rotate: false });
        positions.push({ x: 50, y: 37, rotate: false });
        positions.push({ x: 35, y: 52, rotate: false });
        positions.push({ x: 65, y: 52, rotate: false });
        positions.push({ x: 35, y: 78, rotate: true });
        positions.push({ x: 65, y: 78, rotate: true });
        break;
      case 8:
        positions.push({ x: 35, y: 20, rotate: false });
        positions.push({ x: 65, y: 20, rotate: false });
        positions.push({ x: 35, y: 40, rotate: false });
        positions.push({ x: 65, y: 40, rotate: false });
        positions.push({ x: 35, y: 60, rotate: true });
        positions.push({ x: 65, y: 60, rotate: true });
        positions.push({ x: 35, y: 80, rotate: true });
        positions.push({ x: 65, y: 80, rotate: true });
        break;
      case 9:
        positions.push({ x: 35, y: 18, rotate: false });
        positions.push({ x: 65, y: 18, rotate: false });
        positions.push({ x: 35, y: 35, rotate: false });
        positions.push({ x: 65, y: 35, rotate: false });
        positions.push({ x: 50, y: 50, rotate: false });
        positions.push({ x: 35, y: 65, rotate: true });
        positions.push({ x: 65, y: 65, rotate: true });
        positions.push({ x: 35, y: 82, rotate: true });
        positions.push({ x: 65, y: 82, rotate: true });
        break;
      case 10:
        positions.push({ x: 35, y: 16, rotate: false });
        positions.push({ x: 65, y: 16, rotate: false });
        positions.push({ x: 50, y: 28, rotate: false });
        positions.push({ x: 35, y: 40, rotate: false });
        positions.push({ x: 65, y: 40, rotate: false });
        positions.push({ x: 35, y: 60, rotate: true });
        positions.push({ x: 65, y: 60, rotate: true });
        positions.push({ x: 50, y: 72, rotate: true });
        positions.push({ x: 35, y: 84, rotate: true });
        positions.push({ x: 65, y: 84, rotate: true });
        break;
    }
    
    return positions;
  };

  return (
    <div className={`${sizeClasses} relative perspective-1000`}>
      <div className={`card-flip w-full h-full relative ${isFlipped ? 'flipped' : ''}`}>
        {/* Card Back */}
        <div className="card-front absolute inset-0 bg-black border-2 border-yellow-600 rounded-xl flex items-center justify-center">
          <div className="text-yellow-600 font-bold text-lg">KINGGAMES</div>
        </div>
        
        {/* Card Front */}
        <div className={`card-back absolute inset-0 bg-white border-2 border-black rounded-xl ${
          revealed ? 'shadow-lg shadow-yellow-400/50' : ''
        }`}>
          {/* Top left corner */}
          <div className={`absolute top-2 left-2 ${textColor} font-bold leading-none`}>
            <div className={large ? 'text-2xl' : 'text-lg'}>{getDisplayNumber()}</div>
            <div className={large ? 'text-xl' : 'text-base'}>{getSuitSymbol()}</div>
          </div>
          
          {/* Center suits */}
          {getCenterSuits()}
          
          {/* Bottom right corner (rotated) */}
          <div className={`absolute bottom-2 right-2 ${textColor} font-bold leading-none transform rotate-180`}>
            <div className={large ? 'text-2xl' : 'text-lg'}>{getDisplayNumber()}</div>
            <div className={large ? 'text-xl' : 'text-base'}>{getSuitSymbol()}</div>
          </div>
        </div>
      </div>
      
      {/* Reveal animation overlay */}
      {revealed && isFlipped && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-yellow-400 opacity-20 rounded-xl animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
