# Step 8: Polish & Cleanup

## Overview

All core components are built (Steps 1–7 complete). This final step covers visual polish, consistency fixes, accessibility improvements, and cleanup. This is a series of small, focused changes — no new components or backend routes.

---

## 8A. Remove Dead Header/Tab Styles + Clean Up Old Classes

The old `pm-header` and `pm-tabs` elements were replaced by `CommandBar` in Step 7, but `PMDashboard.tsx` no longer renders them. The SCSS for these can stay (it's dead code but harmless), or optionally:

**Optional cleanup in `_pm.scss`:** Add a comment above the old `.pm-header` and `.pm-tabs` blocks marking them as deprecated:

```scss
// DEPRECATED — replaced by .pm-command-bar in Step 7
// Kept for reference; safe to remove.
.pm-header { ... }
.pm-tabs { ... }
.pm-tab { ... }
```

No functional changes needed.

---

## 8B. MemberStation — Live PR Count + Slack Message Count

Currently `MemberStation.tsx` hardcodes `🔀 0` for open PRs and doesn't show Slack messages. When the GitHub/Slack integrations are configured and syncing, the activity data is in `pm_activity` but MemberStation doesn't use it.

**Enhancement to CommandCenter.tsx:**

Fetch activity alongside team + tasks, and pass counts to each MemberStation:

1. In `CommandCenter.tsx`, add to the `fetchData` `Promise.all`:
   ```tsx
   fetch(`${PM_API}/activity?limit=200`, { headers })
   ```

2. Process activity to compute per-member counts:
   ```tsx
   const activityData = await activityRes.json();
   const allActivity = activityData.activity ?? [];

   // Count by member: PRs and Slack messages from today
   const today = new Date().toISOString().slice(0, 10);
   const prCountByMember: Record<number, number> = {};
   const slackCountByMember: Record<number, number> = {};

   for (const a of allActivity) {
     if (!a.member_id) continue;
     if (a.source === 'github' && a.activity_type === 'pull_request') {
       prCountByMember[a.member_id] = (prCountByMember[a.member_id] || 0) + 1;
     }
     if (a.source === 'slack' && a.timestamp?.startsWith(today)) {
       slackCountByMember[a.member_id] = (slackCountByMember[a.member_id] || 0) + 1;
     }
   }
   ```

3. Add `openPRs` and `slackMessages` to the `EnrichedMember` interface and pass to `MemberStation`:
   ```tsx
   interface EnrichedMember {
     member: StationMember;
     currentTask?: Task;
     status: StationStatus;
     daysInStatus: number;
     openPRs: number;
     slackMessages: number;
   }
   ```

4. Update `MemberStation.tsx` props to accept `openPRs` and `slackMessages`:
   ```tsx
   interface Props {
     member: StationMember;
     currentTask?: Task;
     status: StationStatus;
     daysInStatus: number;
     openPRs: number;
     slackMessages: number;
     onSelect: (memberId: number) => void;
   }
   ```

5. Replace the hardcoded stats:
   ```tsx
   <div className="pm-station__stats">
     <span className="pm-station__stat" title="Days in status">
       🕐 {daysInStatus}d
     </span>
     <span className="pm-station__stat" title="Slack messages today">
       💬 {slackMessages}
     </span>
     <span className="pm-station__stat" title="Open PRs">
       🔀 {openPRs}
     </span>
     <span
       className={`pm-station__stat${blockerCount > 0 ? ' pm-station__stat--alert' : ''}`}
       title="Blockers"
     >
       ⚠ {blockerCount}
     </span>
   </div>
   ```

This makes the stations come alive once integrations are configured — no visual change when activity is empty (just shows 0), but real data flows through when GitHub/Slack are connected.

---

## 8C. Keyboard Shortcuts

Add global keyboard shortcuts to the PM dashboard for power-user navigation.

**In PMDashboard.tsx**, add a `useEffect` with a keydown listener:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger when typing in an input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Alt+1–5: switch tabs
    if (e.altKey && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const tabs: Tab[] = ['command', 'team', 'tasks', 'activity', 'alerts'];
      const idx = parseInt(e.key) - 1;
      if (tabs[idx]) setActiveTab(tabs[idx]);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

That's it — simple, non-intrusive. Alt+1 through Alt+5 for tab switching.

---

## 8D. Empty States Polish

Several views could use better empty states. Add these small improvements:

**CommandCenter.tsx** — When no team members exist, improve the empty message:
```tsx
{enriched.length === 0 ? (
  <div className="pm-empty-state">
    <span className="pm-empty-state__icon">👥</span>
    <p className="pm-empty-state__title">No team members yet</p>
    <p className="pm-empty-state__desc">
      Switch to the Team tab to add your first team member.
    </p>
  </div>
) : (
  // ... existing grid
)}
```

**TaskBoard.tsx** — When no tasks exist across all columns, show:
```tsx
// After the COLUMNS.map(), before the closing </div> of task-board
{tasks.length === 0 && !loading && (
  <div className="pm-empty-state pm-empty-state--wide">
    <span className="pm-empty-state__icon">📋</span>
    <p className="pm-empty-state__title">No tasks yet</p>
    <p className="pm-empty-state__desc">
      Click "New Task" to create your first task.
    </p>
  </div>
)}
```

**SCSS for empty states (add to `_pm.scss`):**

```scss
// ── Empty States ──────────────────────────────────────────

.pm-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-10 $space-6;
  text-align: center;

  &--wide {
    grid-column: 1 / -1; // span all columns in the task board grid
  }

  &__icon {
    font-size: 2.5rem;
    margin-bottom: $space-3;
    opacity: 0.5;
  }

  &__title {
    font-size: $text-sm;
    font-weight: 600;
    color: $pm-text;
    margin: 0 0 $space-1;
  }

  &__desc {
    font-size: $text-xs;
    color: $pm-text-muted;
    margin: 0;
    max-width: 28ch;
    line-height: 1.5;
  }
}
```

---

## 8E. Loading State Consistency

Ensure all tabs show skeleton loading consistently. Most already do (CommandCenter, TaskBoard, AlertsPanel). Verify:

- **TeamOverview** — if it doesn't have a skeleton loader, add one matching the pattern from CommandCenter (use `skeleton` classes)
- **ActivityFeed** — same check

Both should already have them from Phase 1, but verify and add if missing.

---

## 8F. Reduced Motion — Final Audit

The reduced-motion section at the bottom of `_pm.scss` currently covers:
- `.pm-quests-bar__progress`
- `.pm-quests-drawer`
- `.pm-quest__check-mark`
- `.pm-drive-checklist__sync-btn--syncing`
- `.pm-streak-tracker__fire--active`
- `.pm-streak-tracker__count--pop`
- `.pm-confetti__particle`

Add these remaining animated elements:

```scss
@media (prefers-reduced-motion: reduce) {
  // Existing...
  .pm-quests-bar__progress                { transition: none; }
  .pm-quests-drawer                       { transition: none; }
  .pm-quest__check-mark                   { animation: none; }
  .pm-drive-checklist__sync-btn--syncing  { animation: none; }
  .pm-streak-tracker__fire--active        { animation: none; }
  .pm-streak-tracker__count--pop          { animation: none; }
  .pm-confetti__particle                  { animation: none; display: none; }

  // New additions:
  .pm-station__dot                        { animation: none; } // breathing dot
  .pm-station                             { transition: none; } // hover lift
  .pm-station__progress-fill              { transition: none; }
  .task-card                              { transition: none; }
  .pm-command-bar__tab                    { transition: none; }
}
```

---

## 8G. CommandBar Alert Badge — Auto-Refresh

The CommandBar currently re-fetches alert count when `activeTab` changes. Add a 60-second interval so the badge stays fresh even if you're sitting on the Command Center tab:

**In CommandBar.tsx**, modify the existing `useEffect`:

```tsx
useEffect(() => {
  const fetchAlerts = () => {
    fetch(`${PM_API}/alerts`, { headers })
      .then(r => r.json())
      .then(data => setAlertCount((data.alerts ?? []).length))
      .catch(() => {});
  };

  fetchAlerts();
  const interval = setInterval(fetchAlerts, 60000);
  return () => clearInterval(interval);
}, [activeTab, token]);
```

---

## Summary of Files Modified

```
src/pages/pm/PMDashboard.tsx             — keyboard shortcuts (8C)
src/pages/pm/components/CommandCenter.tsx — activity fetch + pass PR/Slack counts (8B), empty state (8D)
src/pages/pm/components/MemberStation.tsx — accept + render openPRs/slackMessages props (8B)
src/pages/pm/components/CommandBar.tsx    — alert badge auto-refresh interval (8G)
src/pages/pm/components/TaskBoard.tsx     — empty state (8D)
src/styles/pages/_pm.scss                — empty state styles (8D), reduced-motion additions (8F), optional header deprecation comment (8A)
```

## Acceptance Criteria

1. MemberStation shows live Slack message + PR counts (0 when no data, real numbers when integrations active)
2. Alt+1 through Alt+5 navigates tabs (doesn't fire when focus is in an input)
3. CommandCenter and TaskBoard show polished empty states with icons
4. All animated elements respect `prefers-reduced-motion: reduce`
5. CommandBar alert badge auto-refreshes every 60 seconds
6. Zero hardcoded colors — all OKLCH design system
7. No regressions — all existing functionality works as before
