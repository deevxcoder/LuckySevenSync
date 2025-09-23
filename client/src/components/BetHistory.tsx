import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { socket } from '../lib/socket';
import { useAuthStore } from '../lib/stores/useAuthStore';

interface Bet {
  id: number;
  gameId: number;
  betAmount: number;
  betType: string;
  betValue: string | null;
  won: boolean;
  winAmount: number;
  createdAt: string;
  gameStatus: string;
}

interface BetHistoryProps {
  socketId: string;
  limit?: number;
}

export function BetHistory({ socketId, limit = 10 }: BetHistoryProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const { isAuthenticated } = useAuthStore();

  const fetchBetHistory = async (showLoading = false) => {
    // Don't fetch if user is not authenticated
    if (!isAuthenticated) {
      if (showLoading) {
        setLoading(false);
      }
      setBets([]);
      setError(null);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch(`/api/player/bets?limit=${limit}`, {
        headers: {
          'socket-id': socketId
        },
        credentials: 'include' // Include cookies for session
      });

      if (!response.ok) {
        // Handle authentication errors silently
        if (response.status === 401 || response.status === 404) {
          setBets([]);
          setError(null);
          return;
        }
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch bet history' }));
        throw new Error(errorData.message || 'Failed to fetch bet history');
      }

      const data = await response.json();
      setBets(data);
      lastFetchTime.current = Date.now();
    } catch (err) {
      // Don't log authentication errors to console
      if (err instanceof Error && err.message.includes('fetch bet history')) {
        // Only set error state for non-auth errors, don't log to console
        setError(null);
      } else {
        setError('Failed to load bet history');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!socketId) return;

    // Initial fetch with loading state
    fetchBetHistory(true);

    // Socket event handlers for real-time updates
    const handleGameStarting = () => {
      // Only refresh if authenticated
      if (!isAuthenticated) return;
      
      // Refresh when new game starts (new bets might be placed)
      const timeSinceLastFetch = Date.now() - lastFetchTime.current;
      if (timeSinceLastFetch > 2000) {
        fetchBetHistory(false);
      }
    };

    const handleRoundEnded = () => {
      // Only refresh if authenticated
      if (!isAuthenticated) return;
      
      // Refresh when round ends (bet results are resolved)
      const timeSinceLastFetch = Date.now() - lastFetchTime.current;
      if (timeSinceLastFetch > 1000) {
        fetchBetHistory(false);
      }
    };

    // Listen to socket events for intelligent updates
    socket.on('game-starting', handleGameStarting);
    socket.on('round-ended', handleRoundEnded);

    return () => {
      socket.off('game-starting', handleGameStarting);
      socket.off('round-ended', handleRoundEnded);
    };
  }, [socketId, limit, isAuthenticated]);

  const getBetTypeDisplay = (betType: string, betValue: string | null) => {
    switch (betType) {
      case 'red':
        return { text: 'Red', emoji: '🔴', color: 'text-red-400' };
      case 'black':
        return { text: 'Black', emoji: '⚫', color: 'text-gray-300' };
      case 'high':
        return { text: 'High (8-13)', emoji: '⬆️', color: 'text-blue-400' };
      case 'low':
        return { text: 'Low (1-6)', emoji: '⬇️', color: 'text-purple-400' };
      case 'lucky7':
        return { text: 'Lucky 7', emoji: '🍀', color: 'text-yellow-400' };
      default:
        return { text: betType, emoji: '🎯', color: 'text-white' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-400/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">📈 Bet History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70">Loading bet history...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-red-900/50 to-orange-900/50 border-red-400/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">📈 Bet History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-300">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-400/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center justify-between">
          📈 Bet History
          <Badge variant="outline" className="bg-indigo-800/50 text-indigo-200 border-indigo-400/50">
            {bets.length} bets
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bets.length === 0 ? (
          <div className="text-white/60 text-center py-6">
            <div className="text-4xl mb-2">🎲</div>
            <div>No bets yet</div>
            <div className="text-sm">Place your first bet to see history here!</div>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {bets.map((bet, index) => {
                const betDisplay = getBetTypeDisplay(bet.betType, bet.betValue);
                return (
                  <div key={bet.id}>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{betDisplay.emoji}</span>
                          <div>
                            <div className={`font-medium ${betDisplay.color}`}>
                              {betDisplay.text}
                            </div>
                            <div className="text-xs text-white/50">
                              Game #{bet.gameId}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {bet.gameStatus === 'completed' ? (
                            <Badge 
                              variant={bet.won ? "default" : "destructive"}
                              className={bet.won 
                                ? "bg-green-800/50 text-green-200 border-green-400/50" 
                                : "bg-red-800/50 text-red-200 border-red-400/50"
                              }
                            >
                              {bet.won ? 'WON' : 'LOST'}
                            </Badge>
                          ) : (
                            <Badge 
                              variant="secondary"
                              className="bg-yellow-800/50 text-yellow-200 border-yellow-400/50"
                            >
                              PENDING
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-white/70 mt-1">
                          Bet: 🪙{bet.betAmount}
                        </div>
                        {bet.gameStatus === 'completed' && bet.won && bet.winAmount > 0 && (
                          <div className="text-sm text-green-300">
                            Won: 🪙{bet.winAmount}
                          </div>
                        )}
                        <div className="text-xs text-white/50">
                          {formatDate(bet.createdAt)}
                        </div>
                      </div>
                    </div>
                    {index < bets.length - 1 && <Separator className="bg-white/10" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}