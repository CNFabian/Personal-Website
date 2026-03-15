# PM Dashboard — Command Center View Spec

## The Vision

The PM dashboard transforms from a traditional kanban/table layout into a **Command Center** — a stylized 2D "operations hub" where your team members are operators at workstations. You can see everyone at a glance, their status radiates visually, and you interact with them by clicking — sending Slack messages, emails, checking their tasks, or getting AI-powered suggestions on what to say.

**Think:** A clean, minimal version of a cloud ops command center. Not pixel art, not isometric — flat, modern, animated, and functional. You're managing from the cloud.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  PM Command Bar (top)                                       │
│  [Daily Quests ✓3/7]  [Alerts 🔴2]  [Sprint: Week 2/2]    │
│  [AI Assistant]  [Search]  [Settings]                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│            ╭─────────╮          ╭─────────╮                 │
│            │  Sarah  │          │  Alex   │                 │
│            │  🟢 FE  │          │  🟡 BE  │                 │
│            │ Auth UI │          │ DB Migr │                 │
│            │ 2 days  │          │ 4 days  │                 │
│            ╰─────────╯          ╰─────────╯                 │
│                                                             │
│     ╭─────────╮     ╭─────────╮     ╭─────────╮            │
│     │  Jordan │     │  Casey  │     │  Riley  │            │
│     │  🟢 FS  │     │  🔴 BE  │     │  🟢 DE  │            │
│     │ API End │     │ BLOCKED │     │ Figma   │            │
│     │ 1 day   │     │ 6 days  │     │ < 1 day │            │
│     ╰─────────╯     ╰─────────╯     ╰─────────╯            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Daily Quest Panel (bottom drawer, expandable)              │
│  ☐ Review open PRs (3 pending)                              │
│  ☑ Post standup summary                                     │
│  ☐ Check in with Casey (blocked 6 days)                     │
│  ☐ Review tech checklist items from Google Drive             │
│  Streak: 🔥 4 days                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Team Member "Stations"

Each team member is a **card/station** on the command center floor. Not a boring table row — a living, breathing visual element.

### Station Anatomy

```
╭──────────────────────╮
│  ┌────┐              │
│  │ CF │  Chris F.    │  ← Avatar (initials or image) + Name
│  └────┘  Frontend    │  ← Role
│                      │
│  🟢 Building Auth UI │  ← Status dot + Current task
│  ████████░░ 70%      │  ← Progress bar (if estimated hours set)
│  Day 2 of ~5         │  ← Time tracking
│                      │
│  💬 3  🔀 1  ⚠️ 0    │  ← Slack messages today, Open PRs, Blockers
╰──────────────────────╯
```

### Visual States

**Status glow ring** around the station card:
- 🟢 Green pulse — active, recent commits/messages today
- 🟡 Yellow steady — no activity in 2+ days, or approaching threshold
- 🔴 Red pulse — blocked, stale 5+ days, or has critical alert
- ⚪ Gray — inactive / on PTO

**Hover effect:** Card lifts slightly, shows a subtle shadow, and displays a quick-action toolbar above it.

**Idle animation:** Subtle breathing animation on the status dot (scale 1.0 → 1.1 → 1.0, 2s loop). Cards with activity get a brief sparkle/flash when new data arrives.

---

## Click Interaction — Member Detail Panel

Clicking a team member station opens a **slide-in panel** from the right side:

