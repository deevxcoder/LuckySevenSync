import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function GameLobby() {
  useEffect(() => {
    // Auto-join lobby when component mounts
    socket.emit('join-lobby');
  }, []);

  const handleJoinGame = () => {
    socket.emit('join-lobby');
  };

  return (
    <div className="min-h-screen bg-casino-green flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-casino-black border-casino-gold border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-responsive-3xl font-bold text-casino-gold mb-2">
            🎰 Lucky 7 🎰
          </CardTitle>
          <p className="text-white text-lg">
            Synchronized Card Game
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-white">
            <p className="mb-4">
              Experience the thrill of synchronized card reveals!
            </p>
            <ul className="text-sm space-y-2 mb-6">
              <li>🕐 Real-time synchronized countdown</li>
              <li>🃏 Cards numbered 1-13 in red and black</li>
              <li>👥 Play with unlimited players worldwide</li>
              <li>🎯 Everyone sees identical results</li>
              <li>⏰ New game every 60 seconds</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleJoinGame}
            className="w-full bg-casino-red hover:bg-red-700 text-white font-bold py-4 text-lg glow-red"
          >
            🎰 Play Lucky 7 Now!
          </Button>
          
          <div className="text-center text-casino-gold text-sm">
            Join the global Lucky 7 game with players from around the world!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
