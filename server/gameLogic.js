// ============================================================
// gameLogic.js — Faithful JS port of src/phaser/lib/card.ts
//                and src/phaser/lib/ratscrew.ts
// ============================================================

// ---- Enums (mirrored as plain objects) ----

const Suit = Object.freeze({
  CLUBS: 'CLUBS',
  DIAMONDS: 'DIAMONDS',
  HEARTS: 'HEARTS',
  SPADES: 'SPADES',
});

const Rank = Object.freeze({
  ACE: 'ACE',
  TWO: 'TWO',
  THREE: 'THREE',
  FOUR: 'FOUR',
  FIVE: 'FIVE',
  SIX: 'SIX',
  SEVEN: 'SEVEN',
  EIGHT: 'EIGHT',
  NINE: 'NINE',
  TEN: 'TEN',
  JACK: 'JACK',
  QUEEN: 'QUEEN',
  KING: 'KING',
});

const GameState = Object.freeze({
  PLAYING: 'PLAYING',
  CHALLENGE: 'CHALLENGE',
  GAME_OVER: 'GAME_OVER',
});

// ---- Lookup tables ----

const FACE_CARD_CHALLENGES = {
  [Rank.ACE]: 4,
  [Rank.TWO]: 0,
  [Rank.THREE]: 0,
  [Rank.FOUR]: 0,
  [Rank.FIVE]: 0,
  [Rank.SIX]: 0,
  [Rank.SEVEN]: 0,
  [Rank.EIGHT]: 0,
  [Rank.NINE]: 0,
  [Rank.TEN]: 0,
  [Rank.JACK]: 1,
  [Rank.QUEEN]: 2,
  [Rank.KING]: 3,
};

const RANK_VALUES = {
  [Rank.ACE]: 1,
  [Rank.TWO]: 2,
  [Rank.THREE]: 3,
  [Rank.FOUR]: 4,
  [Rank.FIVE]: 5,
  [Rank.SIX]: 6,
  [Rank.SEVEN]: 7,
  [Rank.EIGHT]: 8,
  [Rank.NINE]: 9,
  [Rank.TEN]: 10,
  [Rank.JACK]: 11,
  [Rank.QUEEN]: 12,
  [Rank.KING]: 13,
};

const RANK_DISPLAY = {
  [Rank.ACE]: 'A',
  [Rank.TWO]: '2',
  [Rank.THREE]: '3',
  [Rank.FOUR]: '4',
  [Rank.FIVE]: '5',
  [Rank.SIX]: '6',
  [Rank.SEVEN]: '7',
  [Rank.EIGHT]: '8',
  [Rank.NINE]: '9',
  [Rank.TEN]: '10',
  [Rank.JACK]: 'J',
  [Rank.QUEEN]: 'Q',
  [Rank.KING]: 'K',
};

const SUIT_DISPLAY = {
  [Suit.CLUBS]: '♣',
  [Suit.DIAMONDS]: '♦',
  [Suit.HEARTS]: '♥',
  [Suit.SPADES]: '♠',
};

const RED_SUITS = [Suit.DIAMONDS, Suit.HEARTS];

const DEFAULT_RULES = {
  doubles: true,
  sandwich: true,
  tens: false,
  marriage: false,
  topBottom: false,
  fourInRow: false,
  sequence: false,
  jokers: false,
};

// ============================================================
// Card class
// ============================================================

class Card {
  constructor(suit, rank) {
    this._suit = suit;
    this._rank = rank;
  }

  get suit() { return this._suit; }
  get rank() { return this._rank; }

  get color() {
    return RED_SUITS.includes(this._suit) ? 'red' : 'black';
  }

  get displayValue() { return RANK_DISPLAY[this._rank]; }
  get displaySuit() { return SUIT_DISPLAY[this._suit]; }

  get isFaceCard() {
    return FACE_CARD_CHALLENGES[this._rank] > 0;
  }

  get display() {
    return `${this.displayValue}${this.displaySuit}`;
  }

  get challengeCount() {
    return FACE_CARD_CHALLENGES[this._rank];
  }

  equals(other) {
    return this._suit === other._suit && this._rank === other._rank;
  }

  hasSameRank(other) {
    return this._rank === other._rank;
  }

  hasSameSuit(other) {
    return this._suit === other._suit;
  }

