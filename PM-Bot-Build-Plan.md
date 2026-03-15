# PM Bot Build Plan — cnfabian.com

## What We're Building

A private, AI-powered project management dashboard on your personal website (cnfabian.com) that monitors the NestNavigate tech team. It pulls data from GitHub, Slack, and Gmail, uses AI to understand what everyone's working on, flags risks, and acts as your personal APM command center.

Only accessible by you (IP-restricted + authenticated).

---

## How It Fits Into Your Existing Site

Your site already has everything we need: React frontend, Express backend, SQLite database, JWT auth, and AWS Amplify hosting. The PM dashboard is just a new feature added to this stack.

```
cnfabian.com (existing)              PM Dashboard (new)
─────────────────────────            ─────────────────────
/              Home                  /pm              Dashboard home
/about         About                /pm/team         Team overview
/projects      Projects             /pm/tasks        Task board
/contact       Contact              /pm/activity     Activity feed
/casino        Games                /pm/alerts       Alert center
/secret        Puzzle system        /pm/chat         AI assistant
```

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│            FRONTEND (React + TypeScript)          │
│         src/pages/pm/ + src/components/pm/        │
│              SCSS with OKLCH design system         │
└─────────────────────┬────────────────────────────┘
                      │
         ┌────────────▼─────────────┐
         │   EXPRESS BACKEND        │
         │   server/routes/pm.js    │
         │   IP restriction middleware
         └────────────┬─────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
│  SQLite   │  │ Integration│  │  Claude   │
│  Database │  │  Services  │  │  API      │
│  (exists) │  │            │  │  (AI)     │
└───────────┘  └─────┬──────┘  └───────────┘
                     │
           ┌─────────┼─────────┐
        ┌──▼──┐   ┌──▼──┐  ┌──▼────┐
        │Slack│   │Gmail│  │GitHub │
        │ API │   │ API │  │  API  │
        └─────┘   └─────┘  └───────┘
