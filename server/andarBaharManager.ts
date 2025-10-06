import { Server, Socket } from "socket.io";
import { storage } from "./storage";
import crypto from "crypto";
import type { Player as DBPlayer, AndarBaharMatch } from "@shared/schema";

export interface AndarBaharPlayer {
  playerId: number;
  socketId: string;
  username: string;
  chips: number;
}

export interface Card {
  rank: string; // 'A', '2'-'10', 'J', 'Q', 'K'
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  color: 'red' | 'black';
}

export interface AndarBaharMatchState {
  matchId: string;
  dealer: AndarBaharPlayer | null;
  guesser: AndarBaharPlayer | null;
  betAmount: number;
  jokerCard: Card | null;
  guesserChoice: 'andar' | 'bahar' | null;
  andarPile: Card[];
  baharPile: Card[];
  status: string;
  winningSide: 'andar' | 'bahar' | null;
  winner: AndarBaharPlayer | null;
}

export class AndarBaharManager {
  private io: Server;
  private matchmakingQueue: AndarBaharPlayer[] = [];
  private activeMatches: Map<string, AndarBaharMatchState> = new Map();
  private playerToMatch: Map<number, string> = new Map(); // playerId -> matchId

  constructor(io: Server) {
    this.io = io;
  }

  // Generate a deck of 52 cards
  private generateDeck(): Card[] {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits: ('hearts' | 'diamonds' | 'clubs' | 'spades')[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        const color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
        deck.push({ rank, suit, color });
      }
    }

