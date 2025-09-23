import { useEffect, useState } from 'react';
import { socket } from './lib/socket';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import { useGameStore } from './lib/stores/useGameStore';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const { currentRoom, setCurrentRoom, setPlayers } = useGameStore();

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log('Connected to server');
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
  }, [setCurrentRoom, setPlayers]);

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
    <div className="min-h-screen bg-casino-green">
      {currentRoom ? <GameRoom /> : <GameLobby />}
    </div>
  );
}

export default App;
