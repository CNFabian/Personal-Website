# Development Roadmap

## Overview

This roadmap breaks the casino expansion and website improvements into manageable phases. Each phase produces a working, deployable state — nothing is half-built. The phases build on each other but are designed so that the site is usable and impressive at every stage.

---

## Phase 0: Foundation & Cleanup
**Estimated Effort:** 1-2 weeks
**Goal:** Clean up technical debt and prepare the codebase for expansion.

### Tasks

**0.1 — Consolidate Home Page**
- Resolve `new_home.js` vs `Home.js` — pick one, delete the other
- Ensure the chosen home page works cleanly on mobile and desktop

**0.2 — Migrate to Consistent TypeScript**
- Convert remaining `.js` page components to `.tsx`
- Ensure tsconfig covers all source files
- Fix any type errors surfaced by the migration

**0.3 — Organize CSS/SCSS**
- Move all stylesheets into a structured folder (`styles/pages/`, `styles/components/`, `styles/base/`)
- Consolidate duplicate styles
- Standardize on SCSS for all new stylesheets

**0.4 — Code Split the Game**
- Use `React.lazy()` to dynamically import the Egyptian Ratscrew page
- Verify that portfolio pages no longer bundle Phaser
- Measure bundle size before and after

**0.5 — Server Restructure**
- Extract route handlers from `server.js` into separate route files (`routes/auth.js`, `routes/leaderboard.js`)
- Add `express-rate-limit` middleware
- Add a migration system (simple SQL file runner) for database changes
- Rename `ratscrew.db` → `casino.db` (with data preservation)

**0.6 — Expand Database Schema**
- Run migration 002 to add new columns to `users` table
- Create new tables: `game_stats`, `game_sessions`, `game_session_players`, `transactions`, `friends`, `achievements`, `user_achievements`
- Seed achievement definitions
- Update `db.js` with new query functions

### Deliverable
A cleaner codebase with the same user-facing functionality, but a backend and database ready for expansion.

---

## Phase 1: Avatar System & Casino Entry
**Estimated Effort:** 2-3 weeks
**Goal:** Users can create avatars and enter a basic casino lobby.

### Tasks

**1.1 — Avatar Data Model**
- Add `avatar_data` column to users table (already in Phase 0 migration)
- API endpoints: `PUT /api/user/avatar` (save avatar), `GET /api/user/:id` (returns avatar with profile)

**1.2 — Avatar Creator UI (React)**
- Build the avatar creation component as a React overlay
- Implement layer-based customization: body, hair, face, clothing, accessories
- Real-time preview (canvas rendering of composite sprite)
- Default presets for quick selection
- Color tinting for customizable items
- Save to server on confirm

**1.3 — Avatar Sprite Assets**
- Create or source base sprite sheets for all avatar components
- Format: 32x48 per frame, 4 directions × 4 frames per sheet
- Minimum viable set: 3 bodies, 8 hair styles, 4 eyes, 6 tops, 4 bottoms, 4 hats
- Implement Phaser-side composite renderer

**1.4 — Casino Entry Route**
- New route: `/casino` that loads the casino section
- Auth gate: redirect to login if not authenticated
- Avatar gate: redirect to avatar creator if no avatar saved
- Navigation: update navbar to replace "Egyptian Ratscrew" with "Casino"

**1.5 — Basic Casino Lobby Scene (Phaser)**
- Create the tilemap for the casino floor (simple version — carpet, walls, a few tables)
- Player's avatar renders and moves (arrow keys / WASD / virtual joystick)
- Camera follows player
- Collision with walls and furniture
- Single-player only (no other players visible yet) — just the space to walk around

**1.6 — Existing Game Integration**
- Place an Egyptian Ratscrew table in the lobby
- Walking to it and interacting transitions to the existing game scene
- After the game ends, return to the lobby

### Deliverable
Users create an avatar, enter a casino lobby, walk around, and play Egyptian Ratscrew from within the casino environment. It's single-player in the lobby but multiplayer in the game (using existing room codes).

---

## Phase 2: Multiplayer Lobby & Chips
**Estimated Effort:** 2-3 weeks
**Goal:** Players see each other in the lobby and can wager chips.

### Tasks

**2.1 — Lobby Networking**
- Implement lobby Socket.io events: `joinLobby`, `leaveLobby`, `playerPosition`, `playerMoved`
- Server-side lobby manager tracks all connected players and their positions
- Broadcast position updates at 10Hz (batched)
- Client-side interpolation for smooth remote player movement

**2.2 — Multiplayer Lobby Rendering**
- Other players' avatars appear in the lobby in real-time
- Nameplates above each avatar (username)
- Players can walk past each other (no collision between players)

