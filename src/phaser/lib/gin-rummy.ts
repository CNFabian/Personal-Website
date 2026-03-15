import { Suit, Rank, RANK_VALUES } from '../common';
import { Card } from './card';

// Gin Rummy specific types
export enum GinRummyState {
  DEALING = 'DEALING',
  PLAYER_TURN_DRAW = 'PLAYER_TURN_DRAW',
  PLAYER_TURN_DISCARD = 'PLAYER_TURN_DISCARD',
  OPPONENT_TURN_DRAW = 'OPPONENT_TURN_DRAW',
  OPPONENT_TURN_DISCARD = 'OPPONENT_TURN_DISCARD',
  KNOCKING = 'KNOCKING',
  GIN = 'GIN',
  ROUND_OVER = 'ROUND_OVER',
  GAME_OVER = 'GAME_OVER',
}

export interface Meld {
  cards: Card[];
  type: 'set' | 'run';
}

export interface RoundResult {
  knocker: 1 | 2;
  isGin: boolean;
  isUndercut: boolean;
  player1Deadwood: number;
  player2Deadwood: number;
  player1Melds: Meld[];
  player2Melds: Meld[];
  player1DeadwoodCards: Card[];
  player2DeadwoodCards: Card[];
  pointsAwarded: number;
  pointsWinner: 1 | 2;
}

// Card value for deadwood calculation (Ace=1, face=10, others face value)
export function getDeadwoodValue(card: Card): number {
  const rv = RANK_VALUES[card.rank];
  if (rv >= 10) return 10; // J, Q, K
  return rv; // A=1, 2=2, ..., 9=9
}

// Get numeric rank value for run detection (A=1, 2=2, ..., K=13)
function rankNumber(card: Card): number {
  return RANK_VALUES[card.rank];
}

/**
 * Find the optimal melds that minimize deadwood for a hand.
 * Uses recursive backtracking to try all possible meld combinations.
 */
export function findBestMelds(hand: Card[]): { melds: Meld[]; deadwood: Card[]; deadwoodValue: number } {
  let bestResult = { melds: [] as Meld[], deadwood: [...hand], deadwoodValue: calcDeadwood(hand) };

  const allPossibleMelds = findAllPossibleMelds(hand);

  function tryMelds(
    remainingCards: Card[],
    currentMelds: Meld[],
    startIdx: number
  ): void {
    const dw = calcDeadwood(remainingCards);
    if (dw < bestResult.deadwoodValue) {
      bestResult = {
        melds: [...currentMelds],
        deadwood: [...remainingCards],
        deadwoodValue: dw,
      };
    }

    if (dw === 0) return; // Can't do better

    for (let i = startIdx; i < allPossibleMelds.length; i++) {
      const meld = allPossibleMelds[i];
      // Check if all cards in this meld are still in remaining cards
      if (meldFitsInHand(meld, remainingCards)) {
        const newRemaining = removeCardsFromHand(remainingCards, meld.cards);
        currentMelds.push(meld);
        tryMelds(newRemaining, currentMelds, i + 1);
        currentMelds.pop();
      }
    }
  }

  tryMelds(hand, [], 0);
  return bestResult;
}

function calcDeadwood(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + getDeadwoodValue(c), 0);
}

function meldFitsInHand(meld: Meld, hand: Card[]): boolean {
  const handCopy = [...hand];
  for (const card of meld.cards) {
    const idx = handCopy.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (idx === -1) return false;
    handCopy.splice(idx, 1);
  }
  return true;
}

function removeCardsFromHand(hand: Card[], cards: Card[]): Card[] {
  const result = [...hand];
  for (const card of cards) {
    const idx = result.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (idx !== -1) result.splice(idx, 1);
  }
  return result;
}

/**
 * Find melds based on the physical arrangement of cards in the hand.
 * Only adjacent cards that form valid runs or sets count as melds.
 * Returns meld groups with their start/end indices in the hand.
 */
