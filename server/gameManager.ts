import { Server, Socket } from "socket.io";
import { storage } from "./storage";
import type { Player as DBPlayer } from "@shared/schema";
import crypto from "crypto";

export interface HouseStats {
  totalWagered: number;  // Total amount wagered by all players
  totalPaidOut: number;  // Total amount paid out as winnings
  houseProfitThisRound: number;  // Profit for current round
  houseProfitTotal: number;  // Cumulative house profit
  roundCount: number;  // Number of rounds completed
  houseEdgePercent: number;  // Current house edge percentage
}

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
  houseStats?: HouseStats; // House profit tracking
}

export interface Card {
  number: number;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  color: 'red' | 'black';
  revealed: boolean;
}

export class GameManager {
  private io: Server;
  private globalRoom: GameRoom;
  private playerRooms: Map<string, string>; // socketId -> roomId (kept for compatibility)
  private countdownIntervals: Map<string, NodeJS.Timeout>;
  private adminOverrides: Map<number, string>; // gameId -> override result

  constructor(io: Server) {
    this.io = io;
    this.playerRooms = new Map();
    this.countdownIntervals = new Map();
    this.adminOverrides = new Map();
    
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
      roundNumber: 1,
      houseStats: {
        totalWagered: 0,
        totalPaidOut: 0,
        houseProfitThisRound: 0,
        houseProfitTotal: 0,
        roundCount: 0,
        houseEdgePercent: 0
      }
    };
    
    // Set up betting event handlers
    this.setupBettingHandlers();
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generateRandomCard(): Card {
    // Use crypto.randomInt for secure random generation
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
    const suitIndex = crypto.randomInt(0, suits.length);
    const suit = suits[suitIndex];
    const color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
    
    return {
      number: crypto.randomInt(1, 14), // 1-13
      suit,
      color,
      revealed: false
    };
  }

