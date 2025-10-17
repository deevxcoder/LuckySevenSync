import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { useAuthStore } from '../../lib/stores/useAuthStore';
import { Settings, CheckCircle, Users, BarChart, Ban, Coins, Gamepad2, RefreshCw, History, TrendingUp, Target, Dice1, Clock, AlertTriangle, Check, X, DollarSign, Cog, Info } from 'lucide-react';

interface AdminUser {
  id: number;
  username: string;
  role: string;
  status: 'active' | 'suspended' | 'blocked';
  isOnline: boolean;
  chips: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  lastActivity: string | null;
  lastLogin: string | null;
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

interface CoinTossRoundData {
  gameId: number;
  totalBets: number;
  betsByType: {
    heads: number;
    tails: number;
  };
  status: string;
  timeRemaining: number;
  currentResult: 'heads' | 'tails' | null;
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Results Control state (Lucky 7)
  const [currentRound, setCurrentRound] = useState<CurrentRoundData | null>(null);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const [overrideResult, setOverrideResult] = useState<string>('');
  
  // Coin Toss Results Control state
  const [coinTossRound, setCoinTossRound] = useState<CoinTossRoundData | null>(null);
  const [isLoadingCoinTossRound, setIsLoadingCoinTossRound] = useState(false);
  const [coinTossOverrideResult, setCoinTossOverrideResult] = useState<string>('');
  
  // Confirmation Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<string | null>(null);
  const [showCoinTossConfirmDialog, setShowCoinTossConfirmDialog] = useState(false);
  const [pendingCoinTossOverride, setPendingCoinTossOverride] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState<string | null>(null);
  
  // User Management Dialog state
  const [showUserStatsDialog, setShowUserStatsDialog] = useState(false);
  const [userStatsData, setUserStatsData] = useState<any>(null);
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
  const [statusConfirmData, setStatusConfirmData] = useState<{userId: number; status: string; action: string} | null>(null);
  const [showFundsDialog, setShowFundsDialog] = useState(false);
  const [fundsDialogData, setFundsDialogData] = useState<{userId: number; username: string} | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsReason, setFundsReason] = useState('');
  const [showFundsConfirmDialog, setShowFundsConfirmDialog] = useState(false);
  const [fundsConfirmData, setFundsConfirmData] = useState<{userId: number; username: string; amount: number; reason: string} | null>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

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
    
