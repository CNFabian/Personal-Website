# Avatar System

## Overview

Every casino user has a persistent avatar — a customizable 2D character sprite that represents them in the lobby and at game tables. The avatar is created during first login and saved to the user's account. It can be updated anytime from a settings panel.

The system ties into the existing home page's character-selection aesthetic (the three versions of Chris with RPG stats), extending that concept into a full creation tool where every user builds their own character.

---

## Avatar Components

An avatar is composed of layered sprite parts. Each part has multiple options. The layers render bottom-to-top:

### Base Layer — Body
- **Skin Tone:** 8-10 preset skin tones (light to dark spectrum)
- **Body Type:** 2-3 base body shapes (slim, medium, broad) — kept simple for sprite readability at small sizes
- **Gender Presentation:** Masculine, feminine, neutral silhouettes — or a single androgynous base with clothing doing the differentiation

### Layer 2 — Hair
- **Style:** 12-16 hairstyles (short crop, medium length, long, ponytail, afro, mohawk, bald, buzz cut, curly, straight, braids, etc.)
- **Color:** Full color picker or 12 preset colors (black, brown, blonde, red, gray, white, blue, green, pink, purple, orange, teal)

### Layer 3 — Face
- **Eyes:** 6-8 eye styles (round, narrow, wide, glasses, sunglasses, eye patch)
- **Expression:** Default neutral. Emotes change expression temporarily during gameplay.

### Layer 4 — Clothing
- **Top:** 8-10 options (t-shirt, button-up, hoodie, suit jacket, vest, tank top, polo, Hawaiian shirt, leather jacket, tuxedo)
- **Top Color:** Color picker or 12 presets
- **Bottom:** 6-8 options (jeans, slacks, shorts, skirt, cargo pants, joggers)
- **Bottom Color:** Color picker or 12 presets

### Layer 5 — Accessories
- **Hat:** None, baseball cap, fedora, beanie, top hat, cowboy hat, visor, headband
- **Held Item:** None, drink glass, cigar (decorative), playing card, chip stack
- **Necklace/Chain:** None, gold chain, pendant, bowtie, tie

### Layer 6 — Special/Unlockable
- **Aura/Effect:** None by default. Earned through achievements (win streaks, chip milestones, tournament victories)
- **Title Badge:** Displayed below username. Examples: "Rookie," "Card Shark," "High Roller," "Slap King"

---

## Default Presets

For users who want to skip customization, provide 8-10 ready-made avatar presets:

1. **The Casual** — Hoodie, jeans, messy hair, relaxed expression
2. **The Shark** — Suit jacket, slicked hair, sunglasses, confident expression
3. **The Tourist** — Hawaiian shirt, shorts, baseball cap, big smile
4. **The Dealer** — Vest and bowtie, neat hair, neutral expression
5. **The Rebel** — Leather jacket, mohawk, shades, smirk
6. **The Classic** — Button-up, slacks, medium hair, glasses
7. **The VIP** — Tuxedo, top hat, gold chain, monocle
8. **The Chill** — Tank top, joggers, beanie, earbuds

Users who select a preset can still edit individual parts afterward.

---

## Sprite Implementation

### Approach: Composite Sprite Sheets

Each avatar component (body, hair, clothing, etc.) is a separate sprite sheet with walk-cycle frames. At render time, layers are composited in order. This allows mix-and-match without generating thousands of pre-rendered combinations.

**Sprite Sheet Specifications:**
- **Tile Size:** 32x48 pixels per frame (standard RPG character size, scales well in Phaser)
- **Directions:** 4 (down, left, right, up)
- **Frames per Direction:** 4 (idle + 3 walk cycle frames)
- **Total Frames per Sheet:** 16 (4 directions × 4 frames)

**Color Tinting:**
For items where color is customizable (hair, clothing), the sprite sheets are drawn in grayscale/white. Phaser's tint system applies the user's chosen color at runtime. This keeps the number of sprite assets manageable.

**Rendering Pipeline:**
```
For each avatar on screen:
  1. Draw body sprite (tinted to skin tone)
  2. Draw hair sprite (tinted to hair color)
  3. Draw face/eyes sprite
  4. Draw bottom clothing sprite (tinted)
  5. Draw top clothing sprite (tinted)
  6. Draw accessories (hat, held item, etc.)
  7. Draw special effects (aura, if earned)
```

All layers are added to a Phaser Container so the avatar moves as a single unit.

### Mobile Considerations

At mobile resolutions, avatars appear smaller. The 32x48 base size scales down cleanly. Nameplates above avatars use a smaller font on mobile. The avatar creation UI uses a scrollable panel rather than a grid to accommodate touch screens.

