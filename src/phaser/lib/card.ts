import { Suit, Rank, SUIT_OFFSETS, RANK_OFFSETS, RANK_DISPLAY, SUIT_DISPLAY, RED_SUITS, FACE_CARD_CHALLENGES } from '../common';

export class Card {
  private readonly _suit: Suit;
  private readonly _rank: Rank;

  constructor(suit: Suit, rank: Rank) {
    this._suit = suit;
    this._rank = rank;
  }

  // Getters
  get suit(): Suit {
    return this._suit;
  }

  get rank(): Rank {
    return this._rank;
  }

  get color(): 'red' | 'black' {
    return RED_SUITS.includes(this._suit) ? 'red' : 'black';
  }

  get displayValue(): string {
    return RANK_DISPLAY[this._rank];
  }

  get displaySuit(): string {
    return SUIT_DISPLAY[this._suit];
  }

  get spriteFrame(): number {
    // Calculate the frame number in the spritesheet
    // Assuming a 13x4 grid (13 ranks x 4 suits)
    return RANK_OFFSETS[this._rank] * 4 + SUIT_OFFSETS[this._suit];
  }

  get isFaceCard(): boolean {
    return FACE_CARD_CHALLENGES[this._rank] > 0;
  }

  get display(): string {
    return `${this.displayValue}${this.displaySuit}`;
  }

  get challengeCount(): number {
    return FACE_CARD_CHALLENGES[this._rank];
  }

  // Methods
  equals(other: Card): boolean {
    return this._suit === other._suit && this._rank === other._rank;
  }

  hasSameRank(other: Card): boolean {
    return this._rank === other._rank;
  }

  hasSameSuit(other: Card): boolean {
    return this._suit === other._suit;
  }

  toString(): string {
    return this.display;
  }

  // Static helper methods
  static createDeck(): Card[] {
    const deck: Card[] = [];
    
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank)) {
        deck.push(new Card(suit, rank));
      }
    }
    
    return deck;
  }

  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
}