**2.3 — Table Matchmaking**
- Tables in the lobby have states: empty, waiting, in-progress
- Walking to a table and interacting shows a "Sit Down" prompt
- Sitting triggers server-side seat assignment
- Other players see the avatar move to the chair
- When both seats are filled, game starts automatically

**2.4 — Chip System**
- Implement chip balance on user accounts (1,000 starting chips)
- Daily bonus endpoint with streak tracking
- Bankruptcy relief endpoint
- Chip display in lobby UI (top-right corner)
- Transaction logging for all chip movements

**2.5 — Wagering**
- Pre-game wager selector appears when both players are seated
- Host proposes amount, opponent accepts/counters
- Escrow: chips deducted from both players, held by server
- On game end: winner receives pot, transactions logged
- On disconnect/forfeit: remaining player wins pot

**2.6 — Leaderboard Updates**
- Leaderboard now shows chip balance alongside wins
- Leaderboard wall in the lobby is interactive
- Game-specific leaderboards (most Ratscrew wins, highest chip balance, etc.)

### Deliverable
A live multiplayer casino lobby where players see each other, sit at tables, and play Egyptian Ratscrew for chips.

---

## Phase 3: Gin Rummy
**Estimated Effort:** 2-3 weeks
**Goal:** Add the second card game to the casino.

### Tasks

**3.1 — Server-Side Gin Rummy Logic**
- Implement `GinRummyGame` class extending `BaseGame`
- Deck, dealing, draw/discard, meld detection, knock/gin/undercut logic
- Score tracking across multiple rounds
- Match completion (first to 100 points)

**3.2 — Client-Side Gin Rummy Scene**
- Card hand display with drag-to-arrange
- Stock pile and discard pile
- Draw and discard interaction
- Meld grouping UI
- Knock/Gin buttons
- Score display and round history
- Avatar portraits and chip display

**3.3 — Lobby Integration**
- Add 2 Gin Rummy tables to the casino floor
- Same sit-down / matchmaking / wagering flow as Ratscrew
- Game-specific stats tracking

**3.4 — AI Opponent (Optional)**
- Simple AI that plays Gin Rummy for single-player practice
- Strategy: prioritize melds, discard high-deadwood cards, knock when able
- Not required for launch but improves the experience when no opponents are online

### Deliverable
Two games playable in the casino. Players choose between Ratscrew and Gin Rummy.

---

## Phase 4: Texas Hold'em (Heads-Up)
**Estimated Effort:** 3-4 weeks
**Goal:** Add poker — the flagship wagering game.

### Tasks