export function findMeldsFromArrangement(hand: Card[]): {
  melds: Meld[];
  meldRanges: { start: number; end: number }[];
  deadwood: Card[];
  deadwoodValue: number;
} {
  const melds: Meld[] = [];
  const meldRanges: { start: number; end: number }[] = [];
  const usedIndices = new Set<number>();

  let i = 0;
  while (i < hand.length) {
    // Try to find a run starting at position i (3+ same-suit consecutive rank)
    let runLen = 1;
    while (
      i + runLen < hand.length &&
      hand[i + runLen].suit === hand[i].suit &&
      RANK_VALUES[hand[i + runLen].rank] === RANK_VALUES[hand[i + runLen - 1].rank] + 1
    ) {
      runLen++;
    }
    if (runLen >= 3) {
      const cards = hand.slice(i, i + runLen);
      melds.push({ cards, type: 'run' });
      meldRanges.push({ start: i, end: i + runLen - 1 });
      for (let j = i; j < i + runLen; j++) usedIndices.add(j);
      i += runLen;
      continue;
    }

    // Try to find a set starting at position i (3-4 same-rank cards)
    let setLen = 1;
    while (
      i + setLen < hand.length &&
      hand[i + setLen].rank === hand[i].rank
    ) {
      setLen++;
    }
    if (setLen >= 3) {
      const cards = hand.slice(i, i + setLen);
      melds.push({ cards, type: 'set' });
      meldRanges.push({ start: i, end: i + setLen - 1 });
      for (let j = i; j < i + setLen; j++) usedIndices.add(j);
      i += setLen;
      continue;
    }

    i++;
  }

  const deadwood = hand.filter((_, idx) => !usedIndices.has(idx));
  const deadwoodValue = deadwood.reduce((sum, c) => sum + getDeadwoodValue(c), 0);

  return { melds, meldRanges, deadwood, deadwoodValue };
}

/**
 * Find all possible melds (sets and runs) from a hand
 */
function findAllPossibleMelds(hand: Card[]): Meld[] {
  const melds: Meld[] = [];

  // Find sets (3 or 4 cards of same rank)
  const byRank = new Map<Rank, Card[]>();
  for (const card of hand) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank)!.push(card);
  }

  byRank.forEach((cards) => {
    if (cards.length >= 3) {
      // All combinations of 3
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          for (let k = j + 1; k < cards.length; k++) {
            melds.push({ cards: [cards[i], cards[j], cards[k]], type: 'set' });
          }
        }
      }
      // Set of 4
      if (cards.length === 4) {
        melds.push({ cards: [...cards], type: 'set' });
      }
    }
  });

  // Find runs (3+ consecutive same suit)
  const bySuit = new Map<Suit, Card[]>();
  for (const card of hand) {
    if (!bySuit.has(card.suit)) bySuit.set(card.suit, []);
    bySuit.get(card.suit)!.push(card);
  }

  bySuit.forEach((cards) => {
    if (cards.length < 3) return;
    // Sort by rank value
    const sorted = [...cards].sort((a, b) => rankNumber(a) - rankNumber(b));

    // Find all runs of length 3+
    for (let start = 0; start < sorted.length; start++) {
      const run: Card[] = [sorted[start]];
      for (let next = start + 1; next < sorted.length; next++) {
        if (rankNumber(sorted[next]) === rankNumber(run[run.length - 1]) + 1) {
          run.push(sorted[next]);
          if (run.length >= 3) {
            melds.push({ cards: [...run], type: 'run' });
          }
        } else {
          break;
        }
      }
    }
  });

  return melds;
}

/**
 * Core Gin Rummy game engine for 1v1 local play
 */
export class GinRummy {
  private _player1Hand: Card[] = [];
  private _player2Hand: Card[] = [];
  private _stockPile: Card[] = [];
  private _discardPile: Card[] = [];
  private _state: GinRummyState = GinRummyState.DEALING;
  private _currentPlayer: 1 | 2 = 1;
  private _player1Score: number = 0;
  private _player2Score: number = 0;
  private _roundNumber: number = 0;
  private _roundResult: RoundResult | null = null;
  private _statusMessage: string = '';
  private _drawnCard: Card | null = null;
  private _targetScore: number = 100;

