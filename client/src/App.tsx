import { useEffect, useState } from 'react';
import { socket } from './lib/socket';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import AndarBahar from './components/AndarBahar';
import CoinTossRoom from './components/CoinToss/CoinTossRoom';
import AuthContainer from './components/Auth/AuthContainer';
import HomePage from './components/HomePage';
import UserDashboard from './components/Dashboard/UserDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import { HeaderWallet } from './components/HeaderWallet';
import { useGameStore } from './lib/stores/useGameStore';
import { useAudio } from './lib/stores/useAudio';
import { useAuthStore } from './lib/stores/useAuthStore';
import { Button } from './components/ui/button';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string>('');
  const { isAuthenticated, user } = useAuthStore();
  const [currentView, setCurrentView] = useState<'game' | 'userDashboard' | 'adminDashboard' | 'andarBahar' | 'coinToss'>(
    user?.role === 'admin' ? 'adminDashboard' : 'userDashboard'
  );
  const [showHomePage, setShowHomePage] = useState(true); // New state for home vs auth
  const { currentRoom, setCurrentRoom, setPlayers } = useGameStore();
  const { initializeSounds, isInitialized, isMuted, toggleMute, playBackgroundMusic } = useAudio();

  // Update view when user changes (after login)
  useEffect(() => {
    if (user) {
      setCurrentView(user.role === 'admin' ? 'adminDashboard' : 'userDashboard');
    }
  }, [user]);

  useEffect(() => {
    // Initialize sounds when app loads
    if (!isInitialized) {
      initializeSounds();
    }
    
    // Check if already connected
    if (socket.connected && socket.id) {
      setIsConnected(true);
      setSocketId(socket.id);
    }
    
    function onConnect() {
      setIsConnected(true);
      setSocketId(socket.id || '');
      console.log('Connected to server');
      // Don't auto-play music - wait for user to unmute (satisfies autoplay policies)
    }

    function onDisconnect() {
      setIsConnected(false);
      setSocketId('');
      console.log('Disconnected from server');
    }

    function onRoomUpdated(room: any) {
      setCurrentRoom(room);
      setPlayers(room.players);
    }

    function onError(error: string) {
      console.error('Socket error:', error);
      alert(error);
    }

    // Listen for coin toss exit event
    function handleExitCoinToss() {
      setCurrentView('userDashboard');
    }

    // Listen for lucky 7 exit event
    function handleExitLucky7() {
      setCurrentView('userDashboard');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-updated', onRoomUpdated);
    socket.on('error', onError);
    window.addEventListener('exitCoinToss', handleExitCoinToss);
    window.addEventListener('exitLucky7', handleExitLucky7);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-updated', onRoomUpdated);
      socket.off('error', onError);
      window.removeEventListener('exitCoinToss', handleExitCoinToss);
      window.removeEventListener('exitLucky7', handleExitLucky7);
    };
  }, [setCurrentRoom, setPlayers, initializeSounds, isInitialized, isMuted, playBackgroundMusic]);

  // Admins should not access the game view - redirect to admin dashboard
  useEffect(() => {
    if (user?.role === 'admin' && (currentView === 'game' || currentView === 'andarBahar' || currentView === 'coinToss')) {
      setCurrentView('adminDashboard');
    }
  }, [user, currentView]);

  // Show home page or authentication if user is not logged in
  if (!isAuthenticated) {
    if (showHomePage) {
      return (
        <HomePage 
          onLoginClick={() => setShowHomePage(false)}
          onSignupClick={() => setShowHomePage(false)}
        />
      );
    } else {
      return <AuthContainer onBackToHome={() => setShowHomePage(true)} />;
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-purple flex items-center justify-center">
        <div className="glass-card px-8 py-6 rounded-3xl">
          <div className="text-white text-xl font-bold glow-purple">
            Connecting to KingGames...
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard views
  if (currentView === 'userDashboard') {
    return <UserDashboard 
      onNavigateToGame={() => setCurrentView('game')} 
      onNavigateToCoinToss={() => setCurrentView('coinToss')}
    />;
  }

  if (currentView === 'adminDashboard') {
    return <AdminDashboard />;
  }

  // Show Andar Bahar game view
  if (currentView === 'andarBahar') {
    return (
      <div className="min-h-screen bg-gradient-purple relative">
        <div className="absolute top-0 left-0 right-0 z-50 glass-header border-b border-purple-accent/30">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center gap-4">
              <h2 className="text-purple-accent font-bold text-lg glow-purple">🃏 Andar Bahar</h2>
              <span className="text-white/90">Welcome, {user?.username}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <HeaderWallet socketId={socketId} />
              <Button
                onClick={() => setCurrentView('userDashboard')}
                variant="outline"
                size="sm"
                className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
              >
                📊 Dashboard
              </Button>
              <Button
                onClick={toggleMute}
                variant="outline"
                size="sm"
                className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
              >
                {isMuted ? '🔇' : '🔊'}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="pt-16">
          <AndarBahar />
        </div>
      </div>
    );
  }

  // Show Coin Toss game view
  if (currentView === 'coinToss') {
    return (
      <div className="min-h-screen bg-gradient-purple relative">
        <div className="absolute top-0 left-0 right-0 z-50 glass-header border-b border-purple-accent/30">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center gap-4">
              <h2 className="text-purple-accent font-bold text-lg glow-purple">🪙 Coin Toss</h2>
              <span className="text-white/90">Welcome, {user?.username}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <HeaderWallet socketId={socketId} />
              <Button
                onClick={() => setCurrentView('userDashboard')}
                variant="outline"
                size="sm"
                className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
              >
                📊 Dashboard
              </Button>
              <Button
                onClick={toggleMute}
                variant="outline"
                size="sm"
                className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
              >
                {isMuted ? '🔇' : '🔊'}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="pt-16">
          <CoinTossRoom />
        </div>
      </div>
    );
  }

  // Show main game interface with navigation (only for regular users)
  return (
    <div className="min-h-screen bg-gradient-purple relative">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 glass-header border-b border-purple-accent/30">
        <div className="flex justify-between items-center px-4 py-3">
          <div className="flex items-center gap-4">
            <h2 className="text-purple-accent font-bold text-lg glow-purple">👑 KingGames</h2>
            <span className="text-white/90">Welcome, {user?.username}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <HeaderWallet socketId={socketId} />
            <Button
              onClick={() => setCurrentView('userDashboard')}
              variant="outline"
              size="sm"
              className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
            >
              📊 Dashboard
            </Button>
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
              className="glass-button border-purple-accent/50 text-white hover:border-purple-accent"
            >
              {isMuted ? '🔇' : '🔊'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Game Content with top padding for navigation */}
      <div className="pt-16">
        {currentRoom ? <GameRoom /> : <GameLobby />}
      </div>
    </div>
  );
}

export default App;