    return deck;
  }

  // Shuffle deck using Fisher-Yates algorithm
  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Join matchmaking queue
  async joinMatchmaking(socket: Socket, player: DBPlayer, betAmount: number): Promise<void> {
    // Check if player already in a match or queue
    if (this.playerToMatch.has(player.id)) {
      socket.emit('error', 'You are already in a match');
      return;
    }

    const existingInQueue = this.matchmakingQueue.find(p => p.playerId === player.id);
    if (existingInQueue) {
      socket.emit('error', 'You are already in matchmaking queue');
      return;
    }

    // Check if player has enough chips
    if (player.chips < betAmount) {
      socket.emit('error', 'Insufficient chips');
      return;
    }

    const andarBaharPlayer: AndarBaharPlayer = {
      playerId: player.id,
      socketId: socket.id,
      username: player.name,
      chips: player.chips
    };

    // Add to queue
    this.matchmakingQueue.push(andarBaharPlayer);
    socket.emit('matchmaking-joined', { position: this.matchmakingQueue.length });

    // Try to create a match
    await this.tryCreateMatch(betAmount);
  }

  // Try to create a match from the queue
  private async tryCreateMatch(betAmount: number): Promise<void> {
    // Need at least 2 players with same bet amount
    const playersWithBet = this.matchmakingQueue.filter(p => {
      // For now, just match any two players - can add bet amount matching later
      return true;
    });

    if (playersWithBet.length >= 2) {
      const player1 = playersWithBet[0];
      const player2 = playersWithBet[1];

      // Remove from queue
      this.matchmakingQueue = this.matchmakingQueue.filter(
        p => p.playerId !== player1.playerId && p.playerId !== player2.playerId
      );

      // Randomly assign dealer and guesser
      const isPlayer1Dealer = crypto.randomInt(0, 2) === 0;
      const dealer = isPlayer1Dealer ? player1 : player2;
      const guesser = isPlayer1Dealer ? player2 : player1;

      // Create match
      const matchId = crypto.randomBytes(8).toString('hex');
      const matchState: AndarBaharMatchState = {
        matchId,
        dealer,
        guesser,
        betAmount,
        jokerCard: null,
        guesserChoice: null,
        andarPile: [],
        baharPile: [],
        status: 'placing_bets',
        winningSide: null,
        winner: null
      };

      this.activeMatches.set(matchId, matchState);
      this.playerToMatch.set(dealer.playerId, matchId);
      this.playerToMatch.set(guesser.playerId, matchId);

      // Create database record
      await storage.createAndarBaharMatch({
        matchId,
        dealerPlayerId: dealer.playerId,
        guesserPlayerId: guesser.playerId,
        betAmount,
        status: 'placing_bets'
      });

      // Notify both players
      const dealerSocket = this.io.sockets.sockets.get(dealer.socketId);
      const guesserSocket = this.io.sockets.sockets.get(guesser.socketId);

      if (dealerSocket && guesserSocket) {
        dealerSocket.emit('match-found', {
          matchId,
          role: 'dealer',
          opponent: guesser.username,
          betAmount
        });

        guesserSocket.emit('match-found', {
          matchId,
          role: 'guesser',
          opponent: dealer.username,
          betAmount
        });

        // Auto-start the match after a short delay
        setTimeout(() => this.startMatch(matchId), 2000);
      }
    }
  }

  // Start the match - reveal joker card
  private async startMatch(matchId: string): Promise<void> {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    // Generate and shuffle deck
    const deck = this.shuffleDeck(this.generateDeck());

    // Draw joker card (first card from deck)
    const jokerCard = deck[0];
    match.jokerCard = jokerCard;
    match.status = 'choosing_side';

    // Update database
    await storage.updateAndarBaharMatch(matchId, {
      jokerCardRank: jokerCard.rank,
      jokerCardSuit: jokerCard.suit,
      status: 'choosing_side'
    });

    // Notify both players of joker card
    const dealerSocket = this.io.sockets.sockets.get(match.dealer!.socketId);
    const guesserSocket = this.io.sockets.sockets.get(match.guesser!.socketId);

    if (dealerSocket && guesserSocket) {
      const matchData = {
        matchId,
        jokerCard,
        waitingFor: 'guesser'
      };

      dealerSocket.emit('joker-revealed', matchData);
      guesserSocket.emit('joker-revealed', matchData);
    }
  }

  // Guesser makes their choice
  async makeChoice(socket: Socket, matchId: string, choice: 'andar' | 'bahar'): Promise<void> {
    const match = this.activeMatches.get(matchId);
    if (!match) {
      socket.emit('error', 'Match not found');
      return;
    }

    if (match.guesser?.socketId !== socket.id) {
      socket.emit('error', 'Only the guesser can make a choice');
      return;
    }

    if (match.status !== 'choosing_side') {
      socket.emit('error', 'Not the right time to choose');
      return;
    }

    match.guesserChoice = choice;
    match.status = 'dealing_cards';

    // Update database
    await storage.updateAndarBaharMatch(matchId, {
      guesserChoice: choice,
      status: 'dealing_cards'
    });

    // Start dealing cards
    await this.dealCards(matchId);
  }

  // Deal cards alternately until match is found
  private async dealCards(matchId: string): Promise<void> {
    const match = this.activeMatches.get(matchId);
    if (!match || !match.jokerCard) return;

    // Generate and shuffle a fresh deck
    let deck = this.shuffleDeck(this.generateDeck());
    
    // Remove the joker card from deck
    deck = deck.filter(card => 
      !(card.rank === match.jokerCard!.rank && card.suit === match.jokerCard!.suit)
    );

    // Determine first pile based on joker color
    // Black (clubs/spades) -> Andar first
    // Red (hearts/diamonds) -> Bahar first
    let currentPile: 'andar' | 'bahar' = match.jokerCard.color === 'black' ? 'andar' : 'bahar';
    
    let cardIndex = 0;
    let matchFound = false;
    let winningSide: 'andar' | 'bahar' | null = null;

    // Deal cards one by one until matching rank is found
    while (!matchFound && cardIndex < deck.length) {
      const card = deck[cardIndex];
      
      if (currentPile === 'andar') {
        match.andarPile.push(card);
      } else {
        match.baharPile.push(card);
      }

      // Check if this card matches the joker rank
      if (card.rank === match.jokerCard.rank) {
        matchFound = true;
        winningSide = currentPile;
        break;
      }

      // Alternate to other pile
      currentPile = currentPile === 'andar' ? 'bahar' : 'andar';
      cardIndex++;
    }

    if (matchFound && winningSide) {
      match.winningSide = winningSide;
      
      // Determine winner
      const didGuesserWin = match.guesserChoice === winningSide;
      match.winner = didGuesserWin ? match.guesser : match.dealer;
      match.status = 'completed';

      // Update chips
      const winnerPlayerId = match.winner!.playerId;
      const loserPlayerId = didGuesserWin ? match.dealer!.playerId : match.guesser!.playerId;

      // Winner gets double the bet amount (their bet back + loser's bet)
      await storage.updatePlayerFunds(winnerPlayerId, match.betAmount);
      await storage.updatePlayerFunds(loserPlayerId, -match.betAmount);

      // Update match in database
      await storage.updateAndarBaharMatch(matchId, {
        winningSide,
        winnerPlayerId: winnerPlayerId,
        status: 'completed',
        completedAt: new Date()
      });

      // Notify both players of the result
      const dealerSocket = this.io.sockets.sockets.get(match.dealer!.socketId);
      const guesserSocket = this.io.sockets.sockets.get(match.guesser!.socketId);

      const resultData = {
        matchId,
        winningSide,
        winner: match.winner!.username,
        andarPile: match.andarPile,
        baharPile: match.baharPile,
        jokerCard: match.jokerCard
      };

      if (dealerSocket) {
        dealerSocket.emit('match-completed', resultData);
      }
      if (guesserSocket) {
        guesserSocket.emit('match-completed', resultData);
      }

      // Clean up
      this.playerToMatch.delete(match.dealer!.playerId);
      this.playerToMatch.delete(match.guesser!.playerId);
      this.activeMatches.delete(matchId);
    }
  }

  // Leave matchmaking
  leaveMatchmaking(playerId: number): void {
    this.matchmakingQueue = this.matchmakingQueue.filter(p => p.playerId !== playerId);
  }

  // Get player's active match
  getPlayerMatch(playerId: number): AndarBaharMatchState | null {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return null;
    return this.activeMatches.get(matchId) || null;
  }
}