  constructor(targetScore: number = 100) {
    this._targetScore = targetScore;
  }

  // --- Getters ---
  get player1Hand(): Card[] { return [...this._player1Hand]; }
  get player2Hand(): Card[] { return [...this._player2Hand]; }
  get stockPile(): Card[] { return [...this._stockPile]; }
  get discardPile(): Card[] { return [...this._discardPile]; }
  get topDiscard(): Card | null { return this._discardPile.length > 0 ? this._discardPile[this._discardPile.length - 1] : null; }
  get state(): GinRummyState { return this._state; }
  get currentPlayer(): 1 | 2 { return this._currentPlayer; }
  get player1Score(): number { return this._player1Score; }
  get player2Score(): number { return this._player2Score; }
  get roundNumber(): number { return this._roundNumber; }
  get roundResult(): RoundResult | null { return this._roundResult; }
  get statusMessage(): string { return this._statusMessage; }
  get drawnCard(): Card | null { return this._drawnCard; }
  get targetScore(): number { return this._targetScore; }
  get stockCount(): number { return this._stockPile.length; }

  get isGameOver(): boolean {
    return this._state === GinRummyState.GAME_OVER;
  }

  get winner(): 1 | 2 | null {
    if (this._player1Score >= this._targetScore) return 1;
    if (this._player2Score >= this._targetScore) return 2;
    return null;
  }

  // --- Game Flow ---

  startNewRound(): void {
    this._roundNumber++;
    this._roundResult = null;
    this._drawnCard = null;

    // Create and shuffle deck
    const deck = Card.shuffleDeck(Card.createDeck());

    // Deal 10 cards each
    this._player1Hand = deck.splice(0, 10);
    this._player2Hand = deck.splice(0, 10);

    // One card to discard pile
    this._discardPile = [deck.splice(0, 1)[0]];

    // Rest is stock
    this._stockPile = deck;

    // Sort hands
    this.sortHand(1);
    this.sortHand(2);

    // Player 1 starts (non-dealer)
    this._currentPlayer = 1;
    this._state = GinRummyState.PLAYER_TURN_DRAW;
    this._statusMessage = 'Player 1: Draw from stock or discard pile';
  }

  /**
   * Draw a card from stock pile
   */
  drawFromStock(): Card | null {
    if (!this.isDrawPhase()) return null;

    // Check if stock is too low (2 cards left = draw, game continues normally)
    if (this._stockPile.length === 0) {
      // Reshuffle discard pile except top card
      this.reshuffleDiscard();
      if (this._stockPile.length === 0) {
        // No cards left at all - round is a draw
        this._state = GinRummyState.ROUND_OVER;
        this._statusMessage = 'Round drawn - no cards left!';
        return null;
      }
    }

    const card = this._stockPile.pop()!;
    this.getHand(this._currentPlayer).push(card);
    this._drawnCard = card;

    this.setDiscardPhase();
    return card;
  }

  /**
   * Draw the top card from discard pile
   */
  drawFromDiscard(): Card | null {
    if (!this.isDrawPhase()) return null;
    if (this._discardPile.length === 0) return null;

    const card = this._discardPile.pop()!;
    this.getHand(this._currentPlayer).push(card);
    this._drawnCard = card;

    this.setDiscardPhase();
    return card;
  }

