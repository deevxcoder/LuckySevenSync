import { useEffect, useState, useRef } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../lib/stores/useGameStore';
import { useAudio } from '../lib/stores/useAudio';
import Card from './Card';
import CardBack from './CardBack';
import BetResultPopup from './BetResultPopup';
import { Button } from './ui/button';
import { Lock, X, RotateCcw } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Inline betting state
  const [selectedBetType, setSelectedBetType] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [currentBets, setCurrentBets] = useState<any[]>([]);
  const [totalBetAmount, setTotalBetAmount] = useState<number>(0);
  const [lockedBets, setLockedBets] = useState<any[]>([]);
  const [unlockedBets, setUnlockedBets] = useState<any[]>([]);
  const [previousRoundBets, setPreviousRoundBets] = useState<any[]>([]);

  // Bet type mappings for display
  const BET_TYPE_LABELS = {
    'red': '🔴 Red',
    'black': '⚫ Black',
    'high': '📈 High (8-13)',
    'low': '📉 Low (1-6)',
    'lucky7': '🍀 Lucky 7 (12x)'
  };

  // Fullscreen functions
  const enterFullscreen = async () => {
    if (containerRef.current && !document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        
        // Lock to landscape orientation
        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch (err) {
            console.log('Orientation lock not supported or failed:', err);
          }
        }
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    }
  };

  const exitFullscreen = async () => {
    // Exit fullscreen and close the game
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
    
    // Unlock orientation
    if (screen.orientation && (screen.orientation as any).unlock) {
      try {
        (screen.orientation as any).unlock();
      } catch (err) {
        console.log('Orientation unlock not supported or failed:', err);
      }
    }
    
    // Dispatch custom event to notify App.tsx to navigate back to dashboard
    window.dispatchEvent(new CustomEvent('exitLucky7'));
  };

  const handleFullscreenChange = () => {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    setIsFullscreen(isCurrentlyFullscreen);
    
    // If user exits fullscreen (ESC key or browser UI), close the game
    if (!isCurrentlyFullscreen) {
      exitFullscreen();
    }
  };

  // Function to calculate if a bet won based on the revealed card
  const isBetWinner = (betType: string, card: CardType): boolean => {
    switch (betType) {
      case 'red':
        // Red loses on 7 (house number)
        return card.color === 'red' && card.number !== 7;
      case 'black':
        // Black loses on 7 (house number)
        return card.color === 'black' && card.number !== 7;
      case 'high':
        return card.number >= 8;
      case 'low':
        // Low is now 1-6 (7 is excluded as house number)
        return card.number >= 1 && card.number <= 6;
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
      'lucky7': 12 // 11:1 odds = 12x total (stake + 11x winnings)
    };
    return betAmount * (payoutMultipliers[betType] || 0);
  };

  // Calculate total bet amount
  useEffect(() => {
    const total = currentBets.reduce((sum, bet) => sum + bet.amount, 0);
    setTotalBetAmount(total);
    setStoredBets(currentBets);
    if (currentBets.length > 0) {
      lastValidBetsRef.current = [...currentBets];
    }
  }, [currentBets]);

  // Reset bets only when waiting for next round (after results are shown)
  useEffect(() => {
    if (gameStatus === 'waiting') {
      // Save current bets as previous round bets before resetting
      if (currentBets.length > 0) {
        setPreviousRoundBets([...currentBets]);
      }
      // Delay reset to allow popup to show first
      setTimeout(() => {
        setCurrentBets([]);
        setLockedBets([]);
        setUnlockedBets([]);
        setSelectedBetType('');
      }, 100);
    }
  }, [gameStatus, currentBets]);

  const canPlaceBet = () => {
    return gameStatus === 'countdown' && 
           countdownTime > 10 && 
           selectedBetType && 
           selectedAmount > 0 && 
           (playerChips - totalBetAmount) >= selectedAmount;
  };

  const handlePlaceBet = () => {
    if (!canPlaceBet()) return;
    if (lockedBets.length > 0) {
      alert('You have locked bets. Locked bets cannot be changed.');
      return;
    }

    const newBet = {
      type: selectedBetType,
      value: selectedBetType,
      amount: selectedAmount
    };

    setCurrentBets(prev => {
      const updated = [...prev, newBet];
      lastValidBetsRef.current = updated;
      return updated;
    });
    
    setUnlockedBets(prev => [...prev, newBet]);
    playHit();

    socket.emit('place-bet', {
      roomId: currentRoom?.id,
      betType: selectedBetType,
      amount: selectedAmount
    });

    console.log(`Placed bet: ${selectedAmount} on ${selectedBetType}`);
  };

  const handleLockBet = () => {
    if (unlockedBets.length === 0) return;
    
    socket.emit('lock-bets', { roomId: currentRoom?.id });
    console.log('Locking bets:', unlockedBets);
  };

  const handleCancelBet = () => {
    if (unlockedBets.length === 0) return;
    
    socket.emit('cancel-bets', { roomId: currentRoom?.id });
    console.log('Cancelling bets:', unlockedBets);
  };

  const handleRepeatBet = () => {
    if (previousRoundBets.length === 0) return;
    if (lockedBets.length > 0 || unlockedBets.length > 0) return;
    
    const totalPreviousBet = previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0);
    if (playerChips < totalPreviousBet) {
      alert('Insufficient chips to repeat previous bets');
      return;
    }

    // Place all previous bets again
    previousRoundBets.forEach(bet => {
      const newBet = {
        type: bet.type,
        value: bet.value,
        amount: bet.amount
      };

      setCurrentBets(prev => {
        const updated = [...prev, newBet];
        lastValidBetsRef.current = updated;
        return updated;
      });
      
      setUnlockedBets(prev => [...prev, newBet]);

      socket.emit('place-bet', {
        roomId: currentRoom?.id,
        betType: bet.type,
        amount: bet.amount
      });
    });

    playHit();
    console.log('Repeating previous round bets:', previousRoundBets);
  };

  // Function to calculate bet results and show popup
  const showBetResults = (card: CardType) => {
    // Use ref to get the most recent valid bets to prevent race conditions
    const betsToProcess = lastValidBetsRef.current.length > 0 ? lastValidBetsRef.current : storedBets;
    
    console.log(`🎲 showBetResults: Card ${card.number} ${card.color}`);
    console.log(`📊 Bets to process: ${betsToProcess.length}`, betsToProcess);
    console.log(`📋 Current bets state: ${currentBets.length}`, currentBets);
    console.log(`💾 Stored bets: ${storedBets.length}`, storedBets);
    console.log(`🔖 Ref bets: ${lastValidBetsRef.current.length}`, lastValidBetsRef.current);
    
    // Only show popup if user actually placed bets
    if (betsToProcess.length === 0) {
      console.log('❌ No bets to process, skipping popup');
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

  // Auto-enter fullscreen on mount and listen for fullscreen changes
  useEffect(() => {
    // Enter fullscreen when component mounts
    enterFullscreen();
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Socket listeners for bet management
  useEffect(() => {
    const handleBetPlaced = (data: { bet: any; chips: number }) => {
      setCurrentBets(prev => {
        const updated = [...prev];
        const lastBet = updated[updated.length - 1];
        if (lastBet && !lastBet.betId) {
          lastBet.betId = data.bet.id;
        }
        lastValidBetsRef.current = updated;
        return updated;
      });
    };

    const handleBetsLocked = (data: { bets: any[]; chips: number }) => {
      const locked = data.bets.map(bet => ({
        type: bet.betType,
        value: bet.betType === 'lucky7' ? '7' : bet.betType,
        amount: bet.betAmount,
        betId: bet.betId
      }));
      setLockedBets(locked);
      setUnlockedBets([]);
    };

    const handleBetsCancelled = (data: { message: string; chips: number }) => {
      setCurrentBets(prev => {
        const updated = prev.filter(bet => 
          !unlockedBets.some(ub => ub.betId === bet.betId)
        );
        lastValidBetsRef.current = updated;
        return updated;
      });
      setUnlockedBets([]);
    };

    socket.on('bet-placed', handleBetPlaced);
    socket.on('bets-locked', handleBetsLocked);
    socket.on('bets-cancelled', handleBetsCancelled);

    return () => {
      socket.off('bet-placed', handleBetPlaced);
      socket.off('bets-locked', handleBetsLocked);
      socket.off('bets-cancelled', handleBetsCancelled);
    };
  }, [unlockedBets]);

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

  const BET_TYPES = [
    { id: 'high', label: 'High', icon: '📈', description: '8-13', odds: '1:1', color: 'from-blue-600 to-blue-800' },
    { id: 'low', label: 'Low', icon: '📉', description: '1-6', odds: '1:1', color: 'from-green-600 to-green-800' },
    { id: 'lucky7', label: 'Lucky 7', icon: '🍀', description: 'Number 7', odds: '11:1', color: 'from-yellow-500 to-yellow-700' },
    { id: 'red', label: 'Red', icon: '🔴', description: '7 loses', odds: '1:1', color: 'from-red-600 to-red-800' },
    { id: 'black', label: 'Black', icon: '⚫', description: '7 loses', odds: '1:1', color: 'from-gray-700 to-gray-900' },
  ];

  const QUICK_AMOUNTS = [10, 50, 100, 500, 1000, 5000];

  const getBettingStatus = () => {
    if (gameStatus === 'countdown' && countdownTime > 10) return 'BETTING OPEN';
    if (gameStatus === 'countdown' && countdownTime <= 10) return 'BETTING CLOSED';
    if (gameStatus === 'revealed') return 'CARD REVEALED';
    return 'WAITING';
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#1a2b4a] p-2 md:p-4">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header - Compact for Landscape */}
        <div className="flex justify-between items-center mb-2">
          {/* Left: Chips */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <span className="text-xl">🪙</span>
            </div>
            <div className="text-cyan-300 font-bold text-xl">{playerChips}</div>
          </div>

          {/* Center: Title & Round Info */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
              LUCKY 7 ARENA
            </h1>
            <div className="text-cyan-400 text-sm font-semibold">
              ROUND #{currentRoom.currentGameId || totalGameCount + 1}
            </div>
          </div>

          {/* Right: Status & Exit */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${
              getBettingStatus() === 'BETTING OPEN' 
                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                : getBettingStatus() === 'BETTING CLOSED'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
            }`}>
              {getBettingStatus()}
            </div>
            <Button 
              onClick={exitFullscreen}
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 shadow-lg flex items-center justify-center"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Main Content Area - Optimized for Landscape */}
        <div className="flex-1 flex gap-4">
          {/* Left: Timer/Card Display */}
          <div className="flex-1 flex items-center justify-center">
            {gameStatus === 'countdown' && (
              <div className="text-center">
                <div className="relative w-32 h-32 md:w-40 md:h-40">
                  <svg className="transform -rotate-90 w-full h-full">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="rgba(6, 182, 212, 0.2)"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                      strokeDashoffset={2 * Math.PI * 45 * (1 - countdownTime / 30)}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl md:text-5xl font-bold text-cyan-400">{countdownTime}s</div>
                  </div>
                </div>
                <p className="text-cyan-300 text-sm mt-2">BETTING CLOSES IN...</p>
              </div>
            )}

            {currentCard && gameStatus === 'revealed' && (
              <div className="flex justify-center scale-90 md:scale-100">
                <Card 
                  number={currentCard.number}
                  suit={currentCard.suit}
                  color={currentCard.color}
                  revealed={currentCard.revealed}
                  large={true}
                />
              </div>
            )}

            {gameStatus === 'waiting' && (
              <div className="text-center">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-cyan-500/10 border-4 border-cyan-500/30 flex items-center justify-center">
                  <div className="text-4xl">🃏</div>
                </div>
                <p className="text-cyan-300 text-sm mt-2">NEXT ROUND STARTING...</p>
              </div>
            )}
          </div>

          {/* Right: Betting Area */}
          <div className="flex-1 flex flex-col justify-center gap-3">
            {/* Betting Options - Compact Grid */}
            <div className="grid grid-cols-5 gap-2">
              {BET_TYPES.map((bet) => (
                <button
                  key={bet.id}
                  onClick={() => setSelectedBetType(bet.id)}
                  className={`relative p-2 rounded-lg border-2 transition-all ${
                    selectedBetType === bet.id
                      ? 'border-cyan-400 bg-cyan-500/20 scale-105'
                      : 'border-cyan-800/30 bg-gradient-to-br ' + bet.color + ' opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="text-2xl mb-1">{bet.icon}</div>
                  <div className="text-white font-bold text-xs">{bet.label}</div>
                  <div className="text-cyan-300 text-[10px]">{bet.description}</div>
                  <div className="text-cyan-400 text-[10px] font-semibold">{bet.odds}</div>
                </button>
              ))}
            </div>

            {/* Bet Amount Selection */}
            <div className="flex gap-2 justify-center">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    selectedAmount === amount
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-2 border-orange-400'
                      : 'bg-blue-900/50 text-cyan-300 border-2 border-cyan-800/50 hover:border-cyan-600'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Action Buttons - All buttons visible */}
            <div className="grid grid-cols-3 gap-2">
              {/* Place Bet Button - Always visible */}
              <Button
                onClick={handlePlaceBet}
                disabled={!canPlaceBet()}
                className="py-3 text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/50"
              >
                PLACE BET
              </Button>

              {/* Lock Button - Show when there are unlocked bets */}
              <Button
                onClick={handleLockBet}
                disabled={unlockedBets.length === 0 || gameStatus !== 'countdown' || countdownTime <= 10}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title={unlockedBets.length > 0 ? `Lock ${unlockedBets.length} bet(s)` : 'No bets to lock'}
              >
                <Lock className="w-4 h-4 mr-1" />
                Lock {unlockedBets.length > 0 && `(${unlockedBets.length})`}
              </Button>

              {/* Repeat Button - Show when there are previous round bets */}
              <Button
                onClick={handleRepeatBet}
                disabled={previousRoundBets.length === 0 || gameStatus !== 'countdown' || countdownTime <= 10 || playerChips < previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title={previousRoundBets.length > 0 ? `Repeat ${previousRoundBets.length} bet(s) - Total: ${previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0)}` : 'No previous bets to repeat'}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Repeat {previousRoundBets.length > 0 && `(${previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0)})`}
              </Button>
            </div>

            {/* Cancel Button - Show below when there are unlocked bets */}
            {unlockedBets.length > 0 && (
              <Button
                onClick={handleCancelBet}
                disabled={gameStatus !== 'countdown' || countdownTime <= 10}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title={`Cancel ${unlockedBets.length} bet(s)`}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel All Bets ({unlockedBets.length})
              </Button>
            )}

            {/* Current Bets Display */}
            {currentBets.length > 0 && (
              <div className="text-cyan-300 text-xs text-center">
                Total Bet: {totalBetAmount} chips ({currentBets.length} bet{currentBets.length > 1 ? 's' : ''})
              </div>
            )}

            {/* Locked Status */}
            {lockedBets.length > 0 && (
              <div className="bg-yellow-600/20 border border-yellow-600 rounded p-2 text-center">
                <span className="text-yellow-400 font-bold text-xs">
                  <Lock className="w-4 h-4 inline mr-1" />
                  {lockedBets.length} BET(S) LOCKED FOR NEXT ROUND
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Results - Bottom with Better Visibility */}
        <div className="mt-2 bg-black/30 rounded-lg p-2">
          <div className="text-cyan-300 text-xs mb-2 text-center font-bold">RECENT RESULTS</div>
          <div className="flex justify-center gap-2">
            {recentResults.slice(0, 7).map((result) => (
              <div 
                key={result.id}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-3 shadow-lg ${
                  result.cardColor === 'red' 
                    ? 'bg-gradient-to-br from-orange-500 to-orange-700 border-orange-300 text-white shadow-orange-500/50' 
                    : 'bg-gradient-to-br from-cyan-400 to-blue-500 border-cyan-300 text-white shadow-cyan-500/50'
                }`}
                title={`${result.cardNumber}`}
              >
                {result.cardNumber}
              </div>
            ))}
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
