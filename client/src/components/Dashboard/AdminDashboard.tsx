import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
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
  currentCard?: {
    number: number;
    suit: string;
    color: 'red' | 'black';
    revealed: boolean;
  };
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
  
  // Confirmation Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState<string | null>(null);

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
    fetchCurrentRound(true); // Initial load with loading state
    const interval = setInterval(() => fetchCurrentRound(false), 5000); // Poll every 5 seconds without loading state
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchCurrentRound = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoadingRound(true);
      }
      const response = await fetch('/api/admin/current-round');
      if (response.ok) {
        const data = await response.json();
        setCurrentRound(data);
      }
    } catch (err) {
      console.error('Failed to fetch current round data:', err);
    } finally {
      if (isInitialLoad) {
        setIsLoadingRound(false);
      }
    }
  };

  const handleOverrideResult = (selectedResult: string) => {
    if (!currentRound || !selectedResult) return;
    
    // Show confirmation dialog
    setPendingOverride(selectedResult);
    setShowConfirmDialog(true);
  };

  const confirmOverride = async () => {
    if (!currentRound || !pendingOverride) return;

    setShowConfirmDialog(false);

    try {
      const response = await fetch('/api/admin/override-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: currentRound.gameId,
          overrideResult: pendingOverride,
        }),
      });

      if (response.ok) {
        setShowSuccessMessage(`Round result overridden to: ${pendingOverride}`);
        setOverrideResult('');
        fetchCurrentRound(); // Refresh data
        // Auto-hide success message after 3 seconds
        setTimeout(() => setShowSuccessMessage(null), 3000);
      } else {
        setShowErrorMessage('Failed to override result');
        setTimeout(() => setShowErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error overriding result:', err);
      setShowErrorMessage('Error overriding result');
      setTimeout(() => setShowErrorMessage(null), 3000);
    } finally {
      setPendingOverride(null);
    }
  };

  const cancelOverride = () => {
    setShowConfirmDialog(false);
    setPendingOverride(null);
  };

  const handleLogout = () => {
    logout();
  };

  const handleViewUserStats = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`);
      if (response.ok) {
        const data = await response.json();
        alert(`User Stats for ${data.user.username}:\n\nChips: ${data.stats.chips}\nTotal Wins: ${data.stats.totalWins}\nTotal Losses: ${data.stats.totalLosses}\nWin Rate: ${data.stats.winRate}%\nTotal Bets Amount: ${data.stats.totalBetsAmount}`);
      } else {
        setShowErrorMessage('Failed to fetch user stats');
        setTimeout(() => setShowErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setShowErrorMessage('Error fetching user stats');
      setTimeout(() => setShowErrorMessage(null), 3000);
    }
  };

  const handleToggleUserStatus = async (userId: number, newStatus: string) => {
    const action = newStatus === 'blocked' ? 'block' : 'unblock';
    const confirmMessage = `Are you sure you want to ${action} this user?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const result = await response.json();
        setShowSuccessMessage(`User ${result.user.username} has been ${action}ed successfully`);
        setTimeout(() => setShowSuccessMessage(null), 3000);
        
        // Refresh users list
        const usersResponse = await fetch('/api/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      } else {
        const error = await response.json();
        setShowErrorMessage(error.message || `Failed to ${action} user`);
        setTimeout(() => setShowErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
      setShowErrorMessage(`Error ${action}ing user`);
      setTimeout(() => setShowErrorMessage(null), 3000);
    }
  };

  const handleManageFunds = async (userId: number, username: string) => {
    const amountStr = prompt(`Enter amount to add/remove from ${username}'s account:\n(Use negative numbers to remove chips)\nExample: 500 to add, -200 to remove`);
    
    if (amountStr === null) {
      return; // User cancelled
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid number (not zero)');
      return;
    }

    const reason = prompt('Enter reason for fund adjustment (optional):') || 'Admin adjustment';
    
    const action = amount > 0 ? 'add' : 'remove';
    const confirmMessage = `Confirm ${action} ${Math.abs(amount)} chips ${amount > 0 ? 'to' : 'from'} ${username}?\nReason: ${reason}`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, reason }),
      });

      if (response.ok) {
        const result = await response.json();
        setShowSuccessMessage(`${result.message}. ${username} now has ${result.player.chips} chips.`);
        setTimeout(() => setShowSuccessMessage(null), 3000);
        
        // Refresh users list
        const usersResponse = await fetch('/api/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      } else {
        const error = await response.json();
        setShowErrorMessage(error.message || 'Failed to update funds');
        setTimeout(() => setShowErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error updating funds:', err);
      setShowErrorMessage('Error updating user funds');
      setTimeout(() => setShowErrorMessage(null), 3000);
    }
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
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-casino-red border-casino-gold text-white hover:bg-red-700"
          >
            Sign Out
          </Button>
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
                      <TableHead className="text-casino-gold">Status</TableHead>
                      <TableHead className="text-casino-gold">Online</TableHead>
                      <TableHead className="text-casino-gold">Chips</TableHead>
                      <TableHead className="text-casino-gold">Stats</TableHead>
                      <TableHead className="text-casino-gold">Last Activity</TableHead>
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
                        <TableCell className="text-white font-semibold">
                          {user.username}
                          {user.role === 'admin' && (
                            <span className="ml-2 text-xs bg-casino-gold text-casino-black px-2 py-1 rounded">
                              ADMIN
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : user.status === 'blocked'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.status?.toUpperCase() || 'ACTIVE'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${
                              user.isOnline ? 'bg-green-400' : 'bg-gray-400'
                            }`}></span>
                            <span className="text-white text-sm">
                              {user.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          💰 {user.chips || 0}
                        </TableCell>
                        <TableCell className="text-white text-sm">
                          <div>W: {user.totalWins || 0} / L: {user.totalLosses || 0}</div>
                          <div className="text-gray-400">Rate: {user.winRate || 0}%</div>
                        </TableCell>
                        <TableCell className="text-white text-sm">
                          {user.lastActivity 
                            ? new Date(user.lastActivity).toLocaleString()
                            : user.lastLogin
                            ? new Date(user.lastLogin).toLocaleString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
                              onClick={() => handleViewUserStats(user.id)}
                            >
                              📊
                            </Button>
                            {user.role !== 'admin' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline" 
                                  className={`${user.status === 'blocked' 
                                    ? 'border-green-500 text-green-400 hover:bg-green-500' 
                                    : 'border-red-500 text-red-400 hover:bg-red-500'} hover:text-white`}
                                  onClick={() => handleToggleUserStatus(user.id, user.status === 'blocked' ? 'active' : 'blocked')}
                                >
                                  {user.status === 'blocked' ? '✅' : '🚫'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                                  onClick={() => handleManageFunds(user.id, user.username)}
                                >
                                  💰
                                </Button>
                              </>
                            )}
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
            <CardTitle className="text-casino-gold text-xl">🎯 Lucky 7 Results Control</CardTitle>
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

                {/* Current System Results */}
                <div className="border-t border-casino-gold pt-6 mb-6">
                  <h4 className="text-casino-gold font-semibold mb-3">🎲 Current System Results (Natural):</h4>
                  <div className="bg-blue-900/20 border border-blue-500 p-4 rounded">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-blue-300 font-semibold">Natural Random Generation</div>
                      <div className="text-blue-200 text-sm">
                        Status: {currentRound.status === 'countdown' ? 'Card Generated - Ready for Reveal' : 'Pending Generation'}
                      </div>
                    </div>
                    
                    {/* Current Card Display */}
                    {currentRound.currentCard && (
                      <div className="mb-4 p-3 bg-casino-green rounded border border-blue-400">
                        <div className="text-center">
                          <div className="text-blue-200 text-sm mb-2">🎴 Current Generated Card:</div>
                          <div className={`text-3xl font-bold ${currentRound.currentCard.color === 'red' ? 'text-red-400' : 'text-gray-300'}`}>
                            {currentRound.currentCard.number} of {currentRound.currentCard.suit.charAt(0).toUpperCase() + currentRound.currentCard.suit.slice(1)}
                          </div>
                          <div className={`text-lg font-semibold mt-1 ${currentRound.currentCard.color === 'red' ? 'text-red-300' : 'text-gray-400'}`}>
                            {currentRound.currentCard.color.toUpperCase()}
                          </div>
                          <div className="text-blue-100 text-xs mt-2">
                            {currentRound.currentCard.revealed ? 'Card has been revealed to players' : 'Card is hidden from players until countdown ends'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Override Controls */}
                <div className="border-t border-casino-gold pt-4">
                  <h4 className="text-casino-gold font-semibold mb-3">⚠️ Admin Override Results:</h4>
                  
                  {/* Countdown Timer for Override Window */}
                  {currentRound.status === 'countdown' && currentRound.timeRemaining && (
                    <div className="bg-yellow-900/20 border border-yellow-500 p-4 rounded mb-4">
                      <div className="flex items-center justify-center">
                        <div className="text-yellow-300 font-bold text-lg">
                          ⏰ Override Window: {Math.max(0, Math.ceil(currentRound.timeRemaining))}s remaining
                        </div>
                      </div>
                      <p className="text-yellow-200 text-sm text-center mt-2">
                        You can override the result during the countdown phase
                      </p>
                    </div>
                  )}
                  
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

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-casino-black border-casino-gold">
            <DialogHeader>
              <DialogTitle className="text-casino-gold">⚠️ Confirm Result Override</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-white text-center">
                Are you sure you want to override the game result to:
              </p>
              <div className="text-center mt-4">
                <span className="inline-block bg-casino-green px-4 py-2 rounded border border-casino-gold text-casino-gold font-bold text-lg">
                  {pendingOverride?.toUpperCase()}
                </span>
              </div>
              <p className="text-red-300 text-sm text-center mt-4">
                This action will permanently affect the game outcome and cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={cancelOverride}
                className="border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmOverride}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Override Result
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 bg-green-600 border border-green-500 text-white px-6 py-3 rounded shadow-lg z-50">
            <div className="flex items-center">
              <span className="mr-2">✅</span>
              {showSuccessMessage}
            </div>
          </div>
        )}

        {/* Error Message */}
        {showErrorMessage && (
          <div className="fixed top-4 right-4 bg-red-600 border border-red-500 text-white px-6 py-3 rounded shadow-lg z-50">
            <div className="flex items-center">
              <span className="mr-2">❌</span>
              {showErrorMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}