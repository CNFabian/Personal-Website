# Claude Code Prompt — Build MemberDetailPanel (Step 2 of 8)

Paste this into Claude Code.

---

## Prompt

Read `PM-GAME-VIEW-SPEC.md` and `CLAUDE.md` first. Then build the **MemberDetailPanel** — a slide-in panel that opens when clicking a MemberStation in the Command Center. This is step 2 of the build order.

### What to build

**1. `src/pages/pm/components/MemberDetailPanel.tsx`**

A slide-in panel from the right side of the screen. It shows detailed info about a selected team member.

Props:
```ts
interface Props {
  memberId: number;
  token: string;
  onClose: () => void;
}
```

The panel:
- **Slides in from the right** with a CSS transition (transform: translateX). When `memberId` is truthy, the panel is visible. When `onClose` is called, it slides out.
- Has a **backdrop/overlay** behind it (semi-transparent dark, click to close)
- **Fixed position**, takes up roughly 420px width on desktop, full width on mobile (<768px)
- Scrollable content area

#### Panel Sections (top to bottom):

**Header:**
- Large avatar circle with initials (same pattern as MemberStation)
- Full name, role, email (from team member data)
- Close button (X) top-right

**Quick Actions bar:**
- Three buttons in a row: `💬 Slack`, `📧 Email`, `🤖 AI Suggest`
- For now, each button logs to console. These will wire to SlackComposer, EmailComposer, and AISuggestions components in steps 3–5
- Style them as compact outlined buttons with hover glow

**Current Work section:**
- Task title, status badge (reuse `StatusBadge` component or matching styles), priority badge
- "Started X days ago · Est: Y days" line
- Progress bar if estimated_hours and actual_hours exist (same pattern as MemberStation)

**Recent Activity section:**
- Fetch from `GET /api/pm/activity/member/{memberId}` (this endpoint already exists)
- Show the 10 most recent activity items
- Each item shows: icon by source type (🔀 github, 💬 slack, 📧 email, 📝 manual), description text, and relative timestamp ("2 hours ago", "Yesterday")
- If no activity, show "No recent activity"

**All Tasks section:**
- Fetch from `GET /api/pm/tasks` filtered by this member's `assignee_id` (filter client-side)
- Show each task with: title, status badge, priority, days since last update
- Group by status: IN_PROGRESS first, then IN_REVIEW, BACKLOG, DONE (only show last 5 DONE)

#### Data fetching:
- Fetch team member details from `GET /api/pm/team` (find by id in the response)
- Fetch activity from `GET /api/pm/activity/member/{memberId}`
- Fetch tasks from `GET /api/pm/tasks`
- Use the same auth header pattern: `{ Authorization: \`Bearer ${token}\` }`
- Use the same API URL pattern as CommandCenter.tsx: `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`
- Show skeleton loading states while data loads (match the existing skeleton pattern in CommandCenter.tsx)

**2. Update `src/pages/pm/components/CommandCenter.tsx`**

- Import `MemberDetailPanel`
- When `selectedId` is set (non-null), render `<MemberDetailPanel memberId={selectedId} token={token} onClose={() => setSelectedId(null)} />`
- The panel renders alongside the grid (not replacing it) — it's a fixed overlay

**3. Add all styles to `src/styles/pages/_pm.scss`**

Add under the existing `// COMMAND CENTER` comment block. Key styles:

```
Panel container:
- Position fixed, top 0, right 0, height 100vh, width 420px
- Background: $pm-card (oklch 0.10)
- Border-left: 1px solid $pm-border
- Box-shadow: large shadow for depth
- z-index: 100
- transform: translateX(100%) when hidden, translateX(0) when visible
- transition: transform 250ms ease

Backdrop:
- Position fixed, inset 0, background oklch(0 0 0 / 0.5), z-index: 99

Section headings:
- Use $pm-text-muted, font-size $text-xs, text-transform uppercase, letter-spacing 0.1em
- Divider line below each heading: 1px solid $pm-border-subtle

Quick action buttons:
- Display flex, gap $space-2
- Each button: $pm-card background, 1px solid $pm-border, border-radius $radius-lg
- Hover: $pm-accent border, subtle box-shadow with $pm-accent at 0.15 opacity

Activity items:
- Vertical list, each item has left icon, description text, and timestamp on right
- Timestamp in $pm-text-dim
- Subtle bottom border between items

Task items in the panel:
- Compact card style, 8px padding, border-radius $radius-md
- Status badge colored dot matching task status
```

### Utility function to add

Create a small helper (can be at the top of MemberDetailPanel.tsx or in a shared utils file):

```ts
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
```

### Important constraints

- Do NOT modify MemberStation.tsx, TaskBoard, or any existing components beyond CommandCenter.tsx
- Do NOT add any npm packages
- Follow existing SCSS patterns — use the `$pm-*` tokens, never hardcode colors
- Use BEM class naming: `.pm-detail-panel`, `.pm-detail-panel__header`, `.pm-detail-panel__section`, etc.
- The panel must be keyboard accessible: close on Escape key, trap focus while open
- Add a CSS transition for the slide-in, don't use JS animation libraries
- Make the activity list and task list scrollable independently if they overflow
