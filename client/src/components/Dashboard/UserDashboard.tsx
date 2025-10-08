import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { HeaderWallet } from '../HeaderWallet';
import { useAuthStore } from '../../lib/stores/useAuthStore';
import { socket } from '../../lib/socket';
import { ComprehensiveBettingHistory } from '../ComprehensiveBettingHistory';


interface UserDashboardProps {
  onNavigateToGame?: () => void;
  onNavigateToCoinToss?: () => void;
}

export default function UserDashboard({ onNavigateToGame, onNavigateToCoinToss }: UserDashboardProps) {
  const { user, logout } = useAuthStore();
  const [socketId, setSocketId] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);

  useEffect(() => {
    // Check if already connected
    if (socket.connected && socket.id) {
      setSocketId(socket.id);
    }
    
    function onConnect() {
      setSocketId(socket.id || '');
    }

    function onDisconnect() {
      setSocketId('');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);


  const handleLogout = () => {
    logout();
  };


  return (
    <div className="min-h-screen bg-gradient-purple relative">
      {/* Top Navigation Bar - Responsive */}
      <div className="absolute top-0 left-0 right-0 z-50 glass-header border-b border-purple-accent/30">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-2 sm:px-4 py-3 gap-2 sm:gap-0">
          {/* Left side - Title and Welcome */}
          <div className="flex items-center gap-2 sm:gap-4 justify-center sm:justify-start">
            <h2 className="text-white font-bold text-base sm:text-lg glow-purple">👑 KingGames</h2>
            <span className="text-white text-sm sm:text-base hidden sm:inline">
              Welcome, {user?.username}
            </span>
            <span className="text-white text-sm sm:hidden">
              Hi, {user?.username}
            </span>
          </div>
          
          {/* Right side - Wallet and Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 justify-center sm:justify-end">
            <HeaderWallet socketId={socketId} />
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="glass-button border-purple-accent/50 text-white hover:border-purple-accent text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content with top padding for navigation */}
      <div className="pt-20 sm:pt-16 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Available Games */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Available Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lucky 7 Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    🎰 Lucky 7
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white text-sm">
                    Bet on card outcomes in this fast-paced casino classic. Will it be red or black? Higher or lower than 7?
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="glass-button text-white font-bold py-3 px-6 glow-purple w-full border-purple-accent/50 hover:border-purple-accent"
                      onClick={onNavigateToGame}
                    >
                      🎮 Play Lucky 7
                    </Button>
                    <div className="flex gap-2">
                      <span className="text-xs text-white bg-white/10 px-2 py-1 rounded">Multi-bet</span>
                      <span className="text-xs text-white bg-white/10 px-2 py-1 rounded">Live Rounds</span>
                      <span className="text-xs text-white bg-white/10 px-2 py-1 rounded">20s Betting</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coin Toss Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    🪙 Coin Toss
                    <span className="text-xs bg-purple-accent/80 text-white px-2 py-1 rounded ml-auto">NEW</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white text-sm">
                    Simple yet exciting! Bet on Heads or Tails in quick 30-second rounds with real-time results.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="glass-button text-white font-bold py-3 px-6 w-full border-purple-accent/50 hover:border-purple-accent glow-purple"
                      onClick={onNavigateToCoinToss}
                    >
                      🎮 Play Coin Toss
                    </Button>
                    <div className="flex gap-2">
                      <span className="text-xs text-white bg-white/10 px-2 py-1 rounded">Quick Rounds</span>
                      <span className="text-xs text-white bg-white/10 px-2 py-1 rounded">2x Payout</span>
                      <span className="text-xs text-white bg-white/10 px-2 py-1 rounded">30s Game</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats and Betting History */}
          {!showHistory ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-white text-xl">Your Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p className="text-white">Ready to play and build your game history!</p>
                  <Button 
                    variant="outline"
                    className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
                    onClick={() => setShowHistory(true)}
                  >
                    📊 View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Betting History</h2>
                <Button 
                  variant="outline"
                  className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
                  onClick={() => setShowHistory(false)}
                >
                  ← Back to Dashboard
                </Button>
              </div>
              <ComprehensiveBettingHistory />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}