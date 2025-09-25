import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface BetResult {
  type: string;
  value: string;
  amount: number;
  won: boolean;
  winAmount: number;
  betTypeLabel: string;
}

interface BetResultPopupProps {
  isOpen: boolean;
  onClose: () => void;
  betResults: BetResult[];
  totalWinAmount: number;
  revealedCard: {
    number: number;
    color: 'red' | 'black';
    suit: string;
  };
}

export default function BetResultPopup({ 
  isOpen, 
  onClose, 
  betResults, 
  totalWinAmount,
  revealedCard 
}: BetResultPopupProps) {
  const totalBetAmount = betResults.reduce((sum, bet) => sum + bet.amount, 0);
  // Calculate actual winnings (profit) instead of total payout
  const totalWinnings = betResults.reduce((sum, bet) => {
    return sum + (bet.won ? bet.winAmount - bet.amount : 0);
  }, 0);
  const netAmount = totalWinnings - 0; // Net winnings (already excludes stakes)
  const overallWin = netAmount > 0;

  const getResultIcon = (won: boolean) => {
    return won ? '🎉' : '😞';
  };

  const getResultColor = (won: boolean) => {
    return won ? 'text-green-500' : 'text-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-casino-black border-casino-gold border-2 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-casino-gold text-2xl text-center flex items-center justify-center gap-2">
            {getResultIcon(overallWin)}
            {overallWin ? 'You Won!' : 'You Lost!'}
            {getResultIcon(overallWin)}
          </DialogTitle>
          <DialogDescription className="text-center text-white">
            Card revealed: 
            <span className={`font-bold ml-2 ${revealedCard.color === 'red' ? 'text-red-500' : 'text-gray-300'}`}>
              {revealedCard.number} {revealedCard.suit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Result */}
          <Card className="bg-casino-green border-casino-gold">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold">
                <span className={overallWin ? 'text-green-400' : 'text-red-400'}>
                  {overallWin ? '+' : ''}{totalWinnings} chips
                </span>
              </div>
              <div className="text-sm opacity-75">
                Total bet: {totalBetAmount} chips • Total winnings: {totalWinnings} chips
              </div>
            </CardContent>
          </Card>

          {/* Individual Bet Results */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <h4 className="text-casino-gold font-semibold text-sm">Bet Results:</h4>
            {betResults.map((bet, index) => (
              <div key={index} className="flex items-center justify-between bg-casino-green p-3 rounded border border-casino-gold/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getResultIcon(bet.won)}</span>
                  <div>
                    <div className="font-medium text-sm">{bet.betTypeLabel}</div>
                    <div className="text-xs opacity-75">Bet: {bet.amount} chips</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={`${bet.won 
                      ? 'bg-green-600 text-white' 
                      : 'bg-red-600 text-white'
                    }`}
                  >
                    {bet.won ? `+${bet.winAmount}` : `-${bet.amount}`}
                  </Badge>
                  <div className={`text-xs font-medium ${getResultColor(bet.won)}`}>
                    {bet.won ? 'WIN' : 'LOST'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Close Button */}
          <Button 
            onClick={onClose}
            className="w-full bg-casino-gold text-casino-black hover:bg-casino-gold/90 font-bold"
          >
            Continue Playing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}