  /**
   * Discard a card from the current player's hand
   */
  discard(cardIndex: number): Card | null {
    if (!this.isDiscardPhase()) return null;

    const hand = this.getHand(this._currentPlayer);
    if (cardIndex < 0 || cardIndex >= hand.length) return null;

    const card = hand.splice(cardIndex, 1)[0];
    this._discardPile.push(card);
    this._drawnCard = null;

    // Only auto-sort for AI (player 2); player 1 arranges their own hand
    if (this._currentPlayer === 2) {
      this.sortHand(this._currentPlayer);
    }

    // Check if stock is almost empty (last 2 cards - round is a draw)
    if (this._stockPile.length <= 2) {
      this._state = GinRummyState.ROUND_OVER;
      this._statusMessage = 'Round drawn - stock pile exhausted!';
      this._roundResult = null; // No winner
      return card;
    }

    // Switch to next player
    this._currentPlayer = this._currentPlayer === 1 ? 2 : 1;
    this._state = this._currentPlayer === 1
      ? GinRummyState.PLAYER_TURN_DRAW
      : GinRummyState.OPPONENT_TURN_DRAW;
    this._statusMessage = `Player ${this._currentPlayer}: Draw from stock or discard pile`;

    return card;
  }

  /**
   * Attempt to knock. Requires deadwood <= 10.
   * If deadwood == 0, it's Gin.
   */
  knock(): RoundResult | null {
    if (!this.isDiscardPhase()) return null;

    const hand = this.getHand(this._currentPlayer);
    // Player must have 11 cards (just drew one, hasn't discarded yet)
    // Actually knocking replaces the discard - you knock WITH a discard
    // But for simplicity, we check the current hand (11 cards)
    // The player will select which card to discard as part of knocking

    // We check with 10 cards (best arrangement)
    // Actually the player knocks after discarding, so hand should be 10
    // Let's check the 11-card hand and find best with 10
    if (hand.length !== 11) return null;

    // Find the best discard that minimizes deadwood
    const result = findBestMelds(hand);
    // Can't knock if no arrangement gives deadwood <= 10
    // Actually we need to check: for each possible discard, does the remaining give deadwood <= 10?
    // Let the UI handle which card to discard, we just validate here
    return null; // Use knockWithDiscard instead
  }

  /**
   * Knock by discarding a specific card. Returns round result if valid.
   */
  knockWithDiscard(cardIndex: number): RoundResult | null {
    if (!this.isDiscardPhase()) return null;

    const hand = this.getHand(this._currentPlayer);
    if (cardIndex < 0 || cardIndex >= hand.length) return null;

    // Create hand without the discard
    const testHand = [...hand];
    const discardCard = testHand.splice(cardIndex, 1)[0];

    // Player 1 uses arrangement-based melds; AI (player 2) uses auto-optimized melds
    const knockerResult = this._currentPlayer === 1
      ? findMeldsFromArrangement(testHand)
      : findBestMelds(testHand);
    if (knockerResult.deadwoodValue > 10) {
      this._statusMessage = 'Deadwood too high to knock! Need 10 or less.';
      return null;
    }

    // Valid knock - do the discard
    hand.splice(cardIndex, 1);
    this._discardPile.push(discardCard);
    this._drawnCard = null;

    const isGin = knockerResult.deadwoodValue === 0;

    // Evaluate opponent's hand (AI always uses auto-optimized melds)
    const opponent: 1 | 2 = this._currentPlayer === 1 ? 2 : 1;
    const opponentHand = this.getHand(opponent);
    const opponentResult = findBestMelds(opponentHand);

    // If not gin, opponent can lay off on knocker's melds
    let opponentDeadwood = opponentResult.deadwoodValue;
    let opponentDeadwoodCards = [...opponentResult.deadwood];
    const opponentMelds = [...opponentResult.melds];

    if (!isGin) {
      // Opponent can lay off deadwood cards on knocker's melds
      const { remainingDeadwood, remainingCards } = this.layOff(
        opponentResult.deadwood,
        knockerResult.melds
      );
      opponentDeadwood = remainingDeadwood;
      opponentDeadwoodCards = remainingCards;
    }

    // Determine scoring
    let pointsAwarded: number;
    let pointsWinner: 1 | 2;
    let isUndercut = false;

    if (isGin) {
      // Gin bonus: 25 + opponent's deadwood
      pointsAwarded = 25 + opponentDeadwood;
      pointsWinner = this._currentPlayer;
      this._state = GinRummyState.GIN;
      this._statusMessage = `Player ${this._currentPlayer} got GIN! +${pointsAwarded} points!`;
    } else if (opponentDeadwood <= knockerResult.deadwoodValue) {
      // Undercut! Opponent wins
      isUndercut = true;
      pointsAwarded = 25 + (knockerResult.deadwoodValue - opponentDeadwood);
      pointsWinner = opponent;
      this._state = GinRummyState.KNOCKING;
      this._statusMessage = `UNDERCUT! Player ${opponent} wins ${pointsAwarded} points!`;
    } else {
      // Normal knock
      pointsAwarded = knockerResult.deadwoodValue === 0
        ? opponentDeadwood
        : opponentDeadwood - knockerResult.deadwoodValue;
      pointsWinner = this._currentPlayer;
      this._state = GinRummyState.KNOCKING;
      this._statusMessage = `Player ${this._currentPlayer} knocks! +${pointsAwarded} points!`;
    }

    // Update score
    if (pointsWinner === 1) {
      this._player1Score += pointsAwarded;
    } else {
      this._player2Score += pointsAwarded;
    }

    const roundResult: RoundResult = {
      knocker: this._currentPlayer,
      isGin,
      isUndercut,
      player1Deadwood: this._currentPlayer === 1 ? knockerResult.deadwoodValue : opponentDeadwood,
      player2Deadwood: this._currentPlayer === 2 ? knockerResult.deadwoodValue : opponentDeadwood,
      player1Melds: this._currentPlayer === 1 ? knockerResult.melds : opponentMelds,
      player2Melds: this._currentPlayer === 2 ? knockerResult.melds : opponentMelds,
      player1DeadwoodCards: this._currentPlayer === 1 ? knockerResult.deadwood : opponentDeadwoodCards,
      player2DeadwoodCards: this._currentPlayer === 2 ? knockerResult.deadwood : opponentDeadwoodCards,
      pointsAwarded,
      pointsWinner,
    };

    this._roundResult = roundResult;
    this._state = GinRummyState.ROUND_OVER;

    // Check for game over
    if (this._player1Score >= this._targetScore || this._player2Score >= this._targetScore) {
      this._state = GinRummyState.GAME_OVER;
      const w = this._player1Score >= this._targetScore ? 1 : 2;
      this._statusMessage = `GAME OVER! Player ${w} wins with ${w === 1 ? this._player1Score : this._player2Score} points!`;
    }

    return roundResult;
  }

