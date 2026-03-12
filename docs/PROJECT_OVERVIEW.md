# Christopher Fabian — Personal Website & Casino Platform

## Project Overview

This project is a dual-purpose platform: a professional portfolio website showcasing Christopher Fabian's work, skills, and personality, and an evolving multiplayer gaming platform anchored by a casino-themed experience. The site is hosted on AWS Amplify at **cnfabian.com** with a Node.js backend powering real-time multiplayer gameplay.

---

## What Exists Today

### The Portfolio Side

The website currently serves as an interactive personal portfolio with six main sections:

**Home Page** — A gamified landing page with character-selection UI. Three versions of Chris (casual developer, hobbyist, all-business professional) are presented with RPG-style stats and abilities. The page includes a recent projects showcase, animated tech stack icons, and a profile section with four illustrated personality traits (creativity, programming, data analysis, reading).

**About Page** — A personal storytelling page with interactive image tooltips. Photos from Yosemite hiking, family fishing trips, artwork, and Chris's cat Chow are paired with hover-activated descriptions. The page includes hidden underlined letters spelling "HIDDEN" — a clue for the puzzle system.

**Projects Page** — A timeline-style portfolio covering professional work: Egyptian Ratscrew (Phaser 3 game), Nest Navigate (educational homebuyer platform), Pantry Pal (AI-powered kitchen management PWA), CASA nonprofit website redesign, AI Image Captioning (AWS Lambda + Hugging Face), and prior roles at Leading Edge Construction, UC Merced, and Sunburst Agri Biotech.

**Contact Page** — A form (name, subject, message) that submits to Google Apps Script.

**Resume Page** — An embedded PDF viewer displaying the current resume.

**Secret/Puzzle System** — Three interconnected puzzles (Magic Square, Consecutive Number Puzzle, Hidden Code) that feed clues into a password-protected Secret page. Solving all three reveals a final message. A 30-minute countdown timer adds urgency.

### The Game Side

**Egyptian Ratscrew** is a fully implemented multiplayer card game built with Phaser 3 and TypeScript on the frontend and Node.js/Socket.io on the backend. It features:

- Local single-player and online multiplayer modes
- 8 configurable slap rules (doubles, sandwich, tens, marriage, top-bottom, four-in-row, sequence, jokers)
- Face card challenge mechanics (Ace=4, King=3, Queen=2, Jack=1 chances)
- Room-based matchmaking with 4-character room codes
- Server-authoritative game logic (prevents cheating)
- JWT authentication with optional guest mode
- SQLite persistence for user accounts, win tracking, and leaderboards
- Responsive design for both desktop (1200x800) and mobile (600x1000)
- 60-second disconnect tolerance with automatic room cleanup

### Footer & Personality Elements

The footer features five animated character sprites (Zenitsu from Demon Slayer, Venom, Bowser Jr., Patrick Star, Solo Leveling character) with idle and hover animations. Social links connect to GitHub, LinkedIn, and Instagram.

---

## The Vision: Where This Is Going

The long-term goal is to transform the gaming section into a full **casino ecosystem** where users create persistent avatars, enter a shared virtual lobby, walk around a casino floor, sit at tables, and play card games against friends and strangers — all with a wagering system.

The portfolio side of the site will continue to evolve in parallel with design polish, new project showcases, and improved user experience.

### Core Pillars of the Casino Vision

1. **Avatar System** — Users create and customize a character sprite that persists across sessions, saved to their account. Default presets plus custom options (hair, clothing, accessories, colors).

2. **Casino Lobby** — A top-down 2D world (Phaser tilemap) representing a casino floor. Players see other users' avatars moving in real-time. Tables are scattered across the floor, each hosting a different game.

3. **Multiple Card Games** — Egyptian Ratscrew (already built), Gin Rummy, Texas Hold'em (heads-up and multi-player variants), and potentially more. Each game is a separate Phaser scene with its own server-side logic module.

4. **Virtual Currency & Wagering** — A chip-based economy where players wager against each other. Initially virtual (earned through play), with a long-term aspiration toward real-money integration (pending legal/regulatory research).

5. **Social Features** — Friend lists, direct challenges, spectator mode, chat, and presence indicators showing who's online.

---

## Document Index

| Document | Purpose |
|----------|---------|
| [CASINO_GAME_PLAN.md](./CASINO_GAME_PLAN.md) | High-level casino ecosystem design and feature breakdown |
| [AVATAR_SYSTEM.md](./AVATAR_SYSTEM.md) | Character creation, customization, sprite system, and persistence |
| [GAME_DESIGNS.md](./GAME_DESIGNS.md) | Rules, logic, and implementation plans for each card game |
| [LOBBY_AND_MULTIPLAYER.md](./LOBBY_AND_MULTIPLAYER.md) | Casino lobby world design, real-time networking, table system |
| [CURRENCY_AND_WAGERING.md](./CURRENCY_AND_WAGERING.md) | Virtual economy, chip system, wagering mechanics, and future real-money considerations |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Expanded data model for avatars, games, currency, and social features |
| [WEBSITE_IMPROVEMENTS.md](./WEBSITE_IMPROVEMENTS.md) | Portfolio site enhancements, design polish, and UX improvements |
| [TECH_STACK_AND_ARCHITECTURE.md](./TECH_STACK_AND_ARCHITECTURE.md) | System architecture, infrastructure, and technology decisions |
| [ROADMAP.md](./ROADMAP.md) | Phased development timeline with milestones and priorities |

---

## Tech Stack Summary

**Frontend:** React 18, TypeScript, Phaser 3, SASS, GSAP, Three.js/React Three Fiber, Socket.io Client

**Backend:** Node.js, Express, Socket.io, SQLite (better-sqlite3), JWT, bcryptjs

**Hosting:** AWS Amplify (frontend), separate server for Socket.io/Express backend

**Domain:** cnfabian.com (with ws.cnfabian.com for WebSocket connections)
