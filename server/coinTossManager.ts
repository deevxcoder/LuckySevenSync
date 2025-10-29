import { Server, Socket } from "socket.io";
import { storage } from "./storage";
import type { Player as DBPlayer } from "@shared/schema";
import crypto from "crypto";

export interface CoinTossHouseStats {
  totalWagered: number;
  totalPaidOut: number;
  houseProfitThisRound: number;
  houseProfitTotal: number;
  roundCount: number;
  houseEdgePercent: number;
}

export interface CoinTossPlayer {
  id: string;
  name: string;
  socketId: string;
  chips?: number;
  dbId?: number;
}

export interface CoinTossRoom {
  id: string;
  players: CoinTossPlayer[];
  status: 'waiting' | 'countdown' | 'revealing' | 'finished';
  maxPlayers: number;
  currentResult: 'heads' | 'tails' | null;
  countdownTime: number;
  gameStartTime: number | null;
  currentGameId?: number;
  activeBets?: Map<string, any[]>;
  roundNumber?: number;
  houseStats?: CoinTossHouseStats;
}

export class CoinTossManager {
  private io: Server;
  private globalRoom: CoinTossRoom;
  private playerRooms: Map<string, string>;
  private countdownIntervals: Map<string, NodeJS.Timeout>;
  private adminOverrides: Map<number, 'heads' | 'tails'>;
  private lockedBets: Map<number, { betType: 'heads' | 'tails'; amount: number; socketId: string }>;
  private unlockedBets: Map<string, { betType: 'heads' | 'tails'; amount: number; playerId: number }>;

