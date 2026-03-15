// ============================================================
// speedLogic.js — Server-side Speed card game logic
// ============================================================

const Suit = Object.freeze({
  CLUBS: 'CLUBS',
  DIAMONDS: 'DIAMONDS',
  HEARTS: 'HEARTS',
  SPADES: 'SPADES',
});

const Rank = Object.freeze({
  ACE: 'ACE', TWO: 'TWO', THREE: 'THREE', FOUR: 'FOUR', FIVE: 'FIVE',
  SIX: 'SIX', SEVEN: 'SEVEN', EIGHT: 'EIGHT', NINE: 'NINE', TEN: 'TEN',
  JACK: 'JACK', QUEEN: 'QUEEN', KING: 'KING',
});

const RANK_VALUES = {
  [Rank.ACE]: 1, [Rank.TWO]: 2, [Rank.THREE]: 3, [Rank.FOUR]: 4,
  [Rank.FIVE]: 5, [Rank.SIX]: 6, [Rank.SEVEN]: 7, [Rank.EIGHT]: 8,
  [Rank.NINE]: 9, [Rank.TEN]: 10, [Rank.JACK]: 11, [Rank.QUEEN]: 12,
  [Rank.KING]: 13,
};

const RANK_DISPLAY = {
  [Rank.ACE]: 'A', [Rank.TWO]: '2', [Rank.THREE]: '3', [Rank.FOUR]: '4',
  [Rank.FIVE]: '5', [Rank.SIX]: '6', [Rank.SEVEN]: '7', [Rank.EIGHT]: '8',
  [Rank.NINE]: '9', [Rank.TEN]: '10', [Rank.JACK]: 'J', [Rank.QUEEN]: 'Q',
  [Rank.KING]: 'K',
};

const SUIT_DISPLAY = {
  [Suit.CLUBS]: '♣', [Suit.DIAMONDS]: '♦', [Suit.HEARTS]: '♥', [Suit.SPADES]: '♠',
};

const SUIT_OFFSETS = { [Suit.CLUBS]: 0, [Suit.DIAMONDS]: 1, [Suit.HEARTS]: 2, [Suit.SPADES]: 3 };
const RANK_OFFSETS = {
  [Rank.ACE]: 0, [Rank.TWO]: 1, [Rank.THREE]: 2, [Rank.FOUR]: 3,
  [Rank.FIVE]: 4, [Rank.SIX]: 5, [Rank.SEVEN]: 6, [Rank.EIGHT]: 7,
  [Rank.NINE]: 8, [Rank.TEN]: 9, [Rank.JACK]: 10, [Rank.QUEEN]: 11,
  [Rank.KING]: 12,
};

const RED_SUITS = [Suit.DIAMONDS, Suit.HEARTS];

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  get color() { return RED_SUITS.includes(this.suit) ? 'red' : 'black'; }
  get displayValue() { return RANK_DISPLAY[this.rank]; }
  get displaySuit() { return SUIT_DISPLAY[this.suit]; }
  get display() { return `${this.displayValue}${this.displaySuit}`; }
  get spriteFrame() { return RANK_OFFSETS[this.rank] * 4 + SUIT_OFFSETS[this.suit]; }

  toJSON() {
    return {
      suit: this.suit,
      rank: this.rank,
      display: this.display,
      displayValue: this.displayValue,
      displaySuit: this.displaySuit,
      spriteFrame: this.spriteFrame,
      color: this.color,
    };
  }

  static createDeck() {
    const deck = [];
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank)) {
        deck.push(new Card(suit, rank));
      }
    }
    return deck;
  }

  static shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// ============================================================
// Speed game logic
// ============================================================

class Speed {
  constructor() {
    this._p1Hand = [];
    this._p2Hand = [];
    this._p1DrawPile = [];
    this._p2DrawPile = [];
    this._centerLeft = [];
    this._centerRight = [];
    this._gameState = 'PLAYING';
    this._winner = null;
    this._events = [];
    this._lastPlayTime = Date.now();

    this._initializeGame();
  }

  get gameState() { return this._gameState; }
  get winner() { return this._winner; }

  get centerLeftTop() {
    return this._centerLeft.length > 0 ? this._centerLeft[this._centerLeft.length - 1] : null;
  }
  get centerRightTop() {
    return this._centerRight.length > 0 ? this._centerRight[this._centerRight.length - 1] : null;
  }

  _initializeGame() {
    const deck = Card.shuffleDeck(Card.createDeck());

    this._p1Hand = deck.splice(0, 5);
    this._p2Hand = deck.splice(0, 5);
    this._p1DrawPile = deck.splice(0, 15);
    this._p2DrawPile = deck.splice(0, 15);
    this._centerLeft = [deck.splice(0, 1)[0]];
    this._centerRight = [deck.splice(0, 1)[0]];

    // Remaining cards split into draw piles
    let toggle = true;
    while (deck.length > 0) {
      if (toggle) this._p1DrawPile.push(deck.shift());
      else this._p2DrawPile.push(deck.shift());
      toggle = !toggle;
    }

    this._gameState = 'PLAYING';
    this._winner = null;
    this._events = [];
    this._lastPlayTime = Date.now();
  }

