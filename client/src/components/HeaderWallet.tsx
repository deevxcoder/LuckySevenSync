import React, { useState, useEffect, useRef } from 'react';
import { Badge } from './ui/badge';
import { socket } from '../lib/socket';

interface PlayerData {
  id: number;
  name: string;
  chips: number;
  totalWins: number;
  totalLosses: number;
}

interface HeaderWalletProps {
  socketId?: string;
}

export function HeaderWallet({ socketId }: HeaderWalletProps) {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);

  const fetchPlayerData = async (showLoading = false) => {
    if (!socketId) return;
    
    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      const response = await fetch('/api/player/me', {
        headers: {
          'socket-id': socketId
        }
      });

      if (!response.ok) {
        // Don't treat 404 as an error - user may not have joined a game yet
        if (response.status === 404) {
          setPlayerData(null);
          setError(null);
          return;
        }
        throw new Error('Failed to fetch player data');
      }

      const data = await response.json();
      setPlayerData(data);
      setError(null);
      lastFetchTime.current = Date.now();
    } catch (err) {
      // Only log actual errors, not 404s
      console.error('Error fetching player data for header:', err);
      setError('Failed to load wallet');
      if (showLoading) {
        setPlayerData(null);
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
    fetchPlayerData(true);

    // Socket event handlers for real-time updates
    const handleRoomUpdated = (room: any) => {
      // Update player chips from room data if available
      const currentPlayer = room.players?.find((p: any) => p.socketId === socketId);
      if (currentPlayer) {
        setPlayerData(prev => prev ? {
          ...prev,
          chips: currentPlayer.chips
        } : null);
      }
    };

    const handleRoundEnded = () => {
      // Refresh wallet after round ends (when bets are resolved)
      const timeSinceLastFetch = Date.now() - lastFetchTime.current;
      if (timeSinceLastFetch > 2000) { // Avoid too frequent fetches
        fetchPlayerData(false); // No loading state for real-time updates
      }
    };

    // Listen to socket events for real-time updates
    socket.on('room-updated', handleRoomUpdated);
    socket.on('round-ended', handleRoundEnded);

    return () => {
      socket.off('room-updated', handleRoomUpdated);
      socket.off('round-ended', handleRoundEnded);
    };
  }, [socketId]);

  if (loading) {
    return (
      <Badge 
        variant="outline" 
        className="bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
      >
        💰 Loading...
      </Badge>
    );
  }

  if (error && !playerData) {
    return (
      <Badge 
        variant="outline" 
        className="bg-transparent border-red-400 text-red-400 hover:bg-red-400 hover:text-black cursor-pointer"
        onClick={() => fetchPlayerData(true)}
      >
        💰 Retry
      </Badge>
    );
  }

  if (!playerData) {
    return (
      <Badge 
        variant="outline" 
        className="bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
      >
        💰 --
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className="bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black cursor-default"
    >
      🪙 {playerData.chips.toLocaleString()} Chips
    </Badge>
  );
}