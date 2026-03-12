# Casino Lobby & Multiplayer Networking

## Overview

The casino lobby is the centerpiece of the multiplayer experience. It's a top-down 2D world where players see each other in real-time, walk around a casino floor, and interact with game tables. This document covers the lobby's visual design, movement system, real-time networking, table interaction flow, and how it all ties into the existing Socket.io infrastructure.

---

## Lobby Scene Design

### Visual Style

The lobby is a Phaser tilemap rendered in a top-down RPG perspective. The art style is pixel art, consistent with the avatar sprites (32x48 character tiles on a 32x32 world tile grid).

**Color Palette:**
- Deep red carpet with gold pattern (floor tiles)
- Dark wood and green felt (game tables)
- Warm amber lighting (decorative wall sconces, chandeliers)
- Gold and brass accents (railings, signage, trim)
- Dark walls with wainscoting

**Room Dimensions:**
- Initial size: 40x30 tiles (1280x960 pixels at 32px/tile)
- Camera follows the player's avatar, showing a viewport-sized portion
- Desktop viewport: ~1200x800 (shows most of the room)
- Mobile viewport: ~600x1000 (portrait, sees less horizontally)

### Map Elements

**Game Tables:**
Each table is a multi-tile object (3x2 tiles) with chairs around it. A subtle glow or label identifies the game type. Tables have interaction zones — when a player's avatar overlaps the zone, an "interact" prompt appears.

Table layout (approximate positions):
```
┌──────────────────────────────────────────┐
│  ┌─────┐                    ┌─────┐      │
│  │LEADER│    ┌─────────┐    │ BAR │      │
│  │BOARD │    │  MULTI  │    │     │      │
│  └─────┘    │ HOLD'EM │    └─────┘      │
│             └─────────┘                  │
│                                          │
│  ┌───────┐              ┌───────┐        │
│  │ RAT   │              │ GIN   │        │
│  │ SCREW │              │ RUMMY │        │
│  │  #1   │              │  #1   │        │
│  └───────┘              └───────┘        │
│                                          │
│  ┌───────┐              ┌───────┐        │
│  │ RAT   │    ┌────┐    │ GIN   │        │
│  │ SCREW │    │CASH│    │ RUMMY │        │
│  │  #2   │    │ IER│    │  #2   │        │
│  └───────┘    └────┘    └───────┘        │
│                                          │
│  ┌───────┐              ┌───────┐        │
│  │HOLD'EM│              │HOLD'EM│        │
│  │ HU #1 │              │ HU #2 │        │
│  └───────┘              └───────┘        │
│                                          │
│              ┌──────┐                    │
│              │ DOOR │                    │
│              └──────┘                    │
└──────────────────────────────────────────┘
```

**Decorative Elements:**
- Slot machine sprites along walls (non-functional initially, could become playable later)
- Potted plants and velvet rope dividers
- Chandelier sprites on the ceiling layer
- Wall-mounted TVs showing leaderboard stats (decorative)

**Functional Elements:**
- **Cashier Counter:** Interacting opens the chip management overlay (deposit/withdraw virtual currency)
- **Leaderboard Wall:** Interacting opens a detailed leaderboard view
- **Exit Door:** Returns to the main website
- **Settings Kiosk:** Edit avatar, change display name, manage account

---

## Player Movement

### Desktop Controls
- **Arrow Keys** or **WASD**: Move in 4 directions (up, down, left, right)
- **E** or **Enter**: Interact with nearby objects (tables, cashier, leaderboard)
- **Tab**: Open inventory/settings overlay
- Movement speed: 3 tiles per second (96 pixels/second)
- Smooth pixel movement (not tile-locked) for fluid feel

### Mobile Controls
- **Virtual Joystick:** A thumb-controlled joystick in the bottom-left corner of the screen. Uses a Phaser plugin or custom implementation (inner circle within outer circle, drag to move in any direction).
- **Interact Button:** A prominent button in the bottom-right that appears when near an interactable object.
- Same movement speed as desktop.

### Collision
- Walls and furniture have collision bodies
- Other players do NOT block each other (they can walk through each other). This prevents griefing and traffic jams.
- Tables block movement — players must walk around them

### Camera
- Phaser camera follows the player with smooth damping
- Camera stays within map bounds (no showing black void beyond edges)
- Zoom level adjusts between desktop and mobile to show appropriate amount of space

---

## Real-Time Networking

### Architecture Extension

The existing Socket.io server handles room-based game communication. The lobby extends this with a new "lobby" namespace or event set.

**New Socket Events — Lobby:**

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `joinLobby` | Client→Server | `{ userId, avatarData }` | Player enters the casino lobby |
| `leaveLobby` | Client→Server | — | Player exits the lobby (goes to game or leaves) |
| `playerPosition` | Client→Server | `{ x, y, direction, isMoving }` | Player reports their position |
| `lobbyState` | Server→Client | `{ players: [...], tables: [...] }` | Full lobby state on join |
| `playerJoinedLobby` | Server→Clients | `{ userId, username, avatarData, x, y }` | New player appears |
| `playerLeftLobby` | Server→Clients | `{ userId }` | Player disappears |
| `playerMoved` | Server→Clients | `{ userId, x, y, direction, isMoving }` | Player position update |
| `tableStateUpdate` | Server→Clients | `{ tableId, state, players }` | Table occupancy changed |
| `sitAtTable` | Client→Server | `{ tableId }` | Player sits at a game table |
| `leaveTable` | Client→Server | `{ tableId }` | Player stands up from table |

