import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../lib/stores/useGameStore';
import { useAudio } from '../lib/stores/useAudio';
import CountdownTimer from './CountdownTimer';
import Card from './Card';
import BettingPanel from './BettingPanel';
import { BetHistory } from './BetHistory';
import { Button } from './ui/button';
import { Card as UICard, CardContent } from './ui/card';
import type { Card as CardType, GameRoom } from '../types/game';

export default function GameRoom() {
  const { currentRoom, setCurrentRoom, setGameState } = useGameStore();
  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [playerChips, setPlayerChips] = useState<number>(1000);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [socketId, setSocketId] = useState<string>('');
  const { playSuccess, playHit } = useAudio();

  // Fetch recent results only when needed
  const fetchResults = async () => {
    try {
      const response = await fetch('/api/games/recent');
      if (response.ok) {
        const data = await response.json();
        setRecentResults(data.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to fetch recent results:', error);
    }
  };

  // Monitor socket connection
  useEffect(() => {
    const handleConnect = () => {
      setSocketConnected(true);
      setSocketId(socket.id || '');
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      setSocketId('');
    };

    // Check initial connection state
    if (socket.connected && socket.id) {
      setSocketConnected(true);
      setSocketId(socket.id);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    function onRoomUpdated(room: GameRoom) {
      setCurrentRoom(room);
      // Update player chips from room data
      const currentPlayer = room.players.find((p: any) => p.socketId === socket.id);
      if (currentPlayer && currentPlayer.chips !== undefined) {
        setPlayerChips(currentPlayer.chips);
      }
    }
    
    function onGameStarting(data: { room: GameRoom; countdownTime: number }) {
      setCurrentRoom(data.room);
      setCountdownTime(data.countdownTime);
      setGameStatus('countdown');
      setGameState('countdown');
      // Play game start sound
      playSuccess();
    }

    function onCountdownTick(data: { time: number; room: GameRoom }) {
      setCountdownTime(data.time);
      setCurrentRoom(data.room);
    }

    function onCardRevealed(data: { card: CardType; room: GameRoom }) {
      setCurrentCard(data.card);
      setCurrentRoom(data.room);
      setGameStatus('revealed');
      setGameState('playing');
    }

    function onRoundEnded(data: { room: GameRoom }) {
      setCurrentRoom(data.room);
      setGameStatus('waiting');
      setGameState('waiting');
      setCurrentCard(null);
      setCountdownTime(0);
      // Play round end sound
      playHit();
      // Update recent results when new round starts (after 3-second delay)
      fetchResults();
    }

    socket.on('room-updated', onRoomUpdated);
    socket.on('game-starting', onGameStarting);
    socket.on('countdown-tick', onCountdownTick);
    socket.on('card-revealed', onCardRevealed);
    socket.on('round-ended', onRoundEnded);

    return () => {
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-starting', onGameStarting);
      socket.off('countdown-tick', onCountdownTick);
      socket.off('card-revealed', onCardRevealed);
      socket.off('round-ended', onRoundEnded);
    };
  }, [setCurrentRoom, setGameState, playSuccess, playHit]);

  const handleLeaveRoom = () => {
    socket.emit('leave-room');
    setCurrentRoom(null);
    setCurrentCard(null);
    setCountdownTime(0);
    setGameStatus('waiting');
  };

  if (!currentRoom) return null;

  const getStatusMessage = () => {
    switch (gameStatus) {
      case 'countdown':
        return 'Get ready! Card revealing in...';
      case 'revealed':
        return 'Card Revealed!';
      case 'waiting':
        return currentRoom.players.length < 2 
          ? 'Waiting for more players...' 
          : 'Next round starting soon...';
      default:
        return 'Welcome to Lucky 7!';
    }
  };

  return (
    <div className="min-h-screen bg-casino-green p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <h1 className="text-responsive-2xl font-bold text-casino-gold">
              🎰 Lucky 7 - Room {currentRoom.id}
            </h1>
            <p className="text-lg">
              {getStatusMessage()}
            </p>
          </div>
          <Button 
            onClick={handleLeaveRoom}
            variant="outline"
            className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
          >
            Leave Room
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Countdown Timer */}
            {gameStatus === 'countdown' && (
              <UICard className="bg-casino-black border-casino-gold border-2">
                <CardContent className="p-8 text-center">
                  <CountdownTimer 
                    time={countdownTime} 
                    isActive={gameStatus === 'countdown'}
                  />
                </CardContent>
              </UICard>
            )}

            {/* Card Display */}
            <UICard className="bg-casino-black border-casino-gold border-2">
              <CardContent className="p-8 flex justify-center items-center min-h-[300px]">
                {gameStatus === 'countdown' && (
                  <div className="text-center">
                    <div className="text-casino-gold text-6xl mb-4">🎴</div>
                    <p className="text-white text-xl">Card preparing...</p>
                  </div>
                )}
                
                {currentCard && gameStatus === 'revealed' ? (
                  <Card 
                    number={currentCard.number} 
                    color={currentCard.color}
                    revealed={currentCard.revealed}
                    large={true}
                  />
                ) : gameStatus === 'waiting' && (
                  <div className="text-center">
                    <div className="text-casino-gold text-6xl mb-4">🃏</div>
                    <p className="text-white text-xl">
                      {currentRoom.players.length < 2 
                        ? 'Waiting for players to join...' 
                        : 'Next round starting soon...'}
                    </p>
                  </div>
                )}
              </CardContent>
            </UICard>

            {/* Game Status */}
            <UICard className="bg-casino-black border-casino-gold">
              <CardContent className="p-4">
                <div className="flex justify-between items-center text-white">
                  <div>
                    <span className="font-semibold">Status:</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-sm ${
                      gameStatus === 'countdown' ? 'bg-casino-red' :
                      gameStatus === 'revealed' ? 'bg-casino-gold text-casino-black' :
                      'bg-gray-600'
                    }`}>
                      {gameStatus === 'countdown' ? 'Countdown' :
                       gameStatus === 'revealed' ? 'Card Revealed' :
                       'Waiting'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Round:</span>
                    <span className="ml-2 text-casino-gold">#{currentRoom.roundNumber || 1}</span>
                  </div>
                </div>
              </CardContent>
            </UICard>

            {/* Recent Results */}
            <UICard className="bg-casino-black border-casino-gold">
              <CardContent className="p-4">
                <div className="text-white mb-3">
                  <span className="font-semibold text-casino-gold">Recent Results:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentResults.map((result, index) => (
                    <div 
                      key={result.id}
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold border ${
                        result.cardColor === 'red' 
                          ? 'bg-red-500 text-white border-red-400' 
                          : 'bg-gray-800 text-white border-gray-600'
                      }`}
                      title={`Round ${result.id}: ${result.cardNumber} ${result.cardColor}`}
                    >
                      {result.cardNumber}
                    </div>
                  ))}
                  {recentResults.length === 0 && (
                    <div className="text-casino-gold text-sm opacity-75">
                      No recent results
                    </div>
                  )}
                </div>
              </CardContent>
            </UICard>
          </div>

          {/* Sidebar - Players and Betting */}
          <div className="lg:col-span-4 space-y-4">
            {/* Betting Panel */}
            <BettingPanel 
              playerChips={playerChips}
              gameStatus={gameStatus}
              countdownTime={countdownTime}
              roomId={currentRoom.id}
            />

            {/* Bet History */}
            {socketConnected && socketId && (
              <BetHistory 
                socketId={socketId}
                limit={10}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
