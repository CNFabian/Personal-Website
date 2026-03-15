# PM Dashboard — Full Context Handoff

Use this as the first message in a new Cowork chat. Attach both folders (Personal-Website and nest-frontendV2) as before.

---

## Paste this into the new chat:

---

I'm continuing a project to build an AI-powered PM Dashboard on my personal website (cnfabian.com). Here is the full context so you can pick up exactly where I left off. **Read `CLAUDE.md` and `PM-GAME-VIEW-SPEC.md` in the Personal-Website folder before doing anything.**

### Project Overview

My personal portfolio site at cnfabian.com has a private PM Dashboard at `/pm` for managing the NestNavigate tech team (6-15 engineers). The dashboard is built as a gamified "Command Center" — a clean flat 2D operations hub where team members appear as interactive station cards, not a boring table.

**Tech stack:**
- Frontend: React 18 + TypeScript (CRA), React Router v7, SCSS with OKLCH color system
- Backend: Express.js + SQLite (better-sqlite3), JWT auth
- Deployment: AWS Amplify (frontend), VPS at ws.cnfabian.com (backend)
- AI: Claude API (Anthropic) for message parsing, risk scoring, suggestions, PM chat
- Integrations planned: GitHub API, Slack API, Gmail API, Google Drive API

**Access control:** IP restriction + separate PM JWT auth. Returns 404 (not 403) to hide existence.

### What's Built — Backend

All backend work is complete through Step 4. Key files:

**Server core:**
- `server/server.js` — Express + Socket.io server. Also handles Egyptian Rat Screw and Speed card games (separate features). PM routes mounted at `/api/pm`. Scheduler starts on boot with graceful shutdown.
- `server/middleware/pmAccess.js` — IP allowlist + PM JWT. Returns 404 on denial.
- `server/routes/pm.js` — All PM endpoints (~700 lines):
  - Auth: `POST /auth/login`
  - Team CRUD: `GET/POST/PUT/DELETE /team`
  - Task CRUD: `GET/POST/PUT/DELETE /tasks`, `PATCH /tasks/:id/move`, `PUT /tasks/:id/assign`
  - Activity: `GET /activity`, `GET /activity/member/:id`
  - Alerts: `GET /alerts`, `PATCH /alerts/:id/ack`
  - Slack: `GET /slack/channels`, `POST /slack/send`
  - Email: `POST /email/send`
  - AI: `POST /ai/suggest-action`
  - Quests: `GET /quests/daily` (auto-generates AI priorities), `POST /quests`, `PATCH /quests/:id/toggle`, `DELETE /quests/:id`, `GET /quests/streak`

**Integration services (written, not yet configured with real tokens):**
- `server/services/github.js` — PR/commit sync via GitHub Search API
- `server/services/slack.js` — Channel monitoring, message sync, `sendMessage()`, `listChannels()`
- `server/services/gmail.js` — OAuth token refresh, email sync, `sendEmail()`
- `server/services/ai.js` — Slack analysis, email analysis, task risk scoring, PM chat, full analysis batch
- `server/services/scheduler.js` — Background sync: GitHub/Slack every 15min, Gmail every 30min, AI every 60min. Auto-skips unconfigured services.

**Database (SQLite via better-sqlite3):**
- Migrations: 001 (users/games), 002 (casino), 003 (PM tables: sprints, team_members, tasks, activity, alerts, ai_context, chat_history), 004 (daily_quests, streaks)

### What's Built — Frontend

**PM components (`src/pages/pm/components/`):**

✅ Built and working:
- `CommandCenter.tsx` — Main operations hub, fetches team + tasks, renders MemberStation grid, includes MemberDetailPanel + DailyQuestsPanel
- `MemberStation.tsx` — Team member card with avatar, role, status glow (green/yellow/red/gray), current task, progress bar, time tracking, hover lift animation, breathing status dot
- `MemberDetailPanel.tsx` — Slide-in right panel on member click. Shows header, quick actions (Slack/Email/AI Suggest wired to composers), current work, recent activity, all tasks grouped by status. Keyboard accessible with focus trap.
- `SlackComposer.tsx` — Inline Slack message composer with channel picker, AI draft capability
- `EmailComposer.tsx` — Inline email composer with to/subject/body, AI draft capability
- `AISuggestions.tsx` — AI-generated interaction suggestions with send-to-Slack/email actions
- `DailyQuestsPanel.tsx` — Bottom drawer (collapsible) with daily quests, streak counter, progress bar, add quest input
- `QuestItem.tsx` — Individual quest row with checkbox, type badge, delete

