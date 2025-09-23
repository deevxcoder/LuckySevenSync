import { Server, Socket } from "socket.io";
import { storage } from "./storage";
import type { Player as DBPlayer } from "@shared/schema";

export interface Player {
  id: string;
  name: string;
  socketId: string;
  chips?: number;
  dbId?: number; // Reference to database player ID
}

export interface GameRoom {
  id: string;
  players: Player[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  currentCard: Card | null;
  countdownTime: number;
  gameStartTime: number | null;
  currentGameId?: number; // Database game ID for bet tracking
  activeBets?: Map<string, any[]>; // socketId -> bets array
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
    
    // Set up betting event handlers
    this.setupBettingHandlers();
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

  async addPlayerToLobby(socket: Socket) {
    // Create or find persistent player in database
    let dbPlayer: DBPlayer;
    try {
      dbPlayer = await storage.createPlayer({
        socketId: socket.id,
        name: `Player ${Math.floor(Math.random() * 1000)}`,
        chips: 1000 // Starting chips
      });
    } catch (error) {
      // Player might already exist, try to find them
      const existing = await storage.getPlayerBySocketId(socket.id);
      if (existing) {
        dbPlayer = existing;
      } else {
        console.error('Failed to create/find player:', error);
        socket.emit('error', 'Failed to join lobby');
        return;
      }
    }
    
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
        gameStartTime: null,
        activeBets: new Map()
      };
      this.rooms.set(roomId, availableRoom);
    }

