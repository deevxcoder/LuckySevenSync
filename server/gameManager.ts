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
  roundNumber?: number; // Current round number
}

export interface Card {
  number: number;
  color: 'red' | 'black';
  revealed: boolean;
}

export class GameManager {
  private io: Server;
  private globalRoom: GameRoom;
  private playerRooms: Map<string, string>; // socketId -> roomId (kept for compatibility)
  private countdownIntervals: Map<string, NodeJS.Timeout>;

  constructor(io: Server) {
    this.io = io;
    this.playerRooms = new Map();
    this.countdownIntervals = new Map();
    
    // Create one global room for everyone
    this.globalRoom = {
      id: 'GLOBAL',
      players: [],
      status: 'waiting',
      maxPlayers: 999999, // No practical limit
      currentCard: null,
      countdownTime: 60,
      gameStartTime: null,
      activeBets: new Map(),
      roundNumber: 1
    };
    
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
    // Join the global room directly - player creation handled by API endpoints
    await this.joinRoom(socket, 'GLOBAL');
  }

  async joinRoom(socket: Socket, roomId: string) {
    const room = this.globalRoom; // Always use global room
    if (!room) {
      socket.emit('error', 'Game not available');
      return;
    }

    // No player limit check - everyone can join

    // Remove player from any existing room first
    this.leaveRoom(socket);

    // Create a basic room player object (database persistence handled by API endpoints)
    const player: Player = {
      id: socket.id,
      name: `Player ${room.players.length + 1}`,
      socketId: socket.id,
      chips: 1000, // Default chips - real balance from database via API
      dbId: undefined // Will be set when player authenticates and API creates database record
    };

    room.players.push(player);
    this.playerRooms.set(socket.id, 'GLOBAL');
    socket.join('GLOBAL');

    // Emit updated room state (sanitized to prevent card leaks)
    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to('GLOBAL').emit('room-updated', sanitizedRoom);
    
    console.log(`Player ${socket.id} joined Lucky 7 game`);

    // Auto-start game immediately (no minimum player requirement)
    if (room.status === 'waiting') {
      setTimeout(() => this.startGame(socket, 'GLOBAL'), 2000);
    }
  }

  leaveRoom(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const room = this.globalRoom;

    // Remove player from room
    room.players = room.players.filter((p: Player) => p.socketId !== socket.id);
    this.playerRooms.delete(socket.id);
    socket.leave(roomId);

    // Emit updated room state (sanitized to prevent card leaks)
    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to('GLOBAL').emit('room-updated', sanitizedRoom);
    console.log(`Player ${socket.id} left Lucky 7 game`);
  }

  async startGame(socket: Socket, roomId: string) {
    const room = this.globalRoom;
    if (!room || room.status !== 'waiting') return;

    console.log(`Starting Lucky 7 game for everyone`);
    
    room.status = 'countdown';
    room.countdownTime = 60; // 60 second countdown before card reveal
    room.gameStartTime = Date.now();

    // Generate the card that will be revealed
    room.currentCard = this.generateRandomCard();
    
    // Create game record immediately to prevent race conditions
    try {
      const gameRecord = await storage.createGame({
        roomId: 'GLOBAL',
        cardNumber: room.currentCard.number,
        cardColor: room.currentCard.color,
        totalBets: 0,
        totalPlayers: room.players.length
      });
      room.currentGameId = gameRecord.id;
      console.log(`Created game record ${gameRecord.id} for Lucky 7`);
    } catch (error) {
      console.error('Failed to create game record:', error);
    }

    // Send sanitized room without card details to prevent cheating
    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to('GLOBAL').emit('game-starting', {
      room: sanitizedRoom,
      countdownTime: room.countdownTime
    });

    // Start countdown
    const interval = setInterval(() => {
      room.countdownTime--;
      
      // Send sanitized room without card details during countdown
      const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
      this.io.to('GLOBAL').emit('countdown-tick', {
        time: room.countdownTime,
        room: sanitizedRoom
      });

      if (room.countdownTime <= 0) {
        clearInterval(interval);
        this.countdownIntervals.delete('GLOBAL');
        this.revealCard('GLOBAL');
      }
    }, 1000);

    this.countdownIntervals.set('GLOBAL', interval);
  }

