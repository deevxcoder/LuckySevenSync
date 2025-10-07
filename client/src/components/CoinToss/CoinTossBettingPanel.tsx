import { useState, useEffect } from 'react';
import { socket } from '../../lib/socket';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
  { id: 'heads', label: '🪙 Heads', description: 'Bet on Heads', odds: '1:1' },
  { id: 'tails', label: '🎯 Tails', description: 'Bet on Tails', odds: '1:1' },
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
    <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white flex items-center justify-between">
          <span>🎲 Place Your Bets</span>
          {bettingWindowClosed && (
            <Badge variant="destructive" className="text-lg">
              🔒 Betting Closed
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
                  ? 'border-yellow-400 bg-yellow-600 text-white scale-105 shadow-lg'
                  : bettingWindowClosed
                  ? 'border-gray-600 bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'border-gray-600 bg-gray-800 text-white hover:border-yellow-500 hover:bg-gray-700'
              }`}
            >
              <div className="text-3xl mb-2">{type.label.split(' ')[0]}</div>
              <div className="font-bold text-lg">{type.label.split(' ')[1]}</div>
              <div className="text-sm opacity-80">{type.description}</div>
              <div className="text-xs mt-2 font-bold text-yellow-400">Odds: {type.odds}</div>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-white font-semibold">Select Bet Amount</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {BET_AMOUNTS.map(amount => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                disabled={bettingWindowClosed || amount > remainingChips}
                className={`p-3 rounded-lg font-bold transition-all ${
                  selectedAmount === amount
                    ? 'bg-yellow-500 text-black scale-105 shadow-lg'
                    : amount > remainingChips || bettingWindowClosed
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-700 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-white">
            <span>Available Chips:</span>
            <span className="font-bold text-green-400">{remainingChips}</span>
          </div>
          <div className="flex justify-between text-white">
            <span>Total Bet:</span>
            <span className="font-bold text-yellow-400">{totalBetAmount}</span>
          </div>
        </div>

        {currentBets.length > 0 && (
          <div className="space-y-2">
            <label className="text-white font-semibold">Current Bets</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {currentBets.map((bet, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"
                >
                  <span className="text-white font-semibold">
                    {BET_TYPES.find(t => t.id === bet.type)?.label || bet.type}
                  </span>
                  <span className="text-yellow-400 font-bold">{bet.amount} chips</span>
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
          className={`w-full text-xl font-bold py-6 ${
            canPlaceBet()
              ? 'bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800'
              : 'bg-gray-600 cursor-not-allowed'
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

        <div className="text-xs text-yellow-300 bg-gray-800 p-2 rounded">
          <p><strong>How to Play:</strong></p>
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
