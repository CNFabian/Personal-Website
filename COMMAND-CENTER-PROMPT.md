# Claude Code Prompt — Build Command Center View (Step 1 of 8)

Paste this into Claude Code to build the Command Center view and MemberStation components.

---

## Prompt

Read `PM-GAME-VIEW-SPEC.md` and `CLAUDE.md` first. Then build the Command Center view — the new default tab for the PM dashboard. This is step 1 of the build order: **CommandCenter + MemberStation**.

### What to build

**1. `src/pages/pm/components/CommandCenter.tsx`**

The main operations hub. It replaces the Team Overview as the default view. It:
- Fetches team members from `GET /api/pm/team` and tasks from `GET /api/pm/tasks`
- Displays each team member as a `MemberStation` card in a responsive CSS grid layout (not a table)
- The grid should feel like an operations floor — cards arranged in a clean grid with generous spacing
- Accepts a `token` prop (string) for API auth, same pattern as `TeamOverview.tsx`
- When a MemberStation is clicked, it should eventually open a detail panel (for now, just log or highlight — we'll build `MemberDetailPanel` in step 2)

**2. `src/pages/pm/components/MemberStation.tsx`**

Individual team member card/station with:
- **Avatar circle** with initials (first letter of first + last name), colored based on role
- **Name** and **role** displayed
- **Status dot** with glow ring: 🟢 green (active, has activity today), 🟡 yellow (no activity 2+ days), 🔴 red (blocked or stale 5+ days), ⚪ gray (inactive/PTO)
- **Current task name** (their first IN_PROGRESS task, or "No active task")
- **Progress bar** if the task has estimated_hours and actual_hours
- **Time tracking** — "Day X of ~Y" based on task started_at and estimated days
- **Bottom stats row**: number of open PRs (🔀), blockers (⚠️) — derive from task data for now
- **Hover effect**: card lifts with translateY(-2px) and box-shadow increase, shows subtle glow matching status color
- **Idle animation**: breathing animation on the status dot (scale pulse 1.0 → 1.1 → 1.0, 2s ease-in-out infinite)
- **Click handler**: calls `onSelect(memberId)` callback

**3. Update `src/pages/pm/PMDashboard.tsx`**

- Add a new tab `'command'` as the FIRST tab (default)
- Tab label: `"Command Center"` with a 🎯 icon
- Keep all existing tabs (team, tasks, activity, alerts) after it
- Default `activeTab` to `'command'` instead of `'team'`
- Import and render `<CommandCenter token={token} />` when active

**4. Add all styles to `src/styles/pages/_pm.scss`**

Follow the existing patterns in this file exactly. Use the OKLCH design system variables — NEVER hardcode hex/rgb. Key styles:

```
Status glow colors (use existing semantic vars):
- Green active: $color-success with 0.3 opacity glow
- Yellow warning: $color-warning with 0.3 opacity glow
- Red blocked: $color-error with 0.3 opacity glow
- Gray inactive: $color-neutral-600

Card: $pm-card background, $pm-border border, 12px border-radius
Hover: $pm-card-hover background, stronger box-shadow
Text: $pm-text for names, $pm-text-muted for secondary info
Accent: $pm-accent for progress bar fill
```

Use the existing `$pm-*` local tokens defined at the top of `_pm.scss`. Add new styles at the end of the file, under a clear comment block: `// COMMAND CENTER`.

### Important constraints

- Do NOT modify any existing components (TaskBoard, TeamOverview, etc.) — only add new ones
- Do NOT add any npm packages — use only React + SCSS
- Follow the exact API pattern from `TeamOverview.tsx` for data fetching (fetch with Authorization header to the backend at the configured API URL)
- Look at how `TeamOverview.tsx` gets the API_URL — use the same pattern
- The grid should look good with 3-8 team members. Use CSS grid with `auto-fill` and `minmax(280px, 1fr)`
- Keep the card compact but readable — not too tall, not too wide
- All animations should use CSS only (keyframes + animation property), no JS animation libraries
- Use BEM-ish class naming matching existing patterns: `.pm-command-center`, `.pm-station`, `.pm-station__avatar`, etc.
