import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { HeaderWallet } from '../HeaderWallet';
import { useAuthStore } from '../../lib/stores/useAuthStore';
import { socket } from '../../lib/socket';


interface UserDashboardProps {
  onNavigateToGame?: () => void;
}

export default function UserDashboard({ onNavigateToGame }: UserDashboardProps) {
  const { user, logout } = useAuthStore();
  const [socketId, setSocketId] = useState<string>('');

  useEffect(() => {
    // Check if already connected
    if (socket.connected && socket.id) {
      setSocketId(socket.id);
    }
    
    function onConnect() {
      setSocketId(socket.id || '');
    }

    function onDisconnect() {
      setSocketId('');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);


  const handleLogout = () => {
    logout();
  };


  return (
    <div className="min-h-screen bg-casino-green relative">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-casino-black/80 border-b border-casino-gold">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center gap-4">
            <h2 className="text-casino-gold font-bold text-lg">🎰 Lucky 7</h2>
            <span className="text-white">Welcome, {user?.username}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <HeaderWallet socketId={socketId} />
            <Button
              onClick={onNavigateToGame}
              variant="outline"
              size="sm"
              className="bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
            >
              🎮 Play Game
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="bg-transparent border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content with top padding for navigation */}
      <div className="pt-16 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Dashboard Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-casino-gold">
              Your Dashboard
            </h1>
            <p className="text-white mt-1">Track your Lucky 7 performance</p>
          </div>


          {/* Game Actions */}
          <Card className="bg-casino-black border-casino-gold">
            <CardHeader>
              <CardTitle className="text-casino-gold text-xl">Ready to Play?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-white">
                Join a Lucky 7 game and test your luck!
              </p>
              <div className="flex gap-4">
                <Button 
                  className="bg-casino-red hover:bg-red-700 text-white font-bold py-3 px-6 glow-red"
                  onClick={onNavigateToGame}
                >
                  🎰 Join Game
                </Button>
                <Button 
                  variant="outline"
                  className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
                >
                  📊 View Game History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}