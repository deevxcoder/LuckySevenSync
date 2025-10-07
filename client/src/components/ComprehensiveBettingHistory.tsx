import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useAuthStore } from '../lib/stores/useAuthStore';

interface BettingHistoryItem {
  id: number;
  betAmount: number;
  betType: string;
  won: boolean;
  winAmount: number;
  createdAt: string;
  gameType: string;
  gameId: number;
  balanceAfter: number;
  profitLoss: number;
}

export function ComprehensiveBettingHistory() {
  const [bets, setBets] = useState<BettingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();

  const fetchBettingHistory = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setBets([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/player/betting-history?limit=50', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          setBets([]);
          return;
        }
        throw new Error('Failed to fetch betting history');
      }

      const data = await response.json();
      setBets(data);
    } catch (err) {
      setError('Failed to load betting history');
      console.error('Error fetching betting history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBettingHistory();
  }, [isAuthenticated]);

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'Lucky 7':
        return '🎰';
      case 'Coin Toss':
        return '🪙';
      case 'Andar Bahar':
        return '🃏';
      default:
        return '🎮';
    }
  };

  const getBetTypeDisplay = (betType: string, gameType: string) => {
    if (gameType === 'Lucky 7') {
      switch (betType) {
        case 'red':
          return { text: 'Red', color: 'text-red-400' };
        case 'black':
          return { text: 'Black', color: 'text-gray-300' };
        case 'high':
          return { text: 'High (8-13)', color: 'text-blue-400' };
        case 'low':
          return { text: 'Low (1-6)', color: 'text-purple-400' };
        case 'lucky7':
          return { text: 'Lucky 7', color: 'text-yellow-400' };
        default:
          return { text: betType, color: 'text-white' };
      }
    } else if (gameType === 'Coin Toss') {
      return {
        text: betType === 'heads' ? 'Heads' : 'Tails',
        color: betType === 'heads' ? 'text-yellow-400' : 'text-blue-400'
      };
    } else if (gameType === 'Andar Bahar') {
      return {
        text: betType,
        color: 'text-purple-400'
      };
    }
    return { text: betType, color: 'text-white' };
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
      <Card className="bg-casino-black border-casino-gold">
        <CardHeader>
          <CardTitle className="text-casino-gold text-xl">📊 Betting History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70">Loading betting history...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-casino-black border-casino-gold">
        <CardHeader>
          <CardTitle className="text-casino-gold text-xl">📊 Betting History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-300">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-casino-black border-casino-gold">
      <CardHeader>
        <CardTitle className="text-casino-gold text-xl flex items-center justify-between">
          📊 Complete Betting History
          <Badge variant="outline" className="bg-casino-green/50 text-casino-gold border-casino-gold">
            {bets.length} bets
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bets.length === 0 ? (
          <div className="text-white/60 text-center py-8">
            <div className="text-4xl mb-2">🎲</div>
            <div className="text-lg">No bets yet</div>
            <div className="text-sm mt-1">Place your first bet to see history here!</div>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {bets.map((bet, index) => {
                const betDisplay = getBetTypeDisplay(bet.betType, bet.gameType);
                const gameIcon = getGameIcon(bet.gameType);
                
                return (
                  <div key={`${bet.gameType}-${bet.id}`}>
                    <div className="p-3 bg-casino-green/20 rounded-lg hover:bg-casino-green/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{gameIcon}</span>
                          <div>
                            <div className="font-medium text-white">
                              {bet.gameType}
                            </div>
                            <div className={`text-sm ${betDisplay.color}`}>
                              {betDisplay.text}
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                              {formatDate(bet.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <Badge 
                          variant={bet.won ? "default" : "destructive"}
                          className={bet.won 
                            ? "bg-green-600 text-white" 
                            : "bg-red-600 text-white"
                          }
                        >
                          {bet.won ? '✓ WON' : '✗ LOST'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                        <div>
                          <div className="text-white/50 text-xs">Bet Amount</div>
                          <div className="text-white font-medium">🪙 {bet.betAmount}</div>
                        </div>
                        <div>
                          <div className="text-white/50 text-xs">Profit/Loss</div>
                          <div className={`font-medium ${bet.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {bet.profitLoss >= 0 ? '+' : ''}{bet.profitLoss}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/50 text-xs">Win Amount</div>
                          <div className="text-white font-medium">
                            {bet.won ? `🪙 ${bet.winAmount}` : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/50 text-xs">Balance After</div>
                          <div className="text-casino-gold font-medium">🪙 {bet.balanceAfter}</div>
                        </div>
                      </div>
                    </div>
                    {index < bets.length - 1 && <Separator className="bg-white/10 my-2" />}
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