  constructor(io: Server) {
    this.io = io;
    this.playerRooms = new Map();
    this.countdownIntervals = new Map();
    this.adminOverrides = new Map();
    this.lockedBets = new Map();
    this.unlockedBets = new Map();
    
    this.globalRoom = {
      id: 'COIN_TOSS_GLOBAL',
      players: [],
      status: 'waiting',
      maxPlayers: 999999,
      currentResult: null,
      countdownTime: 30,
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
  }

  private async placeLockedBets(): Promise<void> {
    if (this.lockedBets.size === 0) return;

    const gameId = this.globalRoom.currentGameId;
    if (!gameId) {
      console.error('Cannot place locked bets: No active game');
      return;
    }

    console.log(`Placing ${this.lockedBets.size} locked bets...`);

    for (const [playerId, lockedBet] of Array.from(this.lockedBets.entries())) {
      try {
        const dbPlayer = await storage.getPlayer(playerId);
        if (!dbPlayer) {
          console.error(`Player ${playerId} not found for locked bet`);
          continue;
        }

        await storage.updatePlayerChips(dbPlayer.userId, dbPlayer.chips + lockedBet.amount);

        const result = await storage.placeCoinTossBet(
          playerId,
          lockedBet.amount,
          lockedBet.betType,
          gameId
        );

        const player = this.globalRoom.players.find(p => p.dbId === playerId);
        if (player) {
          player.chips = result.updatedPlayer.chips;
        }

        if (!this.globalRoom.activeBets) {
          this.globalRoom.activeBets = new Map();
        }

        if (!this.globalRoom.activeBets.has(lockedBet.socketId)) {
          this.globalRoom.activeBets.set(lockedBet.socketId, []);
        }

        this.globalRoom.activeBets.get(lockedBet.socketId)!.push({
          betId: result.bet.id,
          betType: lockedBet.betType,
          betAmount: lockedBet.amount
        });

        this.io.to(lockedBet.socketId).emit('coin-toss-locked-bet-placed', {
          bet: { betType: lockedBet.betType, betAmount: lockedBet.amount }
        });

        console.log(`Locked bet placed: Player ${playerId} bet ${lockedBet.amount} on ${lockedBet.betType}`);
      } catch (error) {
        console.error(`Error placing locked bet for player ${playerId}:`, error);
      }
    }

    this.lockedBets.clear();
  }

  private generateSmartCoinResult(room: CoinTossRoom): 'heads' | 'tails' {
    let headsBetTotal = 0;
    let tailsBetTotal = 0;
    
    if (room.activeBets) {
      room.activeBets.forEach((bets) => {
        bets.forEach(bet => {
          if (bet.betType === 'heads') {
            headsBetTotal += bet.betAmount;
          } else if (bet.betType === 'tails') {
            tailsBetTotal += bet.betAmount;
          }
        });
      });
    }
    
    console.log(`Coin Toss Bet Analysis - Heads: ${headsBetTotal}, Tails: ${tailsBetTotal}`);
    
    const totalBets = headsBetTotal + tailsBetTotal;
    
    if (totalBets === 0) {
      const result = crypto.randomInt(0, 2) === 0 ? 'heads' : 'tails';
      console.log(`No bets placed - random result: ${result}`);
      return result;
    }
    
    const headsPayout = headsBetTotal * 2;
    const tailsPayout = tailsBetTotal * 2;
    
    if (headsPayout === tailsPayout) {
      const result = crypto.randomInt(0, 2) === 0 ? 'heads' : 'tails';
      console.log(`Equal payouts - random result: ${result}`);
      return result;
    }
    
    const result = headsPayout < tailsPayout ? 'heads' : 'tails';
    console.log(`Lower payout side wins: ${result} (Heads payout: ${headsPayout}, Tails payout: ${tailsPayout})`);
    return result;
  }

  async handlePlaceBet(socket: Socket, data: { roomId: string; betType: string; amount: number }) {
    const player = this.globalRoom.players.find(p => p.socketId === socket.id);
    if (!player || !player.dbId) {
      socket.emit('coin-toss-bet-error', { message: 'Player not found' });
      return;
    }

    if (this.globalRoom.status !== 'countdown' || this.globalRoom.countdownTime <= 10) {
      socket.emit('coin-toss-bet-error', { message: 'Betting window closed' });
      return;
    }

    if (!['heads', 'tails'].includes(data.betType)) {
      socket.emit('coin-toss-bet-error', { message: 'Invalid bet type' });
      return;
    }

    if (this.unlockedBets.has(socket.id)) {
      socket.emit('coin-toss-bet-error', { message: 'You already have an unlocked bet. Please lock or cancel it first.' });
      return;
    }

    if (this.lockedBets.has(player.dbId)) {
      socket.emit('coin-toss-bet-error', { message: 'You already have a locked bet. Locked bets cannot be changed.' });
      return;
    }

    try {
      const dbPlayer = await storage.getPlayer(player.dbId);
      console.log(`Coin toss bet attempt: Player ${player.name} (ID: ${player.dbId}), Chips: ${dbPlayer?.chips}, Bet Amount: ${data.amount}`);
      if (!dbPlayer || dbPlayer.chips < data.amount) {
        console.log(`Bet rejected - Insufficient balance: ${dbPlayer?.chips} < ${data.amount}`);
        socket.emit('coin-toss-bet-error', { message: 'Insufficient balance' });
        return;
      }

      this.unlockedBets.set(socket.id, {
        betType: data.betType as 'heads' | 'tails',
        amount: data.amount,
        playerId: player.dbId
      });

      socket.emit('coin-toss-bet-placed', {
        bet: { betType: data.betType, amount: data.amount, locked: false },
        remainingChips: dbPlayer.chips
      });

      console.log(`Coin toss unlocked bet placed: ${player.name} placed ${data.amount} on ${data.betType} (not yet locked)`);
    } catch (error: any) {
      console.error('Error placing coin toss bet:', error);
      socket.emit('coin-toss-bet-error', { message: error.message });
    }
  }

  async handleLockBet(socket: Socket, data: { roomId: string; betType?: string; amount?: number }) {
    const player = this.globalRoom.players.find(p => p.socketId === socket.id);
    if (!player || !player.dbId) {
      socket.emit('coin-toss-bet-error', { message: 'Player not found' });
      return;
    }

    if (this.globalRoom.status !== 'countdown' || this.globalRoom.countdownTime <= 10) {
      socket.emit('coin-toss-bet-error', { message: 'Betting window closed' });
      return;
    }

    if (this.lockedBets.has(player.dbId)) {
      socket.emit('coin-toss-bet-error', { message: 'You already have a locked bet. Locked bets cannot be changed.' });
      return;
    }

    try {
      let betToLock = this.unlockedBets.get(socket.id);
      
      if (!betToLock) {
        if (!data.betType || !data.amount) {
          socket.emit('coin-toss-bet-error', { message: 'No bet to lock. Please place a bet first.' });
          return;
        }
        betToLock = {
          betType: data.betType as 'heads' | 'tails',
          amount: data.amount,
          playerId: player.dbId
        };
      }

      if (!['heads', 'tails'].includes(betToLock.betType)) {
        socket.emit('coin-toss-bet-error', { message: 'Invalid bet type' });
        return;
      }

      const dbPlayer = await storage.getPlayer(player.dbId);
      if (!dbPlayer || dbPlayer.chips < betToLock.amount) {
        socket.emit('coin-toss-bet-error', { message: 'Insufficient balance' });
        return;
      }

      this.lockedBets.set(player.dbId, {
        betType: betToLock.betType,
        amount: betToLock.amount,
        socketId: socket.id
      });

      this.unlockedBets.delete(socket.id);

      await storage.updatePlayerChips(dbPlayer.userId, dbPlayer.chips - betToLock.amount);
      player.chips = dbPlayer.chips - betToLock.amount;

      socket.emit('coin-toss-bet-locked', {
        bet: { betType: betToLock.betType, betAmount: betToLock.amount, locked: true },
        remainingChips: player.chips
      });

      console.log(`Coin toss bet locked: ${player.name} locked ${betToLock.amount} on ${betToLock.betType} (chips reserved)`);
    } catch (error: any) {
      console.error('Error locking coin toss bet:', error);
      socket.emit('coin-toss-bet-error', { message: error.message });
    }
  }

  async handleCancelBet(socket: Socket, data: { roomId: string }) {
    const player = this.globalRoom.players.find(p => p.socketId === socket.id);
    if (!player || !player.dbId) {
      socket.emit('coin-toss-bet-error', { message: 'Player not found' });
      return;
    }

    if (this.lockedBets.has(player.dbId)) {
      socket.emit('coin-toss-bet-error', { message: 'Cannot cancel a locked bet' });
      return;
    }

    const unlockedBet = this.unlockedBets.get(socket.id);
    if (!unlockedBet) {
      socket.emit('coin-toss-bet-error', { message: 'No bet to cancel' });
      return;
    }

    this.unlockedBets.delete(socket.id);

    socket.emit('coin-toss-bet-cancelled', {
      message: 'Bet cancelled successfully'
    });

    console.log(`Coin toss bet cancelled: ${player.name} cancelled their unlocked bet`);
  }

  async joinRoom(socket: Socket, player: CoinTossPlayer) {
    const roomId = this.globalRoom.id;
    
    socket.join(roomId);
    this.playerRooms.set(socket.id, roomId);
    
    if (!this.globalRoom.players.find(p => p.socketId === socket.id)) {
      this.globalRoom.players.push(player);
    }

    let activeBets: any[] = [];
    let lockedBet: { betType: 'heads' | 'tails'; amount: number } | null = null;

    if (player.dbId && this.lockedBets.has(player.dbId)) {
      const existingLockedBet = this.lockedBets.get(player.dbId)!;
      this.lockedBets.set(player.dbId, {
        ...existingLockedBet,
        socketId: socket.id
      });
      lockedBet = {
        betType: existingLockedBet.betType,
        amount: existingLockedBet.amount
      };
      console.log(`Restored locked bet for ${player.name}: ${lockedBet.amount} on ${lockedBet.betType}`);
    }

    if (this.globalRoom.currentGameId && player.dbId) {
      try {
        const playerBets = await storage.getPlayerBetsByGame(player.dbId, this.globalRoom.currentGameId);
        activeBets = playerBets.map(bet => ({
          id: bet.id,
          type: bet.betType,
          amount: bet.betAmount
        }));

        if (activeBets.length > 0) {
          if (!this.globalRoom.activeBets) {
            this.globalRoom.activeBets = new Map();
          }
          this.globalRoom.activeBets.set(socket.id, activeBets.map(bet => ({
            betId: bet.id,
            betType: bet.type,
            betAmount: bet.amount
          })));
        }
      } catch (error) {
        console.error('Error fetching player bets:', error);
      }
    }

    socket.emit('coin-toss-room-joined', {
      room: this.sanitizeRoomForBroadcast(this.globalRoom),
      player,
      activeBets,
      lockedBet,
      countdownTime: this.globalRoom.countdownTime
    });

    this.io.to(roomId).emit('coin-toss-player-joined', { player, room: this.sanitizeRoomForBroadcast(this.globalRoom) });

    if (this.globalRoom.status === 'waiting') {
      await this.startGame(player, roomId);
    }
  }

  async leaveRoom(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const player = this.globalRoom.players.find(p => p.socketId === socket.id);
    
    if (this.unlockedBets.has(socket.id)) {
      const unlockedBet = this.unlockedBets.get(socket.id)!;
      this.unlockedBets.delete(socket.id);
      console.log(`Unlocked bet cancelled for disconnected player ${player?.name || socket.id}: ${unlockedBet.amount} on ${unlockedBet.betType}`);
    }

    this.globalRoom.players = this.globalRoom.players.filter(p => p.socketId !== socket.id);
    
    this.playerRooms.delete(socket.id);
    socket.leave(roomId);
    
    this.io.to(roomId).emit('coin-toss-player-left', { 
      socketId: socket.id, 
      room: this.sanitizeRoomForBroadcast(this.globalRoom) 
    });
  }

  private sanitizeRoomForBroadcast(room: CoinTossRoom) {
    return {
      ...room,
      currentResult: room.status === 'revealing' ? room.currentResult : null,
      activeBets: undefined
    };
  }

  private async startGame(player: CoinTossPlayer, roomId: string) {
    const room = this.globalRoom;
    if (!room || room.status !== 'waiting') {
      return;
    }

    room.status = 'countdown';
    room.countdownTime = 30;
    room.gameStartTime = Date.now();
    room.currentResult = null;
    
    try {
      const gameRecord = await storage.createCoinTossGame({
        roomId: 'COIN_TOSS_GLOBAL',
        result: 'heads',
        totalBets: 0,
        totalPlayers: room.players.length
      });
      room.currentGameId = gameRecord.id;
      console.log(`Created coin toss game record ${gameRecord.id}`);
    } catch (error) {
      console.error('Failed to create coin toss game record:', error);
    }

    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to('COIN_TOSS_GLOBAL').emit('coin-toss-game-starting', {
      room: sanitizedRoom,
      countdownTime: room.countdownTime
    });

    const interval = setInterval(async () => {
      room.countdownTime--;
      
      if (room.countdownTime === 10 && !room.currentResult) {
        await this.placeLockedBets();
        room.currentResult = this.generateSmartCoinResult(room);
        console.log(`Coin result generated at 10s mark (after betting closed): ${room.currentResult}`);
      }
      
      const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
      this.io.to('COIN_TOSS_GLOBAL').emit('coin-toss-countdown-tick', {
        time: room.countdownTime,
        room: sanitizedRoom
      });

      if (room.countdownTime <= 0) {
        clearInterval(interval);
        this.countdownIntervals.delete('COIN_TOSS_GLOBAL');
        this.revealResult('COIN_TOSS_GLOBAL');
      }
    }, 1000);

    this.countdownIntervals.set('COIN_TOSS_GLOBAL', interval);
  }

  private async revealResult(roomId: string) {
    const room = this.globalRoom;
    if (!room) return;

    if (!room.currentResult) {
      console.warn('No result generated, generating now...');
      room.currentResult = this.generateSmartCoinResult(room);
    }

    const gameId = room.currentGameId;
    if (gameId && this.adminOverrides.has(gameId)) {
      const overrideResult = this.adminOverrides.get(gameId)!;
      room.currentResult = overrideResult;
      this.adminOverrides.delete(gameId);
      console.log(`Admin override applied for coin toss game ${gameId}: ${overrideResult}`);
    }

    room.status = 'revealing';

    console.log(`Revealing coin toss result:`, room.currentResult);

    await this.resolveBets(room);

    if (room.currentGameId && room.currentResult) {
      try {
        await storage.updateCoinTossResult(room.currentGameId, room.currentResult);
        await storage.markCoinTossGameCompleted(room.currentGameId);
        console.log(`Coin toss game ${room.currentGameId} updated with final result and marked as completed`);
      } catch (error) {
        console.error('Failed to update coin toss game result or mark as completed:', error);
      }
    }

    this.io.to('COIN_TOSS_GLOBAL').emit('coin-toss-result-revealed', {
      result: room.currentResult,
      room
    });

    setTimeout(() => {
      this.startNextRound('COIN_TOSS_GLOBAL');
    }, 6000);
  }

  private async resolveBets(room: CoinTossRoom) {
    if (!room.activeBets || !room.currentResult) {
      return;
    }

    let totalWagered = 0;
    let totalPaidOut = 0;

    for (const [socketId, bets] of Array.from(room.activeBets.entries())) {
      for (const bet of bets) {
        totalWagered += bet.betAmount;
        
        const won = bet.betType === room.currentResult;
        const winAmount = won ? bet.betAmount * 2 : 0;
        
        if (won) {
          totalPaidOut += winAmount;
        }

        try {
          const result = await storage.resolveCoinTossBet(bet.betId, won, winAmount);
          
          const player = room.players.find(p => p.socketId === socketId);
          if (player && result.updatedPlayer) {
            player.chips = result.updatedPlayer.chips;
          }

          console.log(`Coin toss bet resolved: betId=${bet.betId}, won=${won}, winAmount=${winAmount}`);
        } catch (error) {
          console.error(`Failed to resolve coin toss bet ${bet.betId}:`, error);
        }
      }
    }

    const houseProfitThisRound = totalWagered - totalPaidOut;
    if (room.houseStats) {
      room.houseStats.totalWagered += totalWagered;
      room.houseStats.totalPaidOut += totalPaidOut;
      room.houseStats.houseProfitThisRound = houseProfitThisRound;
      room.houseStats.houseProfitTotal += houseProfitThisRound;
      room.houseStats.roundCount += 1;
      room.houseStats.houseEdgePercent = room.houseStats.totalWagered > 0 
        ? (room.houseStats.houseProfitTotal / room.houseStats.totalWagered) * 100 
        : 0;
    }

    console.log(`Round complete - Wagered: ${totalWagered}, Paid out: ${totalPaidOut}, House profit: ${houseProfitThisRound}`);
  }

  private startNextRound(roomId: string) {
    const room = this.globalRoom;
    if (!room) return;

    room.status = 'waiting';
    room.currentResult = null;
    room.countdownTime = 30;
    room.currentGameId = undefined;
    room.activeBets?.clear();
    this.lockedBets.clear();
    this.unlockedBets.clear();
    room.roundNumber = (room.roundNumber || 1) + 1;

    const sanitizedRoom = this.sanitizeRoomForBroadcast(room);
    this.io.to('COIN_TOSS_GLOBAL').emit('coin-toss-round-ended', { room: sanitizedRoom });

    if (room.players.length > 0) {
      this.startGame(room.players[0] as any, 'COIN_TOSS_GLOBAL');
    } else {
      console.log('No players in room, waiting for players to join...');
    }
  }

  getRoom(roomId: string): CoinTossRoom | undefined {
    return this.globalRoom.id === roomId ? this.globalRoom : undefined;
  }

  getGlobalRoom(): CoinTossRoom {
    return this.globalRoom;
  }

  getCurrentRoundData(): { 
    gameId: number | undefined;
    totalBets: number;
    betsByType: { heads: number; tails: number };
    status: string;
    timeRemaining: number;
    currentResult: 'heads' | 'tails' | null;
  } {
    const room = this.globalRoom;
    
    let headsBets = 0;
    let tailsBets = 0;
    let totalBets = 0;

    if (room.activeBets) {
      room.activeBets.forEach(bets => {
        bets.forEach(bet => {
          totalBets += bet.betAmount;
          if (bet.betType === 'heads') {
            headsBets += bet.betAmount;
          } else if (bet.betType === 'tails') {
            tailsBets += bet.betAmount;
          }
        });
      });
    }

    return {
      gameId: room.currentGameId,
      totalBets,
      betsByType: {
        heads: headsBets,
        tails: tailsBets
      },
      status: room.status,
      timeRemaining: room.countdownTime,
      currentResult: room.status === 'countdown' && room.countdownTime <= 10 ? room.currentResult : null
    };
  }

  setAdminOverride(gameId: number, overrideResult: 'heads' | 'tails'): boolean {
    const room = this.globalRoom;
    
    if (!room || room.status !== 'countdown' || room.currentGameId !== gameId) {
      return false;
    }

    const validResults = ['heads', 'tails'];
    if (!validResults.includes(overrideResult)) {
      return false;
    }

    this.adminOverrides.set(gameId, overrideResult);
    console.log(`Admin override set for coin toss game ${gameId}: ${overrideResult}`);
    return true;
  }

  getHouseStats(): CoinTossHouseStats | undefined {
    return this.globalRoom.houseStats;
  }
}
