import { useState, useEffect, useRef } from 'react';
import { socket } from '../../lib/socket';
import { useAuthStore } from '../../lib/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import CoinTossBettingPanel from './CoinTossBettingPanel';

interface CoinTossRoomData {
  id: string;
  status: string;
  currentResult: 'heads' | 'tails' | null;
  roundNumber: number;
}

export default function CoinTossRoom() {
  const { user } = useAuthStore();
  const [currentResult, setCurrentResult] = useState<'heads' | 'tails' | null>(null);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [playerChips, setPlayerChips] = useState<number>(1000);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [socketId, setSocketId] = useState<string>('');
  const [totalGameCount, setTotalGameCount] = useState<number>(0);
  const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
  const [storedBets, setStoredBets] = useState<any[]>([]);
  const [betResults, setBetResults] = useState<any[]>([]);
  const [totalWinAmount, setTotalWinAmount] = useState<number>(0);
  const lastValidBetsRef = useRef<any[]>([]);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  const BET_TYPE_LABELS = {
    'heads': '🪙 Heads',
    'tails': '🎯 Tails',
  };

  const isBetWinner = (betType: string, result: 'heads' | 'tails'): boolean => {
    return betType === result;
  };

  const calculateWinAmount = (betAmount: number): number => {
    return betAmount * 2;
  };

  const storeBetsFromChild = (bets: any[]) => {
    if (bets.length > 0) {
      setStoredBets(bets);
      lastValidBetsRef.current = bets;
    }
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
      setSocketConnected(true);
      setSocketId(socket.id || '');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from coin toss socket');
      setSocketConnected(false);
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
      setStoredBets([]);
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

        const betsToProcess = lastValidBetsRef.current.length > 0 ? lastValidBetsRef.current : storedBets;
        
        const results = betsToProcess.map(bet => ({
          betType: bet.type,
          betAmount: bet.amount,
          won: isBetWinner(bet.type, data.result),
          winAmount: isBetWinner(bet.type, data.result) ? calculateWinAmount(bet.amount) : 0,
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
      setStoredBets([]);
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
  }, [user, socketConnected, socketId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Card className="bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-500 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-center text-white">
              🪙 Coin Toss Game
            </CardTitle>
            <div className="text-center text-yellow-100 text-sm">
              Round #{totalGameCount + 1}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center bg-black bg-opacity-30 p-4 rounded-lg">
              <div className="text-white">
                <div className="text-sm opacity-80">Your Chips</div>
                <div className="text-3xl font-bold">💰 {playerChips}</div>
              </div>
              <div className="text-white text-center">
                <div className="text-sm opacity-80">Time Remaining</div>
                <div className="text-5xl font-mono font-bold">
                  {countdownTime}s
                </div>
                <div className="text-xs mt-1">
                  {countdownTime > 10 ? '🎲 Betting Open' : countdownTime > 0 ? '🔒 Admin Override Window' : '⏰ Revealing...'}
                </div>
              </div>
              <div className="text-white text-right">
                <div className="text-sm opacity-80">Status</div>
                <Badge variant={gameStatus === 'countdown' ? 'default' : 'secondary'} className="text-lg">
                  {gameStatus === 'countdown' ? 'BETTING' : gameStatus === 'revealing' ? 'REVEALING' : 'WAITING'}
                </Badge>
              </div>
            </div>

            {(isFlipping || (currentResult && gameStatus === 'revealing')) && (
              <div className="bg-gradient-to-r from-green-600 to-green-800 p-8 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <div className={`relative w-48 h-48 ${isFlipping ? 'animate-coin-flip' : 'animate-bounce-in'}`}>
                    <img 
                      src={`/coin-images/${currentResult === 'heads' ? 'heads' : 'tails'}.png`}
                      alt={currentResult || 'coin'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                {!isFlipping && (
                  <div className="text-4xl font-bold text-white animate-fade-in">
                    {currentResult?.toUpperCase()}
                  </div>
                )}
              </div>
            )}

            {showResultPopup && betResults.length > 0 && (
              <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-6 rounded-lg border-2 border-purple-400 shadow-xl">
                <h3 className="text-2xl font-bold text-white mb-4 text-center">
                  {totalWinAmount > 0 ? '🎉 You Won!' : '😔 Better Luck Next Time'}
                </h3>
                <div className="space-y-2 mb-4">
                  {betResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-3 rounded ${
                        result.won ? 'bg-green-600' : 'bg-red-600'
                      } text-white`}
                    >
                      <span>{BET_TYPE_LABELS[result.betType as keyof typeof BET_TYPE_LABELS]}</span>
                      <span className="font-bold">{result.betAmount} chips</span>
                      <span className="font-bold">
                        {result.won ? `+${result.winAmount}` : '-'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-center text-2xl font-bold text-yellow-300">
                  {totalWinAmount > 0 ? `Total Won: ${totalWinAmount} chips` : 'Total Lost: ' + betResults.reduce((sum, r) => sum + r.betAmount, 0) + ' chips'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <CoinTossBettingPanel
          playerChips={playerChips}
          gameStatus={gameStatus}
          countdownTime={countdownTime}
          roomId="COIN_TOSS_GLOBAL"
          onBetsChange={storeBetsFromChild}
        />

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentResults.slice(0, 20).map((game, index) => (
                <div
                  key={index}
                  className={`w-12 h-12 flex items-center justify-center rounded-full text-2xl ${
                    game.result === 'heads' ? 'bg-yellow-600' : 'bg-blue-600'
                  }`}
                  title={`Round ${game.id}: ${game.result}`}
                >
                  {game.result === 'heads' ? '🪙' : '🎯'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