### Position Broadcasting

Players send their position to the server at a fixed interval (10 updates per second / 100ms). The server rebroadcasts to all other lobby clients. To reduce bandwidth:

**Client-Side Interpolation:** Clients receive position updates from the server and smoothly interpolate between known positions. This hides the 100ms gaps between updates and makes other players' movement look fluid.

**Dead Reckoning:** If an update is late, the client predicts where the player would be based on their last known velocity and direction. When the real update arrives, it corrects smoothly.

**Delta Compression:** Only send position updates when the player has actually moved. Idle players don't generate traffic.

**Area of Interest (Future Optimization):** If the casino expands to multiple rooms, players only receive updates for avatars in their current room/area.

### Player Capacity

**Target: 20-50 concurrent lobby players.** This is manageable for a single Socket.io server. Each player generates ~10 small messages per second while moving (< 100 bytes each). At 50 players all moving simultaneously, that's ~50KB/s of broadcast traffic — well within limits.

If the platform grows beyond this, options include: spatial partitioning (only broadcast nearby players), dedicated lobby servers, or upgrading to a more efficient binary protocol (e.g., Protobuf over WebSocket).

---

## Table Interaction Flow

### Walking Up to a Table

1. Player's avatar enters the table's interaction zone (a rectangular area around the table, ~2 tiles larger than the table itself).
2. An "interact" prompt appears: "Press E to sit" (desktop) or a glowing button appears (mobile).
3. Player presses interact.

### Sitting Down

4. Client sends `sitAtTable` with the table ID.
5. Server validates: Is there an open seat? Is the player eligible (enough chips for minimum bet if wagering)?
6. Server assigns the player to a seat and broadcasts `tableStateUpdate` to all lobby players.
7. The player's avatar smoothly moves to the chair position and plays a "sitting" animation.
8. A mini-UI overlay appears showing: who else is at the table, the game type, rules/settings, and a "Ready" button.

### Waiting for Opponents

9. The seated player sees a waiting screen. Their avatar is visible at the table to lobby players.
10. Other lobby players see the table's state change (e.g., "1/2 players" for a 2-player game).
11. When another player sits, both see each other in the table UI.

### Starting the Game

12. For 2-player games: the game auto-starts when both seats are filled (after a short countdown).
13. For multi-player games: the host (first seated) can configure settings and press "Start" once minimum players are met.
14. The Phaser scene transitions from the lobby scene to the game scene.
15. The game proceeds using the existing room-based Socket.io communication pattern.

### Returning to Lobby

16. After the game ends, players see results and options: Rematch, Return to Lobby, or New Table.
17. Choosing "Return to Lobby" transitions back to the lobby scene. The player spawns near the table they just left.

---

## Room Code System (Retained)

The existing room code system (4-character codes for private games) is preserved alongside the lobby-based matchmaking. Use cases:

- **Friends not in the lobby:** Share a room code via text/Discord to join a specific table directly without navigating the lobby.
- **Private tables:** A player can create a "private" table in the lobby that requires a room code to join. The table appears occupied but not joinable without the code.
- **Direct links:** `cnfabian.com/casino/join/ABCD` takes the user directly to a game room, bypassing the lobby. Useful for sharing with friends.

---

## Lobby UI Overlays

These are React-based overlays rendered on top of the Phaser canvas:

**Player Nameplate (Phaser):** Rendered as Phaser text above each avatar. Shows username. Optionally shows title badge and chip count.

**Mini-Map (Future):** A small overview of the casino floor in the corner, showing dots for players and table locations.

**Chat Panel (React Overlay):** A collapsible chat window in the bottom-left (desktop) or accessible via button (mobile). Global lobby chat with message history. In-game chat switches to table-only.

**Notification Toasts (React Overlay):** "Player X challenged you to Hold'em!" or "Your friend Y is online!" appear as temporary notifications.

**Table Info Tooltip (Phaser):** When hovering near a table, a tooltip shows: game type, current players, minimum/maximum bet, and status (open/in progress).

---

## Scalability Considerations

### Short-Term (< 50 players)
Single Socket.io server handles everything. All lobby players in one broadcast group. Simple and sufficient.

### Medium-Term (50-200 players)
Introduce Socket.io rooms for the lobby itself. Players in the lobby join a "lobby" room. Table-based games use separate rooms (already implemented). Consider reducing position update frequency to 5/second.

### Long-Term (200+ players)
Split into multiple casino "rooms" or "floors" (lobby instances). Players choose a floor to join. Each floor is a separate Socket.io room with its own broadcast group. A load balancer distributes players across floors. Alternatively, move to a dedicated game server framework (like Colyseus) for more efficient state sync.

---

## Transition From Current System

The existing Egyptian Ratscrew flow is:

```
Menu Scene → Auth Scene → Lobby Scene (room codes) → Game Scene
```

The new casino flow is:

```
Main Site → Casino Entry → Auth (if needed) → Avatar Creation (if first time) → Casino Lobby → Walk to Table → Game Scene
```

The old room-code lobby becomes a "Join via Code" option in the casino UI, accessible from a menu or the cashier area. The new spatial lobby is the primary matchmaking path.

The transition should be gradual: Phase 1 keeps the current flow intact while building the lobby scene alongside it. Phase 2 makes the lobby the default entry point. Phase 3 deprecates the old text-based lobby.