  /**
   * Check if the current player can knock (deadwood <= 10 after any discard)
   */
  canKnock(): boolean {
    if (!this.isDiscardPhase()) return false;
    const hand = this.getHand(this._currentPlayer);
    if (hand.length !== 11) return false;

    // Player 1 uses arrangement-based melds; AI uses auto-optimized
    for (let i = 0; i < hand.length; i++) {
      const testHand = [...hand];
      testHand.splice(i, 1);
      const result = this._currentPlayer === 1
        ? findMeldsFromArrangement(testHand)
        : findBestMelds(testHand);
      if (result.deadwoodValue <= 10) return true;
    }
    return false;
  }

  /**
   * Get deadwood value for a player's current hand (best arrangement)
   */
  getPlayerDeadwood(player: 1 | 2): number {
    const hand = this.getHand(player);
    // Player 1 uses arrangement-based melds; AI uses auto-optimized
    if (player === 1) {
      return findMeldsFromArrangement(hand).deadwoodValue;
    }
    return findBestMelds(hand).deadwoodValue;
  }

  /**
   * Get melds for a hand
   */
  getPlayerMelds(player: 1 | 2): { melds: Meld[]; deadwood: Card[]; deadwoodValue: number } {
    if (player === 1) {
      return findMeldsFromArrangement(this.getHand(player));
    }
    return findBestMelds(this.getHand(player));
  }

  // --- AI Opponent (Simple) ---