```
┌─ Sarah Chen ──────────────────────────────┐
│                                            │
│  ┌────┐  Sarah Chen                        │
│  │ SC │  Frontend Engineer                 │
│  └────┘  sarah@company.com                 │
│                                            │
│  ── Quick Actions ──────────────────────── │
│  [💬 Slack]  [📧 Email]  [🤖 AI Suggest]  │
│                                            │
│  ── Current Work ───────────────────────── │
│  Auth UI Components                        │
│  Status: In Progress · Priority: High      │
│  Started: 2 days ago · Est: 5 days         │
│  ████████░░░░░░ 60%                        │
│                                            │
│  ── Recent Activity ────────────────────── │
│  🔀 PR #142: "Add login form validation"   │
│     2 hours ago · +48/-12 lines            │
│  💬 "finishing up the auth form, will push  │
│     the token flow tomorrow"               │
│     4 hours ago · #standup                  │
│  📝 Committed: "feat: add JWT refresh"     │
│     Yesterday · auth-ui branch             │
│                                            │
│  ── AI Insights ────────────────────────── │
│  "Sarah is on track. Her last commit was   │
│  2h ago and she posted a standup update.    │
│  Auth UI should be ready for review by     │
│  Thursday based on current velocity."       │
│                                            │
│  ── Open PRs ───────────────────────────── │
│  #142 Add login form validation (2h ago)   │
│  #138 Auth context provider (review ✓)     │
│                                            │
└────────────────────────────────────────────┘
```

### Quick Action: Slack Message

Clicking "Slack" opens an inline message composer:
```
┌─ Message Sarah on Slack ─────────────────┐
│                                           │
│  Channel: [#engineering ▼]                │
│                                           │
│  ┌───────────────────────────────────┐    │
│  │ Hey Sarah, how's the auth UI      │    │
│  │ coming along? Need anything?      │    │
│  └───────────────────────────────────┘    │
│                                           │
│  [🤖 AI Draft]  [Cancel]  [Send 💬]      │
│                                           │
└───────────────────────────────────────────┘
```

### Quick Action: AI Suggest

Clicking "AI Suggest" generates context-aware options:
```
┌─ AI Suggestions for Sarah ───────────────┐
│                                           │
│  Based on Sarah's current status:         │
│                                           │
│  💬 Check-in message (Slack):             │
│  "Hey Sarah, saw your commit on the JWT   │
│  refresh. Nice work! Are you still on     │
│  track for Thursday review?"              │
│  [Send to Slack]  [Edit first]            │
│                                           │
│  📧 Status request (Email):              │
│  "Quick check — any blockers on the       │
│  auth UI? Want to make sure we're good    │
│  for the sprint deadline."                │
│  [Send Email]  [Edit first]              │
│                                           │
│  ℹ️ No action needed right now.           │
│  Sarah is active and on track.            │
│                                           │
└───────────────────────────────────────────┘
```

---

## Daily Quests Panel

A bottom drawer that slides up, showing your daily PM checklist.

### Two Sources

**1. AI-Generated Priorities** (refreshed each morning)
The AI analyzes project state and creates your daily priorities:
- "Check in with Casey — blocked for 6 days on database migration"
- "Review PR #142 from Sarah — open 3 hours, needs your review"
- "Sprint ends Friday — 3 tasks still in progress, assess if they'll land"

**2. Google Drive Tech Checklist** (synced)
Items pulled from your Google Drive document that tracks the technical checklist:
- "Complete API documentation for auth endpoints"
- "Set up staging environment"
- "Configure CI/CD pipeline"

### Quest UI

```
╭── Daily Quests ─── 🔥 4-day streak ──────────╮
│                                                │
│  AI Priorities                     3/5 done    │
│  ☑ Post standup summary in #standup            │
│  ☑ Review Sarah's PR #142                      │
│  ☑ Update sprint board with new tasks          │
│  ☐ Check in with Casey (blocked 6 days)        │
│  ☐ Send weekly update to CEO                   │
│                                                │
│  Tech Checklist (from Google Drive)  2/8 done  │
│  ☑ Auth API endpoints complete                 │
│  ☑ Database schema finalized                   │
│  ☐ Set up staging environment                  │
│  ☐ Configure CI/CD pipeline                    │
│  ☐ Write API documentation                     │
│  ☐ Load testing setup                          │
│  ☐ Security audit prep                         │
│  ☐ Monitoring and alerting                     │
│                                                │
│  Completed today: 5  |  Streak: 🔥 4 days      │
╰────────────────────────────────────────────────╯
```

### Gamification Elements

