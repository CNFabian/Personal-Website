# Step 5: GoogleDriveChecklist Frontend Component

## Context

The backend is already complete. These files were just added/updated:
- `server/services/drive.js` — Google Drive API service (fetches doc/sheet, parses checkboxes, syncs to pm_daily_quests)
- `server/routes/pm.js` — New endpoints: `GET /api/pm/drive/checklist`, `POST /api/pm/drive/checklist/sync`, `POST /api/pm/drive/checklist/:id/toggle`, `GET /api/pm/drive/checklist/live`
- `server/services/scheduler.js` — Drive sync added (every 30 min)

Drive checklist items are stored as `quest_type = 'drive_checklist'` rows in `pm_daily_quests`. They already appear in the DailyQuestsPanel under the "Google Drive" section via the existing `SECTION_ORDER` constant. The existing toggle/delete flows work for drive items too.

## What to Build

Create `src/pages/pm/components/GoogleDriveChecklist.tsx` — a standalone component that can be rendered inside the DailyQuestsPanel's drawer as a dedicated Drive section with extra features (sync button, doc link, loading/empty/unconfigured states).

### Component: GoogleDriveChecklist.tsx

**File:** `src/pages/pm/components/GoogleDriveChecklist.tsx`

```tsx
// Props
interface Props {
  token: string;
  onItemToggled?: () => void;  // callback to notify parent when an item changes (so DailyQuestsPanel can refresh its counts)
}
```

**Behavior:**
1. On mount, fetch `GET /api/pm/drive/checklist` with auth header
2. If response has `configured: false`, show an unconfigured state (subtle message, not an error)
3. If configured but items are empty, show an empty state
4. Render checklist items using the existing `QuestItem` component (reuse it — import from `./QuestItem`)
5. Include a small sync button (🔄) that calls `POST /api/pm/drive/checklist/sync` and refreshes the list
6. Show a progress counter: "2/8 done"
7. During sync, show a subtle loading spinner on the sync button only (don't reload the whole list)
8. After toggling an item, call `onItemToggled?.()` so the parent can refresh streak/counts

**API pattern (same as all PM components):**
```typescript
const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;
const headers = { Authorization: `Bearer ${token}` };
```

**Item toggle:** Use `POST /api/pm/drive/checklist/:id/toggle` (dedicated drive toggle endpoint).

### Integration into DailyQuestsPanel.tsx

Modify `DailyQuestsPanel.tsx` to:
1. Import and render `<GoogleDriveChecklist>` as a dedicated section inside the drawer, BELOW the existing `SECTION_ORDER.map()` sections
2. Filter OUT `drive_checklist` items from the existing `SECTION_ORDER` rendering (since GoogleDriveChecklist handles them now). Change the `SECTION_ORDER` constant to just `['ai_priority', 'manual']`
3. Pass `onItemToggled={fetchData}` so that when a drive item is toggled, the panel refreshes its quest counts and streak
4. The existing progress bar / "done/total" counter in the bar should still include drive items — so keep counting all quests from the API response (which includes drive_checklist items). Don't change the fetch logic.

### SCSS Styles

Add to `src/styles/pages/_pm.scss` (after the existing `.pm-quest` styles):

```scss
// ── Google Drive Checklist ────────────────────────────────
.pm-drive-checklist {
  padding: $space-3 $space-4 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-2;
  }

  &__title {
    font-size: $text-xs;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $pm-text-muted;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__count {
    font-size: $text-xs;
    color: $pm-text-dim;
  }

  &__sync-btn {
    background: transparent;
    border: none;
    color: $pm-text-dim;
    font-size: $text-sm;
    cursor: pointer;
    padding: $space-1;
    border-radius: $radius-sm;
    transition: color 150ms ease, background 150ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;

    &:hover { color: $pm-accent; background: $pm-card-hover; }

    &--syncing {
      animation: pm-spin 800ms linear infinite;
    }
  }

  &__empty {
    font-size: $text-xs;
    color: $pm-text-dim;
    padding: $space-2 0 $space-3;
    font-style: italic;
  }

  &__unconfigured {
    font-size: $text-xs;
    color: $pm-text-dim;
    padding: $space-2 0 $space-3;
  }
}

@keyframes pm-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

### Design Rules (CRITICAL)
- NEVER hardcode hex/rgb values — use `$pm-*` tokens and `$color-*` variables from `_design-system.scss`
- Class naming: BEM pattern `.pm-drive-checklist`, `.pm-drive-checklist__header`, etc.
- Reuse `QuestItem` for rendering individual items — don't create a new item component
- Keep the same dark theme aesthetic as DailyQuestsPanel
- The sync button should be subtle — small icon, not a prominent button
- Unconfigured state should be informational, not alarming (this is expected when Drive isn't set up yet)

### File Tree After This Step

```
src/pages/pm/components/
├── GoogleDriveChecklist.tsx  ← NEW
├── DailyQuestsPanel.tsx      ← MODIFIED (integrate GoogleDriveChecklist, remove drive_checklist from SECTION_ORDER)
├── QuestItem.tsx             ← NO CHANGES (reused by GoogleDriveChecklist)
└── ... (all other existing components unchanged)
```

### Acceptance Criteria
1. `GoogleDriveChecklist` renders inside the quests drawer below AI Priorities and Manual sections
2. When Drive is not configured, shows a subtle "not configured" message (not an error)
3. When configured but no items, shows "No checklist items found"
4. Sync button triggers a re-fetch from Drive and shows a spinning animation while loading
5. Toggling a drive item works and updates the parent's quest counts
6. Progress counter shows "X/Y done" accurately
7. All styles use OKLCH design system variables — zero hardcoded colors
8. Component follows the existing functional React + hooks pattern