```

---

## New Files to Create

### Frontend

```
src/
├── pages/
│   └── pm/
│       ├── PMDashboard.tsx          (main page with tab navigation)
│       ├── PMLogin.tsx              (secondary auth gate for PM section)
│       └── components/
│           ├── TeamOverview.tsx      (grid of team member cards)
│           ├── TeamMemberCard.tsx    (person card: task, status, activity)
│           ├── TaskBoard.tsx         (kanban: Backlog → In Progress → Review → Done)
│           ├── TaskCard.tsx          (individual task in kanban)
│           ├── TaskModal.tsx         (create/edit task modal)
│           ├── ActivityFeed.tsx      (combined timeline from all sources)
│           ├── ActivityItem.tsx      (single activity entry)
│           ├── AlertsPanel.tsx       (flagged issues list)
│           ├── AlertCard.tsx         (individual alert with action)
│           ├── GithubWidget.tsx      (PR/commit summary widget)
│           ├── SlackWidget.tsx       (parsed Slack digest widget)
│           ├── GmailWidget.tsx       (CEO email summary widget)
│           ├── PMChat.tsx            (AI chat assistant panel)
│           ├── StatusBadge.tsx       (reusable colored badge)
│           ├── PMNavbar.tsx          (PM-specific top nav / breadcrumbs)
│           └── SprintView.tsx        (sprint planning, Phase 6)
├── styles/
│   └── pages/
│       └── _pm.scss                 (all PM dashboard styles)
```

### Backend

```
server/
├── routes/
│   └── pm.js                       (all PM API endpoints)
├── services/
│   ├── github.js                   (GitHub API integration)
│   ├── slack.js                    (Slack API integration)
│   ├── gmail.js                    (Gmail API integration)
│   └── ai.js                       (Claude API for analysis)
├── middleware/
│   └── pmAccess.js                 (IP restriction + PM auth)
├── migrations/
│   └── 002-pm-tables.js            (new database tables)
```

### Files to Update (small changes)

```
src/App.tsx                          — add /pm/* routes
server/server.js                     — mount pm routes
server/db.js                         — run new migration
```

---

## Access Control

Two layers — this section is locked down tight.

**Layer 1: Backend IP restriction** (`server/middleware/pmAccess.js`)
```javascript
// Only your IP(s) can hit PM endpoints
const PM_ALLOWED_IPS = process.env.PM_ALLOWED_IPS?.split(',') || [];

function pmAccessMiddleware(req, res, next) {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  if (!PM_ALLOWED_IPS.includes(clientIP)) {
    return res.status(404).json({ error: 'Not found' }); // 404 not 403 — don't reveal it exists
  }
  next();
}
```

**Layer 2: Frontend auth gate** (`src/pages/pm/PMLogin.tsx`)
A separate password or PIN entry that only you know. Even if someone somehow gets past the IP check, they'd still need the PM password. This is stored as a hashed env variable on the backend, completely separate from the casino auth system.

**Layer 3: Route hiding**
The PM routes don't appear in the Navbar. No links to /pm anywhere on the public site. You access it by navigating directly to cnfabian.com/pm.

---

## Database Schema (New SQLite Tables)

These get added alongside your existing `users` table via a new migration:

```sql
-- Team members you're tracking
CREATE TABLE pm_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,                    -- 'frontend', 'backend', 'fullstack', 'design', etc.
  github_handle TEXT,
  slack_id TEXT,
  avatar_url TEXT,
  capacity_hours INTEGER DEFAULT 40,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks on the board
CREATE TABLE pm_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id INTEGER REFERENCES pm_team_members(id),
  status TEXT DEFAULT 'BACKLOG',         -- BACKLOG, IN_PROGRESS, IN_REVIEW, DONE
  priority TEXT DEFAULT 'MEDIUM',        -- LOW, MEDIUM, HIGH, CRITICAL
  estimated_hours REAL,
  actual_hours REAL,
  sprint_id INTEGER REFERENCES pm_sprints(id),
  ai_risk_score REAL,                    -- 0-1, set by AI analysis
  ai_status_confidence REAL,             -- 0-1, how sure the AI is
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity log (from all sources)
CREATE TABLE pm_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES pm_team_members(id),
  task_id INTEGER REFERENCES pm_tasks(id),
  source TEXT NOT NULL,                  -- 'github', 'slack', 'gmail', 'manual'
  activity_type TEXT NOT NULL,           -- 'commit', 'pr_opened', 'pr_merged', 'message', 'email', 'status_change'
  title TEXT,
  summary TEXT,
  raw_data TEXT,                         -- JSON string of original data
  external_url TEXT,                     -- link to PR, commit, Slack message, etc.
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alerts generated by the system
CREATE TABLE pm_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER REFERENCES pm_tasks(id),
  member_id INTEGER REFERENCES pm_team_members(id),
  alert_type TEXT NOT NULL,              -- 'stale_task', 'velocity_drop', 'blocker', 'review_bottleneck', 'scope_change'
  severity TEXT DEFAULT 'medium',        -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  suggested_action TEXT,
  is_acknowledged INTEGER DEFAULT 0,
  acknowledged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sprints / cycles
CREATE TABLE pm_sprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'PLANNING',        -- PLANNING, ACTIVE, COMPLETED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI context cache (rolling summaries per entity)
CREATE TABLE pm_ai_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,             -- 'task', 'member', 'sprint', 'project'
  entity_id INTEGER,
  context_summary TEXT,                  -- AI-generated rolling summary
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat history with the PM assistant
CREATE TABLE pm_chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,                    -- 'user' or 'assistant'
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Backend API Endpoints

All under `/api/pm/` — all protected by IP middleware.

```
AUTH
POST   /api/pm/auth/login           — PM-specific password check

TEAM
GET    /api/pm/team                  — List all team members
POST   /api/pm/team                  — Add team member
PUT    /api/pm/team/:id              — Update team member
DELETE /api/pm/team/:id              — Remove team member

TASKS
GET    /api/pm/tasks                 — List tasks (filter: status, assignee, sprint)
POST   /api/pm/tasks                 — Create task
PUT    /api/pm/tasks/:id             — Update task
DELETE /api/pm/tasks/:id             — Delete task
PATCH  /api/pm/tasks/:id/move        — Move task to new status column
PUT    /api/pm/tasks/:id/assign      — Assign/reassign task

ACTIVITY
GET    /api/pm/activity              — Combined activity feed (paginated)
GET    /api/pm/activity/member/:id   — Activity for one person

ALERTS
GET    /api/pm/alerts                — List active alerts
PATCH  /api/pm/alerts/:id/ack        — Acknowledge alert

INTEGRATIONS
GET    /api/pm/github/sync           — Trigger GitHub data pull
GET    /api/pm/github/activity       — Cached GitHub activity
GET    /api/pm/slack/sync            — Trigger Slack digest
GET    /api/pm/slack/digest          — Parsed Slack messages
GET    /api/pm/gmail/sync            — Trigger Gmail check
GET    /api/pm/gmail/digest          — CEO email summaries

AI
POST   /api/pm/chat                  — Send message to PM assistant
POST   /api/pm/analyze               — Trigger full AI analysis
GET    /api/pm/suggestions           — AI-generated task suggestions

SPRINTS
GET    /api/pm/sprints               — List sprints
POST   /api/pm/sprints               — Create sprint
PUT    /api/pm/sprints/:id           — Update sprint

REPORTS
GET    /api/pm/reports/weekly        — Generate weekly summary
GET    /api/pm/reports/velocity      — Team velocity data
```

---

## Build Phases

### Phase 1 — Foundation + Task Board (Week 1-2)
_Get a working PM panel with manual task tracking._

**Backend:**
- pmAccess.js middleware (IP restriction)
- PM auth endpoint (separate password)
- Database migration (all tables above)
- Team CRUD endpoints
- Task CRUD endpoints

**Frontend:**
- PMLogin.tsx (password gate)
- PMDashboard.tsx (tab layout: Team | Tasks | Activity | Alerts)
- TeamOverview.tsx + TeamMemberCard.tsx
- TaskBoard.tsx + TaskCard.tsx + TaskModal.tsx
- StatusBadge.tsx
- _pm.scss styles using OKLCH design system
- App.tsx route updates

**Result:** You can add your team, create tasks, move them across the board.

### Phase 2 — GitHub Integration (Week 3)
_Real engineering data flows in._

**Backend:**
- server/services/github.js (GitHub personal access token or GitHub App)
- Endpoints to sync and serve GitHub data
- Cron-like polling (every 15 min via setInterval or external cron)
- Activity log entries auto-created from GitHub events

**Frontend:**
- GithubWidget.tsx (PR list, commit feed per person)
- TeamMemberCard updated with GitHub data (last commit, open PRs)
- Activity feed shows GitHub entries with links

**Result:** Dashboard shows real commits and PRs per team member.

### Phase 3 — Slack Integration (Week 4-5)
_Bot reads standups and understands what people are working on._

**Backend:**
- Slack Bot Token (read-only: channels:history, channels:read, users:read)
- server/services/slack.js (poll channels, store messages)
- server/services/ai.js (Claude API processes Slack → structured data)
- Auto-detect task references, blockers, status updates from messages

**Frontend:**
- SlackWidget.tsx (daily digest of team communication)
- Task suggestion cards ("Sarah mentioned auth work → create task?")
- Blocker indicators on team member cards

**Conservative mode:** AI suggests task updates but never auto-applies them. You review and approve.

**Result:** You see what everyone posted in Slack, parsed into actionable summaries.

### Phase 4 — Gmail Integration (Week 5-6)
_CEO directives surfaced automatically._

**Backend:**
- Google OAuth (your Gmail, read-only scope)
- server/services/gmail.js (poll inbox, filter by CEO sender)
- Claude AI summarizes emails, extracts action items
- Maps directives to suggested priority changes

**Frontend:**
- GmailWidget.tsx (recent CEO emails with AI summaries)
- Action item suggestions surfaced in alerts panel

**Result:** CEO sends an email → you see a summary + suggested tasks within minutes.

### Phase 5 — Alerts + AI Chat (Week 7-8)
_Proactive risk detection and your AI assistant._

**Backend:**
- Alert engine (runs on schedule):
  - Stale task: no GitHub activity in X days
  - Velocity drop: person's output below their average
  - Review bottleneck: PRs waiting > 24h
  - Blocker detected: Slack messages flagged by AI
- Chat endpoint: sends your question + full team context to Claude API

**Frontend:**
- AlertsPanel.tsx + AlertCard.tsx (severity-colored, with suggested actions)
- PMChat.tsx (sidebar chat where you ask questions about the project)
  - "What's the status of the auth feature?"
  - "Who has bandwidth this week?"
  - "Draft a standup summary for today"

**Result:** The bot tells you what's wrong before you have to ask.

### Phase 6 — Sprints + Reports (Week 9-10)
_Structure your process + auto-generated reporting._

**Frontend:**
- SprintView.tsx (create sprints, assign tasks, track progress)
- Weekly report generation (markdown or PDF export)
- Velocity charts over time

**Result:** You can run proper sprints and send status reports to the CEO.

---

## Styling Approach

Follow your existing OKLCH design system in `_design-system.scss`. The PM dashboard uses a dark theme (matching your site's #121212 background) with your existing color tokens:

```scss
// In src/styles/pages/_pm.scss

// Use existing design system variables
.pm-dashboard {
  background: var(--neutral-950);   // darkest background
  color: var(--neutral-100);        // light text
}

.pm-card {
  background: var(--neutral-900);
  border: 1px solid var(--neutral-800);
  border-radius: 12px;
}

// Status colors map to existing semantic tokens
.status-badge--backlog    { background: var(--neutral-700); }
.status-badge--in-progress { background: var(--accent-600); }
.status-badge--in-review  { background: var(--info-500); }
.status-badge--done       { background: var(--success-500); }

// Alert severity
.alert--low      { border-left: 3px solid var(--info-500); }
.alert--medium   { border-left: 3px solid var(--warning-500); }
.alert--high     { border-left: 3px solid var(--error-500); }
.alert--critical { background: var(--error-900); border-left: 3px solid var(--error-500); }

// Priority badges
.priority--low      { color: var(--neutral-400); }
.priority--medium   { color: var(--accent-400); }
.priority--high     { color: var(--warning-400); }
.priority--critical { color: var(--error-400); }
```

---

## Environment Variables to Add

### Frontend (.env)
```
REACT_APP_PM_API_URL=https://ws.cnfabian.com/api/pm
```

### Backend (server/.env)
```
# PM Access
PM_ALLOWED_IPS=YOUR_HOME_IP,YOUR_OFFICE_IP
PM_PASSWORD_HASH=<bcrypt hash of your PM password>

# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_ORG=your-org-name

# Slack Integration
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx
SLACK_CHANNELS=standup,general,engineering

# Gmail Integration (OAuth)
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
GOOGLE_REFRESH_TOKEN=xxxxxxxx
GMAIL_CEO_EMAIL=ceo@company.com

# AI
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

---

## Setting Up Claude Code

You already have VS Code. Here's the setup:

```bash
# 1. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 2. Navigate to your personal website project
cd ~/Personal\ Projects/Personal-Website

# 3. Launch Claude Code
claude

# 4. It opens an interactive session in your terminal.
#    You type prompts and it reads/writes your codebase.
```

That's it — three commands and you're ready.

---

## How We Work Together

```
COWORK (Me)                          CLAUDE CODE (Your Terminal)
───────────────                      ──────────────────────────
Architecture & specs                 Writing component code
Design system decisions              Creating new files
API contract design                  Implementing API routes
Integration setup guides             Database migrations
AI prompt engineering                Installing packages
Reviewing outputs                    Running builds
Creating mockups                     Git operations
Next-phase planning                  Fixing lint/type errors
```

**The workflow for each phase:**

1. I write a detailed spec (types, API shape, component behavior)
2. You paste it to Claude Code as a prompt
3. Claude Code writes the code
4. You review in VS Code
5. Come back to me for the next spec or if something needs redesigning

---

## Claude Code Prompts (Ready to Paste)

### Prompt 1: Give Claude Code Context

```
Read these files to understand the project architecture:
- package.json
- src/App.tsx
- server/server.js
- server/db.js
- server/routes/auth.js
- src/pages/Secret.tsx (example of a protected page)
- src/styles/base/_design-system.scss
- amplify.yml

I'm adding a PM Dashboard feature to this site. It will be a private
project management tool at /pm that only I can access. I need you to
understand the existing patterns (routing, API structure, auth,
styling) because the PM feature will follow them exactly.
```

### Prompt 2: Backend Foundation

```
Create the PM dashboard backend foundation:

1. server/middleware/pmAccess.js
   - Export a middleware that checks req IP against PM_ALLOWED_IPS env var
   - Also check for a PM auth token in the Authorization header
   - Return 404 (not 403) if access denied — don't reveal the route exists
   - Parse x-forwarded-for header for the real IP behind Amplify

2. server/migrations/002-pm-tables.js
   - Create tables: pm_team_members, pm_tasks, pm_activity, pm_alerts,
     pm_sprints, pm_ai_context, pm_chat_history
   - Follow the schema in the build plan (I'll provide the SQL)

3. server/routes/pm.js
   - Mount at /api/pm in server.js
   - Apply pmAccess middleware to all routes
   - Implement: POST /auth/login (checks PM_PASSWORD_HASH with bcrypt)
   - Implement: full CRUD for /team and /tasks
   - Implement: GET /activity (paginated, filterable by member/source)
   - Implement: GET /alerts + PATCH /alerts/:id/ack
   - Use the same db.js pattern as the existing auth.js routes

4. Update server/server.js to:
   - Import and mount pm routes
   - Run the new migration on startup

Follow the exact code style of the existing server files.
```

### Prompt 3: Frontend Foundation

```
Create the PM dashboard frontend:

1. src/pages/pm/PMLogin.tsx
   - Simple password input page (dark theme matching site)
   - On submit, POST to /api/pm/auth/login
   - Store PM auth token in localStorage (key: 'pm_auth_token')
   - Redirect to /pm on success

2. src/pages/pm/PMDashboard.tsx
   - Check for pm_auth_token, redirect to /pm/login if missing
   - Tab navigation: Team | Tasks | Activity | Alerts
   - Render the active tab's component
   - Dark theme, uses OKLCH design system variables

3. Create these components in src/pages/pm/components/:
   - TeamOverview.tsx (fetches /api/pm/team, renders grid of cards)
   - TeamMemberCard.tsx (name, role, current task, status dot, days on task)
   - TaskBoard.tsx (4 columns: Backlog, In Progress, In Review, Done)
   - TaskCard.tsx (title, assignee, priority badge, days count)
   - TaskModal.tsx (form to create/edit tasks)
   - ActivityFeed.tsx (fetches /api/pm/activity, renders timeline)
   - AlertsPanel.tsx (fetches /api/pm/alerts, renders alert cards)
   - AlertCard.tsx (severity color, message, suggested action, ack button)
   - StatusBadge.tsx (reusable: pass status string, renders colored badge)

4. src/styles/pages/_pm.scss
   - Use OKLCH design system variables from _design-system.scss
   - Dark cards on dark background (neutral-900 on neutral-950)
   - Status colors: neutral-700 (backlog), accent-600 (in progress),
     info-500 (review), success-500 (done)
   - Alert severity: info (low), warning (medium), error (high/critical)

5. Update src/App.tsx
   - Add routes: /pm/login → PMLogin, /pm → PMDashboard
   - These should be fullscreen routes (no Navbar/Footer, like Casino)

All API calls should include the PM auth token in Authorization header.
Use fetch() following the same pattern as the casino auth system.
```

---

## What I'll Prepare Next

Tell me to start and I'll create:

1. The exact SQL for the database migration (ready to paste)
2. Integration setup guides (Slack Bot, GitHub token, Gmail OAuth)
3. The AI prompt templates for Slack/Gmail/GitHub parsing
4. A React mockup of the dashboard layout so you can see it before building
