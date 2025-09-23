import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameRoom, Player } from '../../types/game';

type GameState = 'lobby' | 'waiting' | 'countdown' | 'playing' | 'finished';

interface GameStore {
  // Current game state
  gameState: GameState;
  currentRoom: GameRoom | null;
  players: Player[];
  
  // Actions
  setGameState: (state: GameState) => void;
  setCurrentRoom: (room: GameRoom | null) => void;
  setPlayers: (players: Player[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set) => ({
    gameState: 'lobby',
    currentRoom: null,
    players: [],
    
    setGameState: (gameState) => set({ gameState }),
    setCurrentRoom: (currentRoom) => set({ currentRoom }),
    setPlayers: (players) => set({ players }),
    
    reset: () => set({
      gameState: 'lobby',
      currentRoom: null,
      players: [],
    }),
  }))
);

