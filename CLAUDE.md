# Personal Website — PM Dashboard Project

## Project Overview
Personal portfolio site (cnfabian.com) with a private PM Dashboard at `/pm`.
- **Frontend:** React 18 + TypeScript, CRA, React Router v7
- **Backend:** Express.js + SQLite (better-sqlite3), Socket.io
- **Styling:** SCSS with OKLCH design system (`src/styles/base/_design-system.scss`)
- **Deployment:** AWS Amplify (frontend) + VPS (backend at ws.cnfabian.com)

## Commands
- Frontend: `npm start` (dev), `npm run build` (production)
- Backend: `cd server && node server.js`
- Backend dependencies: `cd server && npm install`

## PM Dashboard Architecture
The PM dashboard lives at `/pm` and is a private project management tool. Only accessible via IP restriction + PM JWT auth. Returns 404 (not 403) to hide its existence.

### Key Files
- `server/middleware/pmAccess.js` — IP + JWT access control
- `server/routes/pm.js` — all PM API endpoints
- `src/pages/pm/PMDashboard.tsx` — main dashboard page
- `src/pages/pm/PMLogin.tsx` — auth gate
- `src/pages/pm/components/` — all dashboard components

### API Pattern
All PM endpoints are under `/api/pm/*`. Use `fetch()` with Authorization header:
```javascript
const res = await fetch(`${API_URL}/api/pm/endpoint`, {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('pm_auth_token')}` }
});
```

## Styling Rules — CRITICAL
- **NEVER hardcode hex/rgb values.** Always use OKLCH design system variables from `_design-system.scss`
- Dark theme: `--neutral-950` background, `--neutral-900` cards, `--neutral-100` text
- Status colors: `--success-*` (green), `--warning-*` (yellow/orange), `--error-*` (red), `--info-*` (blue)
- Accent colors: `--accent-*` (orange/gold scale)
- All styles go in `src/styles/pages/_pm.scss`
- Use existing class naming patterns from the codebase

## PM Dashboard Design Principles
- Clean, data-dense, dark interface. Think Linear or Vercel dashboard
- No clutter. Every element earns its space
- Status at a glance: color-coded badges, progress indicators
- Cards with subtle borders (neutral-800), rounded corners (12px)
- Hierarchy through font weight and opacity, not size
- Transitions on hover states (150ms ease)
- Responsive but desktop-first (this is a PM tool, used on laptop/monitor)

## PM Best Practices (Encode Into Features)
When building PM features, follow these principles:

### Task Management
- Tasks have clear statuses: BACKLOG → IN_PROGRESS → IN_REVIEW → DONE
- Every task should show: assignee, priority, days in current status, last activity
- Flag tasks with no activity for 3+ days (yellow), 5+ days (red)
- Completed tasks auto-stamp completed_at timestamp

### Team Visibility
- Each team member card shows: current task, last activity, open PRs, blockers
- Capacity tracking: don't overload people beyond their hours
- Activity should combine all sources (GitHub, Slack, Gmail, manual)

### Alerts & Risk
- Conservative: AI suggests, never auto-acts
- Severity levels: low (info), medium (warning), high (error), critical (error bg)
- Every alert includes a suggested action
- Alerts are acknowledgeable, not auto-dismissing

### Communication
- When generating Slack messages or emails, use professional but warm tone
- Status reports should be concise: what's done, what's in progress, what's blocked
- Never expose team member performance data publicly

## Code Style
- Follow existing patterns in the codebase exactly
- Express routes: try/catch with consistent `{ success, data/error }` response shape
- React: functional components with hooks
- No external UI libraries — build components from scratch with SCSS
- Use semantic HTML elements
- Keep components focused — one responsibility per file
