import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../lib/stores/useGameStore';
import { useAudio } from '../lib/stores/useAudio';
import CountdownTimer from './CountdownTimer';
import Card from './Card';
import RoundResults from './RoundResults';
import BettingPanel from './BettingPanel';
import { Button } from './ui/button';
import { Card as UICard, CardContent } from './ui/card';
import type { Card as CardType, GameRoom } from '../types/game';

export default function GameRoom() {
  const { currentRoom, setCurrentRoom, setGameState } = useGameStore();
  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [playerChips, setPlayerChips] = useState<number>(1000);
  const { playSuccess, playHit } = useAudio();

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
                    <span className="ml-2 text-casino-gold">#{Math.floor(Date.now() / 30000) % 100}</span>
                  </div>
                </div>
              </CardContent>
            </UICard>
          </div>

          {/* Sidebar - Players and Betting */}
          <div className="lg:col-span-4 space-y-4">
            {/* Round Results */}
            <RoundResults />
            
            {/* Betting Panel */}
            <BettingPanel 
              playerChips={playerChips}
              gameStatus={gameStatus}
              countdownTime={countdownTime}
              roomId={currentRoom.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
