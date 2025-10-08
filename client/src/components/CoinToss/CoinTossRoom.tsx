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

const QUICK_AMOUNTS = [10, 20, 20, 500];

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
  const [flipDisplay, setFlipDisplay] = useState<'H' | 'T'>('H');
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  const lastBeepTimeRef = useRef<number>(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Betting state
  const [selectedBetType, setSelectedBetType] = useState<'heads' | 'tails' | ''>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(20);
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

  useEffect(() => {
    if (!beepAudioRef.current) {
      beepAudioRef.current = new Audio('/sounds/hit.mp3');
      beepAudioRef.current.volume = 0.4;
    }
    if (!winSoundRef.current) {
      winSoundRef.current = new Audio('/sounds/success.mp3');
      winSoundRef.current.volume = 0.6;
    }
    if (!loseSoundRef.current) {
      loseSoundRef.current = new Audio('/sounds/hit.mp3');
      loseSoundRef.current.volume = 0.5;
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playBassBeep = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Bass frequency (deep low tone)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(80, ctx.currentTime); // Deep bass at 80Hz
    
    // Volume envelope for punch
    gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => {
    if (isSoundEnabled && countdownTime <= 5 && countdownTime > 0 && gameStatus === 'countdown') {
      if (lastBeepTimeRef.current !== countdownTime) {
        lastBeepTimeRef.current = countdownTime;
        if (beepAudioRef.current) {
          // Single intense ECG heartbeat per second
          beepAudioRef.current.currentTime = 0;
          beepAudioRef.current.volume = 0.7; // More intense
          beepAudioRef.current.play().catch(err => console.error('Beep sound error:', err));
          
          // Add bass thump for extra impact
          playBassBeep();
        }
      }
    }
  }, [countdownTime, gameStatus, isSoundEnabled]);

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
    window.dispatchEvent(new CustomEvent('exitCoinToss'));
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
      
      // Rapid flip animation
      let flipCount = 0;
      const flipInterval = setInterval(() => {
        setFlipDisplay(prev => prev === 'H' ? 'T' : 'H');
        flipCount++;
        if (flipCount >= 10) {
          clearInterval(flipInterval);
        }
      }, 150);
      
      setTimeout(() => {
        clearInterval(flipInterval);
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

        // Play win or lose sound
        if (isSoundEnabled && results.length > 0) {
          if (totalWin > 0) {
            winSoundRef.current?.play().catch(err => console.error('Win sound error:', err));
          } else {
            loseSoundRef.current?.play().catch(err => console.error('Lose sound error:', err));
          }
        }
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
      className="h-screen relative overflow-hidden"
      style={{
        background: '#0a0e1a'
      }}
    >
      <div className="h-full flex flex-col p-2 gap-2">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          {/* Left - Coin Balance */}
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #00d4ff, #0099cc)',
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)'
              }}
            >
              <span className="text-lg">💰</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                <span className="text-xs">💰</span>
              </div>
              <span className="text-xl font-bold text-cyan-400">{remainingChips}</span>
            </div>
          </div>

          {/* Center - Title & Round */}
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold tracking-widest" style={{
              color: '#00d4ff',
              textShadow: '0 0 30px rgba(0, 212, 255, 0.8)'
            }}>
              COINARENA
            </h1>
            <div className="text-xs text-cyan-400 tracking-wider">
              ROUND: #{totalGameCount + 1}/12
            </div>
          </div>

          {/* Right - Close Button */}
          <button
            onClick={exitFullscreen}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center shadow-lg transition-all"
            aria-label="Exit Game"
          >
            ✕
          </button>
        </div>

        {/* Status */}
        <div className="text-center">
          <div 
            className="inline-block px-4 py-1 rounded-lg text-xs font-bold tracking-wider"
            style={{
              border: '2px solid #f97316',
              color: '#fb923c',
              background: 'rgba(249, 115, 22, 0.1)'
            }}
          >
            {bettingWindowClosed ? 'BETTING CLOSED' : 'BETTING OPEN'}
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex items-center gap-2 min-h-0">
          {/* Left Panel - Total Bet */}
          <div 
            className="flex flex-col items-center justify-center p-3 rounded-xl"
            style={{
              border: '2px solid #f97316',
              background: 'rgba(30, 27, 75, 0.5)',
              width: '140px'
            }}
          >
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
              style={{
                background: 'linear-gradient(145deg, #f97316, #ea580c)'
              }}
            >
              <span className="text-2xl">🪙</span>
            </div>
            <div className="text-lg font-bold text-cyan-400">Total</div>
            <div className="text-xs text-cyan-300">Total Bet</div>
            <div className="text-2xl font-bold text-white">{totalBetAmount}</div>
          </div>

          {/* Center - Timer */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div 
              className="w-40 h-40 rounded-full flex flex-col items-center justify-center mb-2"
              style={{
                border: '3px solid #00d4ff',
                boxShadow: '0 0 40px rgba(0, 212, 255, 0.6)',
                background: 'rgba(10, 14, 26, 0.8)'
              }}
            >
              {isFlipping ? (
                <div className="text-5xl font-bold text-cyan-400">{flipDisplay}</div>
              ) : currentResult ? (
                <div className="text-center">
                  <div className="text-6xl animate-bounce">
                    {currentResult === 'heads' ? '🪙' : '🔮'}
                  </div>
                  <div className="text-lg font-bold mt-2" style={{
                    color: currentResult === 'heads' ? '#f97316' : '#00d4ff'
                  }}>
                    {currentResult.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="text-5xl font-bold text-cyan-400">{countdownTime}s</div>
              )}
            </div>
            <div className="text-sm text-cyan-400 tracking-wider">
              TIME REMAIN FOR -{Math.max(0, countdownTime - 10)}s
            </div>
          </div>

          {/* Right Panel - Bet Type */}
          <div 
            className="flex flex-col items-center justify-center p-3 rounded-xl"
            style={{
              border: '2px solid #0ea5e9',
              background: 'rgba(30, 27, 75, 0.5)',
              width: '140px'
            }}
          >
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
              style={{
                background: 'linear-gradient(145deg, #0ea5e9, #0284c7)',
                border: '2px solid #00d4ff'
              }}
            >
              <span className="text-2xl font-bold text-white">{selectedBetType === 'heads' ? 'H' : 'T'}</span>
            </div>
            <div className="text-lg font-bold text-cyan-400">
              Bet on {selectedBetType === 'heads' ? 'Head' : 'Tail'}
            </div>
            <div className="text-xs text-cyan-300">Odds: 1:1</div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-2">
          {/* Bet Type Selection */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setSelectedBetType('heads')}
              disabled={bettingWindowClosed}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedBetType === 'heads' 
                  ? 'bg-orange-500 text-white border-2 border-orange-400' 
                  : 'bg-gray-700 text-gray-300 border-2 border-gray-600'
              } ${bettingWindowClosed ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              SELECT HEADS
            </button>
            <button
              onClick={() => setSelectedBetType('tails')}
              disabled={bettingWindowClosed}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedBetType === 'tails' 
                  ? 'bg-cyan-500 text-white border-2 border-cyan-400' 
                  : 'bg-gray-700 text-gray-300 border-2 border-gray-600'
              } ${bettingWindowClosed ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              SELECT TAILS
            </button>
          </div>

          {/* Bet Amount & Place Bet */}
          <div className="flex items-center justify-center gap-2">
            {QUICK_AMOUNTS.map((amount, index) => (
              <button
                key={index}
                onClick={() => setSelectedAmount(amount)}
                disabled={bettingWindowClosed || amount > remainingChips}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  selectedAmount === amount
                    ? 'bg-orange-500 text-white border-2 border-orange-400'
                    : 'bg-gray-800 text-cyan-400 border-2 border-cyan-500'
                } ${
                  bettingWindowClosed || amount > remainingChips
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90'
                }`}
                style={{
                  minWidth: '60px',
                  boxShadow: selectedAmount === amount ? '0 0 20px rgba(249, 115, 22, 0.6)' : 'none'
                }}
              >
                {amount}
              </button>
            ))}
            <button
              onClick={handlePlaceBet}
              disabled={!canPlaceBet()}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                canPlaceBet()
                  ? 'bg-cyan-500 text-white border-2 border-cyan-400'
                  : 'bg-gray-700 text-gray-400 border-2 border-gray-600 cursor-not-allowed'
              }`}
              style={{
                boxShadow: canPlaceBet() ? '0 0 30px rgba(6, 182, 212, 0.8)' : 'none'
              }}
            >
              PLACE BET ({selectedAmount})
            </button>
          </div>

          {/* Recent Results */}
          <div className="text-center">
            <div className="text-xs text-cyan-400 tracking-wider mb-1">RECENT RESULT</div>
            <div className="flex gap-1 justify-center">
              {recentResults.slice(0, 6).map((game, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full"
                  style={{
                    background: game.result === 'heads' 
                      ? 'linear-gradient(145deg, #f97316, #ea580c)' 
                      : 'linear-gradient(145deg, #0ea5e9, #0284c7)',
                    border: '2px solid ' + (game.result === 'heads' ? '#fb923c' : '#38bdf8')
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Result Popup */}
      {showResultPopup && betResults.length > 0 && (
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-4 rounded-xl text-center"
          style={{
            background: totalWinAmount > 0 
              ? 'linear-gradient(145deg, #10b981, #059669)' 
              : 'linear-gradient(145deg, #ef4444, #dc2626)',
            border: '3px solid ' + (totalWinAmount > 0 ? '#34d399' : '#f87171'),
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)'
          }}
        >
          <div className="text-2xl font-bold text-white mb-2">
            {totalWinAmount > 0 ? '🎉 YOU WON!' : '😔 YOU LOST'}
          </div>
          <div className="text-4xl font-bold text-white">
            {totalWinAmount > 0 ? `+${totalWinAmount}` : `-${betResults.reduce((sum, r) => sum + r.betAmount, 0)}`}
          </div>
        </div>
      )}
    </div>
  );
}
