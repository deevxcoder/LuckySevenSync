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

  constructor(io: Server) {
    this.io = io;
    this.playerRooms = new Map();
    this.countdownIntervals = new Map();
    this.adminOverrides = new Map();
    
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
    
    this.setupBettingHandlers();
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

  private setupBettingHandlers() {
    this.io.on('connection', (socket: Socket) => {
      socket.on('coin-toss-place-bet', async (data: { roomId: string; betType: string; amount: number }) => {
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

        try {
          const gameId = this.globalRoom.currentGameId;
          if (!gameId) {
            socket.emit('coin-toss-bet-error', { message: 'Game not started' });
            return;
          }

          const result = await storage.placeCoinTossBet(
            player.dbId,
            data.amount,
            data.betType,
            gameId
          );

          player.chips = result.updatedPlayer.chips;

          if (!this.globalRoom.activeBets) {
            this.globalRoom.activeBets = new Map();
          }

          if (!this.globalRoom.activeBets.has(socket.id)) {
            this.globalRoom.activeBets.set(socket.id, []);
          }

          this.globalRoom.activeBets.get(socket.id)!.push({
            betId: result.bet.id,
            betType: data.betType,
            betAmount: data.amount
          });

          socket.emit('coin-toss-bet-placed', {
            bet: result.bet,
            remainingChips: result.updatedPlayer.chips
          });

          console.log(`Coin toss bet placed: ${player.name} bet ${data.amount} on ${data.betType}`);
        } catch (error: any) {
          console.error('Error placing coin toss bet:', error);
          socket.emit('coin-toss-bet-error', { message: error.message });
        }
      });
    });
  }

  async joinRoom(socket: Socket, player: CoinTossPlayer) {
    const roomId = this.globalRoom.id;
    
    socket.join(roomId);
    this.playerRooms.set(socket.id, roomId);
    
    if (!this.globalRoom.players.find(p => p.socketId === socket.id)) {
      this.globalRoom.players.push(player);
    }

    let activeBets: any[] = [];
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
      countdownTime: this.globalRoom.countdownTime
    });

    this.io.to(roomId).emit('coin-toss-player-joined', { player, room: this.sanitizeRoomForBroadcast(this.globalRoom) });

    if (this.globalRoom.status === 'waiting') {
      await this.startGame(player, roomId);
    }
  }

  leaveRoom(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

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

    const interval = setInterval(() => {
      room.countdownTime--;
      
      if (room.countdownTime === 10 && !room.currentResult) {
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
