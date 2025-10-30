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
  const [lastBetSelection, setLastBetSelection] = useState<{ type: 'heads' | 'tails'; amount: number } | null>(null);
  const [lockedBets, setLockedBets] = useState<Array<{ type: 'heads' | 'tails'; amount: number; betId?: number }>>([]);
  const [unlockedBets, setUnlockedBets] = useState<Array<{ type: 'heads' | 'tails'; amount: number; betId?: number }>>([]);
  const unlockedBetsRef = useRef<Array<{ type: 'heads' | 'tails'; amount: number; betId?: number }>>([]);

  // Keep ref in sync with state
  useEffect(() => {
    unlockedBetsRef.current = unlockedBets;
  }, [unlockedBets]);

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
    const hasEnoughBalance = playerChips >= selectedAmount;
    return gameStatus === 'countdown' && 
           countdownTime > 10 && 
           selectedBetType && 
           selectedAmount > 0 && 
           hasEnoughBalance;
  };

  const getPlaceBetButtonText = () => {
    if (playerChips === null) return 'LOADING...';
    const hasEnoughBalance = playerChips >= selectedAmount;
    if (!hasEnoughBalance && selectedBetType) {
      return 'INSUFFICIENT BALANCE';
    }
    return `PLACE BET (${selectedAmount})`;
  };

  const handlePlaceBet = () => {
    if (!canPlaceBet()) return;
    if (!selectedBetType) return;
    if (lockedBets.length > 0) {
      alert('You have locked bets. Locked bets cannot be changed.');
      return;
    }

    socket.emit('coin-toss-place-bet', {
      roomId: 'COIN_TOSS_GLOBAL',
      betType: selectedBetType,
      amount: selectedAmount
    });

    // Store last bet selection for repeat functionality
    setLastBetSelection({ type: selectedBetType, amount: selectedAmount });

    console.log(`Placing coin toss bet: ${selectedAmount} on ${selectedBetType}`);
  };

  const handleCancelBet = () => {
    if (unlockedBets.length === 0) return;

    socket.emit('coin-toss-cancel-bet', {
      roomId: 'COIN_TOSS_GLOBAL'
    });

    console.log(`Cancelling ${unlockedBets.length} unlocked bet(s)`);
  };

  const handleRepeatBet = () => {
    if (!lastBetSelection) return;
    if (gameStatus !== 'countdown' || countdownTime <= 10) return;
    if (lockedBets.length > 0) return;
    
    const hasEnoughBalance = playerChips !== null && (playerChips - totalBetAmount) >= lastBetSelection.amount;
    if (!hasEnoughBalance) {
      alert('Insufficient balance to repeat last bet');
      return;
    }
    
    socket.emit('coin-toss-place-bet', {
      roomId: 'COIN_TOSS_GLOBAL',
      betType: lastBetSelection.type,
      amount: lastBetSelection.amount
    });

    console.log(`Repeating last bet: ${lastBetSelection.amount} on ${lastBetSelection.type}`);
  };

  const handleLockBet = () => {
    if (unlockedBets.length === 0) return;
    if (playerChips === null) return;

    socket.emit('coin-toss-lock-bet', {
      roomId: 'COIN_TOSS_GLOBAL'
    });

    console.log(`Locking ${unlockedBets.length} bet(s)`);
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

    socket.on('coin-toss-room-joined', (data: { room: CoinTossRoomData; player: any; activeBets?: any[]; lockedBets?: Array<{ betType: 'heads' | 'tails'; amount: number; betId?: number }>; countdownTime?: number }) => {
      console.log('Joined coin toss room:', data);
      setGameStatus(data.room.status);
      setCurrentResult(data.room.currentResult);
      
      if (data.player?.chips !== undefined) {
        setPlayerChips(data.player.chips);
      }
      
      if (data.countdownTime !== undefined) {
        setCountdownTime(data.countdownTime);
      }

      if (data.lockedBets && data.lockedBets.length > 0) {
        console.log('Restoring locked bets:', data.lockedBets);
        setLockedBets(data.lockedBets.map(bet => ({ type: bet.betType, amount: bet.amount, betId: bet.betId })));
      }
      
      if (data.activeBets && data.activeBets.length > 0) {
        console.log('Restoring active bets:', data.activeBets);
        const restoredBets: Bet[] = data.activeBets.map(bet => ({
          type: bet.type,
          amount: bet.amount
        }));
        setCurrentBets(restoredBets);
        lastValidBetsRef.current = restoredBets;
        
        // Restore unlocked bets (those that are in activeBets but not in lockedBets)
        const lockedBetIds = new Set((data.lockedBets || []).map(b => b.betId));
        const unlockedActiveBets = data.activeBets.filter(bet => !lockedBetIds.has(bet.id));
        if (unlockedActiveBets.length > 0) {
          console.log('Restoring unlocked bets:', unlockedActiveBets);
          setUnlockedBets(unlockedActiveBets.map(bet => ({ 
            type: bet.type, 
            amount: bet.amount, 
            betId: bet.id 
          })));
        }
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
      setUnlockedBets([]);
      setLockedBets([]);
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
      setLockedBets([]);
      setUnlockedBets([]);

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
      
      // Bet is immediately placed, so add to current bets
      const newBet: Bet = {
        type: data.bet.betType,
        amount: data.bet.betAmount || data.bet.amount
      };
      
      setCurrentBets(prev => {
        const updatedBets = [...prev, newBet];
        lastValidBetsRef.current = updatedBets;
        return updatedBets;
      });
      
      // Track as unlocked bet for UI controls (lock/cancel buttons)
      if (data.bet.locked === false) {
        setUnlockedBets(prev => [...prev, { 
          type: data.bet.betType, 
          amount: data.bet.amount || data.bet.betAmount, 
          betId: data.bet.betId 
        }]);
      }
    });

    socket.on('coin-toss-bet-error', (data: { message: string }) => {
      console.error('Coin toss bet error:', data.message);
      alert(`Bet Error: ${data.message}`);
    });

    socket.on('coin-toss-bets-locked', (data: { bets: any[]; remainingChips: number }) => {
      console.log('Coin toss bets locked:', data);
      setPlayerChips(data.remainingChips);
      setLockedBets(data.bets.map((bet: any) => ({ 
        type: bet.betType, 
        amount: bet.betAmount, 
        betId: bet.betId 
      })));
      setUnlockedBets([]);
    });

    socket.on('coin-toss-bets-cancelled', (data: { message: string; remainingChips?: number }) => {
      console.log('Coin toss bets cancelled and refunded:', data.message);
      if (data.remainingChips !== undefined) {
        setPlayerChips(data.remainingChips);
      }
      
      // Remove cancelled unlocked bets from currentBets by rebuilding from locked bets only
      setCurrentBets(prev => {
        // Keep only the locked bets in currentBets
        const lockedBetsOnly = lockedBets.map(lb => ({ type: lb.type, amount: lb.amount }));
        lastValidBetsRef.current = lockedBetsOnly;
        return lockedBetsOnly;
      });
      
      setUnlockedBets([]);
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
      socket.off('coin-toss-bets-locked');
      socket.off('coin-toss-bets-cancelled');
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
      <div className="h-full flex flex-col p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Header */}
        <div className="flex items-center justify-between px-2 sm:px-4">
          {/* Left - Coin Balance */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #00FFC6, #00d4a8)',
                boxShadow: '0 0 20px rgba(0, 255, 198, 0.6)'
              }}
            >
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-base sm:text-xl font-bold text-neo-accent">{playerChips ?? '...'}</span>
          </div>

          {/* Center - Title */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl sm:text-3xl font-heading font-bold tracking-widest" style={{
              color: '#00FFC6',
              textShadow: '0 0 30px rgba(0, 255, 198, 0.8)'
            }}>
              COIN TOSS
            </h1>
          </div>

          {/* Right - Speaker & Close Button */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neo-accent/20 hover:bg-neo-accent/30 border border-neo-accent text-neo-accent font-bold flex items-center justify-center shadow-lg transition-all"
              aria-label="Toggle Sound"
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button
              onClick={exitFullscreen}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neo-accent-secondary/20 hover:bg-neo-accent-secondary/30 border border-neo-accent-secondary text-neo-accent-secondary font-bold flex items-center justify-center shadow-lg transition-all"
              aria-label="Exit Game"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex items-center gap-2 sm:gap-6 min-h-0 px-2 sm:px-8">
          {/* Left Panel - Heads Selection */}
          <button
            onClick={() => setSelectedBetType('heads')}
            disabled={bettingWindowClosed}
            className="flex items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl transition-all hover:scale-105"
            style={{
              border: selectedBetType === 'heads' ? '3px solid #00FFC6' : '2px solid #00FFC6',
              background: selectedBetType === 'heads' ? 'rgba(0, 255, 198, 0.2)' : 'rgba(20, 20, 30, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: selectedBetType === 'heads' ? '0 0 30px rgba(0, 255, 198, 0.5)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
              opacity: bettingWindowClosed ? 0.5 : 1,
              cursor: bettingWindowClosed ? 'not-allowed' : 'pointer'
            }}
          >
            {/* Heads Logo */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #00FFC6, #00d4a8)',
                  boxShadow: '0 4px 20px rgba(0, 255, 198, 0.4)'
                }}
              >
                <span className="text-xl sm:text-4xl font-bold text-white">H</span>
              </div>
              {headsBetTotal > 0 && (
                <div className="text-[10px] sm:text-xs font-mono font-bold text-neo-accent mt-1 px-1.5 sm:px-2 py-0.5 rounded-full" style={{
                  background: 'rgba(0, 255, 198, 0.2)',
                  border: '1px solid #00FFC6'
                }}>
                  {headsBetTotal}
                </div>
              )}
            </div>
            
            {/* Label and Ratio on Right */}
            <div className="flex flex-col items-start">
              <div className="text-xs sm:text-lg font-heading font-bold text-neo-accent">Heads</div>
              <div className="text-[10px] sm:text-sm text-white font-mono font-bold">Win: 1:1</div>
            </div>
          </button>

          {/* Center - Timer */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Round Number */}
            <div className="text-[10px] sm:text-xs text-neo-accent tracking-wider font-mono mb-1 sm:mb-2">
              ROUND #{totalGameCount !== null ? totalGameCount + 1 : '...'}
            </div>
            
            <div 
              className={`w-20 h-20 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center mb-1 ${
                countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult ? 'animate-pulse' : ''
              }`}
              style={{
                border: countdownTime <= 5 && countdownTime > 0 && !isFlipping && !currentResult 
                  ? '3px solid #FF005C' 
                  : '2px solid #00FFC6',
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
                  className="w-12 h-12 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: flipDisplay === 'H' 
                      ? 'linear-gradient(145deg, #00FFC6, #00d4a8)' 
                      : 'linear-gradient(145deg, #FF005C, #d40049)',
                    transform: 'rotateY(180deg)',
                    animation: 'flipCoin 0.15s linear'
                  }}
                >
                  <span className="text-2xl sm:text-4xl font-bold text-white">{flipDisplay}</span>
                </div>
              ) : currentResult ? (
                <div className="text-center">
                  <div 
                    className="w-12 h-12 sm:w-20 sm:h-20 rounded-full flex items-center justify-center animate-bounce"
                    style={{
                      background: currentResult === 'heads' 
                        ? 'linear-gradient(145deg, #00FFC6, #00d4a8)' 
                        : 'linear-gradient(145deg, #FF005C, #d40049)'
                    }}
                  >
                    <span className="text-3xl sm:text-5xl font-bold text-white">
                      {currentResult === 'heads' ? 'H' : 'T'}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-heading font-bold mt-1" style={{
                    color: currentResult === 'heads' ? '#00FFC6' : '#FF005C'
                  }}>
                    {currentResult.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div 
                  className="text-2xl sm:text-4xl font-mono font-bold"
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
            
            {/* Betting Time Left */}
            <div className="text-[10px] sm:text-xs text-neo-accent tracking-wider font-mono mt-1">
              BET TIME: {Math.max(0, countdownTime - 10)}s
            </div>
          </div>

          {/* Right Panel - Tails Selection */}
          <button
            onClick={() => setSelectedBetType('tails')}
            disabled={bettingWindowClosed}
            className="flex items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl transition-all hover:scale-105"
            style={{
              border: selectedBetType === 'tails' ? '3px solid #FF005C' : '2px solid #FF005C',
              background: selectedBetType === 'tails' ? 'rgba(255, 0, 92, 0.2)' : 'rgba(20, 20, 30, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: selectedBetType === 'tails' ? '0 0 30px rgba(255, 0, 92, 0.5)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
              opacity: bettingWindowClosed ? 0.5 : 1,
              cursor: bettingWindowClosed ? 'not-allowed' : 'pointer'
            }}
          >
            {/* Label and Ratio on Left */}
            <div className="flex flex-col items-end">
              <div className="text-xs sm:text-lg font-heading font-bold text-neo-accent-secondary">Tails</div>
              <div className="text-[10px] sm:text-sm text-white font-mono font-bold">Win: 1:1</div>
            </div>
            
            {/* Tails Logo */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #FF005C, #d40049)',
                  boxShadow: '0 4px 20px rgba(255, 0, 92, 0.4)'
                }}
              >
                <span className="text-xl sm:text-4xl font-bold text-white">T</span>
              </div>
              {tailsBetTotal > 0 && (
                <div className="text-[10px] sm:text-xs font-mono font-bold text-neo-accent-secondary mt-1 px-1.5 sm:px-2 py-0.5 rounded-full" style={{
                  background: 'rgba(255, 0, 92, 0.2)',
                  border: '1px solid #FF005C'
                }}>
                  {tailsBetTotal}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-2 sm:space-y-3 px-2 sm:px-4">
          {/* Locked Bet Status Display - Consolidated by Type */}
          {lockedBets.length > 0 && (() => {
            const headsBets = lockedBets.filter(b => b.type === 'heads');
            const tailsBets = lockedBets.filter(b => b.type === 'tails');
            const headsTotal = headsBets.reduce((sum, bet) => sum + bet.amount, 0);
            const tailsTotal = tailsBets.reduce((sum, bet) => sum + bet.amount, 0);
            
            return (
              <div className="text-center flex flex-wrap gap-2 justify-center">
                {headsTotal > 0 && (
                  <div 
                    className="inline-block px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-heading font-bold"
                    style={{
                      border: '2px solid #EAB308',
                      color: '#EAB308',
                      background: 'rgba(234, 179, 8, 0.2)',
                      boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)'
                    }}
                  >
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                    LOCKED: {headsTotal} on HEADS
                  </div>
                )}
                {tailsTotal > 0 && (
                  <div 
                    className="inline-block px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-heading font-bold"
                    style={{
                      border: '2px solid #EAB308',
                      color: '#EAB308',
                      background: 'rgba(234, 179, 8, 0.2)',
                      boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)'
                    }}
                  >
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                    LOCKED: {tailsTotal} on TAILS
                  </div>
                )}
              </div>
            );
          })()}
          
          {/* Status */}
          <div className="text-center">
            <div 
              className="inline-block px-3 sm:px-6 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-heading font-bold tracking-widest"
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

          {/* Bet Amount & Place Bet */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
            {/* Bet Amount Buttons - Wrapped on Mobile */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
              {QUICK_AMOUNTS.map((amount, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAmount(amount)}
                  disabled={bettingWindowClosed || amount > (playerChips ?? 0)}
                  className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-mono font-bold transition-all ${
                    selectedAmount === amount
                      ? 'bg-neo-accent text-neo-bg border-2 border-neo-accent'
                      : 'bg-gray-800/60 text-neo-accent border border-neo-accent/50'
                  } ${
                    bettingWindowClosed || amount > (playerChips ?? 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:opacity-90 hover:scale-105'
                  }`}
                  style={{
                    minWidth: '45px',
                    boxShadow: selectedAmount === amount ? '0 0 20px rgba(0, 255, 198, 0.6)' : 'none'
                  }}
                >
                  {amount}
                </button>
              ))}
            </div>
            
            {/* Action Buttons - Show when bet type and amount are selected */}
            {selectedBetType && selectedAmount > 0 && lockedBets.length === 0 && (
              <div className="flex items-center gap-2">
                {/* Place Bet Button (Icon Only) */}
                <button
                  onClick={handlePlaceBet}
                  disabled={!canPlaceBet()}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                    canPlaceBet()
                      ? 'bg-neo-accent text-neo-bg border-2 border-neo-accent hover:scale-110'
                      : 'bg-gray-700 text-gray-400 border border-gray-600 cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    boxShadow: canPlaceBet() ? '0 0 30px rgba(0, 255, 198, 0.8)' : 'none'
                  }}
                  title={`Place Bet (${selectedAmount})`}
                >
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                
                {/* Lock Button (Icon Only) - Only show when there are unlocked bets */}
                {unlockedBets.length > 0 && (
                  <button
                    onClick={handleLockBet}
                    disabled={bettingWindowClosed}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                      !bettingWindowClosed
                        ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-500/30 hover:scale-110'
                        : 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      boxShadow: !bettingWindowClosed ? '0 0 30px rgba(234, 179, 8, 0.8)' : 'none'
                    }}
                    title={`Lock ${unlockedBets.length} bet(s)`}
                  >
                    <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
                
                {/* Cancel Button (Icon Only) - Only show when there are unlocked bets */}
                {unlockedBets.length > 0 && (
                  <button
                    onClick={handleCancelBet}
                    disabled={bettingWindowClosed}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                      !bettingWindowClosed
                        ? 'bg-red-500/20 text-red-400 border-2 border-red-400 hover:bg-red-500/30 hover:scale-110'
                        : 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      boxShadow: !bettingWindowClosed ? '0 0 30px rgba(239, 68, 68, 0.8)' : 'none'
                    }}
                    title={`Cancel ${unlockedBets.length} bet(s)`}
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
                
                {/* Repeat Last Bet Button (Icon Only) */}
                {lastBetSelection && unlockedBets.length === 0 && lockedBets.length === 0 && (
                  <button
                    onClick={handleRepeatBet}
                    disabled={!lastBetSelection || bettingWindowClosed || (playerChips !== null && (playerChips - totalBetAmount) < lastBetSelection.amount)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                      lastBetSelection && !bettingWindowClosed && playerChips !== null && (playerChips - totalBetAmount) >= lastBetSelection.amount
                        ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-400 hover:bg-blue-500/30 hover:scale-110'
                        : 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      boxShadow: lastBetSelection && !bettingWindowClosed ? '0 0 30px rgba(59, 130, 246, 0.8)' : 'none'
                    }}
                    title={lastBetSelection ? `Repeat: ${lastBetSelection.amount} on ${lastBetSelection.type}` : 'No previous bet'}
                  >
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
              </div>
            )}
            
            {/* Locked Status */}
            {lockedBets.length > 0 && (
              <div className="px-4 sm:px-8 py-1.5 sm:py-2.5 text-center">
                <span className="text-xs sm:text-sm font-heading font-bold text-yellow-400">
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                  {lockedBets.length} BET(S) LOCKED
                </span>
              </div>
            )}
          </div>

          {/* Recent Results */}
          <div className="text-center">
            <div className="text-xs text-neo-accent tracking-wider font-mono mb-1 sm:mb-2">RECENT RESULTS</div>
            <div className="flex gap-1 sm:gap-2 justify-center">
              {recentResults.slice(0, 6).map((game, index) => (
                <div
                  key={index}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center"
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
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-3 sm:p-4 rounded-xl text-center"
          style={{
            background: totalWinAmount > 0 
              ? 'linear-gradient(145deg, #00FFC6, #00d4a8)' 
              : 'linear-gradient(145deg, #FF005C, #d40049)',
            border: '3px solid ' + (totalWinAmount > 0 ? '#00FFC6' : '#FF005C'),
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
            {totalWinAmount > 0 ? 'YOU WON!' : 'YOU LOST'}
          </div>
          <div className="text-3xl sm:text-4xl font-mono font-bold text-white">
            {totalWinAmount > 0 ? `+${totalWinAmount}` : `-${betResults.reduce((sum, r) => sum + r.betAmount, 0)}`}
          </div>
        </div>
      )}
    </div>
  );
}