  /**
   * AI draws a card (simple strategy: take discard if it helps, otherwise stock)
   */
  aiDraw(): { card: Card | null; fromDiscard: boolean; discardCard?: Card } {
    const hand = this.getHand(2);
    const topDiscard = this.topDiscard;

    if (topDiscard) {
      // Check if taking the discard reduces deadwood
      const currentResult = findBestMelds(hand);
      const testHand = [...hand, topDiscard];

      // Find best discard from test hand
      let bestDW = Infinity;
      for (let i = 0; i < testHand.length; i++) {
        const t = [...testHand];
        t.splice(i, 1);
        const r = findBestMelds(t);
        if (r.deadwoodValue < bestDW) bestDW = r.deadwoodValue;
      }

      if (bestDW < currentResult.deadwoodValue) {
        const savedDiscard = topDiscard;
        return { card: this.drawFromDiscard(), fromDiscard: true, discardCard: savedDiscard };
      }
    }

    return { card: this.drawFromStock(), fromDiscard: false };
  }

  /**
   * AI discards (or knocks if possible)
   */
  aiDiscard(): { action: 'discard' | 'knock'; cardIndex: number; result?: RoundResult | null } {
    const hand = this.getHand(2);

    // Try to knock
    if (this.canKnock()) {
      // Find best discard for knocking
      let bestIdx = 0;
      let bestDW = Infinity;
      for (let i = 0; i < hand.length; i++) {
        const t = [...hand];
        t.splice(i, 1);
        const r = findBestMelds(t);
        if (r.deadwoodValue < bestDW) {
          bestDW = r.deadwoodValue;
          bestIdx = i;
        }
      }

      if (bestDW <= 10) {
        const result = this.knockWithDiscard(bestIdx);
        if (result) {
          return { action: 'knock', cardIndex: bestIdx, result };
        }
      }
    }

    // Find worst card (highest deadwood contribution outside of melds)
    let bestDiscardIdx = 0;
    let bestRemainingDW = Infinity;
    for (let i = 0; i < hand.length; i++) {
      const t = [...hand];
      t.splice(i, 1);
      const r = findBestMelds(t);
      if (r.deadwoodValue < bestRemainingDW) {
        bestRemainingDW = r.deadwoodValue;
        bestDiscardIdx = i;
      }
    }

    this.discard(bestDiscardIdx);
    return { action: 'discard', cardIndex: bestDiscardIdx };
  }

  // --- Hand Management ---

  /**
   * Reorder a card in the player's hand from one index to another.
   * Works at any time during the player's turn.
   */
  reorderHand(player: 1 | 2, fromIndex: number, toIndex: number): void {
    const hand = this.getHand(player);
    if (fromIndex < 0 || fromIndex >= hand.length) return;
    if (toIndex < 0 || toIndex >= hand.length) return;
    if (fromIndex === toIndex) return;

    const [card] = hand.splice(fromIndex, 1);
    hand.splice(toIndex, 0, card);
  }

  /**
   * Move the last card in player 1's hand (just-drawn card)
   * to the right edge of the deadwood section.
   * Finds the first meld-boundary from the right and inserts before it.
   */
  placeDrawnCardInDeadwood(): void {
    const hand = this._player1Hand;
    if (hand.length < 2) return;

    // The drawn card is always the last element
    const drawnCard = hand.pop()!;

    // Detect melds on the current hand (without the drawn card)
    const info = findMeldsFromArrangement(hand);
    const usedIndices = new Set<number>();
    info.meldRanges.forEach((r) => {
      for (let j = r.start; j <= r.end; j++) usedIndices.add(j);
    });

    // Find the rightmost deadwood card index
    let insertAt = hand.length; // default: end
    for (let i = hand.length - 1; i >= 0; i--) {
      if (!usedIndices.has(i)) {
        insertAt = i + 1;
        break;
      }
      if (i === 0) {
        // All cards are in melds, insert at front
        insertAt = 0;
      }
    }

    hand.splice(insertAt, 0, drawnCard);
  }

  /**
   * Sort player hand by suit (Clubs, Diamonds, Hearts, Spades) then rank within suit
   */
  sortHandBySuit(player: 1 | 2): void {
    const hand = this.getHand(player);
    const suitOrder = [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES];
    hand.sort((a, b) => {
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return rankNumber(a) - rankNumber(b);
    });
  }

