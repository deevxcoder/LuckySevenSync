export interface Player {
  id: string;
  name: string;
  socketId: string;
  chips?: number;
  dbId?: number;
}

export interface Card {
  number: number;
  color: 'red' | 'black';
  revealed: boolean;
}

export interface GameRoom {
  id: string;
  players: Player[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  currentCard: Card | null;
  countdownTime: number;
  gameStartTime: number | null;
  roundNumber?: number;
}

export type GameEvent = 
  | 'join-lobby'
  | 'join-room'
  | 'leave-room'
  | 'start-game'
  | 'room-updated'
  | 'game-starting'
  | 'countdown-tick'
  | 'card-revealed'
  | 'round-ended'
  | 'error';
