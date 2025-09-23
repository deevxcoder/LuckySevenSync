import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Player } from '../types/game';

interface PlayersListProps {
  players: Player[];
}

export default function PlayersList({ players }: PlayersListProps) {
  return (
    <Card className="bg-casino-black border-casino-gold border-2 h-fit">
      <CardHeader>
        <CardTitle className="text-casino-gold text-xl flex items-center gap-2">
          👥 Players ({players.length}/10)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.map((player, index) => (
            <div 
              key={player.id}
              className="flex items-center gap-3 p-3 bg-casino-green rounded-lg border border-casino-gold"
            >
              <div className="w-8 h-8 bg-casino-gold rounded-full flex items-center justify-center text-casino-black font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">
                  {player.name}
                </div>
                <div className="text-casino-gold text-sm">
                  Online
                </div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 10 - players.length) }).map((_, index) => (
            <div 
              key={`empty-${index}`}
              className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-600 opacity-50"
            >
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 font-bold">
                {players.length + index + 1}
              </div>
              <div className="flex-1">
                <div className="text-gray-400 font-semibold">
                  Waiting for player...
                </div>
              </div>
              <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center text-casino-gold text-sm">
          {players.length < 2 ? 'Need at least 2 players to start' : 'Ready to play!'}
        </div>
      </CardContent>
    </Card>
  );
}