  private generateCardForResult(result: string): Card {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
    const suitIndex = crypto.randomInt(0, suits.length);
    const suit = suits[suitIndex];
    
    let number: number;
    let color: 'red' | 'black';
    
    switch (result) {
      case 'red':
        color = 'red';
        // Avoid 7 to ensure red wins
        const redNumbers = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13];
        number = redNumbers[crypto.randomInt(0, redNumbers.length)];
        break;
      case 'black':
        color = 'black';
        // Avoid 7 to ensure black wins
        const blackNumbers = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13];
        number = blackNumbers[crypto.randomInt(0, blackNumbers.length)];
        break;
      case 'low':
        number = crypto.randomInt(1, 7); // 1-6
        color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
        break;
      case 'high':
        number = crypto.randomInt(8, 14); // 8-13
        color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
        break;
      case 'lucky7':
        number = 7;
        color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
        break;
      default:
        // Fallback to random
        return this.generateRandomCard();
    }
    
    return {
      number,
      suit,
      color,
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

    // Check for admin override
    const gameId = room.currentGameId;
    if (gameId && this.adminOverrides.has(gameId)) {
      const overrideResult = this.adminOverrides.get(gameId)!;
      room.currentCard = this.generateCardForResult(overrideResult);
      this.adminOverrides.delete(gameId); // Remove override after use
      console.log(`Admin override applied for game ${gameId}: ${overrideResult}`);
    }

    room.status = 'playing';
    if (room.currentCard) {
      room.currentCard.revealed = true;
    }

    console.log(`Revealing card in Lucky 7:`, room.currentCard);

    // Resolve all bets for this game
    await this.resolveBets(room);

    // Update game record with actual revealed card (in case of admin override) and mark as completed
    if (room.currentGameId && room.currentCard) {
      try {
        await storage.updateGameCard(room.currentGameId, room.currentCard.number, room.currentCard.color);
        await storage.markGameCompleted(room.currentGameId);
        console.log(`Game ${room.currentGameId} updated with final card and marked as completed`);
      } catch (error) {
        console.error('Failed to update game card or mark as completed:', error);
      }
    }

    // Now that card is revealed, send full room
    this.io.to('GLOBAL').emit('card-revealed', {
      card: room.currentCard,
      room
    });

    // Wait 6 seconds to show results and popup, then start next round
    setTimeout(() => {
      this.startNextRound('GLOBAL');
    }, 6000);
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
    if (!room.activeBets || !room.currentCard || !room.currentGameId || !room.houseStats) return;

    console.log(`Resolving bets for room ${room.id} - Card: ${room.currentCard.number} ${room.currentCard.color}`);

    let roundWagered = 0;
    let roundPaidOut = 0;

    for (const [socketId, bets] of Array.from(room.activeBets.entries())) {
      for (const bet of bets) {
        const won = this.isBetWinner(bet, room.currentCard);
        const winAmount = won ? this.calculateWinAmount(bet) : 0;
        
        // Track house statistics
        roundWagered += bet.betAmount;
        roundPaidOut += winAmount;

        try {
          // Update bet outcome in database
          const result = await storage.resolveBet(bet.id, won, winAmount);
          
          // Update room player chips
          const roomPlayer = room.players.find((p: Player) => p.socketId === socketId);
          if (roomPlayer && result.updatedPlayer) {
            roomPlayer.chips = result.updatedPlayer.chips;
          }

          console.log(`Bet ${bet.id}: ${won ? 'WON' : 'LOST'} - Wager: ${bet.betAmount}, Payout: ${winAmount}`);
        } catch (error) {
          console.error('Error resolving bet:', error);
        }
      }
    }

    // Update house statistics
    this.updateHouseStats(room, roundWagered, roundPaidOut);

    // Clear active bets
    room.activeBets.clear();
  }

  private isBetWinner(bet: any, card: Card): boolean {
    switch (bet.betType) {
      case 'red':
        // Red loses on 7 (house number)
        return card.color === 'red' && card.number !== 7;
      case 'black':
        // Black loses on 7 (house number)
        return card.color === 'black' && card.number !== 7;
      case 'high':
        return card.number >= 8;
      case 'low':
        // Low is now 1-6 (7 is excluded as house number)
        return card.number >= 1 && card.number <= 6;
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
      'lucky7': 12 // 11:1 odds = 12x total (stake + 11x winnings)
    };
    
    const rawAmount = bet.betAmount * (payoutMultipliers[bet.betType] || 0);
    // Round to nearest cent using banker's rounding (round half to even)
    return this.roundToCents(rawAmount);
  }

  private roundToCents(amount: number): number {
    // Standard rounding to nearest cent for financial calculations
    const cents = Math.round(amount * 100);
    return cents / 100;
  }

  private updateHouseStats(room: GameRoom, roundWagered: number, roundPaidOut: number) {
    if (!room.houseStats) return;
    
    const houseProfitThisRound = roundWagered - roundPaidOut;
    
    // Update cumulative statistics
    room.houseStats.totalWagered += roundWagered;
    room.houseStats.totalPaidOut += roundPaidOut;
    room.houseStats.houseProfitThisRound = houseProfitThisRound;
    room.houseStats.houseProfitTotal += houseProfitThisRound;
    room.houseStats.roundCount += 1;
    
    // Calculate current house edge percentage
    if (room.houseStats.totalWagered > 0) {
      room.houseStats.houseEdgePercent = (room.houseStats.houseProfitTotal / room.houseStats.totalWagered) * 100;
    }
    
    console.log(`=== HOUSE STATS ROUND ${room.houseStats.roundCount} ===`);
    console.log(`Round Wagered: $${roundWagered.toFixed(2)}`);
    console.log(`Round Paid Out: $${roundPaidOut.toFixed(2)}`);
    console.log(`House Profit This Round: $${houseProfitThisRound.toFixed(2)}`);
    console.log(`Total Wagered: $${room.houseStats.totalWagered.toFixed(2)}`);
    console.log(`Total Paid Out: $${room.houseStats.totalPaidOut.toFixed(2)}`);
    console.log(`House Profit Total: $${room.houseStats.houseProfitTotal.toFixed(2)}`);
    console.log(`House Edge: ${room.houseStats.houseEdgePercent.toFixed(2)}%`);
    console.log(`==========================================`);
  }

  // Public method to get house statistics for API access
  getHouseStats() {
    return this.globalRoom?.houseStats || null;
  }

  // Get current round data for admin control
  async getCurrentRoundData() {
    const room = this.globalRoom;
    if (!room || !room.currentGameId) {
      return null;
    }

    // Calculate betting totals by type
    const betsByType = {
      red: 0,
      black: 0,
      low: 0,
      high: 0,
      lucky7: 0
    };

    let totalBets = 0;
    let dataSource = 'current'; // Track if we're showing current or last round data

    // Sum up all bets in the current round
    room.activeBets?.forEach((bets, socketId) => {
      bets.forEach(bet => {
        totalBets += bet.betAmount;
        if (betsByType.hasOwnProperty(bet.betType)) {
          betsByType[bet.betType as keyof typeof betsByType] += bet.betAmount;
        }
      });
    });

    // Only show last round data when current round has finished
    // During waiting/countdown/playing phases, always show current data (even if 0)
    if (totalBets === 0 && room.status === 'finished') {
      try {
        const lastRoundStats = await storage.getLastCompletedGameBettingStats(room.id);
        if (lastRoundStats) {
          totalBets = lastRoundStats.totalBets;
          Object.assign(betsByType, lastRoundStats.betsByType);
          dataSource = 'last';
        }
      } catch (error) {
        console.error('Failed to get last round betting stats:', error);
      }
    }

    return {
      gameId: room.currentGameId,
      totalBets: totalBets,
      betsByType: betsByType,
      status: room.status,
      timeRemaining: room.status === 'countdown' ? room.countdownTime : undefined,
      dataSource: dataSource // Include this for debugging/transparency
    };
  }

  // Set admin override for a specific game
  setAdminOverride(gameId: number, overrideResult: string): boolean {
    const room = this.globalRoom;
    
    // Only allow overrides during countdown phase
    if (!room || room.status !== 'countdown' || room.currentGameId !== gameId) {
      return false;
    }

    // Validate override result
    const validResults = ['red', 'black', 'low', 'high', 'lucky7'];
    if (!validResults.includes(overrideResult)) {
      return false;
    }

    this.adminOverrides.set(gameId, overrideResult);
    console.log(`Admin override set for game ${gameId}: ${overrideResult}`);
    return true;
  }
}
