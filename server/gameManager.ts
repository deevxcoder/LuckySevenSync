import { Server, Socket } from "socket.io";

export interface Player {
  id: string;
  name: string;
  socketId: string;
}

export interface GameRoom {
  id: string;
  players: Player[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  currentCard: Card | null;
  countdownTime: number;
  gameStartTime: number | null;
}

export interface Card {
  number: number;
  color: 'red' | 'black';
  revealed: boolean;
}

export class GameManager {
  private io: Server;
  private rooms: Map<string, GameRoom>;
  private playerRooms: Map<string, string>; // socketId -> roomId
  private countdownIntervals: Map<string, NodeJS.Timeout>;

  constructor(io: Server) {
    this.io = io;
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.countdownIntervals = new Map();
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generateRandomCard(): Card {
    return {
      number: Math.floor(Math.random() * 13) + 1,
      color: Math.random() > 0.5 ? 'red' : 'black',
      revealed: false
    };
  }

  addPlayerToLobby(socket: Socket) {
    // Find an available room or create a new one
    let availableRoom: GameRoom | null = null;
    
    for (const room of Array.from(this.rooms.values())) {
      if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
        availableRoom = room;
        break;
      }
    }

    if (!availableRoom) {
      // Create new room
      const roomId = this.generateRoomId();
      availableRoom = {
        id: roomId,
        players: [],
        status: 'waiting',
        maxPlayers: 10,
        currentCard: null,
        countdownTime: 30,
        gameStartTime: null
      };
      this.rooms.set(roomId, availableRoom);
    }

    this.joinRoom(socket, availableRoom.id);
  }

  joinRoom(socket: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', 'Room is full');
      return;
    }

    // Remove player from any existing room first
    this.leaveRoom(socket);

    // Add player to new room
    const player: Player = {
      id: socket.id,
      name: `Player ${room.players.length + 1}`,
      socketId: socket.id
    };

    room.players.push(player);
    this.playerRooms.set(socket.id, roomId);
    socket.join(roomId);

    // Emit updated room state
    this.io.to(roomId).emit('room-updated', room);
    
    console.log(`Player ${socket.id} joined room ${roomId}`);

    // Auto-start game if enough players (min 2)
    if (room.players.length >= 2 && room.status === 'waiting') {
      setTimeout(() => this.startGame(socket, roomId), 2000);
    }
  }

  leaveRoom(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove player from room
    room.players = room.players.filter(p => p.socketId !== socket.id);
    this.playerRooms.delete(socket.id);
    socket.leave(roomId);

    // If room is empty, delete it
    if (room.players.length === 0) {
      const interval = this.countdownIntervals.get(roomId);
      if (interval) {
        clearInterval(interval);
        this.countdownIntervals.delete(roomId);
      }
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted - empty`);
    } else {
      // Emit updated room state
      this.io.to(roomId).emit('room-updated', room);
      console.log(`Player ${socket.id} left room ${roomId}`);
    }
  }

  startGame(socket: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return;

    console.log(`Starting game in room ${roomId}`);
    
    room.status = 'countdown';
    room.countdownTime = 10; // 10 second countdown before card reveal
    room.gameStartTime = Date.now();

    // Generate the card that will be revealed
    room.currentCard = this.generateRandomCard();

    this.io.to(roomId).emit('game-starting', {
      room,
      countdownTime: room.countdownTime
    });

    // Start countdown
    const interval = setInterval(() => {
      room.countdownTime--;
      
      this.io.to(roomId).emit('countdown-tick', {
        time: room.countdownTime,
        room
      });

      if (room.countdownTime <= 0) {
        clearInterval(interval);
        this.countdownIntervals.delete(roomId);
        this.revealCard(roomId);
      }
    }, 1000);

    this.countdownIntervals.set(roomId, interval);
  }

  private revealCard(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentCard) return;

    room.status = 'playing';
    room.currentCard.revealed = true;

    console.log(`Revealing card in room ${roomId}:`, room.currentCard);

    this.io.to(roomId).emit('card-revealed', {
      card: room.currentCard,
      room
    });

    // After 5 seconds, start next round
    setTimeout(() => {
      this.startNextRound(roomId);
    }, 5000);
  }

  private startNextRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'waiting';
    room.currentCard = null;
    room.countdownTime = 30;

    this.io.to(roomId).emit('round-ended', { room });

    // Auto-start next round after 3 seconds
    setTimeout(() => {
      if (room.players.length >= 2) {
        this.startGame(room.players[0] as any, roomId);
      }
    }, 3000);
  }

  handleDisconnect(socket: Socket) {
    this.leaveRoom(socket);
  }
}