    // Fetch coin toss round data initially and set up polling
    fetchCoinTossRound(true);
    const coinTossInterval = setInterval(() => fetchCoinTossRound(false), 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(coinTossInterval);
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

  const fetchCoinTossRound = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoadingCoinTossRound(true);
      }
      const response = await fetch('/api/admin/coin-toss/current-round');
      if (response.ok) {
        const data = await response.json();
        setCoinTossRound(data);
      }
    } catch (err) {
      console.error('Failed to fetch coin toss round data:', err);
    } finally {
      if (isInitialLoad) {
        setIsLoadingCoinTossRound(false);
      }
    }
  };

  const handleCoinTossOverrideResult = (selectedResult: string) => {
    if (!coinTossRound || !selectedResult) return;
    
    setPendingCoinTossOverride(selectedResult);
    setShowCoinTossConfirmDialog(true);
  };

  const confirmCoinTossOverride = async () => {
    if (!coinTossRound || !pendingCoinTossOverride) return;

    setShowCoinTossConfirmDialog(false);

    try {
      const response = await fetch('/api/admin/coin-toss/override-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: coinTossRound.gameId,
          overrideResult: pendingCoinTossOverride,
        }),
      });

      if (response.ok) {
        setShowSuccessMessage(`Coin toss result overridden to: ${pendingCoinTossOverride}`);
        setCoinTossOverrideResult('');
        fetchCoinTossRound();
        setTimeout(() => setShowSuccessMessage(null), 3000);
      } else {
        setShowErrorMessage('Failed to override coin toss result');
        setTimeout(() => setShowErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error overriding coin toss result:', err);
      setShowErrorMessage('Error overriding coin toss result');
      setTimeout(() => setShowErrorMessage(null), 3000);
    } finally {
      setPendingCoinTossOverride(null);
    }
  };

  const cancelCoinTossOverride = () => {
    setShowCoinTossConfirmDialog(false);
    setPendingCoinTossOverride(null);
  };

  const handleLogout = () => {
    logout();
  };

  const handleViewUserStats = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setUserStatsData(data);
        setShowUserStatsDialog(true);
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

  const handleToggleUserStatus = (userId: number, newStatus: string) => {
    const action = newStatus === 'blocked' ? 'block' : 'unblock';
    setStatusConfirmData({ userId, status: newStatus, action });
    setShowStatusConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!statusConfirmData) return;
    
    const { userId, status: newStatus, action } = statusConfirmData;
    setShowStatusConfirmDialog(false);

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

  const handleManageFunds = (userId: number, username: string) => {
    setFundsDialogData({ userId, username });
    setFundsAmount('');
    setFundsReason('Admin adjustment');
    setShowFundsDialog(true);
  };

  const submitFundsDialog = () => {
    const amount = parseFloat(fundsAmount);
    if (isNaN(amount) || amount === 0) {
      setAlertMessage('Please enter a valid number (not zero)');
      setShowAlertDialog(true);
      return;
    }

    if (!fundsDialogData) return;
    
    const action = amount > 0 ? 'add' : 'remove';
    setFundsConfirmData({
      userId: fundsDialogData.userId,
      username: fundsDialogData.username,
      amount,
      reason: fundsReason || 'Admin adjustment'
    });
    setShowFundsDialog(false);
    setShowFundsConfirmDialog(true);
  };

  const confirmFundsChange = async () => {
    if (!fundsConfirmData) return;
    
    const { userId, username, amount, reason } = fundsConfirmData;
    setShowFundsConfirmDialog(false);

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
    <div className="min-h-screen bg-neo-bg p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="neo-glass-card p-6 mb-6 flex justify-between items-center" style={{ borderRadius: 0 }}>
          <div>
            <h1 className="text-3xl font-heading font-bold text-neo-accent flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Admin Dashboard
            </h1>
            <p className="text-neo-text-secondary mt-1">
              Manage KingGames users and game oversight
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
          >
            Sign Out
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="neo-glass-card p-6">
            <h3 className="text-neo-accent text-lg font-heading font-semibold mb-2">Total Users</h3>
            <div className="text-3xl font-mono font-bold text-neo-text">
              {users.length}
            </div>
            <p className="text-neo-text-secondary text-sm">Registered players</p>
          </div>

          <div className="neo-glass-card p-6">
            <h3 className="text-neo-accent text-lg font-heading font-semibold mb-2">Active Games</h3>
            <div className="text-3xl font-mono font-bold text-neo-success flex items-center gap-2">
              1 <span className="live-indicator"></span>
            </div>
            <p className="text-neo-text-secondary text-sm">Current running games</p>
          </div>

          <div className="neo-glass-card p-6">
            <h3 className="text-neo-accent text-lg font-heading font-semibold mb-2">System Status</h3>
            <div className="text-3xl font-mono font-bold text-neo-success flex items-center gap-2">
              <CheckCircle className="w-8 h-8" />
              Online
            </div>
            <p className="text-neo-text-secondary text-sm">All systems operational</p>
          </div>
        </div>

        {/* Users Management */}
        <div className="neo-glass-card p-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" />
            User Management
          </h2>
          
          {isLoading ? (
            <div className="text-center text-neo-text py-8">
              Loading users...
            </div>
          ) : error ? (
            <div className="text-center text-neo-danger py-8">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-neo-text-secondary py-8">
              No users registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neo-border hover:bg-white/5">
                    <TableHead className="text-neo-accent font-heading">ID</TableHead>
                    <TableHead className="text-neo-accent font-heading">Username</TableHead>
                    <TableHead className="text-neo-accent font-heading">Status</TableHead>
                    <TableHead className="text-neo-accent font-heading">Online</TableHead>
                    <TableHead className="text-neo-accent font-heading">Chips</TableHead>
                    <TableHead className="text-neo-accent font-heading">Stats</TableHead>
                    <TableHead className="text-neo-accent font-heading">Last Activity</TableHead>
                    <TableHead className="text-neo-accent font-heading">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow 
                        key={user.id}
                        className="border-purple-accent/20 hover:bg-white/10"
                      >
                        <TableCell className="text-white font-medium">
                          {user.id}
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          {user.username}
                          {user.role === 'admin' && (
                            <span className="ml-2 text-xs bg-gradient-purple-light text-white px-2 py-1 rounded">
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
                              <BarChart className="w-4 h-4" />
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
                                  {user.status === 'blocked' ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                                  onClick={() => handleManageFunds(user.id, user.username)}
                                >
                                  <DollarSign className="w-4 h-4" />
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
        </div>

        {/* Game Management */}
        <div className="neo-glass-card p-6 mt-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-6 flex items-center gap-2">
            <Gamepad2 className="w-6 h-6" />
            Game Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading font-semibold py-3 px-4 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Restart Games
            </Button>
            <Button 
              variant="outline"
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
            >
              <History className="w-4 h-4 inline mr-2" />
              Game History
            </Button>
            <Button 
              variant="outline"
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
            >
              <Cog className="w-4 h-4 inline mr-2" />
              Game Settings
            </Button>
            <Button 
              variant="outline"
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Results Control */}
        <div className="neo-glass-card p-6 mt-6">
          <h2 className="text-neo-accent text-xl font-heading font-bold mb-6">🎯 Lucky 7 Results Control</h2>
            {isLoadingRound ? (
              <div className="text-center text-white py-8">
                Loading current round data...
              </div>
            ) : !currentRound || !currentRound.gameId ? (
              <div className="text-center text-white/60 py-8">
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
                    <p className="text-purple-accent font-semibold">Total Bets:</p>
                    <p className="text-white text-xl">{currentRound.totalBets} chips</p>
                  </div>
                </div>

                {/* Betting Breakdown */}
                <div>
                  <h4 className="text-purple-accent font-semibold mb-3">Current Round Betting:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white/10 p-3 rounded border border-red-400/50">
                      <div className="text-center">
                        <div className="text-red-300 font-semibold">🔴 Red</div>
                        <div className="text-white text-lg">{currentRound.betsByType.red}</div>
                        <div className="text-white/60 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded border border-gray-400/50">
                      <div className="text-center">
                        <div className="text-gray-300 font-semibold">⚫ Black</div>
                        <div className="text-white text-lg">{currentRound.betsByType.black}</div>
                        <div className="text-white/60 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded border border-blue-400/50">
                      <div className="text-center">
                        <div className="text-blue-300 font-semibold">📉 Low (1-6)</div>
                        <div className="text-white text-lg">{currentRound.betsByType.low}</div>
                        <div className="text-white/60 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded border border-orange-400/50">
                      <div className="text-center">
                        <div className="text-orange-300 font-semibold">📈 High (8-13)</div>
                        <div className="text-white text-lg">{currentRound.betsByType.high}</div>
                        <div className="text-white/60 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded border border-yellow-400/50">
                      <div className="text-center">
                        <div className="text-yellow-300 font-semibold">🍀 Lucky 7</div>
                        <div className="text-white text-lg">{currentRound.betsByType.lucky7}</div>
                        <div className="text-white/60 text-sm">chips</div>
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
        </div>

        {/* Coin Toss Results Control Card */}
        <div className="neo-glass-card p-6 mt-6" style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.1) 100%)',
          borderColor: 'rgba(234, 179, 8, 0.3)'
        }}>
          <h2 className="text-2xl font-heading font-bold text-neo-accent flex items-center gap-2 mb-6">
            <Coins className="w-7 h-7" />
            Coin Toss Results Control
          </h2>
            {isLoadingCoinTossRound ? (
              <div className="text-center py-8">
                <div className="text-yellow-300">Loading coin toss round data...</div>
              </div>
            ) : coinTossRound ? (
              <div>
                <div className="bg-yellow-950/50 p-4 rounded mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-yellow-200">
                      <div className="text-sm">Game ID</div>
                      <div className="text-xl font-bold">#{coinTossRound.gameId}</div>
                    </div>
                    <div className="text-yellow-200">
                      <div className="text-sm">Status</div>
                      <div className="text-xl font-bold capitalize">{coinTossRound.status}</div>
                    </div>
                    <div className="text-yellow-200">
                      <div className="text-sm">Total Bets</div>
                      <div className="text-xl font-bold">{coinTossRound.totalBets}</div>
                    </div>
                  </div>

                  <h4 className="text-yellow-300 font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Betting Statistics:
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-yellow-900/50 p-3 rounded border border-yellow-400">
                      <div className="text-center">
                        <div className="text-yellow-300 font-semibold flex items-center justify-center gap-2">
                          <Coins className="w-4 h-4" />
                          Heads
                        </div>
                        <div className="text-white text-lg">{coinTossRound.betsByType.heads}</div>
                        <div className="text-gray-300 text-sm">chips</div>
                      </div>
                    </div>
                    <div className="bg-yellow-900/50 p-3 rounded border border-blue-400">
                      <div className="text-center">
                        <div className="text-blue-300 font-semibold flex items-center justify-center gap-2">
                          <Target className="w-4 h-4" />
                          Tails
                        </div>
                        <div className="text-white text-lg">{coinTossRound.betsByType.tails}</div>
                        <div className="text-gray-300 text-sm">chips</div>
                      </div>
                    </div>
                  </div>
                </div>

                {coinTossRound.currentResult && (
                  <div className="border-t border-yellow-600 pt-6 mb-6">
                    <h4 className="text-yellow-300 font-semibold mb-3 flex items-center gap-2">
                      <Dice1 className="w-5 h-5" />
                      Current System Result:
                    </h4>
                    <div className="bg-blue-900/20 border border-blue-500 p-4 rounded">
                      <div className="text-center">
                        <div className="text-blue-200 text-sm mb-2 flex items-center justify-center gap-2">
                          <Coins className="w-4 h-4" />
                          Generated Result:
                        </div>
                        <div className="text-3xl font-bold text-yellow-400">
                          {coinTossRound.currentResult.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-yellow-600 pt-4">
                  <h4 className="text-yellow-300 font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Admin Override Results:
                  </h4>
                  
                  {coinTossRound.status === 'countdown' && coinTossRound.timeRemaining && (
                    <div className="bg-yellow-900/20 border border-yellow-500 p-4 rounded mb-4">
                      <div className="flex items-center justify-center">
                        <div className="text-yellow-300 font-bold text-lg flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Override Window: {Math.max(0, Math.ceil(coinTossRound.timeRemaining))}s remaining
                        </div>
                      </div>
                      <p className="text-yellow-200 text-sm text-center mt-2">
                        You can override the result during the countdown phase
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-red-900/20 border border-red-500 p-4 rounded mb-4">
                    <p className="text-red-300 text-sm font-medium flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>WARNING: This will override the natural coin toss result and manually set the outcome.</span>
                      Use only when necessary for game management or correction purposes.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleCoinTossOverrideResult('heads')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white py-6 text-lg"
                      disabled={coinTossRound.status !== 'countdown'}
                    >
                      <Coins className="w-5 h-5 inline mr-2" />
                      Force Heads Win
                    </Button>
                    <Button
                      onClick={() => handleCoinTossOverrideResult('tails')}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                      disabled={coinTossRound.status !== 'countdown'}
                    >
                      <Target className="w-5 h-5 inline mr-2" />
                      Force Tails Win
                    </Button>
                  </div>
                  
                  {coinTossRound.status !== 'countdown' && (
                    <p className="text-gray-400 text-sm mt-2">
                      * Results can only be overridden during the countdown phase
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-yellow-300">No active coin toss round found</div>
              </div>
            )}
        </div>

        {/* Lucky 7 Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="neo-glass-card border-neo-accent/30">
            <DialogHeader>
              <DialogTitle className="text-neo-accent font-heading font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Confirm Result Override
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-neo-text text-center">
                Are you sure you want to override the game result to:
              </p>
              <div className="text-center mt-4">
                <span className="inline-block bg-white/20 px-4 py-2 rounded-lg border-2 border-neo-accent text-neo-accent font-heading font-bold text-lg">
                  {pendingOverride?.toUpperCase()}
                </span>
              </div>
              <p className="text-neo-danger text-sm text-center mt-4">
                This action will permanently affect the game outcome and cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={cancelOverride}
                className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmOverride}
                className="border-2 border-neo-danger bg-neo-danger/30 text-neo-text hover:bg-neo-danger hover:text-white font-heading transition-all duration-300"
              >
                Yes, Override Result
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Coin Toss Confirmation Dialog */}
        <Dialog open={showCoinTossConfirmDialog} onOpenChange={setShowCoinTossConfirmDialog}>
          <DialogContent className="neo-glass-card border-neo-accent/30">
            <DialogHeader>
              <DialogTitle className="text-neo-accent font-heading font-bold">⚠️ Confirm Coin Toss Override</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-neo-text text-center">
                Are you sure you want to override the coin toss result to:
              </p>
              <div className="text-center mt-4">
                <span className="inline-block bg-white/20 px-4 py-2 rounded-lg border-2 border-neo-accent text-neo-accent font-heading font-bold text-lg">
                  {pendingCoinTossOverride?.toUpperCase()}
                </span>
              </div>
              <p className="text-neo-danger text-sm text-center mt-4">
                This action will permanently affect the coin toss outcome and cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={cancelCoinTossOverride}
                className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmCoinTossOverride}
                className="border-2 border-neo-danger bg-neo-danger/30 text-neo-text hover:bg-neo-danger hover:text-white font-heading transition-all duration-300"
              >
                Yes, Override Result
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Stats Dialog */}
        <Dialog open={showUserStatsDialog} onOpenChange={setShowUserStatsDialog}>
          <DialogContent className="neo-glass-card border-neo-accent/30">
            <DialogHeader>
              <DialogTitle className="text-neo-accent font-heading font-bold flex items-center gap-2">
                <BarChart className="w-6 h-6" />
                User Statistics
              </DialogTitle>
            </DialogHeader>
            {userStatsData && (
              <div className="py-4 space-y-4">
                <div className="text-center pb-4 border-b border-neo-border">
                  <h3 className="text-2xl font-heading font-bold text-neo-accent">{userStatsData.user.username}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="neo-glass-card p-4">
                    <p className="text-neo-text-secondary text-sm">Chips</p>
                    <p className="text-2xl font-mono font-bold text-neo-accent">{userStatsData.stats.chips}</p>
                  </div>
                  <div className="neo-glass-card p-4">
                    <p className="text-neo-text-secondary text-sm">Win Rate</p>
                    <p className="text-2xl font-mono font-bold text-neo-success">{userStatsData.stats.winRate}%</p>
                  </div>
                  <div className="neo-glass-card p-4">
                    <p className="text-neo-text-secondary text-sm">Total Wins</p>
                    <p className="text-2xl font-mono font-bold text-neo-text">{userStatsData.stats.totalWins}</p>
                  </div>
                  <div className="neo-glass-card p-4">
                    <p className="text-neo-text-secondary text-sm">Total Losses</p>
                    <p className="text-2xl font-mono font-bold text-neo-text">{userStatsData.stats.totalLosses}</p>
                  </div>
                  <div className="neo-glass-card p-4 col-span-2">
                    <p className="text-neo-text-secondary text-sm">Total Bets Amount</p>
                    <p className="text-2xl font-mono font-bold text-neo-accent">{userStatsData.stats.totalBetsAmount}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setShowUserStatsDialog(false)}
                className="border-2 border-neo-accent bg-neo-accent/20 text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Confirmation Dialog */}
        <Dialog open={showStatusConfirmDialog} onOpenChange={setShowStatusConfirmDialog}>
          <DialogContent className="neo-glass-card border-neo-accent/30">
            <DialogHeader>
              <DialogTitle className="text-neo-accent font-heading font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Confirm User Status Change
              </DialogTitle>
            </DialogHeader>
            {statusConfirmData && (
              <div className="py-4">
                <p className="text-neo-text text-center">
                  Are you sure you want to <span className="text-neo-accent font-bold">{statusConfirmData.action}</span> this user?
                </p>
                <p className="text-neo-text-secondary text-sm text-center mt-4">
                  This action will change the user's account status and may affect their access to the platform.
                </p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStatusConfirmDialog(false)}
                className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmStatusChange}
                className="border-2 border-neo-accent bg-neo-accent/30 text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Yes, {statusConfirmData?.action} User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Funds Dialog */}
        <Dialog open={showFundsDialog} onOpenChange={setShowFundsDialog}>
          <DialogContent className="neo-glass-card border-neo-accent/30">
            <DialogHeader>
              <DialogTitle className="text-neo-accent font-heading font-bold flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Manage User Funds
              </DialogTitle>
            </DialogHeader>
            {fundsDialogData && (
              <div className="py-4 space-y-4">
                <p className="text-neo-text text-center">
                  Managing funds for: <span className="text-neo-accent font-bold">{fundsDialogData.username}</span>
                </p>
                <div className="space-y-2">
                  <label className="text-neo-text text-sm">Amount (use negative to remove chips)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 500 to add, -200 to remove"
                    value={fundsAmount}
                    onChange={(e) => setFundsAmount(e.target.value)}
                    className="bg-neo-bg border-neo-accent/50 text-neo-text"
                  />
                  <p className="text-neo-text-secondary text-xs">Example: 500 to add 500 chips, -200 to remove 200 chips</p>
                </div>
                <div className="space-y-2">
                  <label className="text-neo-text text-sm">Reason (optional)</label>
                  <Input
                    type="text"
                    placeholder="Enter reason for adjustment"
                    value={fundsReason}
                    onChange={(e) => setFundsReason(e.target.value)}
                    className="bg-neo-bg border-neo-accent/50 text-neo-text"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFundsDialog(false)}
                className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Cancel
              </Button>
              <Button
                onClick={submitFundsDialog}
                className="border-2 border-neo-accent bg-neo-accent/30 text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Funds Confirmation Dialog */}
        <Dialog open={showFundsConfirmDialog} onOpenChange={setShowFundsConfirmDialog}>
          <DialogContent className="neo-glass-card border-neo-accent/30">
            <DialogHeader>
              <DialogTitle className="text-neo-accent font-heading font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Confirm Funds Adjustment
              </DialogTitle>
            </DialogHeader>
            {fundsConfirmData && (
              <div className="py-4">
                <p className="text-neo-text text-center">
                  Confirm {fundsConfirmData.amount > 0 ? 'adding' : 'removing'} <span className="text-neo-accent font-bold">{Math.abs(fundsConfirmData.amount)} chips</span> {fundsConfirmData.amount > 0 ? 'to' : 'from'} <span className="text-neo-accent font-bold">{fundsConfirmData.username}</span>?
                </p>
                <div className="mt-4 neo-glass-card p-3">
                  <p className="text-neo-text-secondary text-sm">
                    <span className="font-bold">Reason:</span> {fundsConfirmData.reason}
                  </p>
                </div>
                <p className="text-neo-text-secondary text-xs text-center mt-4">
                  This action will be logged and cannot be undone automatically.
                </p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFundsConfirmDialog(false)}
                className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmFundsChange}
                className="border-2 border-neo-accent bg-neo-accent/30 text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                Yes, Adjust Funds
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alert Dialog */}
        <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
          <DialogContent className="neo-glass-card border-neo-accent/30">
            <DialogHeader>
              <DialogTitle className="text-neo-accent font-heading font-bold flex items-center gap-2">
                <Info className="w-6 h-6" />
                Alert
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-neo-text text-center">{alertMessage}</p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowAlertDialog(false)}
                className="border-2 border-neo-accent bg-neo-accent/20 text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 neo-glass-card border-2 border-neo-success text-neo-text px-6 py-3 rounded-xl shadow-lg z-50 neon-glow-success animate-fade-in">
            <div className="flex items-center font-heading gap-2">
              <Check className="w-5 h-5" />
              {showSuccessMessage}
            </div>
          </div>
        )}

        {/* Error Message */}
        {showErrorMessage && (
          <div className="fixed top-4 right-4 neo-glass-card border-2 border-neo-danger text-neo-text px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
            <div className="flex items-center font-heading gap-2">
              <X className="w-5 h-5" />
              {showErrorMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}