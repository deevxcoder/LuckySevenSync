import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface Bet {
  id: number;
  gameId: number;
  betAmount: number;
  betType: string;
  betValue: string | null;
  won: boolean;
  winAmount: number;
  createdAt: string;
}

interface BetHistoryProps {
  socketId: string;
  limit?: number;
}

export function BetHistory({ socketId, limit = 10 }: BetHistoryProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBetHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/player/bets?limit=${limit}`, {
          headers: {
            'socket-id': socketId
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bet history');
        }

        const data = await response.json();
        setBets(data);
      } catch (err) {
        setError('Failed to load bet history');
        console.error('Error fetching bet history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (socketId) {
      fetchBetHistory();
      
      // Refresh bet history every 10 seconds
      const interval = setInterval(fetchBetHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [socketId, limit]);

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
                          <Badge 
                            variant={bet.won ? "default" : "destructive"}
                            className={bet.won 
                              ? "bg-green-800/50 text-green-200 border-green-400/50" 
                              : "bg-red-800/50 text-red-200 border-red-400/50"
                            }
                          >
                            {bet.won ? 'WON' : 'LOST'}
                          </Badge>
                        </div>
                        <div className="text-sm text-white/70 mt-1">
                          Bet: 🪙{bet.betAmount}
                        </div>
                        {bet.won && bet.winAmount > 0 && (
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