import { useState, useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../lib/stores/useGameStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAudio } from '../lib/stores/useAudio';
import { Lock, RotateCcw, X, CheckCircle } from 'lucide-react';

interface BettingPanelProps {
  playerChips: number;
  gameStatus: string;
  countdownTime: number;
  roomId: string;
  onBetsChange?: (bets: Bet[]) => void;
}

interface Bet {
  type: string;
  value: string;
  amount: number;
  betId?: number;
}

const BET_TYPES = [
  { id: 'red', label: '🔴 Red', description: 'Bet on red card (7 loses)', odds: '1:1' },
  { id: 'black', label: '⚫ Black', description: 'Bet on black card (7 loses)', odds: '1:1' },
  { id: 'high', label: '📈 High (8-13)', description: 'Bet on high numbers', odds: '1:1' },
  { id: 'low', label: '📉 Low (1-6)', description: 'Bet on low numbers', odds: '1:1' },
  { id: 'lucky7', label: '🍀 Lucky 7', description: 'Bet on number 7', odds: '11:1' },
];

const BET_AMOUNTS = [5, 10, 50, 100, 500, 1000, 2000, 5000];
const MULTIPLIERS = [2, 5, 10];

export default function BettingPanel({ playerChips, gameStatus, countdownTime, roomId, onBetsChange }: BettingPanelProps) {
  const [selectedBetType, setSelectedBetType] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [totalBetAmount, setTotalBetAmount] = useState<number>(0);
  const [lockedBets, setLockedBets] = useState<Bet[]>([]);
  const [unlockedBets, setUnlockedBets] = useState<Bet[]>([]);
  const [previousRoundBets, setPreviousRoundBets] = useState<Bet[]>([]);
  const lastValidBetsRef = useRef<Bet[]>([]);
  const { playHit, playSuccess } = useAudio();

  // Calculate total bet amount and notify parent
  useEffect(() => {
    const total = currentBets.reduce((sum, bet) => sum + bet.amount, 0);
    setTotalBetAmount(total);
    // Notify parent component about bet changes
    if (onBetsChange) {
      onBetsChange(currentBets);
    }
  }, [currentBets]); // Removed onBetsChange from dependencies to prevent infinite loop

  // Reset bets when game starts
  useEffect(() => {
    if (gameStatus === 'revealed' || gameStatus === 'waiting') {
      // Save current bets to previous round before clearing
      setPreviousRoundBets(lastValidBetsRef.current);
      setCurrentBets([]);
      setSelectedBetType('');
      setLockedBets([]);
      setUnlockedBets([]);
    }
  }, [gameStatus]);

  // Socket event listeners
  useEffect(() => {
    const handleBetPlaced = (data: { bet: any; chips: number; locked: boolean }) => {
      // Update the betId of the most recent unlocked bet (the one we just placed)
      setUnlockedBets(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastBet = updated[updated.length - 1];
        if (!lastBet.betId) {
          lastBet.betId = data.bet.id;
        }
        return updated;
      });
      
      // Update currentBets with betId
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
      // Remove unlocked bets from current bets
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

  const canPlaceBet = () => {
    return gameStatus === 'countdown' && 
           countdownTime > 10 && 
           selectedBetType && 
           selectedAmount > 0 && 
           totalBetAmount + selectedAmount <= playerChips;
  };

  const handlePlaceBet = () => {
    if (!canPlaceBet()) return;
    if (lockedBets.length > 0) {
      alert('You have locked bets. Locked bets cannot be changed.');
      return;
    }

    const betType = BET_TYPES.find(type => type.id === selectedBetType);
    if (!betType) return;

    // Create the bet locally for immediate UI feedback
    const newBet: Bet = {
      type: selectedBetType,
      value: selectedBetType === 'lucky7' ? '7' : selectedBetType,
      amount: selectedAmount
    };

    // Add to currentBets immediately
    setCurrentBets(prev => {
      const updated = [...prev, newBet];
      lastValidBetsRef.current = updated;
      return updated;
    });

    // Track as unlocked bet (server will send betId via socket)
    setUnlockedBets(prev => [...prev, newBet]);

    playHit();

    // Emit bet to server
    socket.emit('place-bet', {
      roomId,
      betType: selectedBetType,
      betValue: selectedBetType === 'lucky7' ? '7' : selectedBetType,
      amount: selectedAmount
    });

    // Reset selection
    setSelectedBetType('');
  };

  const handleLockBet = () => {
    if (unlockedBets.length === 0) return;

    socket.emit('lock-bet', {
      roomId
    });

    console.log(`Locking ${unlockedBets.length} bet(s)`);
  };

  const handleCancelBet = () => {
    if (unlockedBets.length === 0) return;

    socket.emit('cancel-bet', {
      roomId
    });

    console.log(`Cancelling ${unlockedBets.length} unlocked bet(s)`);
  };

  const handleRepeatBet = () => {
    if (previousRoundBets.length === 0) return;
    if (gameStatus !== 'countdown' || countdownTime <= 10) return;
    if (lockedBets.length > 0) return;
    
    // Calculate total amount needed for all previous round bets
    const totalPreviousBetsAmount = previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0);
    const hasEnoughBalance = playerChips >= totalPreviousBetsAmount;
    
    if (!hasEnoughBalance) {
      alert('Insufficient balance to repeat previous round bets');
      return;
    }
    
    // Place all bets from the previous round
    previousRoundBets.forEach(bet => {
      socket.emit('place-bet', {
        roomId,
        betType: bet.type,
        betValue: bet.value,
        amount: bet.amount
      });
    });

    playHit();
    console.log(`Repeating ${previousRoundBets.length} bet(s) from previous round (Total: ${totalPreviousBetsAmount})`);
  };

  const handleRemoveBet = (index: number) => {
    // This is for the old UI - keeping for compatibility but won't work with locked bets
    setCurrentBets(prev => prev.filter((_, i) => i !== index));
    playHit();
  };

  const handleMultiplyBet = (multiplier: number) => {
    const newAmount = selectedAmount * multiplier;
    if (newAmount <= playerChips - totalBetAmount) {
      setSelectedAmount(newAmount);
      playHit();
    }
  };

  const getBettingMessage = () => {
    if (gameStatus !== 'countdown') {
      return 'Waiting for next round...';
    }
    if (countdownTime <= 10) {
      return 'Betting closed! Get ready for reveal!';
    }
    return `Place your bets! Betting time left: ${countdownTime - 10}s`;
  };

  return (
    <Card className="bg-casino-black border-casino-gold border-2">
      <CardHeader>
        <CardTitle className="text-casino-gold text-xl flex items-center justify-between">
          💰 Betting Panel
          <Badge className="bg-casino-green text-white px-3 py-1">
            Chips: {playerChips}
          </Badge>
        </CardTitle>
        <p className="text-white text-sm">
          {getBettingMessage()}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Current Bets - Single Line Display */}
        {currentBets.length > 0 && (
          <div className="bg-casino-green/20 border border-casino-gold rounded p-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-casino-gold text-xs font-bold">Bets:</span>
              {currentBets.map((bet, index) => (
                <div key={index} className="bg-casino-green px-2 py-1 rounded text-white text-xs font-semibold whitespace-nowrap">
                  {BET_TYPES.find(t => t.id === bet.type)?.label.split(' ')[0]} {bet.amount}
                </div>
              ))}
              <span className="text-casino-gold text-xs font-bold ml-auto">
                = {totalBetAmount}
              </span>
            </div>
          </div>
        )}

        {/* Bet Type Selection - Compact Single Row */}
        <div className="space-y-1">
          <h4 className="text-casino-gold font-semibold text-xs">Type:</h4>
          <div className="flex gap-1 flex-wrap">
            {BET_TYPES.map(betType => (
              <Button
                key={betType.id}
                variant={selectedBetType === betType.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBetType(betType.id)}
                disabled={gameStatus !== 'countdown' || countdownTime <= 10}
                className={`px-2 py-1 h-auto text-xs ${
                  selectedBetType === betType.id 
                    ? 'bg-casino-red text-white border-casino-red' 
                    : 'bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black'
                }`}
                title={`${betType.description} (${betType.odds})`}
              >
                {betType.label.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>

        {/* Bet Amount Selection - Compact */}
        <div className="flex gap-2 items-center">
          <span className="text-casino-gold text-xs font-semibold">Amount:</span>
          <div className="flex gap-1 flex-wrap flex-1">
            {BET_AMOUNTS.map(amount => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAmount(amount)}
                disabled={amount > playerChips - totalBetAmount}
                className={`px-2 py-1 h-auto text-xs ${
                  selectedAmount === amount 
                    ? 'bg-casino-gold text-casino-black border-casino-gold' 
                    : 'bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black'
                } ${amount > playerChips - totalBetAmount ? 'opacity-50' : ''}`}
              >
                {amount >= 1000 ? `${amount/1000}k` : amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons Row - Icon Only */}
        <div className="flex gap-2 justify-center">
          {/* Place Bet Button - Icon Only */}
          <Button
            onClick={handlePlaceBet}
            disabled={!canPlaceBet()}
            className="bg-casino-red hover:bg-red-700 text-white font-bold p-3 glow-red disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedBetType && selectedAmount ? 
              `Place Bet: ${selectedAmount} chips on ${BET_TYPES.find(t => t.id === selectedBetType)?.label}` :
              'Select bet type and amount'
            }
          >
            <CheckCircle className="w-6 h-6" />
          </Button>

          {/* Lock Bet Button - Icon Only */}
          {unlockedBets.length > 0 && (
            <Button
              onClick={handleLockBet}
              disabled={gameStatus !== 'countdown' || countdownTime <= 10}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold p-3 disabled:opacity-50 disabled:cursor-not-allowed relative"
              title={`Lock ${unlockedBets.length} bet(s)`}
            >
              <Lock className="w-6 h-6" />
              {unlockedBets.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unlockedBets.length}
                </span>
              )}
            </Button>
          )}

          {/* Cancel Bet Button - Icon Only */}
          {unlockedBets.length > 0 && (
            <Button
              onClick={handleCancelBet}
              disabled={gameStatus !== 'countdown' || countdownTime <= 10}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold p-3 disabled:opacity-50 disabled:cursor-not-allowed relative"
              title={`Cancel ${unlockedBets.length} bet(s)`}
            >
              <X className="w-6 h-6" />
              {unlockedBets.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unlockedBets.length}
                </span>
              )}
            </Button>
          )}

          {/* Repeat Last Round Button - Icon Only */}
          {previousRoundBets.length > 0 && unlockedBets.length === 0 && lockedBets.length === 0 && (
            <Button
              onClick={handleRepeatBet}
              disabled={gameStatus !== 'countdown' || countdownTime <= 10 || playerChips < previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 disabled:opacity-50 disabled:cursor-not-allowed relative"
              title={`Repeat ${previousRoundBets.length} bet(s) - Total: ${previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0)}`}
            >
              <RotateCcw className="w-6 h-6" />
              {previousRoundBets.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {previousRoundBets.length}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Locked Status - Compact */}
        {lockedBets.length > 0 && (
          <div className="bg-yellow-600/20 border border-yellow-600 rounded p-1.5 text-center">
            <span className="text-yellow-400 font-bold text-xs flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              {lockedBets.length} Locked
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}