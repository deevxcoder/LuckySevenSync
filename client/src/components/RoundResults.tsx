import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface RoundResult {
  id: number;
  cardNumber: number;
  cardColor: 'red' | 'black';
  totalBets: number;
  totalPlayers: number;
  createdAt: string;
}

export default function RoundResults() {
  const [results, setResults] = useState<RoundResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the last 10 round results
    const fetchResults = async () => {
      try {
        const response = await fetch('/api/games/recent');
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error('Failed to fetch round results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    // Set up an interval to refresh results every 30 seconds
    const interval = setInterval(fetchResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCardColor = (color: string) => {
    return color === 'red' ? 'text-red-500' : 'text-gray-800';
  };

  const getCardSymbol = (color: string) => {
    return color === 'red' ? '♦' : '♠';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getResultDisplay = (cardNumber: number) => {
    if (cardNumber === 7) return '7';
    if (cardNumber >= 8 && cardNumber <= 13) return 'H';
    return 'L';
  };

  const getResultLabel = (cardNumber: number) => {
    if (cardNumber === 7) return 'Lucky 7';
    if (cardNumber >= 8 && cardNumber <= 13) return 'High';
    return 'Low';
  };

  return (
    <Card className="bg-casino-black border-casino-gold border-2 h-fit">
      <CardHeader>
        <CardTitle className="text-casino-gold text-xl flex items-center gap-2">
          🎯 Last 10 Rounds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div 
                key={`loading-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-600 animate-pulse"
              >
                <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-600 rounded mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div 
                key={result.id}
                className="flex items-center gap-3 p-3 bg-casino-green rounded-lg border border-casino-gold"
              >
                <div className="w-8 h-8 bg-casino-gold rounded-full flex items-center justify-center text-casino-black font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold flex items-center gap-2">
                    <span className={`text-2xl ${getCardColor(result.cardColor)}`}>
                      {getCardSymbol(result.cardColor)}
                    </span>
                    <span className={`text-xl font-bold ${
                      result.cardNumber === 7 
                        ? 'text-yellow-400' 
                        : getCardColor(result.cardColor)
                    }`}>
                      {getResultDisplay(result.cardNumber)}
                    </span>
                    <span className="text-xs text-casino-gold">
                      ({getResultLabel(result.cardNumber)} - Card {result.cardNumber})
                    </span>
                  </div>
                  <div className="text-casino-gold text-sm">
                    {formatTime(result.createdAt)} • {result.totalPlayers} players • ${result.totalBets} total bets
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  result.cardColor === 'red' ? 'bg-red-500' : 'bg-gray-800'
                }`}></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-casino-gold text-sm py-8">
            No recent rounds found
          </div>
        )}
      </CardContent>
    </Card>
  );
}