  /** Serialise for the wire */
  toJSON() {
    return {
      suit: this._suit,
      rank: this._rank,
      displayValue: this.displayValue,
      displaySuit: this.displaySuit,
    };
  }

  // ---- Static helpers ----

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
// RatScrew class  (faithful port of ratscrew.ts)
// ============================================================

class RatScrew {
  constructor(rules) {
    this._rules = { ...(rules || DEFAULT_RULES) };
    this._player1Deck = [];
    this._player2Deck = [];
    this._centerPile = [];
    this._bonusPile = [];
    this._currentPlayer = 1;
    this._gameState = GameState.PLAYING;
    this._challengePlayer = null;
    this._challengeRemaining = 0;
    this._events = [];
    this._pileAwaitingCollection = false;
    this._pileWinner = null;

    this.initializeGame();
  }

  // ---- Public getters ----

  get player1Count() { return this._player1Deck.length; }
  get player2Count() { return this._player2Deck.length; }
  get centerCount() { return this._centerPile.length; }
  get bonusCount() { return this._bonusPile.length; }
  get currentPlayer() { return this._currentPlayer; }
  get gameState() { return this._gameState; }
  get challengePlayer() { return this._challengePlayer; }
  get challengeRemaining() { return this._challengeRemaining; }

  get topCard() {
    return this._centerPile.length > 0
      ? this._centerPile[this._centerPile.length - 1]
      : null;
  }

  get events() { return this._events; }

  get winner() {
    if (this._player1Deck.length === 0) return 2;
    if (this._player2Deck.length === 0) return 1;
    return null;
  }

  get pileAwaitingCollection() { return this._pileAwaitingCollection; }
  get pileWinner() { return this._pileWinner; }
  get rules() { return { ...this._rules }; }

  // ---- Initialise ----

  initializeGame() {
    const fullDeck = Card.createDeck();
    const shuffledDeck = Card.shuffleDeck(fullDeck);

    this._player1Deck = shuffledDeck.slice(0, 26);
    this._player2Deck = shuffledDeck.slice(26, 52);
    this._centerPile = [];
    this._bonusPile = [];
    this._currentPlayer = 1;
    this._gameState = GameState.PLAYING;
    this._challengePlayer = null;
    this._challengeRemaining = 0;
    this._pileAwaitingCollection = false;
    this._pileWinner = null;
    this._events = [];

    this._addEvent({
      type: 'card_played',
      player: 1,
      message: 'Game started! Player 1 goes first.',
    });
  }

  // ---- Main actions ----

  playCard(player) {
    if (!this.canPlayerPlay(player)) return false;

    const playerDeck = player === 1 ? this._player1Deck : this._player2Deck;
    if (playerDeck.length === 0) return false;

    const card = playerDeck.shift();
    this._centerPile.push(card);

    this._addEvent({
      type: 'card_played',
      player,
      message: `Player ${player} played ${card.display}`,
    });

    // Check slappable BEFORE challenge logic
    const slappableCondition = this._getSlappableCondition();
    if (slappableCondition !== 'none') {
      this._addEvent({
        type: 'slap_attempt',
        player,
        message: `${slappableCondition.toUpperCase().replace('_', '-')} - SLAP NOW!`,
      });

      if (this._gameState === GameState.CHALLENGE) {
        this._addEvent({
          type: 'challenge_started',
          player: this._challengePlayer,
          message: `Challenge paused! ${slappableCondition} detected - race to slap!`,
        });
      }

      this._checkGameOver();
      return true;
    }

    // Normal flow
    if (card.isFaceCard) {
      this._startChallenge(player === 1 ? 2 : 1, card.challengeCount);
    } else if (this._gameState === GameState.CHALLENGE) {
      this._challengeRemaining--;
      if (this._challengeRemaining <= 0) {
        this._endChallenge(false);
      } else {
        this._addEvent({
          type: 'challenge_started',
          player: this._challengePlayer,
          message: `Challenge continues. Player ${this._challengePlayer} has ${this._challengeRemaining} chances left.`,
        });
      }
    } else {
      this._currentPlayer = player === 1 ? 2 : 1;
    }

    this._checkGameOver();
    return true;
  }

