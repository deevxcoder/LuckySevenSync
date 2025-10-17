import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Target, AlertTriangle, ArrowLeft } from 'lucide-react';

interface CurrentRoundData {
  gameId: number;
  totalBets: number;
  betsByType: {
    red: number;
    black: number;
    low: number;
    high: number;
    lucky7: number;
  };
  status: 'betting' | 'countdown' | 'revealed' | 'waiting';
  timeRemaining?: number;
  currentCard?: {
    number: number;
    suit: string;
    color: 'red' | 'black';
    revealed: boolean;
  };
}

export default function Lucky7Control() {
  const navigate = useNavigate();
  const [currentRound, setCurrentRound] = useState<CurrentRoundData | null>(null);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentRound(true);
    const interval = setInterval(() => fetchCurrentRound(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentRound = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setIsLoadingRound(true);
      const response = await fetch('/api/admin/current-round');
      if (response.ok) {
        const data = await response.json();
        setCurrentRound(data);
      }
    } catch (err) {
      console.error('Failed to fetch current round data:', err);
    } finally {
      if (isInitialLoad) setIsLoadingRound(false);
    }
  };

  const handleOverrideResult = (selectedResult: string) => {
    if (!currentRound || !selectedResult) return;
    setPendingOverride(selectedResult);
    setShowConfirmDialog(true);
  };

  const confirmOverride = async () => {
    if (!currentRound || !pendingOverride) return;
    setShowConfirmDialog(false);

    try {
      const response = await fetch('/api/admin/override-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentRound.gameId,
          overrideResult: pendingOverride,
        }),
      });

      if (response.ok) {
        setShowSuccessMessage(`Lucky 7 result overridden to: ${pendingOverride}`);
        fetchCurrentRound();
        setTimeout(() => setShowSuccessMessage(null), 3000);
      } else {
        setShowErrorMessage('Failed to override result');
        setTimeout(() => setShowErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error overriding result:', err);
      setShowErrorMessage('Error overriding result');
      setTimeout(() => setShowErrorMessage(null), 3000);
    } finally {
      setPendingOverride(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button
          onClick={() => navigate('/admin/results')}
          variant="outline"
          className="mb-4 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results Control
        </Button>
        
        <h1 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
          <Target className="w-8 h-8" />
          🎯 Lucky 7 Results Control
        </h1>
        <p className="text-neo-text-secondary">Override Lucky 7 game results during countdown phase</p>
      </div>

      {showSuccessMessage && (
        <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-300">
          {showSuccessMessage}
        </div>
      )}
      {showErrorMessage && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
          {showErrorMessage}
        </div>
      )}

      <div className="neo-glass-card p-6">
        {isLoadingRound ? (
          <div className="text-center text-white py-8">Loading current round data...</div>
        ) : !currentRound || !currentRound.gameId ? (
          <div className="text-center text-white/60 py-8">No active round found.</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">Game ID: {currentRound.gameId}</h3>
                <Badge className={`mt-1 ${
                  currentRound.status === 'countdown' ? 'bg-yellow-600' :
                  currentRound.status === 'revealed' ? 'bg-green-600' :
                  currentRound.status === 'betting' ? 'bg-blue-600' : 'bg-gray-600'
                } text-white`}>
                  {currentRound.status.toUpperCase()}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-purple-accent font-semibold">Total Bets:</p>
                <p className="text-white text-xl">{currentRound.totalBets} chips</p>
              </div>
            </div>

            <div>
              <h4 className="text-purple-accent font-semibold mb-3">Current Round Betting:</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white/10 p-3 rounded border border-red-400/50">
                  <div className="text-center">
                    <div className="text-red-300 font-semibold">🔴 Red</div>
                    <div className="text-white text-lg">{currentRound.betsByType.red}</div>
                    <div className="text-white/60 text-sm">chips</div>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded border border-gray-400/50">
                  <div className="text-center">
                    <div className="text-gray-300 font-semibold">⚫ Black</div>
                    <div className="text-white text-lg">{currentRound.betsByType.black}</div>
                    <div className="text-white/60 text-sm">chips</div>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded border border-blue-400/50">
                  <div className="text-center">
                    <div className="text-blue-300 font-semibold">📉 Low (1-6)</div>
                    <div className="text-white text-lg">{currentRound.betsByType.low}</div>
                    <div className="text-white/60 text-sm">chips</div>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded border border-orange-400/50">
                  <div className="text-center">
                    <div className="text-orange-300 font-semibold">📈 High (8-13)</div>
                    <div className="text-white text-lg">{currentRound.betsByType.high}</div>
                    <div className="text-white/60 text-sm">chips</div>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded border border-yellow-400/50">
                  <div className="text-center">
                    <div className="text-yellow-300 font-semibold">🍀 Lucky 7</div>
                    <div className="text-white text-lg">{currentRound.betsByType.lucky7}</div>
                    <div className="text-white/60 text-sm">chips</div>
                  </div>
                </div>
              </div>
            </div>

            {currentRound.currentCard && (
              <div className="border-t border-casino-gold pt-6">
                <h4 className="text-casino-gold font-semibold mb-3">🎲 Current System Result:</h4>
                <div className="bg-blue-900/20 border border-blue-500 p-4 rounded">
                  <div className="text-center">
                    <div className="text-blue-200 text-sm mb-2">🎴 Generated Card:</div>
                    <div className={`text-3xl font-bold ${currentRound.currentCard.color === 'red' ? 'text-red-400' : 'text-gray-300'}`}>
                      {currentRound.currentCard.number} of {currentRound.currentCard.suit.charAt(0).toUpperCase() + currentRound.currentCard.suit.slice(1)}
                    </div>
                    <div className={`text-lg font-semibold mt-1 ${currentRound.currentCard.color === 'red' ? 'text-red-300' : 'text-gray-400'}`}>
                      {currentRound.currentCard.color.toUpperCase()}
                    </div>
                    <div className="text-blue-100 text-xs mt-2">
                      {currentRound.currentCard.revealed ? 'Revealed to players' : 'Hidden until countdown ends'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-casino-gold pt-4">
              <h4 className="text-casino-gold font-semibold mb-3">⚠️ Admin Override:</h4>
              
              {currentRound.status === 'countdown' && currentRound.timeRemaining && (
                <div className="bg-yellow-900/20 border border-yellow-500 p-4 rounded mb-4">
                  <div className="text-yellow-300 font-bold text-lg text-center">
                    ⏰ Override Window: {Math.max(0, Math.ceil(currentRound.timeRemaining))}s remaining
                  </div>
                </div>
              )}
              
              <div className="bg-red-900/20 border border-red-500 p-4 rounded mb-4">
                <p className="text-red-300 text-sm font-medium">
                  ⚠️ WARNING: This will override the natural game result. Use only when necessary.
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button onClick={() => handleOverrideResult('red')} className="bg-red-600 hover:bg-red-700 text-white" disabled={currentRound.status !== 'countdown'}>
                  Force Red Win
                </Button>
                <Button onClick={() => handleOverrideResult('black')} className="bg-gray-600 hover:bg-gray-700 text-white" disabled={currentRound.status !== 'countdown'}>
                  Force Black Win
                </Button>
                <Button onClick={() => handleOverrideResult('low')} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={currentRound.status !== 'countdown'}>
                  Force Low Win
                </Button>
                <Button onClick={() => handleOverrideResult('high')} className="bg-orange-600 hover:bg-orange-700 text-white" disabled={currentRound.status !== 'countdown'}>
                  Force High Win
                </Button>
                <Button onClick={() => handleOverrideResult('lucky7')} className="bg-yellow-600 hover:bg-yellow-700 text-white" disabled={currentRound.status !== 'countdown'}>
                  Force Lucky 7 Win
                </Button>
              </div>
              
              {currentRound.status !== 'countdown' && (
                <p className="text-gray-400 text-sm mt-2">* Results can only be overridden during the countdown phase</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="neo-glass-card border-neo-accent/30">
          <DialogHeader>
            <DialogTitle className="text-neo-accent font-heading font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Confirm Result Override
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neo-text text-center">
              Are you sure you want to override the game result to:
            </p>
            <div className="text-center mt-4">
              <span className="inline-block bg-white/20 px-4 py-2 rounded-lg border-2 border-neo-accent text-neo-accent font-heading font-bold text-lg">
                {pendingOverride?.toUpperCase()}
              </span>
            </div>
            <p className="text-neo-danger text-sm text-center mt-4">
              This action will permanently affect the game outcome and cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg">
              Cancel
            </Button>
            <Button onClick={confirmOverride} className="border-2 border-neo-danger bg-neo-danger/30 text-neo-text hover:bg-neo-danger hover:text-white">
              Yes, Override Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
