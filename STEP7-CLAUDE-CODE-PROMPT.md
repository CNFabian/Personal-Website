# Step 7: CommandBar — Unified Top Navigation

## Context

The PM Dashboard currently has two separate top elements in `PMDashboard.tsx`:
1. A `pm-header` with the title "PM Dashboard" and a logout button
2. A `pm-tabs` nav bar with tab buttons: Command, Team, Tasks, Activity, Alerts

These are replaced with a single, polished `CommandBar` component that consolidates everything into one bar. The tab navigation system in PMDashboard stays the same (same `Tab` type, same state management) — we're just replacing the visual header + nav with the CommandBar component.

No backend changes needed.

## Current PMDashboard.tsx (for reference)

```tsx
type Tab = 'command' | 'team' | 'tasks' | 'activity' | 'alerts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'command',  label: '🎯 Command' },
  { id: 'team',     label: 'Team'       },
  { id: 'tasks',    label: 'Tasks'      },
  { id: 'activity', label: 'Activity'   },
  { id: 'alerts',   label: 'Alerts'     },
];
```

The spec layout from PM-GAME-VIEW-SPEC.md:
```
[🎯 Command Center]  [📋 Board]  [📊 Activity]  [🚨 Alerts]
```

## What to Build

### Component: CommandBar.tsx

**File:** `src/pages/pm/components/CommandBar.tsx`

```tsx
type Tab = 'command' | 'team' | 'tasks' | 'activity' | 'alerts';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onLogout: () => void;
  token: string;
}
```

**Layout (single horizontal bar):**

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⬡ PM Command    [🎯 Command] [👥 Team] [📋 Tasks] [📊 Activity] [🚨 Alerts ●2]    [⚙] [↗ Logout] │
│   Center                                                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Left zone — Brand:**
- A small icon/logo (use a simple hexagon ⬡ or a minimal SVG shape in the accent color)
- "PM Command Center" text — font-weight 700, `$text-sm`, `$pm-text`
- This is static, not clickable (or clicking it goes to Command tab)

**Center zone — Tab Navigation:**
- The same 5 tabs, but with updated labels and icons:
  - `command` → "🎯 Command"
  - `team` → "👥 Team"
  - `tasks` → "📋 Tasks"
  - `activity` → "📊 Activity"
  - `alerts` → "🚨 Alerts"
- Active tab has a bottom highlight bar (2px, `$pm-accent`) and text in `$pm-accent`
- Inactive tabs are `$pm-text-muted`, hover to `$pm-text`
- Alerts tab shows a **badge** with unacknowledged alert count (fetched on mount):
  - Badge is a small circle next to the text, `$color-error` background, white text
  - Only shows when count > 0
  - Fetch from `GET /api/pm/alerts` (which returns unacknowledged by default)

**Right zone — Actions:**
- A settings gear icon (⚙) — for now just a placeholder button, no functionality. Dim color, hover brightens.
- Logout button — small, subtle, `$pm-text-muted` with `$pm-border` border, same style as existing but smaller

**Behavior:**
1. On mount, fetch `GET /api/pm/alerts` to get the unacknowledged alert count for the badge
2. Tab clicks call `onTabChange(tab)`
3. Logout button calls `onLogout()`
4. Keyboard accessible: tab through items with Tab key, Enter/Space to activate
5. The bar is `position: sticky; top: 0; z-index: 15` so it stays visible while scrolling

**Implementation notes:**
- Use the standard API pattern: `const PM_API = \`${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm\``
- Fetch alerts with `{ headers: { Authorization: \`Bearer ${token}\` } }`
- Only count alerts for the badge: `alerts.length` from the response
- Re-fetch alert count when `activeTab` changes (so it updates if you acknowledge alerts then switch back)

---

### Integration: PMDashboard.tsx Modifications

Replace the existing `pm-header` and `pm-tabs` sections with a single `<CommandBar>` component.

**Before (current):**
```tsx
<header className="pm-header">
  <h1 className="pm-header__title">PM Dashboard</h1>
  <button className="pm-header__logout" onClick={handleLogout}>
    Logout
  </button>
</header>

<nav className="pm-tabs">
  {TABS.map(tab => (
    <button
      key={tab.id}
      className={`pm-tab${activeTab === tab.id ? ' pm-tab--active' : ''}`}
      onClick={() => setActiveTab(tab.id)}
    >
      {tab.label}
    </button>
  ))}
</nav>
```

**After (replace with):**
```tsx
<CommandBar
  activeTab={activeTab}
  onTabChange={setActiveTab}
  onLogout={handleLogout}
  token={token}
/>
```

- Remove the `TABS` constant from PMDashboard.tsx (it moves into CommandBar)
- Keep the `Tab` type — either export it from CommandBar or keep it in PMDashboard and import into CommandBar. Preference: **define and export `Tab` from CommandBar.tsx**, then import it in PMDashboard.
- The `<main className="pm-content">` section and everything below stays the same

