# Tech Stack & Architecture

## Overview

This document describes the current and planned system architecture, the rationale behind technology choices, and how all the pieces connect.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │           React 18 Application               │   │
│  │                                              │   │
│  │  Portfolio Pages     Egyptian Ratscrew       │   │
│  │  (React Components)  (Phaser 3 Canvas)      │   │
│  │  - Home              - 6 Scenes             │   │
│  │  - About             - Socket.io Client     │   │
│  │  - Projects          - TypeScript           │   │
│  │  - Contact                                  │   │
│  │  - Resume                                   │   │
│  │  - Secret/Puzzles                           │   │
│  └──────────────┬──────────────┬───────────────┘   │
│                 │              │                     │
│            HTTP REST     Socket.io WS               │
│                 │              │                     │
└─────────────────┼──────────────┼────────────────────┘
                  │              │
                  ▼              ▼
┌─────────────────────────────────────────────────────┐
│              SERVER (Node.js, Port 3001)             │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────┐      │
│  │ Express.js   │    │ Socket.io            │      │
│  │ REST API     │    │ Real-time Events     │      │
│  │              │    │                      │      │
│  │ /api/auth/*  │    │ Room Management      │      │
│  │ /api/leader* │    │ Game State Sync      │      │
│  │ /api/user/*  │    │ Disconnect Handling  │      │
│  └──────┬───────┘    └──────────┬───────────┘      │
│         │                       │                   │
│         ▼                       ▼                   │
│  ┌──────────────────────────────────────────┐      │
│  │           SQLite Database                 │      │
│  │           (ratscrew.db)                   │      │
│  │                                           │      │
│  │  users: id, username, password_hash,      │      │
│  │         wins, created_at                  │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌──────────────────────────────────────────┐      │
│  │           Game Logic Modules              │      │
│  │           (Server-Authoritative)          │      │
│  │                                           │      │
│  │  gameLogic.js (RatScrew engine)          │      │
│  └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘

HOSTING:
  Frontend → AWS Amplify (cnfabian.com)
  Backend  → Separate server (ws.cnfabian.com)
```

---

## Planned Architecture (Casino Expansion)

```
┌───────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser)                        │
│                                                               │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │   Portfolio Section      │  │   Casino Section            │ │
│  │   (React Components)     │  │                             │ │
│  │   - Home                 │  │   React Overlays:           │ │
│  │   - About                │  │   - Avatar Creator          │ │
│  │   - Projects             │  │   - Cashier Panel           │ │
│  │   - Contact              │  │   - Chat Window             │ │
│  │   - Resume               │  │   - Notifications           │ │
│  │   - Secret/Puzzles       │  │   - Settings                │ │
│  │                           │  │                             │ │
│  │   (Lazy-loaded,           │  │   Phaser 3 Canvas:          │ │
│  │    no Phaser dependency)  │  │   - Casino Lobby Scene      │ │
│  │                           │  │   - Ratscrew Game Scene     │ │
│  └─────────────────────────┘  │   - Gin Rummy Game Scene    │ │
│                                │   - Poker Game Scene        │ │
│                                │   - Avatar Preview          │ │
│                                │                             │ │
│                                │   Socket.io Client:          │ │
│                                │   - Lobby position sync      │ │
│                                │   - Table state sync         │ │
│                                │   - Game state sync          │ │
│                                │   - Chat messaging           │ │
│                                │   - Friend presence          │ │
│                                └────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │               Shared Services                             │ │
│  │  - Auth (JWT stored in localStorage)                      │ │
│  │  - React Router (portfolio vs casino routes)              │ │
│  │  - State Management (React Context or Zustand)            │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                    │                    │
               HTTP REST           Socket.io WS
                    │                    │
                    ▼                    ▼
┌───────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js)                          │
│                                                               │
│  ┌─────────────────────┐   ┌──────────────────────────────┐ │
│  │   Express REST API   │   │   Socket.io Event Handlers   │ │
│  │                      │   │                              │ │
│  │   Auth:              │   │   Lobby Namespace:           │ │
│  │   POST /auth/register│   │   - joinLobby / leaveLobby  │ │
│  │   POST /auth/login   │   │   - playerPosition          │ │
│  │   GET  /auth/me      │   │   - sitAtTable / leaveTable  │ │
│  │                      │   │   - tableStateUpdate         │ │
│  │   User:              │   │                              │ │
│  │   GET  /user/:id     │   │   Game Namespace:            │ │
│  │   PUT  /user/avatar  │   │   - createRoom / joinRoom   │ │
│  │   GET  /user/stats   │   │   - startGame               │ │
│  │                      │   │   - playCard / attemptSlap   │ │
│  │   Economy:           │   │   - fold / call / raise      │ │
│  │   GET  /chips        │   │   - draw / discard / knock   │ │
│  │   POST /daily-bonus  │   │   - gameStateUpdate          │ │
│  │   GET  /transactions │   │                              │ │
│  │                      │   │   Social Namespace:          │ │
│  │   Social:            │   │   - chatMessage              │ │
│  │   GET  /friends      │   │   - friendRequest            │ │
│  │   POST /friends/add  │   │   - presenceUpdate           │ │
│  │   GET  /leaderboard  │   │                              │ │
│  │   GET  /achievements │   │                              │ │
│  └──────────┬───────────┘   └──────────────┬───────────────┘ │
│             │                              │                  │
│             ▼                              ▼                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Data Layer                             │ │
│  │                                                           │ │
│  │   SQLite Database (casino.db)                             │ │
│  │   - users (extended with avatar, chips, stats)            │ │
│  │   - game_stats (per-game-type aggregates)                │ │
│  │   - game_sessions (individual game records)              │ │
│  │   - game_session_players (player-game junction)          │ │
│  │   - transactions (chip ledger)                           │ │
│  │   - friends (social graph)                               │ │
│  │   - achievements / user_achievements                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                  Game Logic Modules                        │ │
│  │                                                           │ │
│  │   BaseGame (abstract)                                     │ │
│  │   ├── RatScrewGame   (server/games/ratscrew.js)          │ │
│  │   ├── GinRummyGame   (server/games/ginRummy.js)          │ │
│  │   ├── HoldemHUGame   (server/games/holdemHU.js)          │ │
│  │   └── HoldemMultiGame(server/games/holdemMulti.js)       │ │
│  │                                                           │ │
│  │   Shared Utilities:                                       │ │
│  │   ├── card.js         (Card class, deck builder)         │ │
│  │   ├── handEvaluator.js(Poker hand ranking)               │ │
│  │   └── meldDetector.js (Gin Rummy meld finding)           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                  Lobby Manager                            │ │
│  │                                                           │ │
│  │   - Tracks all connected lobby players                    │ │
│  │   - Manages table states (empty/waiting/in_progress)     │ │
│  │   - Broadcasts position updates                          │ │
│  │   - Handles matchmaking                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## Technology Choices & Rationale

### Why Keep Phaser 3

Phaser is already integrated, the Egyptian Ratscrew game is built on it, and it's well-suited for 2D top-down games. The casino lobby (tilemap + sprites + animation) is a natural fit. Phaser handles rendering, input, camera, physics (simple collision), and sprite animation out of the box. Switching to a different engine would mean rewriting the existing game.

### Why Keep Socket.io

Socket.io is already handling real-time multiplayer. It supports rooms (perfect for game tables), namespaces (can separate lobby events from game events), automatic reconnection, and fallback to long-polling. For the expected user scale (< 200 concurrent), Socket.io on a single server is more than sufficient.

### Why Keep SQLite

SQLite is lightweight, requires no separate server process, and handles the expected load easily. The expanded schema adds several tables but the query patterns are simple (lookup by ID, insert transactions, aggregate stats). SQLite's WAL mode supports concurrent reads with single-writer, which is fine for this use case. If the platform grows past ~1,000 concurrent users, migrating to PostgreSQL is straightforward (the SQL is standard).

### React + Phaser Integration

The pattern remains the same: React owns the page layout, routing, and overlay UI (avatar creator, chat panel, settings). Phaser owns the game canvas (lobby scene, game scenes). They communicate through a shared event bus or callback props. The Phaser game instance is mounted inside a React component and destroyed on unmount.

### State Management

**Current:** Local state in Phaser scenes + localStorage for auth tokens.

**Planned:** Add a lightweight global state manager for the casino section. Options:
- **React Context** — Simple, no extra dependency. Fine for auth state, user profile, and chip balance.
- **Zustand** — Minimal, fast, good for cross-component state. Better than Context if many components need to read casino state without causing unnecessary re-renders.

Recommendation: Use React Context for auth/user data (already implicit in the current design). If the casino UI gets complex (many overlays reading game state), introduce Zustand.

---

## File Structure (Planned)

```
Personal-Website/
├── src/
│   ├── pages/
│   │   ├── Home.js (or new_home.js — consolidate)
│   │   ├── About.js
│   │   ├── Projects.js
│   │   ├── Contact.js
│   │   ├── Resume.js
│   │   ├── Secret.js
│   │   ├── Puzzle1.js, Puzzle2.js, Puzzle3.js
│   │   └── Casino.tsx            ← NEW: Casino entry point
│   │
│   ├── casino/                   ← NEW: Casino-specific code
│   │   ├── components/
│   │   │   ├── AvatarCreator.tsx
│   │   │   ├── CashierPanel.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── GameTable.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── FriendsList.tsx
│   │   │   └── WagerSelector.tsx
│   │   ├── context/
│   │   │   ├── CasinoContext.tsx  (user state, chip balance, etc.)
│   │   │   └── SocketContext.tsx  (shared socket connection)
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   ├── useChips.ts
│   │   │   └── useLobbyPlayers.ts
│   │   └── styles/
│   │       ├── casino.scss
│   │       ├── avatar-creator.scss
│   │       └── cashier.scss
│   │
│   ├── phaser/
│   │   ├── scenes/
│   │   │   ├── preload-scene.ts
│   │   │   ├── menu-scene.ts      (may be removed or repurposed)
│   │   │   ├── auth-scene.ts      (replaced by React auth flow)
│   │   │   ├── lobby-scene.ts     (current text lobby → deprecated)
│   │   │   ├── casino-lobby-scene.ts    ← NEW
│   │   │   ├── game-scene.ts      (Ratscrew — rename for clarity)
│   │   │   ├── gin-rummy-scene.ts       ← NEW
│   │   │   ├── poker-scene.ts           ← NEW
│   │   │   └── rules-scene.ts
│   │   ├── lib/
│   │   │   ├── card.ts
│   │   │   ├── ratscrew.ts
│   │   │   ├── avatar-renderer.ts       ← NEW
│   │   │   └── lobby-player.ts          ← NEW
│   │   ├── assets/
│   │   │   ├── tilemaps/               ← NEW (casino floor tilemap)
│   │   │   ├── avatars/                ← NEW (avatar sprite sheets)
│   │   │   └── ui/                     ← NEW (buttons, icons)
│   │   └── common.ts
│   │
│   ├── components/              (shared React components)
│   │   ├── Navbar/
│   │   ├── Footer/
│   │   └── ...
│   │
│   └── App.js                   (routing: portfolio + casino)
│
├── server/
│   ├── server.js                (main entry — Express + Socket.io)
│   ├── db.js                    (expanded with new tables/queries)
│   ├── middleware/
│   │   └── auth.js              ← NEW (JWT verification middleware)
│   ├── routes/
│   │   ├── auth.js              ← NEW (extracted from server.js)
│   │   ├── user.js              ← NEW (avatar, stats, friends)
│   │   ├── economy.js           ← NEW (chips, transactions, daily bonus)
│   │   └── leaderboard.js       ← NEW (extracted from server.js)
│   ├── games/
│   │   ├── BaseGame.js          ← NEW
│   │   ├── ratscrew.js          (renamed from gameLogic.js)
│   │   ├── ginRummy.js          ← NEW
│   │   ├── holdemHU.js          ← NEW
│   │   └── holdemMulti.js       ← NEW
│   ├── lobby/
│   │   └── lobbyManager.js      ← NEW (player positions, table states)
│   ├── utils/
│   │   ├── card.js              (shared card class)
│   │   ├── handEvaluator.js     ← NEW (poker hand ranking)
│   │   └── meldDetector.js      ← NEW (gin rummy melds)
│   ├── migrations/
│   │   ├── 001_initial.sql
│   │   └── 002_casino_expansion.sql  ← NEW
│   └── data/
│       └── casino.db            (renamed from ratscrew.db)
│
├── docs/                        ← NEW (this documentation)
│   ├── PROJECT_OVERVIEW.md
│   ├── CASINO_GAME_PLAN.md
│   ├── AVATAR_SYSTEM.md
│   ├── GAME_DESIGNS.md
│   ├── LOBBY_AND_MULTIPLAYER.md
│   ├── CURRENCY_AND_WAGERING.md
│   ├── DATABASE_SCHEMA.md
│   ├── WEBSITE_IMPROVEMENTS.md
│   ├── TECH_STACK_AND_ARCHITECTURE.md
│   └── ROADMAP.md
│
├── public/
├── package.json
├── tsconfig.json
└── amplify.yml

```

---

## Deployment Considerations

### Current Setup
- Frontend builds via `yarn build` and deploys to AWS Amplify
- Backend runs on a separate server (presumably EC2 or similar) at ws.cnfabian.com

### Changes Needed

**Frontend Bundle Size:** With Phaser, multiple game scenes, and tilemap assets, the bundle will grow. Mitigation:
- Code split the casino section (`React.lazy(() => import('./pages/Casino'))`)
- Load tilemap and sprite assets via Phaser's loader (not bundled with JS)
- Use dynamic imports for game-specific logic

**Backend Load:** More socket events (lobby positions at 10/sec per player) increase server load. At 50 concurrent lobby players, that's 500 messages/sec inbound. Mitigation:
- Batch position broadcasts (collect all position updates, broadcast once per 100ms tick)
- Only send delta updates (changed positions, not all positions)
- Consider a dedicated game server process if the portfolio API and game server need separation

**Static Assets:** Avatar sprite sheets, tilemap images, and card assets are additional static files. Serve them from the CDN (Amplify's CloudFront) with long cache headers (already configured in amplify.yml for 1 year on static assets).

**Database Backups:** With real user data, chip balances, and game history, the SQLite database becomes important to back up. Add a cron job that copies the .db file to S3 daily. Alternatively, move to a managed database (RDS PostgreSQL) for automatic backups.

---

## Security Considerations

**Authentication:** JWT with 30-day expiry is fine for a personal project. Consider adding refresh tokens for better security. Never store JWTs in cookies without httpOnly/secure flags.

**Input Validation:** All user inputs (usernames, chat messages, avatar data) must be sanitized on the server. Prevent XSS in chat messages. Validate avatar JSON against a schema to prevent arbitrary data injection.

**Rate Limiting:** Add express-rate-limit to API endpoints. Prevent brute-force login attempts, chat spam, and rapid game actions.

**Game Integrity:** Server-authoritative game logic is already in place. Extend this to all new games. Never trust client-reported game results.

**CORS:** Currently configured for cnfabian.com and localhost. Keep it tight — only allow origins that should access the API.
