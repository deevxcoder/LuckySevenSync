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
  const [flipDisplay, setFlipDisplay] = useState<'H' | 'T'>('H');
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  const lastBeepTimeRef = useRef<number>(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);

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
      className="h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1b2e] to-[#0a1628] relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #0a1628 0%, #0d1b2e 50%, #0a1628 100%)'
      }}
    >
      {/* Exit Fullscreen Button */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          className="fixed top-2 right-2 z-50 w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center shadow-lg transition-all"
          aria-label="Exit Fullscreen"
        >
          ✕
        </button>
      )}

      {/* Landscape Gaming Layout */}
      <div className="h-full flex flex-col p-2 gap-2">
        {/* Header */}
        <div className="text-center border-2 border-cyan-500/50 rounded-lg py-1 px-4" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
          <h1 className="text-xl font-bold tracking-wider" style={{ color: '#00d4ff', textShadow: '0 0 20px rgba(0, 212, 255, 0.8)' }}>
            COIN TOSS GAME
          </h1>
          <div className="text-xs text-cyan-300 tracking-widest">ROUND #{totalGameCount + 1}</div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex gap-2 min-h-0">
          {/* Left Panel - Betting Controls */}
          <div className="w-72 flex flex-col gap-1.5 bg-[#0d1b2e]/60 rounded-lg p-2 border border-cyan-500/30">
            {/* Chips & Timer */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="border border-cyan-500/50 rounded-lg p-1.5 bg-[#0a1628]/80">
                <div className="text-xs text-cyan-300 uppercase tracking-wider">Your Chips</div>
                <div className="flex items-center gap-1">
                  <span className="text-sm">💰</span>
                  <span className="text-lg font-bold text-white">{remainingChips}</span>
                </div>
              </div>
              <div className="border border-cyan-500/50 rounded-lg p-1.5 bg-[#0a1628]/80">
                <div className="text-xs text-cyan-300 uppercase tracking-wider">Time Remaining</div>
                <div className="text-lg font-bold" style={{ color: countdownTime <= 5 && countdownTime > 0 ? '#ff0000' : '#00d4ff' }}>
                  {countdownTime}s
                </div>
                <div className="text-xs text-cyan-400">{isFlipping ? 'FLIPPING...' : currentResult ? 'REVEALING...' : 'BETTING...'}</div>
              </div>
            </div>

            {/* Place Bets Section */}
            <div>
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1">Place Your Bets</div>
              
              {/* Heads/Tails Buttons */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button onClick={() => setSelectedBetType('heads')} disabled={bettingWindowClosed} className={`p-2 rounded-lg border-2 transition-all ${selectedBetType === 'heads' ? 'border-orange-400 bg-orange-900/40' : bettingWindowClosed ? 'border-gray-600 bg-gray-800/40 cursor-not-allowed opacity-50' : 'border-cyan-500/50 bg-[#0a1628]/60 hover:border-orange-400'}`}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xl">🪙</span>
                    <div className="text-white font-bold text-xs">Heads</div>
                    <div className="text-xs text-yellow-400">Bet on Heads</div>
                    <div className="text-xs text-cyan-400 font-semibold">000$ +1</div>
                  </div>
                </button>

                <button onClick={() => setSelectedBetType('tails')} disabled={bettingWindowClosed} className={`p-2 rounded-lg border-2 transition-all ${selectedBetType === 'tails' ? 'border-pink-400 bg-pink-900/40' : bettingWindowClosed ? 'border-gray-600 bg-gray-800/40 cursor-not-allowed opacity-50' : 'border-cyan-500/50 bg-[#0a1628]/60 hover:border-pink-400'}`}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xl">🔮</span>
                    <div className="text-white font-bold text-xs">Tails</div>
                    <div className="text-xs text-yellow-400">Bet on Tails</div>
                    <div className="text-xs text-cyan-400 font-semibold">000$ +1</div>
                  </div>
                </button>
              </div>

              {/* Bet Amounts */}
              <div className="grid grid-cols-2 gap-1 mb-2">
                {QUICK_AMOUNTS.map(amount => (
                  <button key={amount} onClick={() => setSelectedAmount(amount)} disabled={bettingWindowClosed || amount > remainingChips} className={`py-1.5 px-2 rounded font-bold text-xs transition-all ${selectedAmount === amount ? 'bg-cyan-500 text-white' : amount > remainingChips || bettingWindowClosed ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-[#0a1628] text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/20'}`}>
                    {amount}
                  </button>
                ))}
              </div>

              {/* Available Chips & Total Bet */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300">Available Chips:</span>
                  <span className="text-cyan-400 font-bold">{remainingChips}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300">Total Bet:</span>
                  <span className="text-cyan-400 font-bold">{totalBetAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Coin Display */}
          <div className="flex-1 flex flex-col gap-1.5">
            {/* Result Display Area */}
            <div className="flex-1 border-2 border-cyan-500/50 rounded-lg flex items-center justify-center relative" style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, rgba(10, 22, 40, 0.9) 100%)' }}>
              {/* Result Popup */}
              {showResultPopup && betResults.length > 0 && (
                <div className="absolute top-2 right-2 bg-gradient-to-br from-purple-900/90 to-purple-700/90 p-2 rounded-lg border-2 border-purple-400 shadow-xl z-40">
                  <h3 className="text-sm font-bold text-white text-center">
                    {totalWinAmount > 0 ? '🎉 Won!' : '😔 Lost'}
                  </h3>
                  <div className="text-center text-base font-bold text-yellow-300">
                    {totalWinAmount > 0 ? totalWinAmount : betResults.reduce((sum, r) => sum + r.betAmount, 0)}
                  </div>
                </div>
              )}

              {/* Coin/Result Circle */}
              <div className="flex flex-col items-center">
                <div 
                  className={`w-40 h-40 rounded-full flex items-center justify-center ${countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult ? 'animate-heartbeat' : ''}`}
                  style={{
                    border: countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult ? '4px solid #ff0000' : '4px solid #00d4ff',
                    boxShadow: countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult ? '0 0 60px rgba(255, 0, 0, 0.8), inset 0 0 40px rgba(255, 0, 0, 0.3)' : '0 0 40px rgba(0, 212, 255, 0.6), inset 0 0 40px rgba(0, 212, 255, 0.3)',
                    background: currentResult ? (currentResult === 'heads' ? 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)' : 'linear-gradient(145deg, #22d3ee 0%, #06b6d4 100%)') : countdownTime <= 5 && countdownTime > 0 && !isFlipping ? 'radial-gradient(circle, rgba(255, 0, 0, 0.15) 0%, rgba(10, 22, 40, 0.9) 100%)' : 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, rgba(10, 22, 40, 0.9) 100%)'
                  }}
                >
                  {isFlipping ? (
                    <div className="text-6xl font-bold text-white">{flipDisplay}</div>
                  ) : currentResult && gameStatus === 'revealing' ? (
                    <div className="text-center">
                      <div className="text-7xl font-bold text-white animate-bounce">
                        {currentResult === 'heads' ? '🪙' : '🔮'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-5xl font-bold" style={{ color: countdownTime <= 5 && countdownTime > 0 ? '#ff0000' : '#00d4ff', textShadow: '0 0 30px currentColor' }}>
                      {countdownTime}s
                    </div>
                  )}
                </div>
                {currentResult && (
                  <div className="mt-2 text-3xl font-bold uppercase" style={{ color: currentResult === 'heads' ? '#fbbf24' : '#22d3ee', textShadow: '0 0 20px currentColor' }}>
                    {currentResult}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar - Place Bet & Sound */}
            <div className="flex gap-1.5 items-center">
              <button onClick={handlePlaceBet} disabled={!canPlaceBet()} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${canPlaceBet() ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-2 border-cyan-400' : 'bg-gray-700 text-gray-400 cursor-not-allowed border-2 border-gray-600'}`} style={{ boxShadow: canPlaceBet() ? '0 0 30px rgba(34, 211, 238, 0.6)' : 'none' }}>
                PLACE YOUR BETS - {totalBetAmount}
              </button>
              <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg border-2 border-cyan-400">
                <span className="text-lg">{isSoundEnabled ? '🔊' : '🔇'}</span>
              </button>
            </div>

            {/* Recent Results */}
            <div className="border border-cyan-500/30 rounded-lg p-1.5 bg-[#0d1b2e]/60">
              <div className="text-xs text-cyan-300 uppercase tracking-wider mb-1">Recent Results</div>
              <div className="flex gap-1">
                {recentResults.slice(0, 15).map((game, index) => (
                  <div key={index} className={`w-5 h-5 rounded-full flex items-center justify-center ${game.result === 'heads' ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`}>
                    <span className="text-xs font-bold text-white">{game.result === 'heads' ? 'H' : 'T'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
