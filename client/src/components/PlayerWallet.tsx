import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface PlayerData {
  id: number;
  name: string;
  chips: number;
  totalWins: number;
  totalLosses: number;
}

interface PlayerWalletProps {
  socketId: string;
  onPlayerDataLoaded?: (data: PlayerData) => void;
}

export function PlayerWallet({ socketId, onPlayerDataLoaded }: PlayerWalletProps) {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/player/me', {
          headers: {
            'socket-id': socketId
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch player data');
        }

        const data = await response.json();
        setPlayerData(data);
        onPlayerDataLoaded?.(data);
      } catch (err) {
        setError('Failed to load wallet data');
        console.error('Error fetching player data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (socketId) {
      fetchPlayerData();
      
      // Refresh wallet data every 5 seconds to keep it updated
      const interval = setInterval(fetchPlayerData, 5000);
      return () => clearInterval(interval);
    }
  }, [socketId, onPlayerDataLoaded]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-400/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">💰 Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !playerData) {
    return (
      <Card className="bg-gradient-to-br from-red-900/50 to-orange-900/50 border-red-400/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">💰 Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-300">{error || 'Failed to load wallet'}</div>
        </CardContent>
      </Card>
    );
  }

  const totalGames = playerData.totalWins + playerData.totalLosses;
  const winRate = totalGames > 0 ? ((playerData.totalWins / totalGames) * 100).toFixed(1) : '0.0';

  return (
    <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-400/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          💰 Wallet
          <Badge variant="outline" className="bg-green-800/50 text-green-200 border-green-400/50">
            {playerData.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chips Balance */}
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-300 mb-1">
            🪙 {playerData.chips.toLocaleString()}
          </div>
          <div className="text-sm text-white/70">Virtual Chips</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-800/30 rounded-lg p-2">
            <div className="text-green-300 font-bold text-lg">{playerData.totalWins}</div>
            <div className="text-xs text-white/70">Wins</div>
          </div>
          <div className="bg-red-800/30 rounded-lg p-2">
            <div className="text-red-300 font-bold text-lg">{playerData.totalLosses}</div>
            <div className="text-xs text-white/70">Losses</div>
          </div>
          <div className="bg-blue-800/30 rounded-lg p-2">
            <div className="text-blue-300 font-bold text-lg">{winRate}%</div>
            <div className="text-xs text-white/70">Win Rate</div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="text-xs text-white/60 text-center">
          Total Games: {totalGames}
        </div>
      </CardContent>
    </Card>
  );
}