  attemptSlap(player) {
    if (this._gameState === GameState.GAME_OVER) return false;

    if (this._pileAwaitingCollection) {
      if (player === this._pileWinner) {
        this._collectPile(player);
        return true;
      }
      return false;
    }

    if (this._centerPile.length < 2) return false;

    const condition = this._getSlappableCondition();

    if (condition !== 'none') {
      this._setPileWinner(player);

      if (this._gameState === GameState.CHALLENGE) {
        this._addEvent({
          type: 'slap_attempt',
          player,
          condition,
          message: `Player ${player} slapped ${condition} during challenge! Challenge cancelled - Slap again to collect!`,
        });
        this._gameState = GameState.PLAYING;
        this._challengePlayer = null;
        this._challengeRemaining = 0;
      } else {
        this._addEvent({
          type: 'slap_attempt',
          player,
          condition,
          message: `Player ${player} slapped successfully! (${condition}) - Slap again to collect!`,
        });
      }
      this._checkGameOver();
      return true;
    } else {
      this._penalizePlayer(player);
      this._addEvent({
        type: 'slap_attempt',
        player,
        message: `Player ${player} slapped incorrectly! Lost one card to bonus pile.`,
      });
      return false;
    }
  }

  // ---- Helpers ----

  _startChallenge(challengePlayer, challengeCount) {
    this._gameState = GameState.CHALLENGE;
    this._challengePlayer = challengePlayer;
    this._challengeRemaining = challengeCount;

    this._addEvent({
      type: 'challenge_started',
      player: challengePlayer,
      message: `Face card challenge! Player ${challengePlayer} has ${challengeCount} chances.`,
    });
  }

  _endChallenge(challengerWon) {
    if (challengerWon) {
      if (this._challengePlayer) {
        this._setPileWinner(this._challengePlayer);
        this._addEvent({
          type: 'pile_won',
          player: this._challengePlayer,
          message: `Player ${this._challengePlayer} won the challenge! Slap to collect!`,
        });
      }
    } else {
      const originalPlayer = this._challengePlayer === 1 ? 2 : 1;
      this._setPileWinner(originalPlayer);
      this._addEvent({
        type: 'challenge_failed',
        player: originalPlayer,
        message: `Challenge failed! Player ${originalPlayer} wins the pile - Slap to collect!`,
      });
    }

    this._gameState = GameState.PLAYING;
    this._challengePlayer = null;
    this._challengeRemaining = 0;
  }

  _setPileWinner(player) {
    this._pileAwaitingCollection = true;
    this._pileWinner = player;
    this._currentPlayer = player;
  }

  _collectPile(player) {
    const playerDeck = player === 1 ? this._player1Deck : this._player2Deck;
    playerDeck.push(...this._centerPile);

    const bonusCount = this._bonusPile.length;
    if (bonusCount > 0) {
      playerDeck.push(...this._bonusPile);
      this._addEvent({
        type: 'pile_won',
        player,
        message: `Player ${player} also gets ${bonusCount} bonus card${bonusCount > 1 ? 's' : ''}!`,
      });
    }

    this._centerPile = [];
    this._bonusPile = [];
    this._pileAwaitingCollection = false;
    this._pileWinner = null;
    this._currentPlayer = player;
    this._gameState = GameState.PLAYING;

    const totalCards = playerDeck.length;
    this._addEvent({
      type: 'pile_won',
      player,
      message: `Player ${player} collected the pile! (${totalCards} cards total)`,
    });

    this._checkGameOver();
  }

  _penalizePlayer(player) {
    const playerDeck = player === 1 ? this._player1Deck : this._player2Deck;

    if (playerDeck.length > 0) {
      const card = playerDeck.shift();
      this._bonusPile.push(card);
      this._addEvent({
        type: 'slap_attempt',
        player,
        message: `Player ${player} penalized: ${card.display} added to bonus pile (${this._bonusPile.length} cards).`,
      });
    } else {
      this._addEvent({
        type: 'slap_attempt',
        player,
        message: `Player ${player} has no cards to penalize!`,
      });
    }

    this._checkGameOver();
  }

