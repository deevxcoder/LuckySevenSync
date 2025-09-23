import { 
  users, players, games, bets, chatMessages,
  type User, type InsertUser,
  type Player, type InsertPlayer,
  type Game, type InsertGame,
  type Bet, type InsertBet,
  type ChatMessage, type InsertChatMessage
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createAdminUser(user: InsertUser): Promise<User>;
  
  // Players
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerBySocketId(socketId: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerChips(playerId: number, chips: number): Promise<Player | undefined>;
  updatePlayerStats(playerId: number, wins: number, losses: number): Promise<Player | undefined>;
  
  // Games
  createGame(game: InsertGame): Promise<Game>;
  getGameHistory(limit?: number): Promise<Game[]>;
  getGamesByRoom(roomId: string, limit?: number): Promise<Game[]>;
  
  // Bets
  createBet(bet: InsertBet): Promise<Bet>;
  getBetsByGame(gameId: number): Promise<Bet[]>;
  getBetsByPlayer(playerId: number, limit?: number): Promise<Bet[]>;
  
  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(roomId: string, limit?: number): Promise<ChatMessage[]>;
  
  // Authentication
  verifyUserPassword(username: string, password: string): Promise<User | null>;
  
  // Advanced betting operations
  placeBet(playerId: number, betAmount: number, betType: string, betValue: string | null, gameId: number): Promise<{ bet: Bet; updatedPlayer: Player }>;
  resolveBet(betId: number, won: boolean, winAmount: number): Promise<{ bet: Bet; updatedPlayer?: Player }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword,
    }).returning();
    return result[0];
  }
  
  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
  
  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async createAdminUser(user: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword,
      role: 'admin'
    }).returning();
    return result[0];
  }
  
  // Players
  async getPlayer(id: number): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.id, id));
    return result[0];
  }
  
  async getPlayerBySocketId(socketId: string): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.socketId, socketId));
    return result[0];
  }
  
  async createPlayer(player: InsertPlayer): Promise<Player> {
    // Check if player already exists with this socketId
    const existing = await this.getPlayerBySocketId(player.socketId);
    if (existing) {
      return existing;
    }
    const result = await db.insert(players).values(player).returning();
    return result[0];
  }
  
  async updatePlayerChips(playerId: number, chips: number): Promise<Player | undefined> {
    if (chips < 0) {
      throw new Error('Chip balance cannot be negative');
    }
    const result = await db.update(players)
      .set({ chips, updatedAt: new Date() })
      .where(eq(players.id, playerId))
      .returning();
    return result[0];
  }
  
  // Atomic betting operation with transaction
  async placeBet(playerId: number, betAmount: number, betType: string, betValue: string | null, gameId: number): Promise<{ bet: Bet; updatedPlayer: Player }> {
    return await db.transaction(async (tx) => {
      // Lock player row and check balance
      const player = await tx.select().from(players)
        .where(eq(players.id, playerId))
        .for('update');
      
      if (!player[0]) {
        throw new Error('Player not found');
      }
      
      if (player[0].chips < betAmount) {
        throw new Error('Insufficient chips');
      }
      
      // Create the bet (outcome will be determined later)
      const bet = await tx.insert(bets).values({
        gameId,
        playerId,
        betAmount,
        betType,
        betValue,
        won: false, // Will be updated when game resolves
        winAmount: 0,
      }).returning();
      
      // Deduct chips from player
      const updatedPlayer = await tx.update(players)
        .set({ 
          chips: player[0].chips - betAmount,
          updatedAt: new Date() 
        })
        .where(eq(players.id, playerId))
        .returning();
      
      return { bet: bet[0], updatedPlayer: updatedPlayer[0] };
    });
  }
  
  // Update bet outcome and award winnings
  async resolveBet(betId: number, won: boolean, winAmount: number): Promise<{ bet: Bet; updatedPlayer?: Player }> {
    return await db.transaction(async (tx) => {
      // Update bet outcome
      const bet = await tx.update(bets)
        .set({ won, winAmount })
        .where(eq(bets.id, betId))
        .returning();
      
      let updatedPlayer;
      if (won && winAmount > 0) {
        // Award winnings to player
        const player = await tx.select().from(players)
          .where(eq(players.id, bet[0].playerId));
        
        if (player[0]) {
          updatedPlayer = await tx.update(players)
            .set({ 
              chips: player[0].chips + winAmount,
              totalWins: player[0].totalWins + 1,
              updatedAt: new Date() 
            })
            .where(eq(players.id, bet[0].playerId))
            .returning();
        }
      } else {
        // Update loss count
        const player = await tx.select().from(players)
          .where(eq(players.id, bet[0].playerId));
        
        if (player[0]) {
          updatedPlayer = await tx.update(players)
            .set({ 
              totalLosses: player[0].totalLosses + 1,
              updatedAt: new Date() 
            })
            .where(eq(players.id, bet[0].playerId))
            .returning();
        }
      }
      
      return { bet: bet[0], updatedPlayer: updatedPlayer?.[0] };
    });
  }
  
  async updatePlayerStats(playerId: number, wins: number, losses: number): Promise<Player | undefined> {
    const result = await db.update(players)
      .set({ totalWins: wins, totalLosses: losses, updatedAt: new Date() })
      .where(eq(players.id, playerId))
      .returning();
    return result[0];
  }
  
  // Games
  async createGame(game: InsertGame): Promise<Game> {
    const result = await db.insert(games).values(game).returning();
    return result[0];
  }
  
  async getGameHistory(limit: number = 50): Promise<Game[]> {
    return await db.select().from(games)
      .orderBy(desc(games.createdAt))
      .limit(limit);
  }
  
  async getGamesByRoom(roomId: string, limit: number = 20): Promise<Game[]> {
    return await db.select().from(games)
      .where(eq(games.roomId, roomId))
      .orderBy(desc(games.createdAt))
      .limit(limit);
  }
  
  // Bets
  async createBet(bet: InsertBet): Promise<Bet> {
    const result = await db.insert(bets).values(bet).returning();
    return result[0];
  }
  
  async getBetsByGame(gameId: number): Promise<Bet[]> {
    return await db.select().from(bets)
      .where(eq(bets.gameId, gameId))
      .orderBy(desc(bets.createdAt));
  }
  
  async getBetsByPlayer(playerId: number, limit: number = 50): Promise<Bet[]> {
    return await db.select().from(bets)
      .where(eq(bets.playerId, playerId))
      .orderBy(desc(bets.createdAt))
      .limit(limit);
  }
  
  // Chat Messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }
  
  async getChatHistory(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
