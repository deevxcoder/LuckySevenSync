import { useState, useEffect } from 'react';
import { socket } from '../../lib/socket';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Coins, Target, Lock, DollarSign } from 'lucide-react';

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
  { id: 'heads', label: 'Heads', description: 'Bet on Heads', odds: '1:1', icon: 'coins' },
  { id: 'tails', label: 'Tails', description: 'Bet on Tails', odds: '1:1', icon: 'target' },
];

const BET_AMOUNTS = [10, 50, 100, 500, 1000, 2000];

export default function CoinTossBettingPanel({ playerChips, gameStatus, countdownTime, roomId, onBetsChange }: BettingPanelProps) {
  const [selectedBetType, setSelectedBetType] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [totalBetAmount, setTotalBetAmount] = useState<number>(0);

  useEffect(() => {
    const total = currentBets.reduce((sum, bet) => sum + bet.amount, 0);
    setTotalBetAmount(total);
    if (onBetsChange) {
      onBetsChange(currentBets);
    }
  }, [currentBets]);

  useEffect(() => {
    if (gameStatus === 'revealing' || gameStatus === 'waiting') {
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
      value: selectedBetType,
      amount: selectedAmount
    };

    setCurrentBets(prev => [...prev, newBet]);

    socket.emit('coin-toss-place-bet', {
      roomId,
      betType: selectedBetType,
      amount: selectedAmount
    });

    console.log(`Placed coin toss bet: ${selectedAmount} on ${selectedBetType}`);
  };

  const handleRemoveBet = (index: number) => {
    const removedBet = currentBets[index];
    setCurrentBets(prev => prev.filter((_, i) => i !== index));
    console.log(`Removed bet: ${removedBet.amount} on ${removedBet.type}`);
  };

  const remainingChips = playerChips - totalBetAmount;
  const bettingWindowClosed = gameStatus !== 'countdown' || countdownTime <= 10;

  return (
    <Card className="neo-glass-card border-neo-accent/30 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-heading font-bold text-neo-accent flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Place Your Bets
          </span>
          {bettingWindowClosed && (
            <Badge variant="destructive" className="text-lg flex items-center gap-1">
              <Lock className="w-4 h-4" />
              Betting Closed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BET_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedBetType(type.id)}
              disabled={bettingWindowClosed}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedBetType === type.id
                  ? type.id === 'heads'
                    ? 'border-neo-accent bg-neo-accent/20 text-neo-accent scale-105 shadow-lg'
                    : 'border-neo-accent-secondary bg-neo-accent-secondary/20 text-neo-accent-secondary scale-105 shadow-lg'
                  : bettingWindowClosed
                  ? 'border-gray-600 bg-gray-700/50 text-gray-400 cursor-not-allowed'
                  : type.id === 'heads'
                  ? 'border-neo-accent/50 bg-gray-800/50 text-neo-text hover:border-neo-accent hover:bg-gray-700/50'
                  : 'border-neo-accent-secondary/50 bg-gray-800/50 text-neo-text hover:border-neo-accent-secondary hover:bg-gray-700/50'
              }`}
            >
              <div className="text-3xl mb-2 flex justify-center">
                {type.icon === 'coins' ? <Coins className="w-8 h-8" /> : <Target className="w-8 h-8" />}
              </div>
              <div className="font-heading font-bold text-lg">{type.label}</div>
              <div className="text-sm opacity-80">{type.description}</div>
              <div className="text-xs mt-2 font-mono font-bold" style={{
                color: type.id === 'heads' ? '#00FFC6' : '#FF005C'
              }}>Odds: {type.odds}</div>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-neo-accent font-heading font-semibold">Select Bet Amount</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {BET_AMOUNTS.map(amount => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                disabled={bettingWindowClosed || amount > remainingChips}
                className={`p-3 rounded-lg font-mono font-bold transition-all ${
                  selectedAmount === amount
                    ? 'bg-neo-accent text-neo-bg scale-105 shadow-lg'
                    : amount > remainingChips || bettingWindowClosed
                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700/50 text-neo-accent hover:bg-gray-600/50 border border-neo-accent/30'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-neo-accent/20 space-y-2">
          <div className="flex justify-between text-neo-text">
            <span className="font-mono">Available Chips:</span>
            <span className="font-mono font-bold text-neo-accent">{remainingChips}</span>
          </div>
          <div className="flex justify-between text-neo-text">
            <span className="font-mono">Total Bet:</span>
            <span className="font-mono font-bold text-neo-accent">{totalBetAmount}</span>
          </div>
        </div>

        {currentBets.length > 0 && (
          <div className="space-y-2">
            <label className="text-neo-accent font-heading font-semibold">Current Bets</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {currentBets.map((bet, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-gray-800/50 backdrop-blur-sm border border-neo-accent/20 p-3 rounded-lg"
                >
                  <span className="text-neo-text font-heading font-semibold flex items-center gap-2">
                    {bet.type === 'heads' ? <Coins className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                    {BET_TYPES.find(t => t.id === bet.type)?.label || bet.type}
                  </span>
                  <span className="text-neo-accent font-mono font-bold">{bet.amount} chips</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveBet(index)}
                    disabled={bettingWindowClosed}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet()}
          className={`w-full text-xl font-heading font-bold py-6 ${
            canPlaceBet()
              ? 'bg-neo-accent text-neo-bg hover:bg-neo-accent/90 border-2 border-neo-accent'
              : 'bg-gray-600/50 cursor-not-allowed border border-gray-600'
          }`}
        >
          {!selectedBetType
            ? 'Select a bet type'
            : selectedAmount > remainingChips
            ? 'Insufficient chips'
            : bettingWindowClosed
            ? 'Betting window closed'
            : `Place Bet: ${selectedAmount} chips on ${BET_TYPES.find(t => t.id === selectedBetType)?.label}`}
        </Button>

        <div className="text-xs text-neo-text-secondary bg-gray-800/50 backdrop-blur-sm border border-neo-accent/20 p-3 rounded-lg">
          <p className="font-heading font-bold text-neo-accent mb-1">How to Play:</p>
          <p>• Choose Heads or Tails</p>
          <p>• Select your bet amount</p>
          <p>• Click "Place Bet" to confirm</p>
          <p>• Win 2x your bet if you guess correctly!</p>
          <p>• Betting closes 10 seconds before result is revealed</p>
        </div>
      </CardContent>
    </Card>
  );
}
