import { Card } from './card';
import { Rank, RANK_VALUES, Player } from '../common';

/**
 * Speed — Real-time two-player card game.
 *
 * Layout:
 *   [P1 side-pile (15)]  [center-left pile]  [center-right pile]  [P2 side-pile (15)]
 *   [P1 hand (5 cards)]                                            [P2 hand (5 cards)]
 *
 * Rules:
 * - Each player has a hand of 5 cards and a draw pile of 15 cards.
 * - Two center piles start with one card each.
 * - Players play simultaneously (real-time, no turns).
 * - A card can be played on a center pile if it is exactly ±1 in rank
 *   (Ace wraps: King→Ace and Ace→King are valid).
 * - When neither player can play, both flip a new card from their side pile
 *   onto the center piles.
 * - First player to empty their hand AND draw pile wins.
 */

export type SpeedGameState = 'WAITING' | 'PLAYING' | 'STALLED' | 'GAME_OVER';

export interface SpeedEvent {
  type: 'card_played' | 'flip' | 'game_over' | 'stall' | 'resume';
  player?: Player;
  message: string;
}

export class Speed {
  // Each player's hand (up to 5 visible cards)
  private _p1Hand: Card[] = [];
  private _p2Hand: Card[] = [];

  // Each player's draw pile (face-down, 15 cards each)
  private _p1DrawPile: Card[] = [];
  private _p2DrawPile: Card[] = [];

  // Two center piles (the top card of each is what players play onto)
  private _centerLeft: Card[] = [];
  private _centerRight: Card[] = [];

  private _gameState: SpeedGameState = 'PLAYING';
  private _winner: Player | null = null;
  private _events: SpeedEvent[] = [];
  private _lastPlayTime: number = Date.now();

  constructor() {
    this.initializeGame();
  }

  // ---- Public getters ----

  get p1Hand(): readonly Card[] { return this._p1Hand; }
  get p2Hand(): readonly Card[] { return this._p2Hand; }
  get p1DrawCount(): number { return this._p1DrawPile.length; }
  get p2DrawCount(): number { return this._p2DrawPile.length; }
  get centerLeftTop(): Card | null {
    return this._centerLeft.length > 0 ? this._centerLeft[this._centerLeft.length - 1] : null;
  }
  get centerRightTop(): Card | null {
    return this._centerRight.length > 0 ? this._centerRight[this._centerRight.length - 1] : null;
  }
  get centerLeftCount(): number { return this._centerLeft.length; }
  get centerRightCount(): number { return this._centerRight.length; }
  get gameState(): SpeedGameState { return this._gameState; }
  get winner(): Player | null { return this._winner; }
  get events(): readonly SpeedEvent[] { return this._events; }
  get lastPlayTime(): number { return this._lastPlayTime; }

  // ---- Initialization ----

  initializeGame(): void {
    const deck = Card.shuffleDeck(Card.createDeck());

    // Deal 5 cards to each player's hand
    this._p1Hand = deck.splice(0, 5);
    this._p2Hand = deck.splice(0, 5);

    // 15 cards to each player's draw pile
    this._p1DrawPile = deck.splice(0, 15);
    this._p2DrawPile = deck.splice(0, 15);

    // 1 card to each center pile to start
    this._centerLeft = [deck.splice(0, 1)[0]];
    this._centerRight = [deck.splice(0, 1)[0]];

    // Remaining 10 cards split evenly as extra cards in center piles' reserve
    // (In traditional Speed, these go under the center piles for flips)
    // We'll add them to the draw piles evenly
    while (deck.length > 0) {
      if (deck.length > 0) this._p1DrawPile.push(deck.shift()!);
      if (deck.length > 0) this._p2DrawPile.push(deck.shift()!);
    }

    this._gameState = 'PLAYING';
    this._winner = null;
    this._events = [];
    this._lastPlayTime = Date.now();

    this._addEvent({
      type: 'resume',
      message: 'Game started! Play cards that are ±1 rank onto the center piles.',
    });
  }

  // ---- Core game actions ----

  /**
   * Player attempts to play a card from their hand onto a center pile.
   * @param player - Which player (1 or 2)
   * @param handIndex - Index in their hand (0-4)
   * @param targetPile - 'left' or 'right' center pile
   * @returns true if the play was valid
   */
  playCard(player: Player, handIndex: number, targetPile: 'left' | 'right'): boolean {
    if (this._gameState === 'GAME_OVER') return false;

    const hand = player === 1 ? this._p1Hand : this._p2Hand;
    const drawPile = player === 1 ? this._p1DrawPile : this._p2DrawPile;

    if (handIndex < 0 || handIndex >= hand.length) return false;

    const card = hand[handIndex];
    const pile = targetPile === 'left' ? this._centerLeft : this._centerRight;
    const topCard = pile.length > 0 ? pile[pile.length - 1] : null;

    if (!topCard) return false;

    if (!this.isValidPlay(card, topCard)) return false;

    // Valid play — move card from hand to center pile
    hand.splice(handIndex, 1);
    pile.push(card);

    // Refill hand from draw pile (up to 5 cards)
    if (hand.length < 5 && drawPile.length > 0) {
      hand.push(drawPile.shift()!);
    }

    this._lastPlayTime = Date.now();

    // Unstall if we were stalled
    if (this._gameState === 'STALLED') {
      this._gameState = 'PLAYING';
      this._addEvent({ type: 'resume', message: 'Game resumed!' });
    }

    this._addEvent({
      type: 'card_played',
      player,
      message: `Player ${player} played ${card.display} on ${targetPile} pile`,
    });

    // Check for win
    if (hand.length === 0 && drawPile.length === 0) {
      this._gameState = 'GAME_OVER';
      this._winner = player;
      this._addEvent({
        type: 'game_over',
        player,
        message: `Player ${player} wins! All cards played!`,
      });
    }

    return true;
  }

