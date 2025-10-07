import { useState, useEffect, useRef } from 'react';
import { socket } from '../../lib/socket';
import { useAuthStore } from '../../lib/stores/useAuthStore';

interface CoinTossRoomData {
  id: string;
  status: string;
  currentResult: 'heads' | 'tails' | null;
  roundNumber: number;
}

interface Bet {
  type: string;
  amount: number;
}

const QUICK_AMOUNTS = [10, 50, 100, 500];

export default function CoinTossRoom() {
  const { user } = useAuthStore();
  const [currentResult, setCurrentResult] = useState<'heads' | 'tails' | null>(null);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [playerChips, setPlayerChips] = useState<number>(1000);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [socketId, setSocketId] = useState<string>('');
  const [totalGameCount, setTotalGameCount] = useState<number>(0);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Betting state
  const [selectedBetType, setSelectedBetType] = useState<'heads' | 'tails' | ''>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [totalBetAmount, setTotalBetAmount] = useState<number>(0);
  const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
  const [betResults, setBetResults] = useState<any[]>([]);
  const [totalWinAmount, setTotalWinAmount] = useState<number>(0);
  const lastValidBetsRef = useRef<any[]>([]);

  useEffect(() => {
    const total = currentBets.reduce((sum, bet) => sum + bet.amount, 0);
    setTotalBetAmount(total);
  }, [currentBets]);

  const enterFullscreen = async () => {
    if (containerRef.current && !document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  const canPlaceBet = () => {
    return gameStatus === 'countdown' && 
           countdownTime > 10 && 
           selectedBetType && 
           selectedAmount > 0 && 
           (playerChips - totalBetAmount) >= selectedAmount;
  };

  const handlePlaceBet = () => {
    if (!canPlaceBet()) return;

    const newBet: Bet = {
      type: selectedBetType,
      amount: selectedAmount
    };

    setCurrentBets(prev => [...prev, newBet]);
    lastValidBetsRef.current = [...currentBets, newBet];

    socket.emit('coin-toss-place-bet', {
      roomId: 'COIN_TOSS_GLOBAL',
      betType: selectedBetType,
      amount: selectedAmount
    });

    console.log(`Placed coin toss bet: ${selectedAmount} on ${selectedBetType}`);
  };

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/player/me', {
          headers: {
            'socket-id': socket.id || '',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setPlayerChips(data.chips);
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    const fetchGameCount = async () => {
      try {
        const response = await fetch('/api/coin-toss/games/count');
        if (response.ok) {
          const data = await response.json();
          setTotalGameCount(data.totalGames);
        }
      } catch (error) {
        console.error('Error fetching game count:', error);
      }
    };

    const fetchRecentGames = async () => {
      try {
        const response = await fetch('/api/coin-toss/games/recent');
        if (response.ok) {
          const games = await response.json();
          setRecentResults(games);
        }
      } catch (error) {
        console.error('Error fetching recent games:', error);
      }
    };

    if (socket.connected && socketId) {
      fetchPlayerData();
      fetchGameCount();
      fetchRecentGames();
    }

    socket.on('connect', () => {
      console.log('Connected to coin toss socket');
      setSocketId(socket.id || '');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from coin toss socket');
    });

    socket.on('coin-toss-room-joined', (data: { room: CoinTossRoomData; player: any }) => {
      console.log('Joined coin toss room:', data);
      setGameStatus(data.room.status);
      setCurrentResult(data.room.currentResult);
    });

    socket.on('coin-toss-game-starting', (data: { room: CoinTossRoomData; countdownTime: number }) => {
      console.log('Coin toss game starting:', data);
      setGameStatus('countdown');
      setCountdownTime(data.countdownTime);
      setCurrentResult(null);
      setCurrentBets([]);
      setShowResultPopup(false);
      setIsFlipping(false);
    });

    socket.on('coin-toss-countdown-tick', (data: { time: number; room: CoinTossRoomData }) => {
      setCountdownTime(data.time);
      setGameStatus(data.room.status);
    });

    socket.on('coin-toss-result-revealed', (data: { result: 'heads' | 'tails'; room: CoinTossRoomData }) => {
      console.log('Coin toss result revealed:', data);
      
      setIsFlipping(true);
      
      setTimeout(() => {
        setCurrentResult(data.result);
        setGameStatus('revealing');
        setIsFlipping(false);

        const betsToProcess = lastValidBetsRef.current.length > 0 ? lastValidBetsRef.current : currentBets;
        
        const results = betsToProcess.map(bet => ({
          betType: bet.type,
          betAmount: bet.amount,
          won: bet.type === data.result,
          winAmount: bet.type === data.result ? bet.amount * 2 : 0,
        }));

        const totalWin = results.reduce((sum, r) => sum + r.winAmount, 0);
        setBetResults(results);
        setTotalWinAmount(totalWin);
        setShowResultPopup(results.length > 0);
      }, 1500);
    });

    socket.on('coin-toss-round-ended', async (data: { room: CoinTossRoomData }) => {
      console.log('Coin toss round ended:', data);
      setGameStatus('waiting');
      setCurrentResult(null);
      setCurrentBets([]);
      lastValidBetsRef.current = [];

      if (user && socket.id) {
        try {
          const response = await fetch('/api/player/me', {
            headers: {
              'socket-id': socket.id,
            },
          });
          if (response.ok) {
            const playerData = await response.json();
            setPlayerChips(playerData.chips);
          }
        } catch (error) {
          console.error('Error updating player chips:', error);
        }
      }

      fetchGameCount();
      fetchRecentGames();
    });

    socket.on('coin-toss-bet-placed', (data: { bet: any; remainingChips: number }) => {
      console.log('Coin toss bet placed:', data);
      setPlayerChips(data.remainingChips);
    });

    socket.on('coin-toss-bet-error', (data: { message: string }) => {
      console.error('Coin toss bet error:', data.message);
      alert(`Bet Error: ${data.message}`);
    });

    if (user && socket.connected && socket.id) {
      socket.emit('coin-toss-join', {
        roomId: 'COIN_TOSS_GLOBAL',
        userId: user.id,
        username: user.username,
      });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('coin-toss-room-joined');
      socket.off('coin-toss-game-starting');
      socket.off('coin-toss-countdown-tick');
      socket.off('coin-toss-result-revealed');
      socket.off('coin-toss-round-ended');
      socket.off('coin-toss-bet-placed');
      socket.off('coin-toss-bet-error');
    };
  }, [user, socketId]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    const timer = setTimeout(() => {
      enterFullscreen();
    }, 500);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearTimeout(timer);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error('Error exiting fullscreen on unmount:', err));
      }
    };
  }, []);

  const bettingWindowClosed = gameStatus !== 'countdown' || countdownTime <= 10;
  const remainingChips = playerChips - totalBetAmount;

  return (
    <div 
      ref={containerRef} 
      className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1b2e] to-[#0a1628] relative overflow-y-auto"
      style={{
        background: 'linear-gradient(to bottom, #0a1628 0%, #0d1b2e 50%, #0a1628 100%)'
      }}
    >
      {/* Exit Fullscreen Button */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-all"
        >
          ✕ Exit Fullscreen
        </button>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          {/* Chips Display */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <span className="text-xl">💰</span>
            </div>
            <span className="text-white text-2xl font-bold">{remainingChips}</span>
          </div>

          {/* Title */}
          <h1 
            className="text-3xl font-bold text-center"
            style={{
              color: '#00d4ff',
              textShadow: '0 0 20px rgba(0, 212, 255, 0.8), 0 0 40px rgba(0, 212, 255, 0.5)'
            }}
          >
            COIN TOSS ARENA
          </h1>

          {/* User Icon */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
            <span className="text-xl">👤</span>
          </div>
        </div>

        {/* Round Number and Status */}
        <div className="flex items-center justify-between">
          <div className="text-cyan-300 text-sm font-semibold tracking-wider">
            ROUND #{totalGameCount + 1}
          </div>
          <div 
            className={`px-4 py-1 rounded-full border-2 text-sm font-bold ${
              bettingWindowClosed 
                ? 'border-red-500 text-red-400' 
                : 'border-orange-500 text-orange-400'
            }`}
          >
            {bettingWindowClosed ? 'BETTING CLOSED' : 'BETTING OPEN'}
          </div>
        </div>

        {/* Circular Timer */}
        <div className="flex flex-col items-center justify-center py-6">
          <div 
            className="w-48 h-48 rounded-full flex items-center justify-center relative"
            style={{
              border: '4px solid #00d4ff',
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.3)',
              background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, rgba(10, 22, 40, 0.9) 100%)'
            }}
          >
            {isFlipping ? (
              <div className="animate-spin text-6xl">🪙</div>
            ) : currentResult && gameStatus === 'revealing' ? (
              <img 
                src={`/coin-images/${currentResult}.png`}
                alt={currentResult}
                className="w-32 h-32 object-contain animate-bounce"
              />
            ) : (
              <div 
                className="text-7xl font-bold"
                style={{
                  color: '#00d4ff',
                  textShadow: '0 0 20px rgba(0, 212, 255, 0.8)'
                }}
              >
                {countdownTime}s
              </div>
            )}
          </div>
          <div className="mt-4 text-cyan-300 text-sm tracking-widest">
            {isFlipping ? 'FLIPPING...' : currentResult ? currentResult.toUpperCase() : 'BETTING CLOSES IN...'}
          </div>
        </div>

        {/* Result Popup */}
        {showResultPopup && betResults.length > 0 && (
          <div className="bg-gradient-to-br from-purple-900/90 to-purple-700/90 p-6 rounded-lg border-2 border-purple-400 shadow-xl backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">
              {totalWinAmount > 0 ? '🎉 You Won!' : '😔 Better Luck Next Time'}
            </h3>
            <div className="text-center text-2xl font-bold text-yellow-300">
              {totalWinAmount > 0 ? `Won: ${totalWinAmount} chips` : `Lost: ${betResults.reduce((sum, r) => sum + r.betAmount, 0)} chips`}
            </div>
          </div>
        )}

        {/* Betting Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Heads Card */}
          <button
            onClick={() => setSelectedBetType('heads')}
            disabled={bettingWindowClosed}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedBetType === 'heads'
                ? 'border-orange-400 bg-gradient-to-br from-orange-900/40 to-purple-900/40'
                : bettingWindowClosed
                ? 'border-gray-600 bg-gray-800/40 cursor-not-allowed opacity-50'
                : 'border-blue-600 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:border-orange-400'
            }`}
            style={{
              boxShadow: selectedBetType === 'heads' 
                ? '0 0 20px rgba(251, 146, 60, 0.5)' 
                : '0 0 10px rgba(37, 99, 235, 0.3)'
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                  boxShadow: '0 0 20px rgba(251, 146, 60, 0.6)'
                }}
              >
                <span className="text-5xl font-bold text-white">H</span>
              </div>
              <div className="text-white font-bold text-xl">Heads</div>
              <div className="text-cyan-300 text-sm">Bet on Heads</div>
              <div className="text-cyan-400 text-xs font-semibold">Odds: 1:1</div>
            </div>
          </button>

          {/* Tails Card */}
          <button
            onClick={() => setSelectedBetType('tails')}
            disabled={bettingWindowClosed}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedBetType === 'tails'
                ? 'border-cyan-400 bg-gradient-to-br from-cyan-900/40 to-purple-900/40'
                : bettingWindowClosed
                ? 'border-gray-600 bg-gray-800/40 cursor-not-allowed opacity-50'
                : 'border-blue-600 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:border-cyan-400'
            }`}
            style={{
              boxShadow: selectedBetType === 'tails' 
                ? '0 0 20px rgba(34, 211, 238, 0.5)' 
                : '0 0 10px rgba(37, 99, 235, 0.3)'
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                  boxShadow: '0 0 20px rgba(34, 211, 238, 0.6)'
                }}
              >
                <span className="text-5xl font-bold text-white">T</span>
              </div>
              <div className="text-white font-bold text-xl">Tails</div>
              <div className="text-cyan-300 text-sm">Bet on Tails</div>
              <div className="text-cyan-400 text-xs font-semibold">Odds: 1:1</div>
            </div>
          </button>
        </div>

        {/* Quick Bet Amounts */}
        <div className="flex justify-center gap-3">
          {QUICK_AMOUNTS.map(amount => (
            <button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              disabled={bettingWindowClosed || amount > remainingChips}
              className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${
                selectedAmount === amount
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-2 border-orange-400'
                  : amount > remainingChips || bettingWindowClosed
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed border-2 border-gray-600'
                  : 'bg-blue-900/50 text-cyan-300 border-2 border-blue-600 hover:border-cyan-400'
              }`}
              style={{
                boxShadow: selectedAmount === amount 
                  ? '0 0 20px rgba(251, 146, 60, 0.6)' 
                  : 'none'
              }}
            >
              {amount}
            </button>
          ))}
        </div>

        {/* Place Bet Button */}
        <button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet()}
          className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
            canPlaceBet()
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-2 border-cyan-400'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed border-2 border-gray-600'
          }`}
          style={{
            boxShadow: canPlaceBet() 
              ? '0 0 30px rgba(34, 211, 238, 0.6)' 
              : 'none',
            textShadow: canPlaceBet() 
              ? '0 0 10px rgba(255, 255, 255, 0.8)' 
              : 'none'
          }}
        >
          PLACE BET
        </button>

        {/* Recent Results */}
        <div className="space-y-3">
          <div className="text-cyan-300 text-sm font-semibold tracking-wider">
            RECENT RESULTS
          </div>
          <div className="flex flex-wrap gap-2">
            {recentResults.slice(0, 15).map((game, index) => (
              <div
                key={index}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  game.result === 'heads' 
                    ? 'bg-gradient-to-br from-orange-400 to-orange-600' 
                    : 'bg-gradient-to-br from-cyan-400 to-blue-600'
                }`}
                style={{
                  boxShadow: game.result === 'heads'
                    ? '0 0 10px rgba(251, 146, 60, 0.6)'
                    : '0 0 10px rgba(34, 211, 238, 0.6)'
                }}
              >
                <span className="text-xl font-bold text-white">{game.result === 'heads' ? 'H' : 'T'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
