import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { HeaderWallet } from '../HeaderWallet';
import { useAuthStore } from '../../lib/stores/useAuthStore';
import { socket } from '../../lib/socket';

interface UserStats {
  username: string;
  gamesPlayed: number;
  totalWins: number;
  totalLosses: number;
}

interface UserDashboardProps {
  onNavigateToGame?: () => void;
}

export default function UserDashboard({ onNavigateToGame }: UserDashboardProps) {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/users/${user.id}/stats`);
        if (!response.ok) {
          throw new Error('Failed to fetch user stats');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

  const handleLogout = () => {
    logout();
  };

  const winRate = stats && stats.gamesPlayed > 0 
    ? ((stats.totalWins / stats.gamesPlayed) * 100).toFixed(1)
    : '0.0';

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoading ? (
            <div className="col-span-full text-center text-white py-8">
              Loading stats...
            </div>
          ) : error ? (
            <div className="col-span-full text-center text-red-300 py-8">
              {error}
            </div>
          ) : (
            <>
              <Card className="bg-casino-black border-casino-gold">
                <CardHeader className="pb-2">
                  <CardTitle className="text-casino-gold text-lg">Games Played</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {stats?.gamesPlayed || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-casino-black border-casino-gold">
                <CardHeader className="pb-2">
                  <CardTitle className="text-casino-gold text-lg">Total Wins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {stats?.totalWins || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-casino-black border-casino-gold">
                <CardHeader className="pb-2">
                  <CardTitle className="text-casino-gold text-lg">Total Losses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    {stats?.totalLosses || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-casino-black border-casino-gold">
                <CardHeader className="pb-2">
                  <CardTitle className="text-casino-gold text-lg">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-casino-gold">
                    {winRate}%
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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