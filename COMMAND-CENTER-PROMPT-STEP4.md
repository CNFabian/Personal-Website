# Claude Code Prompt — Build DailyQuestsPanel + QuestItem (Step 4 of 8)

Paste this into Claude Code.

---

## Prompt

Read `PM-GAME-VIEW-SPEC.md` and `CLAUDE.md` first. Then build the **Daily Quests** system — a bottom drawer panel with your daily PM checklist, streak tracking, and the ability to add/complete/remove quests. This is step 4 of the build order.

### Backend endpoints already exist

These routes are implemented in `server/routes/pm.js`:

```
GET    /api/pm/quests/daily       → { success, date, quests: [...], streak: { current_streak, longest_streak, total_quests_completed, last_completed_date } }
POST   /api/pm/quests             → body: { title, description?, quest_type? } → { success, quest }
PATCH  /api/pm/quests/:id/toggle  → { success, quest, streak }
DELETE /api/pm/quests/:id          → { success }
GET    /api/pm/quests/streak      → { success, streak }
```

Quest object shape:
```ts
interface Quest {
  id: number;
  date: string;           // "2026-03-14"
  quest_type: string;     // "ai_priority" | "drive_checklist" | "manual"
  title: string;
  description: string | null;
  source_id: string | null;
  is_completed: number;   // 0 or 1
  completed_at: string | null;
  created_at: string;
}
```

Streak object shape:
```ts
interface Streak {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  total_quests_completed: number;
}
```

The `GET /quests/daily` endpoint auto-generates AI priority quests if none exist for today (or falls back to data-driven defaults if AI isn't configured). So the frontend just needs to call this endpoint — it always returns quests.

### What to build

**1. `src/pages/pm/components/QuestItem.tsx`**

A single quest row in the checklist.

Props:
```ts
interface Props {
  quest: Quest;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}
```

Behavior:
- **Checkbox** on the left — clicking calls `onToggle(quest.id)`
- **Title** — main text, with strikethrough + muted color when completed
- **Description** — smaller muted text below title (only if description exists)
- **Type badge** — small pill showing quest_type: "AI" (accent color) or "Manual" (neutral) or "Drive" (info color)
- **Delete button** — small X on the right, only visible on hover, calls `onDelete(quest.id)`
- **Completion animation** — when toggling to complete, brief checkmark scale-up animation + the text fades to muted

**2. `src/pages/pm/components/DailyQuestsPanel.tsx`**

A bottom drawer that can be collapsed (just showing the summary bar) or expanded (showing all quests).

Props:
```ts
interface Props {
  token: string;
}
```

Behavior:
- **Collapsed state** (default): A slim bar at the bottom of the Command Center showing:
  - "Daily Quests" label
  - Completion count: "3/7 done"
  - Streak: "🔥 4" (or "🔥 0" with dimmer styling if no streak)
  - Click/tap anywhere on the bar to expand
  - Subtle progress bar fill across the bar background showing % complete

- **Expanded state**: Slides up with CSS transition to show the full quest list:
  - **Header row**: "Daily Quests" title, completion fraction, streak counter, collapse button (chevron down)
  - **Quest sections**, grouped by `quest_type`:
    - "AI Priorities" section — quests where `quest_type === 'ai_priority'`
    - "Manual" section — quests where `quest_type === 'manual'`
    - "Google Drive" section — quests where `quest_type === 'drive_checklist'` (may be empty, that's fine)
    - Only show section headers if there are quests in that category
  - Each quest rendered as a `<QuestItem />`
  - **Add Quest input**: A compact inline form at the bottom:
    - Text input with placeholder "Add a quest..."
    - When user types and presses Enter (or clicks +), calls `POST /api/pm/quests` with `{ title: inputValue }`
    - Clears input after successful add and refreshes the list
  - **"All Clear" state**: When every quest is completed, show a subtle celebration message: "All done for today! 🎉" in success color

- **Data fetching**:
  - On mount, fetch `GET /api/pm/quests/daily`
  - After toggle/delete/add, refetch or optimistically update the local state
  - For toggle: call `PATCH /api/pm/quests/:id/toggle`, update local quest's `is_completed` and update streak from response

- **Streak logic**: The backend handles streak calculation. The frontend just displays `streak.current_streak` from the response.

**3. Update `src/pages/pm/components/CommandCenter.tsx`**

- Import `DailyQuestsPanel`
- Render `<DailyQuestsPanel token={token} />` AFTER the grid div, inside the `.pm-command-center` container
- It should sit at the bottom of the Command Center view

**4. Add all styles to `src/styles/pages/_pm.scss`**

Add under the existing `// COMMAND CENTER` block. Key new classes:

```
Collapsed bar (.pm-quests-bar):
- Position: sticky, bottom 0
- Background: $pm-card
- Border-top: 1px solid $pm-border
- Padding: $space-3 $space-4
- Display flex, align-items center, justify-content space-between
- Cursor pointer
- Transition: background 150ms ease
- Hover: $pm-card-hover background

Progress fill behind the bar (.pm-quests-bar__progress):
- Position absolute, left 0, top 0, height 100%
- Background: $color-success at 0.08 opacity
- Transition: width 300ms ease
- Border-radius: inherit

Streak counter (.pm-quests-bar__streak):
- Font-weight 600
- When streak > 0: $color-warning color (fire orange)
- When streak === 0: $pm-text-dim color

Expanded drawer (.pm-quests-drawer):
- Background: $pm-card
- Border-top: 1px solid $pm-border
- Max-height: 50vh
- Overflow-y: auto
- Padding: $space-4
- Transition: max-height 300ms ease, opacity 200ms ease

Section header (.pm-quests-drawer__section-title):
- Font-size: $text-xs
- Text-transform: uppercase
- Letter-spacing: 0.1em
- Color: $pm-text-muted
- Margin-bottom: $space-2

Quest item (.pm-quest):
- Display flex, align-items flex-start, gap $space-3
- Padding: $space-2 0
- Border-bottom: 1px solid $pm-border-subtle (last-child: none)

Checkbox (.pm-quest__check):
- Width 18px, height 18px
- Border: 2px solid $pm-border
- Border-radius: $radius-sm (4px)
- Cursor: pointer
- When checked: background $color-success, border-color $color-success, checkmark appears
- Transition: all 150ms ease

Quest title when completed (.pm-quest__title--done):
- Text-decoration: line-through
- Color: $pm-text-dim

Type badge (.pm-quest__badge):
- Font-size: 10px
- Padding: 1px 6px
- Border-radius: $radius-full (999px)
- ai_priority: $pm-accent background at 0.15, $pm-accent text
- manual: $pm-border background, $pm-text-muted text
- drive_checklist: $color-info at 0.15 background, $color-info text

Add quest input (.pm-quests-drawer__add):
- Display flex, gap $space-2
- Input: same style as other PM inputs, flex 1
- Add button: $pm-accent color, no background, font-size $text-lg

All-clear message (.pm-quests-drawer__all-clear):
- Text-align center
- Color: $color-success
- Padding: $space-4
- Font-weight 500
```

### Important constraints

- Do NOT modify backend files — routes are done
- Do NOT add npm packages
- Same API URL pattern as other components: `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`
- Same auth header: `{ Authorization: \`Bearer ${token}\` }`
- BEM naming: `.pm-quests-bar`, `.pm-quests-drawer`, `.pm-quest`, `.pm-quest__check`, etc.
- All OKLCH design system vars — never hardcode colors
- The drawer should NOT overlay the command center grid — it pushes content up or sticks to the bottom
- Keep animations subtle and fast (150-300ms)
- The collapsed bar should always be visible when on the Command Center tab
