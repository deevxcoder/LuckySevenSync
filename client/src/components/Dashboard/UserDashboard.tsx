import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuthStore } from '../../lib/stores/useAuthStore';

interface UserStats {
  username: string;
  gamesPlayed: number;
  totalWins: number;
  totalLosses: number;
}

export default function UserDashboard() {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-casino-green p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-casino-gold">
              Welcome, {user?.username}!
            </h1>
            <p className="text-white mt-1">Your Lucky 7 Dashboard</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-casino-red border-casino-gold text-white hover:bg-red-700"
          >
            Sign Out
          </Button>
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
                onClick={() => window.location.reload()} // Simple way to go back to game
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
  );
}