# Game Designs

## Overview

Each game in the casino follows the same architectural pattern established by Egyptian Ratscrew: a client-side Phaser scene for rendering and input, paired with a server-side game logic class that acts as the single source of truth. The server validates every action, updates state, and broadcasts to all connected clients. No game state is trusted from the client.

This document covers the rules, mechanics, and implementation considerations for each game.

---

## Game 1: Egyptian Ratscrew (Existing)

### Status: Complete

### Rules Summary
A 2-player card game where players take turns playing cards from their deck onto a center pile. When certain card patterns appear (doubles, sandwiches, etc.), either player can "slap" the pile to claim it. Face cards trigger challenge rounds where the opponent must play a face card within a set number of tries or lose the pile. The player who collects all 52 cards wins.

### Current Implementation
- **Client:** `src/phaser/scenes/game-scene.ts` + `src/phaser/lib/ratscrew.ts`
- **Server:** `server/gameLogic.js`
- **Rules:** 8 configurable slap conditions (doubles, sandwich, tens, marriage, top-bottom, four-in-row, sequence, jokers)
- **Controls:** Space to play, S to slap (desktop); touch buttons (mobile)

### Casino Integration Changes
- Move from standalone page to a scene accessible from the casino lobby
- Add chip wagering (bet placed before game starts, winner takes pot)
- Add avatar portraits beside each player's deck
- Keep configurable rules — the host (first seated player) chooses which slap rules are active
- Add spectator view for other players watching from the lobby

---

## Game 2: Gin Rummy

### Rules

**Players:** 2

**Deck:** Standard 52-card deck (no jokers)

**Card Values:**
- Face cards (K, Q, J): 10 points each
- Aces: 1 point
- Number cards: face value

**Deal:** 10 cards each. Remaining cards form the stock pile. Top card of stock is flipped to start the discard pile.

**Objective:** Form all 10 cards into melds (sets of 3-4 same rank, or runs of 3+ consecutive same suit). Unmatched cards are "deadwood." Minimize deadwood points.

**Turn Structure:**
1. Draw one card (from stock pile or discard pile)
2. Discard one card (face up onto discard pile)

**Ending a Round:**

- **Knock:** If a player's deadwood totals 10 points or fewer, they can knock. They lay down their melds and deadwood. The opponent can "lay off" their deadwood onto the knocker's melds (if they match). Compare deadwood totals — lower wins the difference in points. If the opponent's deadwood is equal or lower, they score an "undercut" bonus (25 points + the difference).
- **Gin:** If a player melds all 10 cards (zero deadwood), they call "Gin" and score 25 bonus points plus the opponent's total deadwood. The opponent cannot lay off.
- **Stock Exhaustion:** If the stock pile runs out, the round is a draw (no points scored).

**Winning:** Play multiple rounds. First to reach a target score (typically 100 points) wins the match.

### Implementation Plan

**Server-Side Logic (`server/ginRummyLogic.js`):**
- `GinRummy` class managing: player hands (10 cards each), stock pile, discard pile, current turn, game phase (PLAYING, KNOCKING, LAYING_OFF, ROUND_OVER, MATCH_OVER)
- Meld detection algorithm: identify all valid sets and runs in a hand. Use backtracking to find the arrangement that minimizes deadwood.
- Knock validation: verify deadwood ≤ 10
- Lay-off validation: check if deadwood cards extend existing melds
- Score calculation per round and cumulative match score

**Client-Side Scene (`src/phaser/scenes/gin-rummy-scene.ts`):**
- Player's hand displayed as fanned cards at bottom of screen
- Opponent's hand shown as card backs at top
- Stock pile and discard pile in center
- Drag-and-drop or tap-to-select for drawing and discarding
- Meld grouping UI: drag cards into groups to arrange melds before knocking
- Score display and round history sidebar
- Knock/Gin buttons appear when eligible

