// Scene keys
export const SCENE_KEYS = {
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  RULES: 'RulesScene',
  GAME: 'GameScene'
} as const;

// Asset keys
export const ASSET_KEYS = {
  CARDS: 'cards',
  TITLE: 'title',
  CLICK_TO_START: 'clickToStart'
} as const;

// Card dimensions
export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 190;
export const CARD_SCALE = 0.4;
export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 800;

// Card enums
export enum Suit {
  CLUBS = 'CLUBS',
  DIAMONDS = 'DIAMONDS',
  HEARTS = 'HEARTS',
  SPADES = 'SPADES'
}

export enum Rank {
  ACE = 'ACE',
  TWO = 'TWO',
  THREE = 'THREE',
  FOUR = 'FOUR',
  FIVE = 'FIVE',
  SIX = 'SIX',
  SEVEN = 'SEVEN',
  EIGHT = 'EIGHT',
  NINE = 'NINE',
  TEN = 'TEN',
  JACK = 'JACK',
  QUEEN = 'QUEEN',
  KING = 'KING'
}

// Player type
export type Player = 1 | 2;

// Game states
export enum GameState {
  MENU = 'MENU',
  RULES = 'RULES',
  PLAYING = 'PLAYING',
  CHALLENGE = 'CHALLENGE',
  GAME_OVER = 'GAME_OVER'
}

// Face card challenge counts
export const FACE_CARD_CHALLENGES: Record<Rank, number> = {
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
  [Rank.KING]: 3
};

// Sprite sheet offsets
export const SUIT_OFFSETS: Record<Suit, number> = {
  [Suit.CLUBS]: 0,
  [Suit.DIAMONDS]: 1,
  [Suit.HEARTS]: 2,
  [Suit.SPADES]: 3
};

export const RANK_OFFSETS: Record<Rank, number> = {
  [Rank.ACE]: 0,
  [Rank.TWO]: 1,
  [Rank.THREE]: 2,
  [Rank.FOUR]: 3,
  [Rank.FIVE]: 4,
  [Rank.SIX]: 5,
  [Rank.SEVEN]: 6,
  [Rank.EIGHT]: 7,
  [Rank.NINE]: 8,
  [Rank.TEN]: 9,
  [Rank.JACK]: 10,
  [Rank.QUEEN]: 11,
  [Rank.KING]: 12
};

// Display strings
export const RANK_DISPLAY: Record<Rank, string> = {
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
  [Rank.KING]: 'K'
};

export const SUIT_DISPLAY: Record<Suit, string> = {
  [Suit.CLUBS]: '♣',
  [Suit.DIAMONDS]: '♦',
  [Suit.HEARTS]: '♥',
  [Suit.SPADES]: '♠'
};

// Rank values for calculations
export const RANK_VALUES: Record<Rank, number> = {
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
  [Rank.KING]: 13
};

// Color helpers
export const RED_SUITS = [Suit.DIAMONDS, Suit.HEARTS];
export const BLACK_SUITS = [Suit.CLUBS, Suit.SPADES];

// Game colors
export const COLORS = {
  BACKGROUND: '#0a5f38',
  GOLD: '#ffd700',
  WHITE: '#ffffff',
  BLACK: '#000000',
  RED: '#ff0000',
  GREEN: '#00ff00',
  ORANGE: '#ff8c00',
  LIGHT_GRAY: '#d3d3d3',
  BLUE: '#4169E1',
  YELLOW: '#FFFF00'
} as const;

// Slap condition types - ALL POSSIBLE RULES
export type SlapCondition = 
  | 'doubles'        // Two cards of same rank in a row (5-5)
  | 'sandwich'       // Same rank separated by one card (5-7-5)
  | 'tens'           // Two cards that add up to 10 (3-7, 4-6, etc.)
  | 'marriage'       // King and Queen together (K-Q or Q-K)
  | 'top_bottom'     // Top and bottom cards of pile match
  | 'four_in_row'    // Four cards in sequence (3-4-5-6)
  | 'sequence'       // Any sequence of 3+ consecutive ranks
  | 'jokers'         // If jokers are enabled
  | 'none';

// Game rules configuration
export interface GameRules {
  doubles: boolean;
  sandwich: boolean;
  tens: boolean;
  marriage: boolean;
  topBottom: boolean;
  fourInRow: boolean;
  sequence: boolean;
  jokers: boolean;
}

// Rule descriptions for UI
export const RULE_DESCRIPTIONS: Record<keyof GameRules, string> = {
  doubles: 'Two cards of same rank in a row (5-5)',
  sandwich: 'Same rank with one card between (5-7-5)',
  tens: 'Two cards that add up to 10 (3-7, 4-6)',
  marriage: 'King and Queen together (K-Q or Q-K)',
  topBottom: 'Top and bottom cards of pile match',
  fourInRow: 'Four consecutive ranks (3-4-5-6)',
  sequence: 'Any 3+ card sequence (5-6-7)',
  jokers: 'Include jokers in deck (always slappable)'
};

// Rule display names
export const RULE_NAMES: Record<keyof GameRules, string> = {
  doubles: 'Doubles',
  sandwich: 'Sandwich',
  tens: 'Adds to 10',
  marriage: 'Marriage',
  topBottom: 'Top-Bottom',
  fourInRow: '4-in-a-Row',
  sequence: 'Sequence',
  jokers: 'Jokers'
};

export const DEFAULT_RULES: GameRules = {
  doubles: true,
  sandwich: true,
  tens: false,
  marriage: false,
  topBottom: false,
  fourInRow: false,
  sequence: false,
  jokers: false
};

// Game event types
export interface GameEvent {
  type: 'card_played' | 'slap_attempt' | 'pile_won' | 'game_over' | 'challenge_started' | 'challenge_failed';
  player?: Player;
  condition?: SlapCondition;
  message?: string;
}