interface CardBackProps {
  large?: boolean;
}

export default function CardBack({ large = false }: CardBackProps) {
  const cardSize = large ? 'w-48 h-72' : 'w-32 h-48';
  
  return (
    <div className={`${cardSize} relative rounded-lg bg-gray-900 border-2 border-casino-gold shadow-2xl flex flex-col justify-center items-center overflow-hidden`}>
      {/* Ornate border */}
      <div className="absolute inset-2 border border-casino-gold rounded-md">
        {/* Corner decorations */}
        <div className="absolute top-1 left-1 text-casino-gold text-xs">
          ✦
        </div>
        <div className="absolute top-1 right-1 text-casino-gold text-xs">
          ✦
        </div>
        <div className="absolute bottom-1 left-1 text-casino-gold text-xs">
          ✦
        </div>
        <div className="absolute bottom-1 right-1 text-casino-gold text-xs">
          ✦
        </div>
      </div>
      
      {/* Center branding */}
      <div className="text-casino-gold font-bold text-center tracking-wider">
        <div className={`${large ? 'text-2xl' : 'text-lg'} mb-1`}>
          KING
        </div>
        <div className={`${large ? 'text-2xl' : 'text-lg'}`}>
          GAMES
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-4 left-4 text-casino-gold text-lg opacity-60">
        ❦
      </div>
      <div className="absolute top-4 right-4 text-casino-gold text-lg opacity-60 transform rotate-90">
        ❦
      </div>
      <div className="absolute bottom-4 left-4 text-casino-gold text-lg opacity-60 transform rotate-180">
        ❦
      </div>
      <div className="absolute bottom-4 right-4 text-casino-gold text-lg opacity-60 transform rotate-270">
        ❦
      </div>
    </div>
  );
}