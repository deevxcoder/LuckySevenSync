import { useEffect, useState } from 'react';
import { socket } from './lib/socket';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import { useGameStore } from './lib/stores/useGameStore';
import { useAudio } from './lib/stores/useAudio';
import { Button } from './components/ui/button';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const { currentRoom, setCurrentRoom, setPlayers } = useGameStore();
  const { initializeSounds, isInitialized, isMuted, toggleMute, playBackgroundMusic } = useAudio();

  useEffect(() => {
    // Initialize sounds when app loads
    if (!isInitialized) {
      initializeSounds();
    }
    
    function onConnect() {
      setIsConnected(true);
      console.log('Connected to server');
      // Don't auto-play music - wait for user to unmute (satisfies autoplay policies)
    }

    function onDisconnect() {
      setIsConnected(false);
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-updated', onRoomUpdated);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-updated', onRoomUpdated);
      socket.off('error', onError);
    };
  }, [setCurrentRoom, setPlayers, initializeSounds, isInitialized, isMuted, playBackgroundMusic]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-casino-green flex items-center justify-center">
        <div className="text-white text-xl font-bold">
          Connecting to Lucky 7...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-casino-green relative">
      {/* Sound Control Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          onClick={toggleMute}
          variant="outline"
          size="sm"
          className="bg-casino-black border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black"
        >
          {isMuted ? '🔇 Unmute' : '🔊 Mute'}
        </Button>
      </div>
      
      {currentRoom ? <GameRoom /> : <GameLobby />}
    </div>
  );
}

export default App;