---

## Avatar Creation UI

### Desktop Layout
A centered panel over a blurred casino background. The avatar preview stands in the middle, updating in real-time as the user changes options. Category tabs run along the left (Body, Hair, Face, Clothes, Accessories). Options for the selected category display as a scrollable grid on the right. A color picker appears when relevant. "Randomize" and "Reset" buttons at the top. "Confirm" button at the bottom.

### Mobile Layout
Full-screen overlay. Avatar preview at the top (1/3 of screen). Category tabs as a horizontal scrollable row below the preview. Options grid fills the remaining space. Color picker as a modal popup. Large touch-friendly buttons.

### Tech Choice
The avatar creation screen is built as a **React component** (not a Phaser scene). This makes form inputs, color pickers, and scrolling much easier than implementing them in Phaser's canvas. The avatar preview itself is a small Phaser instance or a canvas element that renders the composite sprite in real-time.

Once the user confirms, the avatar data is serialized as JSON and sent to the server.

---

## Avatar Data Model

The avatar is stored as a JSON object in the database. This keeps the schema flexible — adding new customization options doesn't require schema migrations.

```json
{
  "body": {
    "type": "medium",
    "skinTone": "#C68642"
  },
  "hair": {
    "style": "short_crop",
    "color": "#2C1B0E"
  },
  "face": {
    "eyes": "round",
    "glasses": false
  },
  "clothing": {
    "top": "hoodie",
    "topColor": "#1A1A2E",
    "bottom": "jeans",
    "bottomColor": "#3D5A80"
  },
  "accessories": {
    "hat": "none",
    "heldItem": "none",
    "necklace": "none"
  },
  "special": {
    "aura": "none",
    "title": "Rookie"
  }
}
```

This JSON blob is stored in an `avatar_data` column on the users table (TEXT type, storing JSON). The server sends it to other clients when broadcasting player positions in the lobby, so everyone can render everyone else's avatar correctly.

---

## Avatar in Different Contexts

**Casino Lobby** — Full sprite with walk animation. 32x48 base, scaled appropriately. Nameplate above. Four-directional movement.

**Game Table (Seated)** — A cropped portrait view showing the avatar from the chest up. Displayed next to the player's card hand and chip count. Smaller than the lobby sprite but recognizable.

**Leaderboard** — A tiny icon-sized render of the avatar face/bust. Displayed next to the username and win count.

**Friend List** — Same icon-sized render as the leaderboard, with an online/offline indicator dot.

---

## Asset Pipeline

Creating the sprite assets is the most labor-intensive part of the avatar system. Options for production:

1. **Hand-Drawn Pixel Art** — Best visual quality and consistency. Time-intensive. Could commission a pixel artist or use tools like Aseprite.

2. **AI-Assisted Generation** — Use an image generation model to create base sprites, then manually clean up and align to the grid. Faster but may need post-processing.

3. **Open-Source Assets** — Use existing RPG sprite packs (like LPC Sprite Sheet Generator or similar Creative Commons assets) as a starting point, customizing to fit the casino theme.

4. **Hybrid Approach (Recommended)** — Start with open-source base sprites for body/hair, create custom clothing and accessories specific to the casino theme (suits, Hawaiian shirts, etc.), and hand-tune the final result.

### Phase 1 Asset Requirements (Minimum Viable)

To launch the avatar system with a respectable set of options:

- 3 body types × 1 sheet each = 3 sheets
- 8 hair styles × 1 sheet each = 8 sheets
- 4 eye styles × 1 sheet each = 4 sheets
- 6 tops × 1 sheet each = 6 sheets
- 4 bottoms × 1 sheet each = 4 sheets
- 4 hats × 1 sheet each = 4 sheets
- 3 held items × 1 sheet each = 3 sheets

**Total: ~32 sprite sheets** for a solid initial release. Color tinting multiplies the visual variety without additional assets.

---

## Connection to Existing Home Page

The current home page already has a character-selection mechanic with three versions of Chris. This can be evolved in two ways:

**Option A — Merge** — The home page character selection becomes the avatar builder. New visitors choose/create their avatar as part of the landing experience, which doubles as onboarding for the casino.

**Option B — Separate** — The home page character selection remains a portfolio-specific UI showcase. The casino avatar is a separate system accessed only within the casino section. The two systems share visual style but are technically independent.

**Recommended: Option B** for now. The home page is a portfolio piece with a specific narrative (three versions of Chris). The casino avatar is a generic system for all users. Merging them would complicate both. They can share art style and even sprite assets but should function independently.