  private async revealCard(roomId: string) {
    const room = this.globalRoom;
    if (!room || !room.currentCard) return;

    room.status = 'playing';
    room.currentCard.revealed = true;

    console.log(`Revealing card in Lucky 7:`, room.currentCard);

    // Resolve all bets for this game
    await this.resolveBets(room);

    // Mark game as completed
    if (room.currentGameId) {
      try {
        await storage.markGameCompleted(room.currentGameId);
        console.log(`Game ${room.currentGameId} marked as completed`);
      } catch (error) {
        console.error('Failed to mark game as completed:', error);
      }
    }

    // Now that card is revealed, send full room
    this.io.to('GLOBAL').emit('card-revealed', {
      card: room.currentCard,
      room
    });

    // Wait 3 seconds to show results, then start next round
    setTimeout(() => {
      this.startNextRound('GLOBAL');
    }, 3000);
  }

  private startNextRound(roomId: string) {
    const room = this.globalRoom;
    if (!room) return;

    room.status = 'waiting';
    room.currentCard = null;
    room.countdownTime = 60;
    room.currentGameId = undefined; // Reset game ID for next round
    room.activeBets?.clear(); // Ensure bets are cleared
    room.roundNumber = (room.roundNumber || 1) + 1; // Increment round number

    // Send sanitized room (card should be null at this point)
    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to('GLOBAL').emit('round-ended', { room: sanitizedRoom });

    // Auto-start next round immediately (no minimum player requirement)
    this.startGame(room.players[0] as any, 'GLOBAL');
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
      
      // Handle authentication updates
      socket.on('update-player-auth', async (data: { userId: number; username: string }) => {
        await this.handlePlayerAuth(socket, data);
      });
    });
  }

  private async handlePlayerAuth(socket: Socket, data: { userId: number; username: string }) {
    try {
      const room = this.globalRoom;
      if (!room) return;

      // Find the room player for this socket
      const roomPlayer = room.players.find((p: Player) => p.socketId === socket.id);
      if (!roomPlayer) return;

      // Get or create the database player record for this user
      const dbPlayer = await storage.createOrUpdatePlayerByUserId(data.userId, socket.id, data.username);
      
      // Update the room player with database information
      roomPlayer.name = dbPlayer.name;
      roomPlayer.chips = dbPlayer.chips;
      roomPlayer.dbId = dbPlayer.id;

      // Broadcast updated room state
      const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
      this.io.to('GLOBAL').emit('room-updated', sanitizedRoom);
      
      console.log(`Player ${socket.id} authenticated as user ${data.userId} (${data.username}) with ${dbPlayer.chips} chips`);
    } catch (error) {
      console.error('Error handling player authentication:', error);
    }
  }

  private async handlePlaceBet(socket: Socket, data: { roomId: string; betType: string; betValue: string; amount: number }) {
    try {
      const room = this.globalRoom;
      if (!room || room.status !== 'countdown' || room.countdownTime <= 20) {
        socket.emit('bet-error', 'Cannot place bet at this time');
        return;
      }

      // Verify player is in the game and authenticated
      const playerInRoom = room.players.find((p: Player) => p.socketId === socket.id);
      if (!playerInRoom) {
        socket.emit('bet-error', 'You must be in the game to place bets');
        return;
      }

      // Check if player is authenticated (has dbId from authentication)
      if (!playerInRoom.dbId) {
        socket.emit('bet-error', 'Authentication required to place bets');
        return;
      }

      // Get current database player state
      const dbPlayer = await storage.getPlayer(playerInRoom.dbId);
      if (!dbPlayer) {
        socket.emit('bet-error', 'Player record not found');
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
      const roomPlayer = room.players.find((p: Player) => p.socketId === socket.id);
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
      this.io.to('GLOBAL').emit('room-updated', sanitizedRoom);
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
          const roomPlayer = room.players.find((p: Player) => p.socketId === socketId);
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
