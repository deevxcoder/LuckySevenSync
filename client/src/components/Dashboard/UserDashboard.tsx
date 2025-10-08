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
    <div className="min-h-screen bg-neo-bg relative">
      {/* Top Navigation Bar - Responsive */}
      <div className="absolute top-0 left-0 right-0 z-50 neo-glass-card border-b border-neo-border rounded-none">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-2 sm:px-4 py-3 gap-2 sm:gap-0">
          {/* Left side - Title and Welcome */}
          <div className="flex items-center gap-2 sm:gap-4 justify-center sm:justify-start">
            <h2 className="text-neo-accent font-heading font-bold text-base sm:text-lg">👑 KingGames</h2>
            <span className="text-neo-text text-sm sm:text-base hidden sm:inline">
              Welcome, {user?.username}
            </span>
            <span className="text-neo-text text-sm sm:hidden">
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
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
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
            <h2 className="text-2xl font-heading font-bold text-neo-accent mb-4">Available Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lucky 7 Card */}
              <div className="neo-glass-card p-6">
                <h3 className="text-neo-accent text-xl font-heading font-bold flex items-center gap-2 mb-4">
                  🎰 Lucky 7
                </h3>
                <div className="space-y-4">
                  <p className="text-neo-text-secondary text-sm">
                    Bet on card outcomes in this fast-paced casino classic. Will it be red or black? Higher or lower than 7?
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="bg-neo-accent hover:bg-gradient-hover text-neo-bg font-heading font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 w-full"
                      onClick={onNavigateToGame}
                    >
                      🎮 Play Lucky 7
                    </Button>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-neo-text bg-white/10 px-2 py-1 rounded-lg border border-neo-border">Multi-bet</span>
                      <span className="text-xs text-neo-text bg-white/10 px-2 py-1 rounded-lg border border-neo-border">Live Rounds</span>
                      <span className="text-xs text-neo-text bg-white/10 px-2 py-1 rounded-lg border border-neo-border">20s Betting</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coin Toss Card */}
              <div className="neo-glass-card p-6">
                <h3 className="text-neo-accent text-xl font-heading font-bold flex items-center gap-2 mb-4">
                  🪙 Coin Toss
                  <span className="text-xs bg-neo-accent-secondary text-white px-2 py-1 rounded ml-auto">NEW</span>
                </h3>
                <div className="space-y-4">
                  <p className="text-neo-text-secondary text-sm">
                    Simple yet exciting! Bet on Heads or Tails in quick 30-second rounds with real-time results.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="bg-neo-accent hover:bg-gradient-hover text-neo-bg font-heading font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 w-full"
                      onClick={onNavigateToCoinToss}
                    >
                      🎮 Play Coin Toss
                    </Button>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-neo-text bg-white/10 px-2 py-1 rounded-lg border border-neo-border">Quick Rounds</span>
                      <span className="text-xs text-neo-text bg-white/10 px-2 py-1 rounded-lg border border-neo-border">2x Payout</span>
                      <span className="text-xs text-neo-text bg-white/10 px-2 py-1 rounded-lg border border-neo-border">30s Game</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats and Betting History */}
          {!showHistory ? (
            <div className="neo-glass-card p-6">
              <h3 className="text-neo-accent text-xl font-heading font-bold mb-4">Your Stats</h3>
              <div className="flex justify-between items-center">
                <p className="text-neo-text-secondary">Ready to play and build your game history!</p>
                <Button 
                  variant="outline"
                  className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
                  onClick={() => setShowHistory(true)}
                >
                  📊 View History
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-heading font-bold text-neo-accent">Betting History</h2>
                <Button 
                  variant="outline"
                  className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading transition-all duration-300"
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