    await this.joinRoom(socket, availableRoom.id);
  }

  async joinRoom(socket: Socket, roomId: string) {
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

    // Get or create persistent player
    let dbPlayer = await storage.getPlayerBySocketId(socket.id);
    if (!dbPlayer) {
      dbPlayer = await storage.createPlayer({
        socketId: socket.id,
        name: `Player ${room.players.length + 1}`,
        chips: 1000
      });
    }

    // Add player to new room
    const player: Player = {
      id: socket.id,
      name: dbPlayer.name,
      socketId: socket.id,
      chips: dbPlayer.chips,
      dbId: dbPlayer.id
    };

    room.players.push(player);
    this.playerRooms.set(socket.id, roomId);
    socket.join(roomId);

    // Emit updated room state (sanitized to prevent card leaks)
    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to(roomId).emit('room-updated', sanitizedRoom);
    
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
      // Emit updated room state (sanitized to prevent card leaks)
      const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
      this.io.to(roomId).emit('room-updated', sanitizedRoom);
      console.log(`Player ${socket.id} left room ${roomId}`);
    }
  }

  async startGame(socket: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return;

    console.log(`Starting game in room ${roomId}`);
    
    room.status = 'countdown';
    room.countdownTime = 10; // 10 second countdown before card reveal
    room.gameStartTime = Date.now();

    // Generate the card that will be revealed
    room.currentCard = this.generateRandomCard();
    
    // Create game record immediately to prevent race conditions
    try {
      const gameRecord = await storage.createGame({
        roomId,
        cardNumber: room.currentCard.number,
        cardColor: room.currentCard.color,
        totalBets: 0,
        totalPlayers: room.players.length
      });
      room.currentGameId = gameRecord.id;
      console.log(`Created game record ${gameRecord.id} for room ${roomId}`);
    } catch (error) {
      console.error('Failed to create game record:', error);
    }

    // Send sanitized room without card details to prevent cheating
    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to(roomId).emit('game-starting', {
      room: sanitizedRoom,
      countdownTime: room.countdownTime
    });

    // Start countdown
    const interval = setInterval(() => {
      room.countdownTime--;
      
      // Send sanitized room without card details during countdown
      const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
      this.io.to(roomId).emit('countdown-tick', {
        time: room.countdownTime,
        room: sanitizedRoom
      });

      if (room.countdownTime <= 0) {
        clearInterval(interval);
        this.countdownIntervals.delete(roomId);
        this.revealCard(roomId);
      }
    }, 1000);

    this.countdownIntervals.set(roomId, interval);
  }

  private async revealCard(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentCard) return;

    room.status = 'playing';
    room.currentCard.revealed = true;

    console.log(`Revealing card in room ${roomId}:`, room.currentCard);

    // Resolve all bets for this game
    await this.resolveBets(room);

    // Now that card is revealed, send full room
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
    room.currentGameId = undefined; // Reset game ID for next round
    room.activeBets?.clear(); // Ensure bets are cleared

    // Send sanitized room (card should be null at this point)
    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to(roomId).emit('round-ended', { room: sanitizedRoom });

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

  // Betting functionality
  private setupBettingHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('place-bet', async (data: { roomId: string; betType: string; betValue: string; amount: number }) => {
        await this.handlePlaceBet(socket, data);
      });
    });
  }

  private async handlePlaceBet(socket: Socket, data: { roomId: string; betType: string; betValue: string; amount: number }) {
    try {
      const room = this.rooms.get(data.roomId);
      if (!room || room.status !== 'countdown' || room.countdownTime <= 3) {
        socket.emit('bet-error', 'Cannot place bet at this time');
        return;
      }

      // Verify player is in this room
      const playerInRoom = room.players.find(p => p.socketId === socket.id);
      if (!playerInRoom || this.playerRooms.get(socket.id) !== data.roomId) {
        socket.emit('bet-error', 'You must be in the room to place bets');
        return;
      }

      // Find player in database
      const dbPlayer = await storage.getPlayerBySocketId(socket.id);
      if (!dbPlayer) {
        socket.emit('bet-error', 'Player not found');
        return;
      }

      // Validate bet type
      const validBetTypes = ['red', 'black', 'high', 'low', 'lucky7'];
      if (!validBetTypes.includes(data.betType)) {
        socket.emit('bet-error', 'Invalid bet type');
        return;
      }

      // Validate bet amount
      if (data.amount <= 0 || data.amount > dbPlayer.chips) {
        socket.emit('bet-error', 'Invalid bet amount');
        return;
      }

      // Ensure game record exists (should be created in startGame)
      if (!room.currentGameId) {
        socket.emit('bet-error', 'Game not ready for betting');
        return;
      }

      // Place bet in database
      const betResult = await storage.placeBet(
        dbPlayer.id,
        data.amount,
        data.betType,
        data.betValue,
        room.currentGameId
      );

      // Update room player chips
      const roomPlayer = room.players.find(p => p.socketId === socket.id);
      if (roomPlayer) {
        roomPlayer.chips = betResult.updatedPlayer.chips;
      }

      // Store bet in room for quick access
      if (!room.activeBets) {
        room.activeBets = new Map();
      }
      const playerBets = room.activeBets.get(socket.id) || [];
      playerBets.push(betResult.bet);
      room.activeBets.set(socket.id, playerBets);

      // Notify room of updated player chips (sanitized to prevent card leaks)
      const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
      this.io.to(data.roomId).emit('room-updated', sanitizedRoom);
      socket.emit('bet-placed', { bet: betResult.bet, chips: betResult.updatedPlayer.chips });
      
      console.log(`Bet placed: ${data.amount} chips on ${data.betType} by ${socket.id}`);
      
    } catch (error) {
      console.error('Error placing bet:', error);
      socket.emit('bet-error', 'Failed to place bet');
    }
  }

  private async resolveBets(room: GameRoom) {
    if (!room.activeBets || !room.currentCard || !room.currentGameId) return;

    console.log(`Resolving bets for room ${room.id} - Card: ${room.currentCard.number} ${room.currentCard.color}`);

    for (const [socketId, bets] of Array.from(room.activeBets.entries())) {
      for (const bet of bets) {
        const won = this.isBetWinner(bet, room.currentCard);
        const winAmount = won ? this.calculateWinAmount(bet) : 0;

        try {
          // Update bet outcome in database
          const result = await storage.resolveBet(bet.id, won, winAmount);
          
          // Update room player chips
          const roomPlayer = room.players.find(p => p.socketId === socketId);
          if (roomPlayer && result.updatedPlayer) {
            roomPlayer.chips = result.updatedPlayer.chips;
          }

          console.log(`Bet ${bet.id}: ${won ? 'WON' : 'LOST'} - Payout: ${winAmount}`);
        } catch (error) {
          console.error('Error resolving bet:', error);
        }
      }
    }

    // Clear active bets
    room.activeBets.clear();
  }

  private isBetWinner(bet: any, card: Card): boolean {
    switch (bet.betType) {
      case 'red':
        return card.color === 'red';
      case 'black':
        return card.color === 'black';
      case 'high':
        return card.number >= 8;
      case 'low':
        return card.number <= 7;
      case 'lucky7':
        return card.number === 7;
      default:
        return false;
    }
  }

  // Sanitize room object to prevent card information leaks during countdown
  private sanitizeRoomForBroadcast(room: GameRoom): GameRoom {
    return {
      ...room,
      // Hide card details during countdown phase
      currentCard: room.status === 'playing' && room.currentCard?.revealed 
        ? room.currentCard 
        : null,
      // Remove internal betting data
      activeBets: undefined,
      currentGameId: undefined
    };
  }

  private calculateWinAmount(bet: any): number {
    // Return total payout (stake + winnings) since resolveBet adds winAmount directly
    // Player already had stake deducted in placeBet, so winAmount should include stake return
    const payoutMultipliers: { [key: string]: number } = {
      'red': 2,    // 1:1 odds = 2x total (stake + equal winnings)
      'black': 2,  // 1:1 odds = 2x total (stake + equal winnings)
      'high': 2,   // 1:1 odds = 2x total (stake + equal winnings)
      'low': 2,    // 1:1 odds = 2x total (stake + equal winnings)
      'lucky7': 6  // 5:1 odds = 6x total (stake + 5x winnings)
    };
    
    return bet.betAmount * (payoutMultipliers[bet.betType] || 0);
  }
}