  /**
   * Flip new cards onto the center piles when no one can play.
   * Both players must agree (or server detects stall).
   * Each player flips one card from their draw pile onto a center pile.
   */
  flipCenterCards(): boolean {
    if (this._gameState === 'GAME_OVER') return false;

    // Need at least one draw pile to have cards
    const p1HasCards = this._p1DrawPile.length > 0;
    const p2HasCards = this._p2DrawPile.length > 0;

    if (!p1HasCards && !p2HasCards) {
      // No cards to flip — check if truly stuck
      // Reshuffle center piles (except top cards) into draw piles
      this.reshuffleCenterPiles();
      return true;
    }

    if (p1HasCards) {
      this._centerLeft.push(this._p1DrawPile.shift()!);
    }
    if (p2HasCards) {
      this._centerRight.push(this._p2DrawPile.shift()!);
    }

    this._gameState = 'PLAYING';
    this._lastPlayTime = Date.now();

    this._addEvent({
      type: 'flip',
      message: 'New cards flipped onto center piles!',
    });

    return true;
  }

  /**
   * Mark the game as stalled — neither player can play.
   */
  markStalled(): void {
    if (this._gameState !== 'PLAYING') return;
    this._gameState = 'STALLED';
    this._addEvent({
      type: 'stall',
      message: 'No valid plays! Flip new center cards.',
    });
  }

  /**
   * Check if any player has a valid move.
   */
  hasAnyValidPlay(): boolean {
    return this.playerHasValidPlay(1) || this.playerHasValidPlay(2);
  }

  /**
   * Check if a specific player has a valid move.
   */
  playerHasValidPlay(player: Player): boolean {
    const hand = player === 1 ? this._p1Hand : this._p2Hand;
    const leftTop = this.centerLeftTop;
    const rightTop = this.centerRightTop;

    for (const card of hand) {
      if (leftTop && this.isValidPlay(card, leftTop)) return true;
      if (rightTop && this.isValidPlay(card, rightTop)) return true;
    }
    return false;
  }

  // ---- Helpers ----

  private isValidPlay(card: Card, pileTop: Card): boolean {
    const cardVal = RANK_VALUES[card.rank];
    const pileVal = RANK_VALUES[pileTop.rank];

    const diff = Math.abs(cardVal - pileVal);

    // ±1 with wrapping (Ace-King)
    return diff === 1 || diff === 12;
  }

  private reshuffleCenterPiles(): void {
    // Take all but top card from each center pile, shuffle them, redistribute
    const leftTop = this._centerLeft.pop();
    const rightTop = this._centerRight.pop();

    const reshuffled = Card.shuffleDeck([...this._centerLeft, ...this._centerRight]);

    this._centerLeft = leftTop ? [leftTop] : [];
    this._centerRight = rightTop ? [rightTop] : [];

    // Split reshuffled cards evenly into draw piles
    let toggle = true;
    for (const card of reshuffled) {
      if (toggle) {
        this._p1DrawPile.push(card);
      } else {
        this._p2DrawPile.push(card);
      }
      toggle = !toggle;
    }

    // Refill hands
    while (this._p1Hand.length < 5 && this._p1DrawPile.length > 0) {
      this._p1Hand.push(this._p1DrawPile.shift()!);
    }
    while (this._p2Hand.length < 5 && this._p2DrawPile.length > 0) {
      this._p2Hand.push(this._p2DrawPile.shift()!);
    }

    this._gameState = 'PLAYING';
    this._lastPlayTime = Date.now();

    this._addEvent({
      type: 'flip',
      message: 'Center piles reshuffled! New cards dealt.',
    });
  }

  private _addEvent(event: SpeedEvent): void {
    this._events.push(event);
    console.log(`[Speed] ${event.message}`);
  }

  getStatusMessage(): string {
    const latestEvent = this._events[this._events.length - 1];
    return latestEvent?.message || 'Game ready';
  }

  /** Serialize game state for wire transfer (multiplayer). */
  serialize(): any {
    return {
      p1Hand: this._p1Hand.map(c => ({ suit: c.suit, rank: c.rank, display: c.display, displayValue: c.displayValue, displaySuit: c.displaySuit, spriteFrame: c.spriteFrame, color: c.color })),
      p2Hand: this._p2Hand.map(c => ({ suit: c.suit, rank: c.rank, display: c.display, displayValue: c.displayValue, displaySuit: c.displaySuit, spriteFrame: c.spriteFrame, color: c.color })),
      p1DrawCount: this._p1DrawPile.length,
      p2DrawCount: this._p2DrawPile.length,
      centerLeftTop: this.centerLeftTop ? { suit: this.centerLeftTop.suit, rank: this.centerLeftTop.rank, display: this.centerLeftTop.display, displayValue: this.centerLeftTop.displayValue, displaySuit: this.centerLeftTop.displaySuit, spriteFrame: this.centerLeftTop.spriteFrame, color: this.centerLeftTop.color } : null,
      centerRightTop: this.centerRightTop ? { suit: this.centerRightTop.suit, rank: this.centerRightTop.rank, display: this.centerRightTop.display, displayValue: this.centerRightTop.displayValue, displaySuit: this.centerRightTop.displaySuit, spriteFrame: this.centerRightTop.spriteFrame, color: this.centerRightTop.color } : null,
      centerLeftCount: this.centerLeftCount,
      centerRightCount: this.centerRightCount,
      gameState: this._gameState,
      winner: this._winner,
      statusMessage: this.getStatusMessage(),
      lastAction: this._events.length > 0 ? this._events[this._events.length - 1] : null,
    };
  }
}
