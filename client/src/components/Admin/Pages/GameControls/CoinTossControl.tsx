import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Coins, AlertTriangle, Clock, Dice1, DollarSign, Target, ArrowLeft } from 'lucide-react';

interface CoinTossRoundData {
  gameId: number;
  totalBets: number;
  betsByType: {
    heads: number;
    tails: number;
  };
  status: string;
  timeRemaining: number;
  currentResult: 'heads' | 'tails' | null;
}

export default function CoinTossControl() {
  const navigate = useNavigate();
  const [coinTossRound, setCoinTossRound] = useState<CoinTossRoundData | null>(null);
  const [isLoadingCoinTossRound, setIsLoadingCoinTossRound] = useState(false);
  const [showCoinTossConfirmDialog, setShowCoinTossConfirmDialog] = useState(false);
  const [pendingCoinTossOverride, setPendingCoinTossOverride] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCoinTossRound(true);
    const interval = setInterval(() => fetchCoinTossRound(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCoinTossRound = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setIsLoadingCoinTossRound(true);
      const response = await fetch('/api/admin/coin-toss/current-round');
      if (response.ok) {
        const data = await response.json();
        setCoinTossRound(data);
      }
    } catch (err) {
      console.error('Failed to fetch coin toss round data:', err);
    } finally {
      if (isInitialLoad) setIsLoadingCoinTossRound(false);
    }
  };

  const handleCoinTossOverrideResult = (selectedResult: string) => {
    if (!coinTossRound || !selectedResult) return;
    setPendingCoinTossOverride(selectedResult);
    setShowCoinTossConfirmDialog(true);
  };

  const confirmCoinTossOverride = async () => {
    if (!coinTossRound || !pendingCoinTossOverride) return;
    setShowCoinTossConfirmDialog(false);

    try {
      const response = await fetch('/api/admin/coin-toss/override-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: coinTossRound.gameId,
          overrideResult: pendingCoinTossOverride,
        }),
      });

      if (response.ok) {
        setShowSuccessMessage(`Coin toss result overridden to: ${pendingCoinTossOverride}`);
        fetchCoinTossRound();
        setTimeout(() => setShowSuccessMessage(null), 3000);
      } else {
        setShowErrorMessage('Failed to override coin toss result');
        setTimeout(() => setShowErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error overriding coin toss result:', err);
      setShowErrorMessage('Error overriding coin toss result');
      setTimeout(() => setShowErrorMessage(null), 3000);
    } finally {
      setPendingCoinTossOverride(null);
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
          <Coins className="w-8 h-8" />
          🪙 Coin Toss Results Control
        </h1>
        <p className="text-neo-text-secondary">Override Coin Toss game results during countdown phase</p>
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

      <div className="neo-glass-card p-6" style={{
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.1) 100%)',
        borderColor: 'rgba(234, 179, 8, 0.3)'
      }}>
        {isLoadingCoinTossRound ? (
          <div className="text-center py-8 text-yellow-300">Loading coin toss round data...</div>
        ) : coinTossRound ? (
          <div>
            <div className="bg-yellow-950/50 p-4 rounded mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-yellow-200">
                  <div className="text-sm">Game ID</div>
                  <div className="text-xl font-bold">#{coinTossRound.gameId}</div>
                </div>
                <div className="text-yellow-200">
                  <div className="text-sm">Status</div>
                  <div className="text-xl font-bold capitalize">{coinTossRound.status}</div>
                </div>
                <div className="text-yellow-200">
                  <div className="text-sm">Total Bets</div>
                  <div className="text-xl font-bold">{coinTossRound.totalBets}</div>
                </div>
              </div>

              <h4 className="text-yellow-300 font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Betting Statistics:
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-yellow-900/50 p-3 rounded border border-yellow-400">
                  <div className="text-center">
                    <div className="text-yellow-300 font-semibold">Heads</div>
                    <div className="text-white text-lg">{coinTossRound.betsByType.heads}</div>
                    <div className="text-gray-300 text-sm">chips</div>
                  </div>
                </div>
                <div className="bg-yellow-900/50 p-3 rounded border border-blue-400">
                  <div className="text-center">
                    <div className="text-blue-300 font-semibold">Tails</div>
                    <div className="text-white text-lg">{coinTossRound.betsByType.tails}</div>
                    <div className="text-gray-300 text-sm">chips</div>
                  </div>
                </div>
              </div>
            </div>

            {coinTossRound.currentResult && (
              <div className="border-t border-yellow-600 pt-6 mb-6">
                <h4 className="text-yellow-300 font-semibold mb-3 flex items-center gap-2">
                  <Dice1 className="w-5 h-5" />
                  Current System Result:
                </h4>
                <div className="bg-blue-900/20 border border-blue-500 p-4 rounded">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                      {coinTossRound.currentResult.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-yellow-600 pt-4">
              <h4 className="text-yellow-300 font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Admin Override:
              </h4>
              
              {coinTossRound.status === 'countdown' && coinTossRound.timeRemaining && (
                <div className="bg-yellow-900/20 border border-yellow-500 p-4 rounded mb-4">
                  <div className="text-yellow-300 font-bold text-lg flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5" />
                    Override Window: {Math.max(0, Math.ceil(coinTossRound.timeRemaining))}s remaining
                  </div>
                </div>
              )}
              
              <div className="bg-red-900/20 border border-red-500 p-4 rounded mb-4">
                <p className="text-red-300 text-sm font-medium">
                  ⚠️ WARNING: This will override the natural coin toss result.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleCoinTossOverrideResult('heads')} className="bg-yellow-600 hover:bg-yellow-700 text-white py-6 text-lg" disabled={coinTossRound.status !== 'countdown'}>
                  <Coins className="w-5 h-5 inline mr-2" />
                  Force Heads Win
                </Button>
                <Button onClick={() => handleCoinTossOverrideResult('tails')} className="bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg" disabled={coinTossRound.status !== 'countdown'}>
                  <Target className="w-5 h-5 inline mr-2" />
                  Force Tails Win
                </Button>
              </div>
              
              {coinTossRound.status !== 'countdown' && (
                <p className="text-gray-400 text-sm mt-2">* Results can only be overridden during the countdown phase</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-yellow-300">No active coin toss round found</div>
        )}
      </div>

      <Dialog open={showCoinTossConfirmDialog} onOpenChange={setShowCoinTossConfirmDialog}>
        <DialogContent className="neo-glass-card border-neo-accent/30">
          <DialogHeader>
            <DialogTitle className="text-neo-accent font-heading font-bold">⚠️ Confirm Coin Toss Override</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neo-text text-center">
              Are you sure you want to override the coin toss result to:
            </p>
            <div className="text-center mt-4">
              <span className="inline-block bg-white/20 px-4 py-2 rounded-lg border-2 border-neo-accent text-neo-accent font-heading font-bold text-lg">
                {pendingCoinTossOverride?.toUpperCase()}
              </span>
            </div>
            <p className="text-neo-danger text-sm text-center mt-4">
              This action will permanently affect the coin toss outcome and cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCoinTossConfirmDialog(false)} className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg">
              Cancel
            </Button>
            <Button onClick={confirmCoinTossOverride} className="border-2 border-neo-danger bg-neo-danger/30 text-neo-text hover:bg-neo-danger hover:text-white">
              Yes, Override Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