- **Daily streak** — consecutive days with all AI priorities completed
- **Completion rate** — percentage badge that fills up through the day
- **"All Clear" celebration** — subtle confetti animation when all quests are done
- **Weekly summary** — "You completed 34/38 quests this week (89%)"

---

## Navigation

The Command Center is the **default view** when you log in. The existing tab views (Team table, Kanban, Activity, Alerts) become secondary views accessible from the command bar:

```
[🎯 Command Center]  [📋 Board]  [📊 Activity]  [🚨 Alerts]  [💬 Chat]  [📋 Quests]
```

- **Command Center** — the operations hub (default)
- **Board** — the kanban task board (already built)
- **Activity** — the activity feed (already built)
- **Alerts** — the alerts panel (already built)
- **Chat** — the AI assistant (Phase 5)
- **Quests** — expanded daily quests view

---

## Technical Implementation

### Built in React + CSS (Not Phaser)

The clean flat 2D style doesn't need a game engine. React + SCSS + CSS animations gives us:
- Better accessibility
- Easier to maintain
- Integrates naturally with the existing dashboard components
- Can still feel game-like with the right animations

### New Components

```
src/pages/pm/components/
├── CommandCenter.tsx            (main operations hub workspace)
├── MemberStation.tsx            (individual team member card/station)
├── MemberDetailPanel.tsx        (slide-in panel on click)
├── QuickActionMenu.tsx          (Slack/Email/AI action buttons)
├── SlackComposer.tsx            (inline Slack message composer)
├── EmailComposer.tsx            (inline email composer)
├── AISuggestions.tsx            (AI-generated action suggestions)
├── DailyQuestsPanel.tsx         (bottom drawer with quests)
├── QuestItem.tsx                (individual quest/checklist item)
├── StreakTracker.tsx             (streak counter with fire animation)
├── CommandBar.tsx                (top navigation bar)
├── Confetti.tsx                 (celebration animation)
└── GoogleDriveChecklist.tsx     (synced checklist from Drive)
```

### New Backend Endpoints

```
POST   /api/pm/slack/send         — Send a Slack message
POST   /api/pm/email/send         — Send an email
POST   /api/pm/ai/suggest-action  — Get AI suggestions for a team member
GET    /api/pm/quests/daily       — Get today's AI-generated quests
POST   /api/pm/quests/:id/complete — Mark a quest complete
GET    /api/pm/quests/streak      — Get current streak data
GET    /api/pm/drive/checklist    — Fetch tech checklist from Google Drive
POST   /api/pm/drive/checklist/:id/toggle — Toggle a checklist item
```

### New Database Tables

```sql
CREATE TABLE pm_daily_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  quest_type TEXT NOT NULL,         -- 'ai_priority' or 'drive_checklist'
  title TEXT NOT NULL,
  description TEXT,
  source_id TEXT,                   -- Google Drive item ID or null
  is_completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pm_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  total_quests_completed INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Google Drive Integration

### How It Works

1. You have a Google Doc or Sheet with your tech checklist
2. The PM dashboard reads it via Google Drive API (you already have Gmail OAuth — same credentials work)
3. Checklist items appear in your Daily Quests panel
4. When you check them off in the dashboard, it can optionally update the Drive doc too

### Scopes Needed (add to existing Gmail OAuth)

```
https://www.googleapis.com/auth/drive.readonly
```

Or for two-way sync:
```
https://www.googleapis.com/auth/drive.file
```

---

## Build Order

1. **CommandCenter + MemberStation** — the operations hub with team member cards
2. **MemberDetailPanel** — click-to-open detail panel
3. **QuickActionMenu + SlackComposer** — messaging from the dashboard
4. **DailyQuestsPanel + QuestItem** — daily checklist system
5. **AISuggestions** — AI-powered interaction suggestions
6. **GoogleDriveChecklist** — synced tech checklist
7. **StreakTracker + Confetti** — gamification polish
8. **CommandBar** — unified top navigation
