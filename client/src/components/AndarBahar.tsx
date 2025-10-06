import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { useAuthStore } from '../lib/stores/useAuthStore';
import { Button } from './ui/button';
import { Card as UICard, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface Card {
  rank: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  color: 'red' | 'black';
}

interface MatchData {
  matchId: string;
  role: 'dealer' | 'guesser';
  opponent: string;
  betAmount: number;
}

export default function AndarBahar() {
  const { user } = useAuthStore();
  const [gameState, setGameState] = useState<'idle' | 'matchmaking' | 'in_match'>('idle');
  const [betAmount, setBetAmount] = useState<number>(100);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [jokerCard, setJokerCard] = useState<Card | null>(null);
  const [guesserChoice, setGuesserChoice] = useState<'andar' | 'bahar' | null>(null);
  const [andarPile, setAndarPile] = useState<Card[]>([]);
  const [baharPile, setBaharPile] = useState<Card[]>([]);
  const [winningSide, setWinningSide] = useState<'andar' | 'bahar' | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [matchmakingPosition, setMatchmakingPosition] = useState<number>(0);

  useEffect(() => {
    function onMatchmakingJoined(data: { position: number }) {
      setMatchmakingPosition(data.position);
      setGameState('matchmaking');
    }

    function onMatchFound(data: MatchData) {
      setMatchData(data);
      setGameState('in_match');
      setJokerCard(null);
      setGuesserChoice(null);
      setAndarPile([]);
      setBaharPile([]);
      setWinningSide(null);
      setWinner(null);
    }

    function onJokerRevealed(data: { matchId: string; jokerCard: Card; waitingFor: string }) {
      setJokerCard(data.jokerCard);
    }

    function onMatchCompleted(data: { 
      matchId: string; 
      winningSide: 'andar' | 'bahar'; 
      winner: string;
      andarPile: Card[];
      baharPile: Card[];
      jokerCard: Card;
    }) {
      setWinningSide(data.winningSide);
      setWinner(data.winner);
      setAndarPile(data.andarPile);
      setBaharPile(data.baharPile);
    }

    function onError(error: string) {
      console.error('Andar Bahar error:', error);
      alert(error);
    }

    socket.on('matchmaking-joined', onMatchmakingJoined);
    socket.on('match-found', onMatchFound);
    socket.on('joker-revealed', onJokerRevealed);
    socket.on('match-completed', onMatchCompleted);
    socket.on('error', onError);

    return () => {
      socket.off('matchmaking-joined', onMatchmakingJoined);
      socket.off('match-found', onMatchFound);
      socket.off('joker-revealed', onJokerRevealed);
      socket.off('match-completed', onMatchCompleted);
      socket.off('error', onError);
    };
  }, []);

  const handleJoinMatchmaking = () => {
    socket.emit('andar-bahar-join', { betAmount });
  };

  const handleMakeChoice = (choice: 'andar' | 'bahar') => {
    if (matchData && jokerCard) {
      socket.emit('andar-bahar-choice', { matchId: matchData.matchId, choice });
      setGuesserChoice(choice);
    }
  };

  const handlePlayAgain = () => {
    setGameState('idle');
    setMatchData(null);
    setJokerCard(null);
    setGuesserChoice(null);
    setAndarPile([]);
    setBaharPile([]);
    setWinningSide(null);
    setWinner(null);
  };

  const getCardSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥️';
      case 'diamonds': return '♦️';
      case 'clubs': return '♣️';
      case 'spades': return '♠️';
      default: return '';
    }
  };

  const renderCard = (card: Card, index: number) => {
    const suitSymbol = getCardSymbol(card.suit);
    const isRed = card.color === 'red';
    
    return (
      <div 
        key={index}
        className={`inline-block w-16 h-24 rounded-lg border-2 ${
          isRed ? 'border-red-500 bg-white' : 'border-black bg-white'
        } shadow-lg m-1 flex flex-col items-center justify-center`}
      >
        <div className={`text-2xl font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
          {card.rank}
        </div>
        <div className={`text-2xl ${isRed ? 'text-red-600' : 'text-black'}`}>
          {suitSymbol}
        </div>
      </div>
    );
  };

  // Idle state - join matchmaking
  if (gameState === 'idle') {
    return (
      <div className="min-h-screen bg-casino-green flex items-center justify-center p-4">
        <UICard className="w-full max-w-md bg-casino-black border-casino-gold border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-casino-gold mb-2">
              🃏 Andar Bahar
            </CardTitle>
            <p className="text-white text-lg">Cut Patti - 1v1 Card Game</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-white space-y-3">
              <p className="text-center mb-4">Traditional Indian card game</p>
              
              <div className="bg-casino-green/20 p-4 rounded space-y-2 text-sm">
                <p><strong>How to Play:</strong></p>
                <p>• Both players place equal bets</p>
                <p>• Dealer reveals a joker card</p>
                <p>• Guesser picks Andar (inside) or Bahar (outside)</p>
                <p>• Cards are dealt until matching rank appears</p>
                <p>• Winner takes the pot! 🎉</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-white text-sm font-semibold">Bet Amount:</label>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 250, 500, 1000, 2000, 5000, 10000].map(amount => (
                  <Button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    variant={betAmount === amount ? 'default' : 'outline'}
                    className={betAmount === amount 
                      ? 'bg-casino-gold text-casino-black hover:bg-casino-gold/80' 
                      : 'border-casino-gold text-casino-gold hover:bg-casino-gold/20'
                    }
                    size="sm"
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleJoinMatchmaking}
              className="w-full bg-casino-red hover:bg-red-700 text-white font-bold py-4 text-lg glow-red"
            >
              🎰 Find Match - {betAmount} Chips
            </Button>
          </CardContent>
        </UICard>
      </div>
    );
  }

  // Matchmaking state
  if (gameState === 'matchmaking') {
    return (
      <div className="min-h-screen bg-casino-green flex items-center justify-center p-4">
        <UICard className="w-full max-w-md bg-casino-black border-casino-gold border-2">
          <CardContent className="py-12 text-center space-y-6">
            <div className="text-casino-gold text-6xl animate-pulse">🔍</div>
            <h2 className="text-2xl font-bold text-casino-gold">Finding Opponent...</h2>
            <p className="text-white">Position in queue: {matchmakingPosition}</p>
            <p className="text-casino-gold">Bet amount: {betAmount} chips</p>
            <Button
              onClick={() => {
                socket.emit('andar-bahar-leave');
                setGameState('idle');
              }}
              variant="outline"
              className="border-casino-gold text-casino-gold hover:bg-casino-gold/20"
            >
              Cancel
            </Button>
          </CardContent>
        </UICard>
      </div>
    );
  }

  // In match state
  if (gameState === 'in_match' && matchData) {
    const isDealer = matchData.role === 'dealer';
    const isGuesser = matchData.role === 'guesser';
    const showChoice = isGuesser && jokerCard && !guesserChoice;
    const isGameComplete = winningSide !== null;
    const didIWin = winner === user?.username;

    return (
      <div className="min-h-screen bg-casino-green p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-casino-gold mb-2">🃏 Andar Bahar</h1>
            <div className="flex justify-center gap-4 text-white">
              <Badge className={`${isDealer ? 'bg-casino-gold text-casino-black' : 'bg-casino-black text-casino-gold border-casino-gold'} text-lg px-4 py-2`}>
                {isDealer ? '🎴 You are DEALER' : '🤔 You are GUESSER'}
              </Badge>
              <Badge className="bg-casino-black text-casino-gold border-casino-gold text-lg px-4 py-2">
                vs {matchData.opponent}
              </Badge>
              <Badge className="bg-casino-red text-white text-lg px-4 py-2">
                💰 {matchData.betAmount} chips
              </Badge>
            </div>
          </div>

          {/* Joker Card */}
          {jokerCard && (
            <div className="text-center mb-6">
              <p className="text-casino-gold text-xl mb-3 font-semibold">Joker Card:</p>
              {renderCard(jokerCard, 0)}
              <p className="text-white mt-2">
                Starting with: {jokerCard.color === 'black' ? '🎴 Andar (Black)' : '❤️ Bahar (Red)'}
              </p>
            </div>
          )}

          {/* Choice Buttons for Guesser */}
          {showChoice && (
            <div className="text-center mb-6">
              <p className="text-casino-gold text-xl mb-4 font-semibold">Make your choice:</p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => handleMakeChoice('andar')}
                  className="bg-black text-white hover:bg-black/80 font-bold py-6 px-12 text-2xl border-4 border-white"
                >
                  ♣️ Andar (Inside)
                </Button>
                <Button
                  onClick={() => handleMakeChoice('bahar')}
                  className="bg-red-600 text-white hover:bg-red-700 font-bold py-6 px-12 text-2xl border-4 border-white"
                >
                  ♥️ Bahar (Outside)
                </Button>
              </div>
            </div>
          )}

          {/* Waiting message */}
          {jokerCard && !showChoice && !isGameComplete && (
            <div className="text-center mb-6">
              <p className="text-casino-gold text-xl animate-pulse">
                {isDealer ? '⏳ Waiting for guesser to choose...' : '⏳ Dealing cards...'}
              </p>
            </div>
          )}

          {/* Card Piles */}
          {(andarPile.length > 0 || baharPile.length > 0) && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Andar Pile */}
              <UICard className={`bg-casino-black border-2 ${winningSide === 'andar' ? 'border-casino-gold shadow-2xl shadow-casino-gold' : 'border-white'}`}>
                <CardHeader>
                  <CardTitle className={`text-center ${winningSide === 'andar' ? 'text-casino-gold' : 'text-white'}`}>
                    ♣️ Andar ({andarPile.length})
                    {winningSide === 'andar' && <span className="ml-2">🏆 WINNER!</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap justify-center">
                    {andarPile.map((card, idx) => renderCard(card, idx))}
                  </div>
                </CardContent>
              </UICard>

              {/* Bahar Pile */}
              <UICard className={`bg-casino-black border-2 ${winningSide === 'bahar' ? 'border-casino-gold shadow-2xl shadow-casino-gold' : 'border-red-600'}`}>
                <CardHeader>
                  <CardTitle className={`text-center ${winningSide === 'bahar' ? 'text-casino-gold' : 'text-red-400'}`}>
                    ♥️ Bahar ({baharPile.length})
                    {winningSide === 'bahar' && <span className="ml-2">🏆 WINNER!</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap justify-center">
                    {baharPile.map((card, idx) => renderCard(card, idx))}
                  </div>
                </CardContent>
              </UICard>
            </div>
          )}

          {/* Game Result */}
          {isGameComplete && (
            <div className="text-center mb-6">
              <UICard className={`${didIWin ? 'bg-green-900 border-casino-gold' : 'bg-red-900 border-red-500'} border-4`}>
                <CardContent className="py-8">
                  <h2 className={`text-4xl font-bold mb-4 ${didIWin ? 'text-casino-gold' : 'text-red-300'}`}>
                    {didIWin ? '🎉 You Won!' : '😞 You Lost'}
                  </h2>
                  <p className="text-white text-xl mb-2">
                    Winner: <span className="text-casino-gold font-bold">{winner}</span>
                  </p>
                  <p className="text-white text-lg mb-4">
                    Winning side: <span className="text-casino-gold font-bold">{winningSide === 'andar' ? '♣️ Andar' : '♥️ Bahar'}</span>
                  </p>
                  <p className="text-white text-lg">
                    {didIWin ? `+${matchData.betAmount} chips` : `-${matchData.betAmount} chips`}
                  </p>
                  <Button
                    onClick={handlePlayAgain}
                    className="mt-6 bg-casino-gold text-casino-black hover:bg-casino-gold/80 font-bold py-3 px-8 text-lg"
                  >
                    Play Again
                  </Button>
                </CardContent>
              </UICard>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