---

### SCSS Styles

Add to `src/styles/pages/_pm.scss`. You can either replace the existing `.pm-header` and `.pm-tabs` styles or leave them and add the new `.pm-command-bar` styles alongside. Preference: **keep the old styles** (they don't hurt anything) and add new ones.

```scss
// ── Command Bar ───────────────────────────────────────────

.pm-command-bar {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  gap: $space-4;
  padding: 0 $space-5;
  height: 52px;
  background: $pm-card;
  border-bottom: 1px solid $pm-border;
  flex-shrink: 0;

  &__brand {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex-shrink: 0;
    cursor: default;
  }

  &__logo {
    color: $pm-accent;
    font-size: $text-lg;
    line-height: 1;
  }

  &__brand-text {
    font-size: $text-sm;
    font-weight: 700;
    color: $pm-text;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  // Separator between brand and nav
  &__separator {
    width: 1px;
    height: 20px;
    background: $pm-border;
    flex-shrink: 0;
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: $space-1;
    flex: 1;
    min-width: 0; // allow shrinking
  }

  &__tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: $space-1_5;
    padding: $space-2 $space-3;
    background: transparent;
    border: none;
    border-radius: $radius-md;
    color: $pm-text-muted;
    font-size: $text-xs;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: color 150ms ease, background 150ms ease;

    &:hover:not(.pm-command-bar__tab--active) {
      color: $pm-text;
      background: oklch(from #{$pm-card-hover} l c h / 0.5);
    }

    &--active {
      color: $pm-accent;
      background: oklch(from #{$pm-accent} l c h / 0.08);
    }
  }

  &__tab-icon {
    font-size: $text-sm;
    line-height: 1;
  }

  &__tab-label {
    line-height: 1;
  }

  // Alert badge
  &__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: $color-error;
    color: oklch(1 0 0); // white
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  // Right-side actions
  &__actions {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-left: auto;
    flex-shrink: 0;
  }

  &__icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: $radius-md;
    color: $pm-text-dim;
    font-size: $text-sm;
    cursor: pointer;
    transition: color 150ms ease, background 150ms ease;

    &:hover {
      color: $pm-text;
      background: $pm-card-hover;
    }
  }

  &__logout {
    padding: $space-1 $space-3;
    background: transparent;
    border: 1px solid $pm-border;
    border-radius: $radius-md;
    color: $pm-text-dim;
    font-size: $text-xs;
    font-weight: 500;
    cursor: pointer;
    transition: color 150ms ease, border-color 150ms ease;

    &:hover {
      color: $color-error;
      border-color: $color-error;
    }
  }
}

// Responsive: stack tabs on narrow screens
@include media(md) {
  .pm-command-bar {
    padding: 0 $space-4;

    &__brand-text {
      display: none; // hide text, keep logo on narrow
    }
  }
}
```

---

## Design Rules (CRITICAL)

- NEVER hardcode hex/rgb values — use `$pm-*` tokens and `$color-*` variables
- Exception: `oklch(1 0 0)` for white on the alert badge is fine (it's a direct OKLCH value)
- Class naming: BEM pattern `.pm-command-bar`, `.pm-command-bar__tab`, etc.
- All styles in `_pm.scss`
- The bar should feel like one cohesive element — no visual separation between brand/nav/actions
- Height: 52px total (compact, professional)
- The active tab style uses a subtle accent-tinted background pill rather than an underline (more modern than the old tab bar)

## File Tree After This Step

```
src/pages/pm/
├── PMDashboard.tsx              ← MODIFIED (use CommandBar, remove old header + tabs)
├── components/
│   ├── CommandBar.tsx           ← NEW
│   ├── StreakTracker.tsx        ← NO CHANGES
│   ├── Confetti.tsx             ← NO CHANGES
│   ├── DailyQuestsPanel.tsx     ← NO CHANGES
│   ├── GoogleDriveChecklist.tsx  ← NO CHANGES
│   └── ... (all other components unchanged)
```

## Acceptance Criteria

1. CommandBar renders as a single sticky bar at the top of the dashboard
2. Brand section shows a small accent-colored icon + "PM Command Center"
3. Five navigation tabs with icons and labels, matching the existing `Tab` type
4. Active tab has accent-colored text + subtle accent background pill
5. Alerts tab shows a red badge with unacknowledged alert count (hidden when 0)
6. Alert badge count refreshes when switching tabs
7. Logout button is subtle, turns red on hover
8. Settings gear button is present as a placeholder
9. Old `pm-header` and `pm-tabs` HTML removed from PMDashboard.tsx
10. Tab switching still works identically to before (same state, same content rendering)
11. Bar is keyboard accessible (Tab + Enter/Space navigation)
12. Zero hardcoded colors — everything from OKLCH design system
13. `Tab` type is exported from CommandBar.tsx and imported by PMDashboard.tsx