✅ Built previously (Phase 1):
- `PMDashboard.tsx` — Main page with tab navigation. Command Center is the default tab.
- `PMLogin.tsx` — Auth gate
- `TeamOverview.tsx` — Team table view
- `TaskBoard.tsx` — Kanban board with drag and drop
- `TaskCard.tsx` + `TaskModal.tsx` — Task display and editing
- `ActivityFeed.tsx` — Activity feed with source/member filtering
- `AlertsPanel.tsx` + `AlertCard.tsx` — Alerts with severity and acknowledgment
- `StatusBadge.tsx` — Reusable status badge
- `Toast.tsx` — Toast notification system

**Styles:** All in `src/styles/pages/_pm.scss` using OKLCH design system from `src/styles/base/_design-system.scss`. Dark theme with `$pm-*` local tokens. NEVER hardcode hex/rgb.

**Navigation tabs in PMDashboard.tsx:**
```
[🎯 Command Center (default)]  [👥 Team]  [📋 Tasks]  [📊 Activity]  [🚨 Alerts]
```

### Build Order from PM-GAME-VIEW-SPEC.md

1. ✅ CommandCenter + MemberStation
2. ✅ MemberDetailPanel
3. ✅ QuickActionMenu + SlackComposer + EmailComposer + AISuggestions
4. ✅ DailyQuestsPanel + QuestItem
5. ⬜ **GoogleDriveChecklist** — synced tech checklist from Google Drive
6. ⬜ **StreakTracker + Confetti** — gamification polish (streak fire animation, confetti on all-clear)
7. ⬜ **CommandBar** — unified top navigation bar replacing the current tab nav
8. ⬜ **Additional polish** — any remaining items

### What's NOT Done Yet

**Frontend steps remaining (5-8):**
- GoogleDriveChecklist component (syncs checklist items from a Google Doc/Sheet)
- StreakTracker component (fire animation, streak counter widget)
- Confetti component (celebration when all quests complete)
- CommandBar component (replaces current tab nav with the unified command bar from the spec)

**Integration setup (not yet configured):**
- GitHub PAT token not set
- Slack Bot not created / token not set
- Gmail OAuth not configured (need Google Cloud Console setup)
- Anthropic API key not set
- Google Drive API scope not added
- See `INTEGRATION-SETUP-GUIDE.md` for step-by-step instructions

**Other pending items:**
- Google Drive service (`server/services/drive.js`) — needs to be created
- Drive API routes in pm.js (`GET /drive/checklist`, `POST /drive/checklist/:id/toggle`)
- Drag and drop on TaskBoard was added but may need polish
- Real-time updates via Socket.io for the PM dashboard (stretch goal)

### Important Project Rules (from CLAUDE.md)

1. **NEVER hardcode hex/rgb** — always use OKLCH design system variables
2. **Dark theme**: neutral-950 bg, neutral-900 cards, neutral-100 text
3. **All styles in `_pm.scss`** — use existing `$pm-*` tokens
4. **API pattern**: `fetch(\`${API_URL}/api/pm/endpoint\`, { headers: { Authorization: \`Bearer ${token}\` } })`
5. **No external UI libraries** — everything built from scratch with SCSS
6. **Conservative AI**: suggests, never auto-acts
7. **BEM class naming**: `.pm-command-center`, `.pm-station__avatar`, etc.
8. **Code style**: functional React components with hooks, try/catch with `{ success, data/error }` response shape

### Custom Claude Code Skills

7 skills in `.claude/skills/`: pm-workflow, slack-integration, linear-integration, dashboard-ui, figma-to-code, animations, testing. Each has a SKILL.md with best practices.

### Files to Read First

1. `CLAUDE.md` — project rules and architecture
2. `PM-GAME-VIEW-SPEC.md` — full Command Center spec with layout, components, endpoints, build order
3. `INTEGRATION-SETUP-GUIDE.md` — how to set up GitHub/Slack/Gmail/Drive tokens

### Where I Left Off

**I just completed Step 4 (DailyQuestsPanel + QuestItem).** The next step is Step 5: GoogleDriveChecklist. This needs:
1. A new backend service `server/services/drive.js` for Google Drive API
2. New routes in pm.js for drive checklist endpoints
3. Frontend `GoogleDriveChecklist.tsx` component
4. Integration into the DailyQuestsPanel

After that: Step 6 (StreakTracker + Confetti), Step 7 (CommandBar), then integration setup and polish.

I use **Cowork** (this chat) for architecture, backend code, and generating Claude Code prompts. I use **Claude Code** (VS Code sidebar) to build the frontend React/SCSS components by pasting the prompts Cowork generates.
