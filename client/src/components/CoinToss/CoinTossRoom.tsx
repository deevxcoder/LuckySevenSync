import { useState, useEffect, useRef } from 'react';
import { socket } from '../../lib/socket';
import { useAuthStore } from '../../lib/stores/useAuthStore';
import { Volume2, VolumeX, X, DollarSign, Coins, Target, RotateCcw, Lock, LockOpen } from 'lucide-react';

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

const QUICK_AMOUNTS = [10, 20, 50, 100, 500, 1000, 5000];

export default function CoinTossRoom() {
  const { user } = useAuthStore();
  const [currentResult, setCurrentResult] = useState<'heads' | 'tails' | null>(null);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [playerChips, setPlayerChips] = useState<number | null>(null);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [socketId, setSocketId] = useState<string>('');
  const [totalGameCount, setTotalGameCount] = useState<number | null>(null);
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
  const [previousRoundBets, setPreviousRoundBets] = useState<Bet[]>([]);
  const [lockedBet, setLockedBet] = useState<{ type: 'heads' | 'tails'; amount: number } | null>(null);

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

  const isMobileOrTablet = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return (isMobile || isTablet || isTouchDevice) && window.innerWidth <= 1024;
  };

  const handleFullscreenChange = () => {
    const isNowFullscreen = !!document.fullscreenElement;
    setIsFullscreen(isNowFullscreen);
    
    // On mobile/tablet, close game if fullscreen is exited
    if (!isNowFullscreen && isMobileOrTablet()) {
      console.log('Fullscreen exited on mobile/tablet - closing game');
      exitFullscreen();
    }
  };

  const handleOrientationChange = () => {
    if (isMobileOrTablet()) {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      
      if (!isLandscape) {
        console.log('Orientation changed to portrait on mobile/tablet - closing game');
        exitFullscreen();
      }
    }
  };

  const canPlaceBet = () => {
    if (playerChips === null) return false;
    const hasEnoughBalance = (playerChips - totalBetAmount) >= selectedAmount;
    return gameStatus === 'countdown' && 
           countdownTime > 10 && 
           selectedBetType && 
           selectedAmount > 0 && 
           hasEnoughBalance;
  };

  const getPlaceBetButtonText = () => {
    if (playerChips === null) return 'LOADING...';
    const hasEnoughBalance = (playerChips - totalBetAmount) >= selectedAmount;
    if (!hasEnoughBalance && selectedBetType) {
      return 'INSUFFICIENT BALANCE';
    }
    return `PLACE BET (${selectedAmount})`;
  };

  const handlePlaceBet = () => {
    if (!canPlaceBet()) return;

    socket.emit('coin-toss-place-bet', {
      roomId: 'COIN_TOSS_GLOBAL',
      betType: selectedBetType,
      amount: selectedAmount
    });

    console.log(`Placing coin toss bet: ${selectedAmount} on ${selectedBetType}`);
  };

  const handleRepeatBet = () => {
    if (previousRoundBets.length === 0) return;
    if (gameStatus !== 'countdown' || countdownTime <= 10) return;
    
    const totalRepeatAmount = previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0);
    if (playerChips === null || (playerChips - totalBetAmount) < totalRepeatAmount) return;
    
    previousRoundBets.forEach(bet => {
      socket.emit('coin-toss-place-bet', {
        roomId: 'COIN_TOSS_GLOBAL',
        betType: bet.type,
        amount: bet.amount
      });
    });

    console.log(`Repeating ${previousRoundBets.length} bets from previous round`);
  };

  const handleLockBet = () => {
    if (!selectedBetType || selectedAmount <= 0) return;
    if (playerChips === null || (playerChips - totalBetAmount) < selectedAmount) return;

    setLockedBet({ type: selectedBetType as 'heads' | 'tails', amount: selectedAmount });
    
    socket.emit('coin-toss-lock-bet', {
      roomId: 'COIN_TOSS_GLOBAL',
      betType: selectedBetType,
      amount: selectedAmount
    });

    console.log(`Locking bet: ${selectedAmount} on ${selectedBetType}`);
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

    socket.on('coin-toss-room-joined', (data: { room: CoinTossRoomData; player: any; activeBets?: any[]; countdownTime?: number }) => {
      console.log('Joined coin toss room:', data);
      setGameStatus(data.room.status);
      setCurrentResult(data.room.currentResult);
      
      if (data.player?.chips !== undefined) {
        setPlayerChips(data.player.chips);
      }
      
      if (data.countdownTime !== undefined) {
        setCountdownTime(data.countdownTime);
      }
      
      if (data.activeBets && data.activeBets.length > 0) {
        console.log('Restoring active bets:', data.activeBets);
        const restoredBets: Bet[] = data.activeBets.map(bet => ({
          type: bet.type,
          amount: bet.amount
        }));
        setCurrentBets(restoredBets);
        lastValidBetsRef.current = restoredBets;
      }
      
      fetchGameCount();
    });

    socket.on('coin-toss-game-starting', (data: { room: CoinTossRoomData; countdownTime: number }) => {
      console.log('Coin toss game starting:', data);
      setGameStatus('countdown');
      setCountdownTime(data.countdownTime);
      setCurrentResult(null);
      setCurrentBets([]);
      setShowResultPopup(false);
      setIsFlipping(false);
      setLockedBet(null);
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
      
      setPreviousRoundBets(lastValidBetsRef.current);
      
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
      
      const newBet: Bet = {
        type: data.bet.betType,
        amount: data.bet.betAmount
      };
      
      setCurrentBets(prev => {
        const updatedBets = [...prev, newBet];
        lastValidBetsRef.current = updatedBets;
        return updatedBets;
      });
    });

    socket.on('coin-toss-bet-error', (data: { message: string }) => {
      console.error('Coin toss bet error:', data.message);
      alert(`Bet Error: ${data.message}`);
    });

    socket.on('coin-toss-bet-locked', (data: { bet: any; remainingChips: number }) => {
      console.log('Coin toss bet locked:', data);
      setPlayerChips(data.remainingChips);
      setLockedBet({ type: data.bet.betType, amount: data.bet.betAmount });
    });

    socket.on('coin-toss-locked-bet-placed', (data: { bet: any }) => {
      console.log('Locked bet automatically placed:', data);
      const newBet: Bet = {
        type: data.bet.betType,
        amount: data.bet.betAmount
      };
      setCurrentBets(prev => {
        const updatedBets = [...prev, newBet];
        lastValidBetsRef.current = updatedBets;
        return updatedBets;
      });
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
      socket.off('coin-toss-bet-locked');
      socket.off('coin-toss-locked-bet-placed');
    };
  }, [user, socketId]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.matchMedia('(orientation: landscape)').addEventListener('change', handleOrientationChange);
    
    const timer = setTimeout(() => {
      enterFullscreen();
    }, 500);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.matchMedia('(orientation: landscape)').removeEventListener('change', handleOrientationChange);
      clearTimeout(timer);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error('Error exiting fullscreen on unmount:', err));
      }
    };
  }, []);

  const bettingWindowClosed = gameStatus !== 'countdown' || countdownTime <= 10;
  const remainingChips = (playerChips ?? 0) - totalBetAmount;
  
  const headsBetTotal = currentBets.filter(bet => bet.type === 'heads').reduce((sum, bet) => sum + bet.amount, 0);
  const tailsBetTotal = currentBets.filter(bet => bet.type === 'tails').reduce((sum, bet) => sum + bet.amount, 0);

  return (
    <div 
      ref={containerRef} 
      className="h-screen relative overflow-hidden"
      style={{
        background: '#0E0E0E'
      }}
    >
      <div className="h-full flex flex-col p-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4">
          {/* Left - Coin Balance */}
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #00FFC6, #00d4a8)',
                boxShadow: '0 0 20px rgba(0, 255, 198, 0.6)'
              }}
            >
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-neo-accent">{playerChips ?? '...'}</span>
          </div>

          {/* Center - Title & Round */}
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-heading font-bold tracking-widest" style={{
              color: '#00FFC6',
              textShadow: '0 0 30px rgba(0, 255, 198, 0.8)'
            }}>
              COIN TOSS
            </h1>
            <div className="text-xs text-neo-accent tracking-wider font-mono">
              ROUND: #{totalGameCount !== null ? totalGameCount + 1 : '...'}
            </div>
          </div>

          {/* Right - Speaker & Close Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="w-10 h-10 rounded-full bg-neo-accent/20 hover:bg-neo-accent/30 border border-neo-accent text-neo-accent font-bold flex items-center justify-center shadow-lg transition-all"
              aria-label="Toggle Sound"
            >
              {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={exitFullscreen}
              className="w-10 h-10 rounded-full bg-neo-accent-secondary/20 hover:bg-neo-accent-secondary/30 border border-neo-accent-secondary text-neo-accent-secondary font-bold flex items-center justify-center shadow-lg transition-all"
              aria-label="Exit Game"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          <div 
            className="inline-block px-6 py-2 rounded-lg text-sm font-heading font-bold tracking-widest"
            style={{
              border: bettingWindowClosed ? '2px solid #FF005C' : '2px solid #00FFC6',
              color: bettingWindowClosed ? '#FF005C' : '#00FFC6',
              background: bettingWindowClosed ? 'rgba(255, 0, 92, 0.15)' : 'rgba(0, 255, 198, 0.15)',
              boxShadow: bettingWindowClosed ? '0 0 20px rgba(255, 0, 92, 0.3)' : '0 0 20px rgba(0, 255, 198, 0.3)'
            }}
          >
            {bettingWindowClosed ? 'BETTING CLOSED' : 'BETTING OPEN'}
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex items-center gap-6 min-h-0 px-8">
          {/* Left Panel - Heads Selection */}
          <button
            onClick={() => setSelectedBetType('heads')}
            disabled={bettingWindowClosed}
            className="flex flex-col items-center justify-center p-4 rounded-2xl transition-all hover:scale-105"
            style={{
              border: selectedBetType === 'heads' ? '3px solid #00FFC6' : '2px solid #00FFC6',
              background: selectedBetType === 'heads' ? 'rgba(0, 255, 198, 0.2)' : 'rgba(20, 20, 30, 0.6)',
              backdropFilter: 'blur(10px)',
              width: '140px',
              minHeight: '180px',
              boxShadow: selectedBetType === 'heads' ? '0 0 30px rgba(0, 255, 198, 0.5)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
              opacity: bettingWindowClosed ? 0.5 : 1,
              cursor: bettingWindowClosed ? 'not-allowed' : 'pointer'
            }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
              style={{
                background: 'linear-gradient(145deg, #00FFC6, #00d4a8)',
                boxShadow: '0 4px 20px rgba(0, 255, 198, 0.4)'
              }}
            >
              <span className="text-4xl font-bold text-white">H</span>
            </div>
            <div className="text-base font-heading font-bold text-neo-accent mb-1">Heads</div>
            <div className="text-xs text-neo-text-secondary mb-1">Bet Heads</div>
            <div className="text-sm text-white font-mono font-bold">Odds 1:1</div>
            {headsBetTotal > 0 && (
              <div className="text-sm font-mono font-bold text-neo-accent mt-2 px-3 py-1 rounded-full" style={{
                background: 'rgba(0, 255, 198, 0.2)',
                border: '1px solid #00FFC6'
              }}>
                {headsBetTotal}
              </div>
            )}
          </button>

          {/* Center - Timer */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div 
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center mb-1 ${
                countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult ? 'animate-pulse' : ''
              }`}
              style={{
                border: countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult 
                  ? '4px solid #FF005C' 
                  : '3px solid #00FFC6',
                boxShadow: countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult
                  ? '0 0 40px rgba(255, 0, 92, 0.8), 0 0 80px rgba(255, 0, 92, 0.6)'
                  : '0 0 30px rgba(0, 255, 198, 0.6)',
                background: countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult
                  ? 'radial-gradient(circle, rgba(255, 0, 92, 0.2) 0%, rgba(14, 14, 14, 0.9) 100%)'
                  : 'rgba(14, 14, 14, 0.8)',
                backdropFilter: 'blur(10px)',
                animation: countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult
                  ? 'heartbeat 1s ease-in-out infinite'
                  : 'none'
              }}
            >
              {isFlipping ? (
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: flipDisplay === 'H' 
                      ? 'linear-gradient(145deg, #00FFC6, #00d4a8)' 
                      : 'linear-gradient(145deg, #FF005C, #d40049)',
                    transform: 'rotateY(180deg)',
                    animation: 'flipCoin 0.15s linear'
                  }}
                >
                  <span className="text-4xl font-bold text-white">{flipDisplay}</span>
                </div>
              ) : currentResult ? (
                <div className="text-center">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce"
                    style={{
                      background: currentResult === 'heads' 
                        ? 'linear-gradient(145deg, #00FFC6, #00d4a8)' 
                        : 'linear-gradient(145deg, #FF005C, #d40049)'
                    }}
                  >
                    <span className="text-5xl font-bold text-white">
                      {currentResult === 'heads' ? 'H' : 'T'}
                    </span>
                  </div>
                  <div className="text-sm font-heading font-bold mt-1" style={{
                    color: currentResult === 'heads' ? '#00FFC6' : '#FF005C'
                  }}>
                    {currentResult.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div 
                  className="text-4xl font-mono font-bold"
                  style={{
                    color: countdownTime <= 5 && countdownTime > 0 ? '#FF005C' : '#00FFC6',
                    textShadow: countdownTime <= 5 && countdownTime > 0 
                      ? '0 0 30px rgba(255, 0, 92, 0.8)' 
                      : '0 0 20px rgba(0, 255, 198, 0.6)'
                  }}
                >
                  {countdownTime}s
                </div>
              )}
            </div>
            <div className="text-xs text-neo-accent tracking-wider font-mono">
              TIME: {Math.max(0, countdownTime - 10)}s
            </div>
          </div>

          {/* Right Panel - Tails Selection */}
          <button
            onClick={() => setSelectedBetType('tails')}
            disabled={bettingWindowClosed}
            className="flex flex-col items-center justify-center p-4 rounded-2xl transition-all hover:scale-105"
            style={{
              border: selectedBetType === 'tails' ? '3px solid #FF005C' : '2px solid #FF005C',
              background: selectedBetType === 'tails' ? 'rgba(255, 0, 92, 0.2)' : 'rgba(20, 20, 30, 0.6)',
              backdropFilter: 'blur(10px)',
              width: '140px',
              minHeight: '180px',
              boxShadow: selectedBetType === 'tails' ? '0 0 30px rgba(255, 0, 92, 0.5)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
              opacity: bettingWindowClosed ? 0.5 : 1,
              cursor: bettingWindowClosed ? 'not-allowed' : 'pointer'
            }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
              style={{
                background: 'linear-gradient(145deg, #FF005C, #d40049)',
                boxShadow: '0 4px 20px rgba(255, 0, 92, 0.4)'
              }}
            >
              <span className="text-4xl font-bold text-white">T</span>
            </div>
            <div className="text-base font-heading font-bold text-neo-accent-secondary mb-1">Tails</div>
            <div className="text-xs text-neo-text-secondary mb-1">Bet Tails</div>
            <div className="text-sm text-white font-mono font-bold">Odds 1:1</div>
            {tailsBetTotal > 0 && (
              <div className="text-sm font-mono font-bold text-neo-accent-secondary mt-2 px-3 py-1 rounded-full" style={{
                background: 'rgba(255, 0, 92, 0.2)',
                border: '1px solid #FF005C'
              }}>
                {tailsBetTotal}
              </div>
            )}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-3 px-4">
          {/* Total Bet Display */}
          <div className="text-center">
            <span className="text-sm text-neo-text-secondary font-mono">Total Bet: </span>
            <span className="text-lg font-mono font-bold text-neo-accent">{totalBetAmount}</span>
          </div>

          {/* Bet Amount & Place Bet */}
          <div className="flex items-center justify-center gap-2">
            {QUICK_AMOUNTS.map((amount, index) => (
              <button
                key={index}
                onClick={() => setSelectedAmount(amount)}
                disabled={bettingWindowClosed || amount > remainingChips}
                className={`px-4 py-2 rounded-full text-sm font-mono font-bold transition-all ${
                  selectedAmount === amount
                    ? 'bg-neo-accent text-neo-bg border-2 border-neo-accent'
                    : 'bg-gray-800/60 text-neo-accent border border-neo-accent/50'
                } ${
                  bettingWindowClosed || amount > remainingChips
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90 hover:scale-105'
                }`}
                style={{
                  minWidth: '60px',
                  boxShadow: selectedAmount === amount ? '0 0 20px rgba(0, 255, 198, 0.6)' : 'none'
                }}
              >
                {amount}
              </button>
            ))}
            <button
              onClick={handlePlaceBet}
              disabled={!canPlaceBet()}
              className={`px-8 py-2.5 rounded-full text-sm font-heading font-bold tracking-wide transition-all ${
                canPlaceBet()
                  ? 'bg-neo-accent text-neo-bg border-2 border-neo-accent hover:scale-105'
                  : 'bg-gray-700 text-gray-400 border border-gray-600 cursor-not-allowed'
              }`}
              style={{
                boxShadow: canPlaceBet() ? '0 0 30px rgba(0, 255, 198, 0.8)' : 'none',
                minWidth: '180px'
              }}
            >
              {getPlaceBetButtonText()}
            </button>
            <button
              onClick={handleRepeatBet}
              disabled={previousRoundBets.length === 0 || bettingWindowClosed || (playerChips !== null && (playerChips - totalBetAmount) < previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0))}
              className={`p-3 rounded-full text-sm font-heading font-bold transition-all ${
                previousRoundBets.length > 0 && !bettingWindowClosed && playerChips !== null && (playerChips - totalBetAmount) >= previousRoundBets.reduce((sum, bet) => sum + bet.amount, 0)
                  ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-400 hover:bg-blue-500/30 hover:scale-105'
                  : 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50'
              }`}
              style={{
                boxShadow: previousRoundBets.length > 0 && !bettingWindowClosed ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none'
              }}
              title="Repeat Bet"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleLockBet}
              disabled={!selectedBetType || selectedAmount <= 0 || bettingWindowClosed || playerChips === null || (playerChips - totalBetAmount) < selectedAmount || lockedBet !== null}
              className={`p-3 rounded-full text-sm font-heading font-bold transition-all ${
                selectedBetType && selectedAmount > 0 && !bettingWindowClosed && playerChips !== null && (playerChips - totalBetAmount) >= selectedAmount && lockedBet === null
                  ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-500/30 hover:scale-105'
                  : lockedBet !== null
                  ? 'bg-yellow-500/40 text-yellow-300 border-2 border-yellow-300'
                  : 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50'
              }`}
              style={{
                boxShadow: lockedBet ? '0 0 20px rgba(234, 179, 8, 0.6)' : selectedBetType && !bettingWindowClosed ? '0 0 20px rgba(234, 179, 8, 0.4)' : 'none'
              }}
              title={lockedBet ? 'Bet Locked' : 'Lock Bet'}
            >
              {lockedBet ? <Lock className="w-5 h-5" /> : <LockOpen className="w-5 h-5" />}
            </button>
          </div>

          {/* Recent Results */}
          <div className="text-center">
            <div className="text-xs text-neo-accent tracking-wider font-mono mb-2">RECENT RESULTS</div>
            <div className="flex gap-2 justify-center">
              {recentResults.slice(0, 6).map((game, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: game.result === 'heads' 
                      ? 'linear-gradient(145deg, #00FFC6, #00d4a8)' 
                      : 'linear-gradient(145deg, #FF005C, #d40049)',
                    border: '2px solid ' + (game.result === 'heads' ? '#00FFC6' : '#FF005C')
                  }}
                >
                  <span className="text-xs font-bold text-white">
                    {game.result === 'heads' ? 'H' : 'T'}
                  </span>
                </div>
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
              ? 'linear-gradient(145deg, #00FFC6, #00d4a8)' 
              : 'linear-gradient(145deg, #FF005C, #d40049)',
            border: '3px solid ' + (totalWinAmount > 0 ? '#00FFC6' : '#FF005C'),
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="text-2xl font-heading font-bold text-white mb-2">
            {totalWinAmount > 0 ? 'YOU WON!' : 'YOU LOST'}
          </div>
          <div className="text-4xl font-mono font-bold text-white">
            {totalWinAmount > 0 ? `+${totalWinAmount}` : `-${betResults.reduce((sum, r) => sum + r.betAmount, 0)}`}
          </div>
        </div>
      )}
    </div>
  );
}