  /**
   * Player plays a card from hand onto a center pile.
   * @param {1|2} player
   * @param {number} handIndex
   * @param {'left'|'right'} targetPile
   * @returns {boolean}
   */
  playCard(player, handIndex, targetPile) {
    if (this._gameState === 'GAME_OVER') return false;

    const hand = player === 1 ? this._p1Hand : this._p2Hand;
    const drawPile = player === 1 ? this._p1DrawPile : this._p2DrawPile;

    if (handIndex < 0 || handIndex >= hand.length) return false;

    const card = hand[handIndex];
    const pile = targetPile === 'left' ? this._centerLeft : this._centerRight;
    const topCard = pile.length > 0 ? pile[pile.length - 1] : null;

    if (!topCard) return false;
    if (!this._isValidPlay(card, topCard)) return false;

    // Move card
    hand.splice(handIndex, 1);
    pile.push(card);

    // Refill hand
    if (hand.length < 5 && drawPile.length > 0) {
      hand.push(drawPile.shift());
    }

    this._lastPlayTime = Date.now();

    if (this._gameState === 'STALLED') {
      this._gameState = 'PLAYING';
    }

    this._events.push({
      type: 'card_played',
      player,
      message: `Player ${player} played ${card.display} on ${targetPile} pile`,
    });

    // Check win
    if (hand.length === 0 && drawPile.length === 0) {
      this._gameState = 'GAME_OVER';
      this._winner = player;
      this._events.push({
        type: 'game_over',
        player,
        message: `Player ${player} wins! All cards played!`,
      });
    }

    return true;
  }

  /** Flip new center cards when stalled. */
  flipCenterCards() {
    if (this._gameState === 'GAME_OVER') return false;

    const p1Has = this._p1DrawPile.length > 0;
    const p2Has = this._p2DrawPile.length > 0;

    if (!p1Has && !p2Has) {
      this._reshuffleCenterPiles();
      return true;
    }

    if (p1Has) this._centerLeft.push(this._p1DrawPile.shift());
    if (p2Has) this._centerRight.push(this._p2DrawPile.shift());

    this._gameState = 'PLAYING';
    this._lastPlayTime = Date.now();

    this._events.push({ type: 'flip', message: 'New cards flipped onto center piles!' });
    return true;
  }

  hasAnyValidPlay() {
    return this._playerHasValidPlay(1) || this._playerHasValidPlay(2);
  }

  _playerHasValidPlay(player) {
    const hand = player === 1 ? this._p1Hand : this._p2Hand;
    const leftTop = this.centerLeftTop;
    const rightTop = this.centerRightTop;

    for (const card of hand) {
      if (leftTop && this._isValidPlay(card, leftTop)) return true;
      if (rightTop && this._isValidPlay(card, rightTop)) return true;
    }
    return false;
  }

  _isValidPlay(card, pileTop) {
    const cardVal = RANK_VALUES[card.rank];
    const pileVal = RANK_VALUES[pileTop.rank];
    const diff = Math.abs(cardVal - pileVal);
    return diff === 1 || diff === 12; // ±1 with Ace-King wrap
  }

  _reshuffleCenterPiles() {
    const leftTop = this._centerLeft.pop();
    const rightTop = this._centerRight.pop();

    const reshuffled = Card.shuffleDeck([...this._centerLeft, ...this._centerRight]);
    this._centerLeft = leftTop ? [leftTop] : [];
    this._centerRight = rightTop ? [rightTop] : [];

    let toggle = true;
    for (const card of reshuffled) {
      if (toggle) this._p1DrawPile.push(card);
      else this._p2DrawPile.push(card);
      toggle = !toggle;
    }

    while (this._p1Hand.length < 5 && this._p1DrawPile.length > 0) {
      this._p1Hand.push(this._p1DrawPile.shift());
    }
    while (this._p2Hand.length < 5 && this._p2DrawPile.length > 0) {
      this._p2Hand.push(this._p2DrawPile.shift());
    }

    this._gameState = 'PLAYING';
    this._lastPlayTime = Date.now();
    this._events.push({ type: 'flip', message: 'Center piles reshuffled! New cards dealt.' });
  }

  getStatusMessage() {
    const latestEvent = this._events[this._events.length - 1];
    return latestEvent?.message || 'Game ready';
  }

  /** Serialize full game state for wire transfer. */
  serialize() {
    return {
      p1Hand: this._p1Hand.map(c => c.toJSON()),
      p2Hand: this._p2Hand.map(c => c.toJSON()),
      p1DrawCount: this._p1DrawPile.length,
      p2DrawCount: this._p2DrawPile.length,
      centerLeftTop: this.centerLeftTop ? this.centerLeftTop.toJSON() : null,
      centerRightTop: this.centerRightTop ? this.centerRightTop.toJSON() : null,
      centerLeftCount: this._centerLeft.length,
      centerRightCount: this._centerRight.length,
      gameState: this._gameState,
      winner: this._winner,
      statusMessage: this.getStatusMessage(),
      lastAction: this._events.length > 0 ? this._events[this._events.length - 1] : null,
    };
  }
}

module.exports = { Speed, Card };
