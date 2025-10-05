import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../lib/stores/useGameStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAudio } from '../lib/stores/useAudio';

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
      setCurrentBets([]);
      setSelectedBetType('');
    }
  }, [gameStatus]);

  const canPlaceBet = () => {
    return gameStatus === 'countdown' && 
           countdownTime > 10 && 
           selectedBetType && 
           selectedAmount > 0 && 
           totalBetAmount + selectedAmount <= playerChips;
  };

  const handlePlaceBet = () => {
    if (!canPlaceBet()) return;

    const betType = BET_TYPES.find(type => type.id === selectedBetType);
    if (!betType) return;

    const newBet: Bet = {
      type: selectedBetType,
      value: selectedBetType === 'lucky7' ? '7' : selectedBetType,
      amount: selectedAmount
    };

    setCurrentBets(prev => [...prev, newBet]);
    playHit();

    // Emit bet to server
    socket.emit('place-bet', {
      roomId,
      betType: selectedBetType,
      betValue: newBet.value,
      amount: selectedAmount
    });

    // Reset selection
    setSelectedBetType('');
  };

  const handleRemoveBet = (index: number) => {
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
      
      <CardContent className="space-y-4">
        {/* Current Bets */}
        {currentBets.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-casino-gold font-semibold text-sm">Your Bets:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {currentBets.map((bet, index) => (
                <div key={index} className="flex items-center justify-between bg-casino-green p-2 rounded text-white text-sm">
                  <span>{BET_TYPES.find(t => t.id === bet.type)?.label} - {bet.amount} chips</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRemoveBet(index)}
                    className="h-6 px-2 text-xs border-casino-red text-casino-red hover:bg-casino-red hover:text-white"
                  >
                    ❌
                  </Button>
                </div>
              ))}
            </div>
            <div className="text-casino-gold font-bold text-right">
              Total: {totalBetAmount} chips
            </div>
          </div>
        )}

        {/* Bet Type Selection */}
        <div className="space-y-2">
          <h4 className="text-casino-gold font-semibold text-sm">Select Bet Type:</h4>
          <div className="grid grid-cols-1 gap-2">
            {BET_TYPES.map(betType => (
              <Button
                key={betType.id}
                variant={selectedBetType === betType.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBetType(betType.id)}
                disabled={gameStatus !== 'countdown' || countdownTime <= 10}
                className={`text-left justify-start h-auto py-2 px-3 ${
                  selectedBetType === betType.id 
                    ? 'bg-casino-red text-white border-casino-red' 
                    : 'bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black'
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold">{betType.label}</span>
                    <span className="text-xs">{betType.odds}</span>
                  </div>
                  <span className="text-xs opacity-75">{betType.description}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Bet Amount Selection */}
        <div className="space-y-2">
          <h4 className="text-casino-gold font-semibold text-sm">Bet Amount:</h4>
          <div className="grid grid-cols-4 gap-2">
            {BET_AMOUNTS.map(amount => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAmount(amount)}
                disabled={amount > playerChips - totalBetAmount}
                className={`${
                  selectedAmount === amount 
                    ? 'bg-casino-gold text-casino-black border-casino-gold' 
                    : 'bg-transparent border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black'
                } ${amount > playerChips - totalBetAmount ? 'opacity-50' : ''}`}
              >
                {amount >= 1000 ? `${amount/1000}k` : amount}
              </Button>
            ))}
          </div>
          
          {/* Quick Multipliers */}
          <div className="flex gap-2 items-center">
            <span className="text-casino-gold text-xs font-semibold">Quick Bet:</span>
            {MULTIPLIERS.map(multiplier => (
              <Button
                key={multiplier}
                variant="outline"
                size="sm"
                onClick={() => handleMultiplyBet(multiplier)}
                disabled={selectedAmount * multiplier > playerChips - totalBetAmount}
                className="bg-transparent border-casino-red text-casino-red hover:bg-casino-red hover:text-white disabled:opacity-30"
              >
                {multiplier}x
              </Button>
            ))}
          </div>
        </div>

        {/* Place Bet Button */}
        <Button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet()}
          className="w-full bg-casino-red hover:bg-red-700 text-white font-bold py-3 glow-red disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedBetType && selectedAmount ? 
            `Place Bet: ${selectedAmount} chips on ${BET_TYPES.find(t => t.id === selectedBetType)?.label}` :
            'Select bet type and amount'
          }
        </Button>

        {/* Betting Tips */}
        <div className="text-xs text-casino-gold bg-casino-green p-2 rounded">
          <p><strong>Tip:</strong> 7 is the house number - Red/Black lose on 7!</p>
          <p>• Red/Black (loses on 7), High (8-13), Low (1-6): Even money (1:1)</p>
          <p>• Lucky 7: High payout (11:1)</p>
        </div>
      </CardContent>
    </Card>
  );
}