**Key Technical Challenges:**
- Meld optimization algorithm (NP-hard in the general case, but with only 10 cards, brute-force with pruning is fine)
- Lay-off logic (opponent extending knocker's melds)
- Card arrangement UI (letting players manually organize their hand)

**Controls:**
- Desktop: Click to select cards, drag to rearrange, keyboard shortcuts for draw/discard/knock
- Mobile: Tap to select, swipe to rearrange, prominent action buttons

---

## Game 3: Texas Hold'em — Heads Up (2 Players)

### Rules

**Players:** 2

**Deck:** Standard 52-card deck

**Positions:** Dealer/Small Blind and Big Blind alternate each hand.

**Blinds:** Forced bets before cards are dealt. Small blind = half of big blind. (e.g., 5/10 chips)

**Hand Flow:**

1. **Pre-Flop:** Each player receives 2 hole cards (face down). Betting round starting with small blind.
2. **Flop:** 3 community cards dealt face up. Betting round.
3. **Turn:** 1 additional community card. Betting round.
4. **River:** 1 final community card (5 total on board). Final betting round.
5. **Showdown:** If 2+ players remain, best 5-card hand from 7 cards (2 hole + 5 community) wins the pot.

**Betting Actions:**
- **Fold:** Surrender hand, lose any chips already bet
- **Check:** Pass action (only if no bet to match)
- **Call:** Match the current bet
- **Raise:** Increase the current bet (minimum raise = previous raise amount)
- **All-In:** Bet all remaining chips

**Hand Rankings (highest to lowest):**
1. Royal Flush (A-K-Q-J-10 same suit)
2. Straight Flush (5 consecutive same suit)
3. Four of a Kind
4. Full House (3 of a kind + pair)
5. Flush (5 same suit)
6. Straight (5 consecutive)
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

**Winning:** Play continues until one player has all chips or a player leaves.

### Implementation Plan

**Server-Side Logic (`server/pokerLogic.js`):**
- `TexasHoldem` class managing: player stacks, hole cards, community cards, pot, side pots, current bet, betting round phase (PRE_FLOP, FLOP, TURN, RIVER, SHOWDOWN)
- Hand evaluator: given 7 cards, determine best 5-card hand and its ranking. This is a well-solved problem — use a lookup-table approach or a combinatorial evaluator.
- Betting validation: enforce minimum raises, all-in rules, blind posting
- Pot management: calculate main pot and side pots for all-in scenarios
- Dealer rotation between hands

**Client-Side Scene (`src/phaser/scenes/poker-scene.ts`):**
- Player's hole cards displayed face-up at bottom
- Opponent's hole cards shown as backs (revealed at showdown)
- 5 community card positions in center (revealed progressively)
- Pot display in center
- Player chip stacks and bet amounts next to avatars
- Action buttons: Fold, Check/Call, Raise (with slider or preset amounts)
- Bet sizing: slider from minimum raise to all-in, with preset buttons (½ pot, pot, all-in)
- Timer per action (30 seconds, configurable) — auto-fold on timeout
- Hand history log (collapsible sidebar)

**Key Technical Challenges:**
- Hand evaluation algorithm (must be fast and correct — evaluate all C(7,5) = 21 combinations)
- Side pot calculation when multiple all-ins occur
- Information hiding: server must never send opponent's hole cards until showdown
- Betting logic edge cases (heads-up blind structure, minimum raises, re-raises)

**Controls:**
- Desktop: Click action buttons, use slider for bet sizing, keyboard shortcuts (F=fold, C=check/call, R=raise)
- Mobile: Large touch buttons, simplified bet sizing with preset amounts

---

## Game 4: Texas Hold'em — Multi-Player (3-6 Players)

### Rules

Same as heads-up with these additions:

**Positions:** Dealer button rotates clockwise. Small blind is left of dealer, big blind is left of small blind. Action starts left of big blind pre-flop, left of dealer post-flop.

**Side Pots:** When a player goes all-in for less than the current bet, a side pot is created. Players can only win from pots they contributed to.

**Showdown:** Multiple players may be involved. Best hand among remaining players wins each pot.

### Implementation Plan

The multi-player version extends the heads-up `TexasHoldem` class:

**Server-Side Additions:**
- Support for 3-6 players in a single game instance
- Proper blind rotation with 3+ players
- Side pot calculations for multiple all-in players at different stack sizes
- Seat management: players can sit/stand, empty seats are skipped
- Late join: players can sit down between hands

**Client-Side Additions:**
- Circular table layout with 3-6 avatar positions
- Dynamic positioning based on number of seated players
- Multiple pot displays (main pot + side pots)
- Action indicator showing whose turn it is
- Fold animation (cards flip face down, avatar grays out)

**Key Technical Challenge:** Side pots with multiple all-ins. Example: Player A has 100 chips, Player B has 300, Player C has 500. All go all-in. Main pot = 300 (100 from each, A eligible). Side pot 1 = 400 (200 from B and C, B and C eligible). Side pot 2 = 200 (remaining from C, only C eligible). Each pot is awarded separately at showdown.

---

## Game 5 (Future): Blackjack

### Concept
Player vs. house (server-dealt). 1-3 players per table, each playing independently against the dealer. Standard rules: hit, stand, double down, split. Insurance on dealer ace. Blackjack pays 3:2.

### Why Later
Blackjack is player-vs-house, which doesn't fit the social player-vs-player model as well. It's a good addition for solo play or when waiting for opponents, but it's lower priority than the PvP games.

---

## Shared Game Infrastructure

### Game Base Class

All games inherit from a shared base class on the server:

```
BaseGame
├── players: Map<socketId, PlayerInfo>
├── state: GameState (enum)
├── startGame()
├── getSerializedState(forPlayer): object
├── handleAction(socketId, action, data): void
├── isGameOver(): boolean
├── getWinner(): PlayerInfo | null
├── reset(): void
```

Each game overrides these methods with its specific logic. The server's Socket.io handler dispatches actions to the appropriate game instance based on the room's game type.

### Shared Card Utilities

The existing `Card` class and deck utilities are reused across all card games. A shared module provides:
- Deck creation and shuffling (Fisher-Yates)
- Card comparison and sorting
- Suit and rank enums
- Card value calculations (configurable per game — Aces are 1 in Gin Rummy, 11/1 in Blackjack, high in Poker)

### State Serialization

Every game implements `getSerializedState(forPlayer)` which returns only the information that player is allowed to see. In Ratscrew, both players see the same thing (center pile, deck counts). In Poker, each player sees their own hole cards but not the opponent's. This function is the security boundary — it ensures the server never leaks hidden information.

### Anti-Cheat Measures

- All randomness (shuffling, dealing) happens server-side
- Clients cannot request specific cards or manipulate deck order
- Action timestamps are validated to prevent impossible speeds (e.g., slapping in Ratscrew before a card is visually played)
- Rate limiting on actions to prevent spam
- Game state checksums to detect client-side tampering
