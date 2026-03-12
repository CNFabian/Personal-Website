# Casino Game Plan

## The Big Picture

The casino is a self-contained world within the website. When a user navigates to the casino section, they leave the portfolio experience and enter a persistent multiplayer environment. They see their avatar on a casino floor, surrounded by other real players. They walk to a table, sit down, and play a card game for chips. The experience should feel like walking into a virtual poker room — social, competitive, and immersive.

---

## Experience Flow

### First-Time User Journey

1. **Entry Point** — User clicks "Enter Casino" from the main site navigation or from the existing Egyptian Ratscrew page (which becomes one game among many).

2. **Account Gate** — If not logged in, the user is prompted to log in or register. The existing JWT auth system handles this, but the UI moves from the current Phaser-rendered auth scene to a polished React-based auth flow that feels integrated with the casino theme.

3. **Avatar Creation** — First-time users are taken to an avatar builder. They choose a base sprite, customize appearance (hair style, hair color, skin tone, outfit, accessories), and confirm. The avatar is saved to their account. They can change it later from a settings menu.

4. **Casino Lobby** — The user spawns into the main casino floor. This is a top-down 2D Phaser scene with a tilemap. Other online players are visible as sprites walking around. The user moves with arrow keys (desktop) or a virtual joystick (mobile).

5. **Table Interaction** — Walking up to a table and pressing an interact key (or tapping on mobile) opens the game at that table. Tables are visually distinct and labeled: "Egyptian Ratscrew," "Gin Rummy," "Texas Hold'em," etc.

6. **Matchmaking** — Some tables are open (anyone can sit), some are private (room codes, like the current system). A player sitting at an open table waits for opponents. When enough players are seated, the game begins.

7. **Gameplay** — The game plays out in its own Phaser scene. The existing Egyptian Ratscrew game scene is the template. New games follow the same pattern: a dedicated scene with game-specific UI, backed by server-authoritative logic.

8. **Post-Game** — After the game ends, players see results, chip gains/losses, and options to rematch, return to the lobby, or challenge someone new.

### Returning User Journey

1. Log in (or auto-login via stored JWT)
2. Avatar loads from database
3. Spawn in casino lobby
4. Walk to a table or accept a friend's challenge
5. Play

---

## Casino Floor Layout

The lobby is a Phaser tilemap scene. The initial design is a single room (expandable later). Key elements:

**Floor** — Patterned carpet tiles in deep reds and golds, classic casino aesthetic.

**Tables** — Positioned around the room. Each table is a sprite or tile object with a collision zone and interaction prompt. Table types:

- 2 Egyptian Ratscrew tables (2-player)
- 2 Gin Rummy tables (2-player)
- 2 Texas Hold'em tables (2-player heads-up)
- 1 Texas Hold'em table (4-6 player)
- 1 Multi-player game table (future expansion)

**Bar/Lounge Area** — Decorative area where players can hang out. No gameplay function initially, but sets the mood and provides space for future social features (chat bubbles, emotes).

**Cashier/Bank Counter** — Where players manage their chip balance. Initially virtual currency only. The counter is a UI overlay triggered by interacting with the cashier sprite.

**Leaderboard Wall** — A decorative board in the lobby that displays top players. Replaces the current in-game leaderboard with a spatial, immersive version.

**Entrance/Exit** — A door sprite that transitions back to the main website.

---

## Game Table System

Each table in the lobby is a game host point. The table system works as follows:

**Table States:**
- **Empty** — No players seated. Table appears available (green indicator or open chairs).
- **Waiting** — One or more players seated, waiting for more. Other players can see this and choose to join.
- **In Progress** — Game is active. Table shows a "Game in Progress" indicator. Spectators may watch (future feature).

**Sitting Down:**
When a player interacts with a table, their avatar moves to a chair position. The server registers them as seated at that table. Other players in the lobby see the avatar sitting.

**Starting a Game:**
For 2-player games, the game starts when both seats are filled. For multi-player games, the host (first seated player) can start when minimum players are met. A countdown gives late joiners a window.

**Leaving a Table:**
A player can leave before the game starts freely. During a game, leaving forfeits (and loses their wager, if any). The existing 60-second disconnect grace period applies.

---

## Game Roster

### Currently Implemented
- **Egyptian Ratscrew** — 2-player, real-time slap card game. Fully functional with 8 configurable rules.

### Planned Games

**Gin Rummy (2 players)**
Classic card game of forming melds (sets and runs). Turn-based with draw/discard mechanics. Strategic depth without the real-time reaction element of Ratscrew.

**Texas Hold'em — Heads Up (2 players)**
Standard poker with community cards. Betting rounds (pre-flop, flop, turn, river). This is the core wagering game — chips flow naturally here.

**Texas Hold'em — Multi-Player (3-6 players)**
Same rules as heads-up but with multiple players, blinds rotation, side pots, and more complex betting. This is the flagship multiplayer experience.

**Future Considerations:**
- Blackjack (player vs house/dealer)
- Spades (4-player teams)
- War (simple 2-player)
- Slot machine (single-player, decorative/fun)

---

## Social Features

**Player Presence** — All online players are visible in the lobby. Their avatars move in real-time. Nameplates hover above sprites showing username and chip count.

**Friend System** — Add friends by username. See when friends are online. Direct-challenge friends to a specific game.

**Chat** — Text chat in the lobby (global or proximity-based). In-game chat during gameplay. Filtered for inappropriate content.

**Spectator Mode** — Watch ongoing games at occupied tables without participating. See cards being played in real-time (with appropriate information hiding for poker).

**Emotes** — Quick expressions (thumbs up, clap, laugh) triggered by hotkeys or buttons. Displayed as animated icons above the avatar.

---

## Integration With the Main Site

The casino is a distinct section of the website, accessible from the main navigation. The transition should feel intentional — the user is "entering" the casino rather than just loading another page.

**Navigation Changes:**
- The current "Egyptian Ratscrew" nav link becomes "Casino" or "Game Room"
- The Egyptian Ratscrew page becomes a route within the casino ecosystem
- Direct links to specific games still work (for sharing with friends)

**Portfolio Showcase:**
The casino itself becomes a portfolio piece on the Projects page, demonstrating real-time multiplayer networking, game development, avatar systems, and virtual economies.

**Shared Authentication:**
The same user account works across the portfolio and casino. A user who registers to play games can also leave a message on the contact form. The auth system is unified.

---

## Design Principles

1. **Server Authority** — All game logic runs on the server. Clients send actions, server validates and broadcasts state. No client can cheat.

2. **Scene Isolation** — Each game is its own Phaser scene with its own logic module. Adding a new game means adding a new scene and a new server-side game class. The lobby doesn't need to change.

3. **Progressive Enhancement** — The casino starts simple (lobby + existing game) and grows. Each phase adds one or two games and one or two features. Nothing is blocked on everything else being done.

4. **Mobile-First** — Every game and the lobby must work on mobile. The existing responsive design pattern (desktop landscape vs mobile portrait) continues.

5. **Fun First, Money Later** — Virtual chips with no real-money connection come first. The wagering system is designed so that real money could plug in later, but nothing depends on it.
