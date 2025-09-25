import { useEffect, useState, useRef } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../lib/stores/useGameStore';
import { useAudio } from '../lib/stores/useAudio';
import CountdownTimer from './CountdownTimer';
import Card from './Card';
import CardBack from './CardBack';
import BettingPanel from './BettingPanel';
import { BetHistory } from './BetHistory';
import BetResultPopup from './BetResultPopup';
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
  const [totalGameCount, setTotalGameCount] = useState<number>(0);
  const [showBetResultPopup, setShowBetResultPopup] = useState<boolean>(false);
  const [storedBets, setStoredBets] = useState<any[]>([]);
  const [betResults, setBetResults] = useState<any[]>([]);
  const [totalWinAmount, setTotalWinAmount] = useState<number>(0);
  const lastValidBetsRef = useRef<any[]>([]);
  const { playSuccess, playHit } = useAudio();

  // Bet type mappings for display
  const BET_TYPE_LABELS = {
    'red': '🔴 Red',
    'black': '⚫ Black',
    'high': '📈 High (8-13)',
    'low': '📉 Low (1-7)',
    'lucky7': '🍀 Lucky 7'
  };

  // Function to calculate if a bet won based on the revealed card
  const isBetWinner = (betType: string, card: CardType): boolean => {
    switch (betType) {
      case 'red':
        return card.color === 'red';
      case 'black':
        return card.color === 'black';
      case 'high':
        return card.number >= 8;
      case 'low':
        return card.number <= 7;
      case 'lucky7':
        return card.number === 7;
      default:
        return false;
    }
  };

  // Function to calculate win amount based on bet type and amount
  const calculateWinAmount = (betType: string, betAmount: number): number => {
    const payoutMultipliers: { [key: string]: number } = {
      'red': 2,    // 1:1 odds = 2x total (stake + equal winnings)
      'black': 2,  // 1:1 odds = 2x total (stake + equal winnings)
      'high': 2,   // 1:1 odds = 2x total (stake + equal winnings)
      'low': 2,    // 1:1 odds = 2x total (stake + equal winnings)
      'lucky7': 6  // 5:1 odds = 6x total (stake + 5x winnings)
    };
    return betAmount * (payoutMultipliers[betType] || 0);
  };

  // Function to store current bets from BettingPanel
  const storeBetsFromChild = (bets: any[]) => {
    // Only store non-empty bets or when game is not in revealed/waiting state
    if (bets.length > 0 || (gameStatus !== 'revealed' && gameStatus !== 'waiting')) {
      console.log('Storing bets from BettingPanel:', bets.length, 'bets');
      setStoredBets([...bets]);
      // Keep a ref of the last non-empty bets to prevent race conditions
      if (bets.length > 0) {
        lastValidBetsRef.current = [...bets];
      }
    }
  };

  // Function to calculate bet results and show popup
  const showBetResults = (card: CardType) => {
    // Use ref to get the most recent valid bets to prevent race conditions
    const betsToProcess = lastValidBetsRef.current.length > 0 ? lastValidBetsRef.current : storedBets;
    
    console.log(`showBetResults: Card ${card.number} ${card.color}, processing ${betsToProcess.length} bets`);
    
    // Only show popup if user actually placed bets
    if (betsToProcess.length === 0) {
      console.log('No bets to process, skipping popup');
      // Make sure popup is closed if it was somehow open
      setShowBetResultPopup(false);
      setBetResults([]);
      setTotalWinAmount(0);
      return;
    }

    const results = betsToProcess.map(bet => {
      const won = isBetWinner(bet.type, card);
      const winAmount = won ? calculateWinAmount(bet.type, bet.amount) : 0;
      console.log(`Bet ${bet.type} ${bet.amount} chips: ${won ? 'WON' : 'LOST'} (payout: ${winAmount})`);
      return {
        type: bet.type,
        value: bet.value,
        amount: bet.amount,
        won,
        winAmount,
        betTypeLabel: BET_TYPE_LABELS[bet.type as keyof typeof BET_TYPE_LABELS] || bet.type
      };
    });

    const totalWin = results.reduce((sum, result) => sum + result.winAmount, 0);
    const totalBet = results.reduce((sum, result) => sum + result.amount, 0);
    const netWinnings = results.reduce((sum, result) => sum + (result.won ? result.winAmount - result.amount : 0), 0);
    
    console.log(`Results: Total bet: ${totalBet}, Total payout: ${totalWin}, Net winnings: ${netWinnings}`);
    
    // Additional safety check - only show popup if there are actually results to display
    if (results.length > 0 && totalBet > 0) {
      setBetResults(results);
      setTotalWinAmount(totalWin);
      setShowBetResultPopup(true);
      console.log('Showing bet results popup');
    } else {
      console.log('No valid bet results to display, skipping popup');
      setShowBetResultPopup(false);
      setBetResults([]);
      setTotalWinAmount(0);
    }
    
    // Clear the ref after processing to prepare for next round
    lastValidBetsRef.current = [];
  };

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

  // Fetch total game count (real round number)
  const fetchGameCount = async () => {
    try {
      const response = await fetch('/api/games/count');
      if (response.ok) {
        const data = await response.json();
        setTotalGameCount(data.totalGames);
      }
    } catch (error) {
      console.error('Failed to fetch game count:', error);
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
    fetchGameCount();
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
      // Don't update room state on every tick to prevent frequent updates
      // Room state will be updated by other events when needed
    }

    function onCardRevealed(data: { card: CardType; room: GameRoom }) {
      setCurrentCard(data.card);
      setCurrentRoom(data.room);
      setGameStatus('revealed');
      setGameState('playing');
      
      // Show bet results popup after 3 seconds to let user see the card first
      setTimeout(() => {
        showBetResults(data.card);
      }, 3000);
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
      // Update game count to reflect the new round number
      fetchGameCount();
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
              🎰 Lucky 7
            </h1>
            <p className="text-lg">
              {getStatusMessage()}
            </p>
          </div>
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
                    <CardBack large={true} />
                    <p className="text-white text-xl mt-4">Card preparing...</p>
                  </div>
                )}
                
                {currentCard && gameStatus === 'revealed' ? (
                  <Card 
                    number={currentCard.number}
                    suit={currentCard.suit}
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
                    <span className="ml-2 text-casino-gold">#{totalGameCount + 1}</span>
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
              onBetsChange={storeBetsFromChild}
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

        {/* Bet Result Popup */}
        {currentCard && (
          <BetResultPopup
            isOpen={showBetResultPopup}
            onClose={() => setShowBetResultPopup(false)}
            betResults={betResults}
            totalWinAmount={totalWinAmount}
            revealedCard={{
              number: currentCard.number,
              color: currentCard.color,
              suit: currentCard.suit
            }}
          />
        )}
      </div>
    </div>
  );
}