**4.1 — Poker Hand Evaluator**
- Implement hand ranking algorithm (evaluate best 5 from 7 cards)
- Cover all hand types: royal flush through high card
- Tiebreaking logic (kickers, suit irrelevant in Hold'em)
- Unit tests for all hand types and edge cases

**4.2 — Server-Side Hold'em Logic**
- Implement `HoldemHUGame` class
- Blind posting, dealing hole cards, community cards (flop/turn/river)
- Betting rounds with fold/check/call/raise/all-in
- Pot calculation, showdown, winner determination
- Hand rotation (dealer/blinds swap each hand)
- Session management (buy-in, cash-out, rebuy between hands)

**4.3 — Client-Side Poker Scene**
- Hole cards at bottom, opponent's card backs at top
- Community cards in center (revealed progressively with animation)
- Pot display, chip stacks, bet amounts
- Action buttons: Fold, Check/Call, Raise
- Bet sizing slider with preset buttons (½ pot, pot, all-in)
- Action timer (30 seconds per decision)
- Hand result animation (pot sliding to winner)

**4.4 — Lobby Integration**
- Add 2 heads-up Hold'em tables with different blind levels
- Buy-in flow: player selects how many chips to bring to the table
- Table min/max buy-in based on blind level

**4.5 — Hand History**
- Log every hand played (cards, actions, result)
- Players can review past hands from a history panel
- Useful for learning and detecting bugs

### Deliverable
A full poker experience. The casino now has three distinct games with chip wagering.

---

## Phase 5: Social Features & Polish
**Estimated Effort:** 2-3 weeks
**Goal:** Make the casino social and polished.

### Tasks

**5.1 — Friend System**
- Send/accept/decline friend requests by username
- Friends list panel in the casino UI
- Online/offline indicators
- "Challenge Friend" button: sends an invite to a specific game/table

**5.2 — Chat System**
- Global lobby chat (text-based, displayed in a collapsible panel)
- In-game chat (table-only during a game)
- Basic content filtering (profanity filter)
- Chat message rate limiting

**5.3 — Emotes**
- Quick-expression system: 6-8 preset emotes (thumbs up, clap, laugh, cry, thinking, angry)
- Triggered by hotkeys or a radial menu
- Displayed as animated icons above the avatar (brief duration)

**5.4 — Achievement System**
- Track achievement progress server-side
- Unlock notifications in the lobby
- Achievement panel in the casino UI
- Chip rewards for unlocking achievements

**5.5 — Visual Polish**
- Improved tilemap with decorative details (chandeliers, wall art, plants)
- Table animations (cards shuffling, chip stacking)
- Smooth scene transitions (fade in/out between lobby and games)
- Sound effects: ambient casino sounds, card dealing, chip clinking, slap sounds
- Background music: low-key jazz or lounge music (with mute toggle)

**5.6 — Mobile Polish**
- Virtual joystick refined for smooth touch movement
- All game UIs tested and adjusted for mobile viewports
- Touch-friendly bet sizing and card interaction
- Performance testing on mid-range mobile devices

### Deliverable
A polished, social casino experience that feels alive and engaging.

---

## Phase 6: Multi-Player Poker & Expansion
**Estimated Effort:** 3-4 weeks
**Goal:** Full multi-player poker table and future game infrastructure.

### Tasks

**6.1 — Multi-Player Hold'em**
- Extend poker logic for 3-6 players
- Blind rotation with multiple players
- Side pot calculations
- Circular table UI with dynamic player positioning

**6.2 — Spectator Mode**
- Players can watch games in progress from the lobby
- Spectator view shows appropriate information (no hole cards in poker until showdown)
- Spectator count displayed at tables

**6.3 — Private Tables**
- Room code system for private games (preserves existing functionality)
- Private tables visible in lobby but marked as locked
- Invite links: `cnfabian.com/casino/join/ABCD`

**6.4 — Tournament Mode (Stretch)**
- Bracket-style tournaments for any game type
- Fixed buy-in, increasing blinds (poker)
- Prize pool distribution (1st, 2nd, 3rd place)

**6.5 — Additional Games (Stretch)**
- Blackjack (player vs house)
- Spades (4-player teams)
- Any new game follows the BaseGame pattern

### Deliverable
The casino supports multi-player poker, spectating, and has infrastructure for adding new games indefinitely.

---

## Phase 7: Portfolio Improvements (Parallel Track)
**Can be done alongside any casino phase.**

### Tasks (prioritized)

**7.1 — SEO & Metadata** (1-2 days)
- Add Open Graph tags, meta descriptions, dynamic page titles
- Create sitemap.xml

**7.2 — Accessibility Pass** (2-3 days)
- Alt text, ARIA labels, keyboard navigation, color contrast audit

**7.3 — Performance Audit** (1-2 days)
- Lighthouse score, lazy-load images, font optimization

**7.4 — Projects Page Update** (1 day)
- Add casino as a featured project
- Add thumbnails and GitHub links

**7.5 — Error Pages** (half day)
- Custom 404 page
- Error boundary for React crashes

**7.6 — Contact Form Upgrade** (1 day)
- Validation, rate limiting, subject dropdown

---

## Timeline Summary

| Phase | Focus | Effort | Dependencies |
|-------|-------|--------|--------------|
| 0 | Foundation & Cleanup | 1-2 weeks | None |
| 1 | Avatar System & Casino Entry | 2-3 weeks | Phase 0 |
| 2 | Multiplayer Lobby & Chips | 2-3 weeks | Phase 1 |
| 3 | Gin Rummy | 2-3 weeks | Phase 2 |
| 4 | Texas Hold'em (Heads-Up) | 3-4 weeks | Phase 2 |
| 5 | Social Features & Polish | 2-3 weeks | Phase 2 |
| 6 | Multi-Player Poker & Expansion | 3-4 weeks | Phase 4 |
| 7 | Portfolio Improvements | Ongoing | None |

**Phases 3, 4, and 5 can be worked in parallel** after Phase 2 is complete. They don't depend on each other.

**Total estimated time to full casino (Phases 0-6):** 15-22 weeks of focused development.

**Minimum viable casino (Phases 0-2):** 5-8 weeks. This gets you a multiplayer lobby with avatars, chip wagering, and the existing Egyptian Ratscrew game. It's a real casino experience, even with just one game.

---

## What to Build First

If starting tomorrow, the priority order is:

1. **Phase 0** — Clean foundation. No shortcuts here. Technical debt now becomes structural problems later.
2. **Phase 1** — Avatar system and lobby are the visual wow factor. Even before multiplayer, walking around a casino floor with your custom character feels good.
3. **Phase 2** — Multiplayer lobby is the core innovation. Seeing other players changes everything.
4. **Phase 4** — Poker is the killer app for wagering. Gin Rummy is great but poker drives engagement.
5. **Phase 3** — Gin Rummy fills out the game roster.
6. **Phase 5** — Social features make players stay.
7. **Phase 6** — Multi-player poker and expansion for long-term growth.

Phase 7 (portfolio improvements) can happen anytime there's a break between casino work.
