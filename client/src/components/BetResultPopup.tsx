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
      <DialogContent className="bg-gradient-to-br from-[#0a1628] to-[#1a2b4a] border-cyan-400 border-4 text-white max-w-lg z-50 shadow-2xl shadow-cyan-500/50">
        <DialogHeader>
          <DialogTitle className="text-3xl md:text-4xl text-center flex items-center justify-center gap-3 mb-2">
            <span className="text-5xl">{getResultIcon(overallWin)}</span>
            <span className={`font-bold ${overallWin ? 'text-green-400' : 'text-red-400'}`}>
              {overallWin ? 'You Won!' : 'You Lost!'}
            </span>
            <span className="text-5xl">{getResultIcon(overallWin)}</span>
          </DialogTitle>
          <DialogDescription className="text-center text-cyan-300 text-lg">
            Card revealed: 
            <span className={`font-bold ml-2 text-xl ${revealedCard.color === 'red' ? 'text-orange-400' : 'text-cyan-400'}`}>
              {revealedCard.number} {revealedCard.suit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Result - More Prominent */}
          <Card className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-cyan-400 border-2 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">
                <span className={overallWin ? 'text-green-400' : 'text-red-400'}>
                  {overallWin ? '+' : ''}{totalWinnings}
                </span>
                <span className="text-cyan-300 text-2xl ml-2">chips</span>
              </div>
              <div className="text-sm text-cyan-400">
                Total bet: {totalBetAmount} • Total winnings: {totalWinnings}
              </div>
            </CardContent>
          </Card>

          {/* Individual Bet Results */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <h4 className="text-cyan-400 font-semibold text-sm">Bet Results:</h4>
            {betResults.map((bet, index) => (
              <div key={index} className="flex items-center justify-between bg-cyan-900/30 p-3 rounded-lg border border-cyan-600/30">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getResultIcon(bet.won)}</span>
                  <div>
                    <div className="font-medium text-sm text-white">{bet.betTypeLabel}</div>
                    <div className="text-xs text-cyan-300">Bet: {bet.amount} chips</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={`${bet.won 
                      ? 'bg-green-500 text-white border-green-400' 
                      : 'bg-red-500 text-white border-red-400'
                    } border-2 font-bold`}
                  >
                    {bet.won ? `+${bet.winAmount}` : `-${bet.amount}`}
                  </Badge>
                  <div className={`text-xs font-bold ${getResultColor(bet.won)}`}>
                    {bet.won ? 'WIN' : 'LOST'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Close Button - More Prominent */}
          <Button 
            onClick={onClose}
            className="w-full py-4 text-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold shadow-lg shadow-cyan-500/50"
          >
            Continue Playing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}