  /**
   * Sort player hand by rank (A, 2, 3, ..., K) then suit within rank
   */
  sortHandByRank(player: 1 | 2): void {
    const hand = this.getHand(player);
    const suitOrder = [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES];
    hand.sort((a, b) => {
      const rankDiff = rankNumber(a) - rankNumber(b);
      if (rankDiff !== 0) return rankDiff;
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    });
  }

  /**
   * Get a copy of the full discard pile (bottom to top)
   */
  get fullDiscardPile(): Card[] { return [...this._discardPile]; }

  // --- Helpers ---

  private getHand(player: 1 | 2): Card[] {
    return player === 1 ? this._player1Hand : this._player2Hand;
  }

  private sortHand(player: 1 | 2): void {
    const hand = this.getHand(player);
    hand.sort((a, b) => {
      // Sort by suit first, then by rank
      const suitOrder = [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES];
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return rankNumber(a) - rankNumber(b);
    });
  }

  private isDrawPhase(): boolean {
    return (
      (this._currentPlayer === 1 && this._state === GinRummyState.PLAYER_TURN_DRAW) ||
      (this._currentPlayer === 2 && this._state === GinRummyState.OPPONENT_TURN_DRAW)
    );
  }

  private isDiscardPhase(): boolean {
    return (
      (this._currentPlayer === 1 && this._state === GinRummyState.PLAYER_TURN_DISCARD) ||
      (this._currentPlayer === 2 && this._state === GinRummyState.OPPONENT_TURN_DISCARD)
    );
  }

  private setDiscardPhase(): void {
    if (this._currentPlayer === 1) {
      this._state = GinRummyState.PLAYER_TURN_DISCARD;
      this._statusMessage = 'Player 1: Discard a card (or Knock if able)';
    } else {
      this._state = GinRummyState.OPPONENT_TURN_DISCARD;
      this._statusMessage = 'Player 2 is thinking...';
    }
  }

  private reshuffleDiscard(): void {
    if (this._discardPile.length <= 1) return;
    const topCard = this._discardPile.pop()!;
    this._stockPile = Card.shuffleDeck(this._discardPile);
    this._discardPile = [topCard];
  }

  private layOff(
    deadwoodCards: Card[],
    knockerMelds: Meld[]
  ): { remainingDeadwood: number; remainingCards: Card[] } {
    let remaining = [...deadwoodCards];

    // Try to add deadwood cards to knocker's melds
    for (const meld of knockerMelds) {
      const toRemove: number[] = [];
      for (let i = 0; i < remaining.length; i++) {
        const card = remaining[i];
        if (meld.type === 'set') {
          // Can add if same rank and meld has < 4 cards
          if (card.rank === meld.cards[0].rank && meld.cards.length < 4) {
            toRemove.push(i);
            meld.cards.push(card);
          }
        } else {
          // Run - can extend at either end
          const sorted = [...meld.cards].sort((a, b) => rankNumber(a) - rankNumber(b));
          const low = rankNumber(sorted[0]);
          const high = rankNumber(sorted[sorted.length - 1]);

          if (card.suit === sorted[0].suit) {
            if (rankNumber(card) === low - 1 || rankNumber(card) === high + 1) {
              toRemove.push(i);
              meld.cards.push(card);
            }
          }
        }
      }
      // Remove in reverse order
      for (let i = toRemove.length - 1; i >= 0; i--) {
        remaining.splice(toRemove[i], 1);
      }
    }

    return {
      remainingDeadwood: calcDeadwood(remaining),
      remainingCards: remaining,
    };
  }

  /**
   * Reset for a completely new game
   */
  reset(): void {
    this._player1Score = 0;
    this._player2Score = 0;
    this._roundNumber = 0;
    this._state = GinRummyState.DEALING;
    this._roundResult = null;
    this._statusMessage = '';
    this._drawnCard = null;
    this._player1Hand = [];
    this._player2Hand = [];
    this._stockPile = [];
    this._discardPile = [];
  }
}
