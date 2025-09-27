import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { useAuthStore } from '../../lib/stores/useAuthStore';

interface AdminUser {
  id: number;
  username: string;
}

interface CurrentRoundData {
  gameId: number;
  totalBets: number;
  betsByType: {
    red: number;
    black: number;
    low: number;
    high: number;
    lucky7: number;
  };
  status: 'betting' | 'countdown' | 'revealed' | 'waiting';
  timeRemaining?: number;
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Results Control state
  const [currentRound, setCurrentRound] = useState<CurrentRoundData | null>(null);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const [overrideResult, setOverrideResult] = useState<string>('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
    
    // Fetch current round data initially and set up polling
    fetchCurrentRound();
    const interval = setInterval(fetchCurrentRound, 5000); // Poll every 5 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchCurrentRound = async () => {
    try {
      setIsLoadingRound(true);
      const response = await fetch('/api/admin/current-round');
      if (response.ok) {
        const data = await response.json();
        setCurrentRound(data);
      }
    } catch (err) {
      console.error('Failed to fetch current round data:', err);
    } finally {
      setIsLoadingRound(false);
    }
  };

  const handleOverrideResult = async (selectedResult: string) => {
    if (!currentRound || !selectedResult) return;

    try {
      const response = await fetch('/api/admin/override-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: currentRound.gameId,
          overrideResult: selectedResult,
        }),
      });

      if (response.ok) {
        alert(`Round result overridden to: ${selectedResult}`);
        setOverrideResult('');
        fetchCurrentRound(); // Refresh data
      } else {
        alert('Failed to override result');
      }
    } catch (err) {
      console.error('Error overriding result:', err);
      alert('Error overriding result');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleBackToGame = () => {
    window.location.reload(); // Simple way to go back to game
  };

  return (
    <div className="min-h-screen bg-casino-green p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-casino-gold">
              🛠️ Admin Dashboard
            </h1>
            <p className="text-white mt-1">
              Manage Lucky 7 users and game oversight
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleBackToGame}
              variant="outline"
              className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
            >
              🎰 Back to Game
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-casino-red border-casino-gold text-white hover:bg-red-700"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-casino-black border-casino-gold">
            <CardHeader className="pb-2">
              <CardTitle className="text-casino-gold text-lg">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {users.length}
              </div>
              <p className="text-gray-400 text-sm">Registered players</p>
            </CardContent>
          </Card>

          <Card className="bg-casino-black border-casino-gold">
            <CardHeader className="pb-2">
              <CardTitle className="text-casino-gold text-lg">Active Games</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                1
              </div>
              <p className="text-gray-400 text-sm">Current running games</p>
            </CardContent>
          </Card>

          <Card className="bg-casino-black border-casino-gold">
            <CardHeader className="pb-2">
              <CardTitle className="text-casino-gold text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                ✅ Online
              </div>
              <p className="text-gray-400 text-sm">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Management */}
        <Card className="bg-casino-black border-casino-gold">
          <CardHeader>
            <CardTitle className="text-casino-gold text-xl">👥 User Management</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-white py-8">
                Loading users...
              </div>
            ) : error ? (
              <div className="text-center text-red-300 py-8">
                {error}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No users registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-casino-gold hover:bg-casino-green/20">
                      <TableHead className="text-casino-gold">ID</TableHead>
                      <TableHead className="text-casino-gold">Username</TableHead>
                      <TableHead className="text-casino-gold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow 
                        key={user.id}
                        className="border-casino-gold/50 hover:bg-casino-green/20"
                      >
                        <TableCell className="text-white font-medium">
                          {user.id}
                        </TableCell>
                        <TableCell className="text-white">
                          {user.username}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
                            >
                              View Stats
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                            >
                              Manage
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Management */}
        <Card className="bg-casino-black border-casino-gold mt-6">
          <CardHeader>
            <CardTitle className="text-casino-gold text-xl">🎮 Game Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="bg-casino-red hover:bg-red-700 text-white font-bold py-3 px-4"
              >
                🔄 Restart Games
              </Button>
              <Button 
                variant="outline"
                className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
              >
                📊 Game History
              </Button>
              <Button 
                variant="outline"
                className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
              >
                ⚙️ Game Settings
              </Button>
              <Button 
                variant="outline"
                className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
              >
                📈 Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Control */}
        <Card className="bg-casino-black border-casino-gold mt-6">
          <CardHeader>
            <CardTitle className="text-casino-gold text-xl">🎯 Results Control</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRound ? (
              <div className="text-center text-white py-8">
                Loading current round data...
              </div>
            ) : !currentRound || !currentRound.gameId ? (
              <div className="text-center text-gray-400 py-8">
                No active round found.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Round Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Game ID: {currentRound.gameId}</h3>
                    <Badge 
                      className={`mt-1 ${
                        currentRound.status === 'countdown' ? 'bg-yellow-600' :
                        currentRound.status === 'revealed' ? 'bg-green-600' :
                        currentRound.status === 'betting' ? 'bg-blue-600' :
                        'bg-gray-600'
                      } text-white`}
                    >
                      {currentRound.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-casino-gold font-semibold">Total Bets:</p>
                    <p className="text-white text-xl">{currentRound.totalBets} chips</p>
                  </div>
                </div>

                {/* Betting Breakdown */}
                <div>
                  <h4 className="text-casino-gold font-semibold mb-3">Current Round Betting:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-casino-green p-3 rounded border border-red-500">
                      <div className="text-center">
                        <div className="text-red-400 font-semibold">🔴 Red</div>
                        <div className="text-white text-lg">{currentRound.betsByType.red}</div>
                        <div className="text-gray-400 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-casino-green p-3 rounded border border-gray-500">
                      <div className="text-center">
                        <div className="text-gray-300 font-semibold">⚫ Black</div>
                        <div className="text-white text-lg">{currentRound.betsByType.black}</div>
                        <div className="text-gray-400 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-casino-green p-3 rounded border border-blue-500">
                      <div className="text-center">
                        <div className="text-blue-400 font-semibold">📉 Low (1-6)</div>
                        <div className="text-white text-lg">{currentRound.betsByType.low}</div>
                        <div className="text-gray-400 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-casino-green p-3 rounded border border-orange-500">
                      <div className="text-center">
                        <div className="text-orange-400 font-semibold">📈 High (8-13)</div>
                        <div className="text-white text-lg">{currentRound.betsByType.high}</div>
                        <div className="text-gray-400 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-casino-green p-3 rounded border border-yellow-500">
                      <div className="text-center">
                        <div className="text-yellow-400 font-semibold">🍀 Lucky 7</div>
                        <div className="text-white text-lg">{currentRound.betsByType.lucky7}</div>
                        <div className="text-gray-400 text-sm">chips</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Override Controls */}
                <div className="border-t border-casino-gold pt-4">
                  <h4 className="text-casino-gold font-semibold mb-3">⚠️ Admin Override Results:</h4>
                  <div className="bg-red-900/20 border border-red-500 p-4 rounded mb-4">
                    <p className="text-red-300 text-sm font-medium">
                      ⚠️ WARNING: This will override the natural game result and manually set the outcome.
                      Use only when necessary for game management or correction purposes.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <Button
                      onClick={() => handleOverrideResult('red')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={currentRound.status !== 'countdown'}
                    >
                      Force Red Win
                    </Button>
                    <Button
                      onClick={() => handleOverrideResult('black')}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                      disabled={currentRound.status !== 'countdown'}
                    >
                      Force Black Win
                    </Button>
                    <Button
                      onClick={() => handleOverrideResult('low')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={currentRound.status !== 'countdown'}
                    >
                      Force Low Win
                    </Button>
                    <Button
                      onClick={() => handleOverrideResult('high')}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      disabled={currentRound.status !== 'countdown'}
                    >
                      Force High Win
                    </Button>
                    <Button
                      onClick={() => handleOverrideResult('lucky7')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      disabled={currentRound.status !== 'countdown'}
                    >
                      Force Lucky 7 Win
                    </Button>
                  </div>
                  
                  {currentRound.status !== 'countdown' && (
                    <p className="text-gray-400 text-sm mt-2">
                      * Results can only be overridden during the countdown phase
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}