  _getSlappableCondition() {
    const pile = this._centerPile;
    if (pile.length < 2) return 'none';

    const topCard = pile[pile.length - 1];
    const secondCard = pile[pile.length - 2];
    if (!topCard || !secondCard) return 'none';

    // DOUBLES
    if (this._rules.doubles && topCard.hasSameRank(secondCard)) {
      return 'doubles';
    }

    // SANDWICH
    if (this._rules.sandwich && pile.length >= 3) {
      const thirdCard = pile[pile.length - 3];
      if (thirdCard && topCard.hasSameRank(thirdCard)) {
        return 'sandwich';
      }
    }

    // TENS
    if (this._rules.tens) {
      const topValue = RANK_VALUES[topCard.rank];
      const secondValue = RANK_VALUES[secondCard.rank];
      if (topValue + secondValue === 10) {
        return 'tens';
      }
    }

    // MARRIAGE
    if (this._rules.marriage) {
      const isMarriage =
        (topCard.rank === Rank.KING && secondCard.rank === Rank.QUEEN) ||
        (topCard.rank === Rank.QUEEN && secondCard.rank === Rank.KING);
      if (isMarriage) return 'marriage';
    }

    // TOP-BOTTOM
    if (this._rules.topBottom && pile.length >= 3) {
      const bottomCard = pile[0];
      if (bottomCard && topCard.hasSameRank(bottomCard)) {
        return 'top_bottom';
      }
    }

    // FOUR IN A ROW
    if (this._rules.fourInRow && pile.length >= 4) {
      const cards = [
        pile[pile.length - 4],
        pile[pile.length - 3],
        pile[pile.length - 2],
        pile[pile.length - 1],
      ];
      if (this._isSequence(cards)) return 'four_in_row';
    }

    // SEQUENCE (3+)
    if (this._rules.sequence && pile.length >= 3) {
      const last3 = [
        pile[pile.length - 3],
        pile[pile.length - 2],
        pile[pile.length - 1],
      ];
      if (this._isSequence(last3)) return 'sequence';
    }

    return 'none';
  }

  _isSequence(cards) {
    const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => a - b);

    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        if (!(values[i - 1] === 13 && values[i] === 1)) {
          return false;
        }
      }
    }
    return true;
  }

  _checkGameOver() {
    const winner = this.winner;
    if (winner) {
      this._gameState = GameState.GAME_OVER;
      this._addEvent({
        type: 'game_over',
        player: winner,
        message: `Game Over! Player ${winner} wins - opponent is out of cards!`,
      });
    }
  }

  _addEvent(event) {
    this._events.push(event);
  }

  canPlayerPlay(player) {
    if (this._gameState === GameState.GAME_OVER) return false;
    if (this._pileAwaitingCollection) return false;
    if (this._gameState === GameState.PLAYING) return player === this._currentPlayer;
    if (this._gameState === GameState.CHALLENGE) return player === this._challengePlayer;
    return false;
  }

  getGameStatusMessage() {
    if (this._pileAwaitingCollection && this._pileWinner) {
      return `Player ${this._pileWinner}: Slap to collect the pile!`;
    }
    const latestEvent = this._events[this._events.length - 1];
    return latestEvent?.message || 'Game ready';
  }

  getActiveRuleNames() {
    const active = [];
    if (this._rules.doubles) active.push('Doubles');
    if (this._rules.sandwich) active.push('Sandwich');
    if (this._rules.tens) active.push('Tens');
    if (this._rules.marriage) active.push('Marriage');
    if (this._rules.topBottom) active.push('Top-Bottom');
    if (this._rules.fourInRow) active.push('4-in-Row');
    if (this._rules.sequence) active.push('Sequence');
    if (this._rules.jokers) active.push('Jokers');
    return active;
  }

  /** Serialise the full game state for the wire */
  serialize() {
    const topCard = this.topCard;
    const latestEvent = this._events[this._events.length - 1];

    return {
      player1Count: this.player1Count,
      player2Count: this.player2Count,
      centerCount: this.centerCount,
      bonusCount: this.bonusCount,
      topCard: topCard ? topCard.toJSON() : null,
      currentPlayer: this._currentPlayer,
      gameState: this._gameState,
      winner: this.winner,
      challengePlayer: this._challengePlayer,
      challengeRemaining: this._challengeRemaining,
      pileAwaitingCollection: this._pileAwaitingCollection,
      pileWinner: this._pileWinner,
      statusMessage: this.getGameStatusMessage(),
      lastAction: latestEvent
        ? { type: latestEvent.type, player: latestEvent.player }
        : null,
    };
  }
}

module.exports = { RatScrew, Card, GameState, Suit, Rank, DEFAULT_RULES };
