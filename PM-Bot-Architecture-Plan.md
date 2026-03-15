# NestNavigate PM Bot — Architecture & Build Plan

## What This Is

An AI-powered project management dashboard that acts as your personal command center for overseeing the entire tech side of NestNavigate. It monitors your team (6–15 engineers), understands what everyone is working on by pulling data from GitHub, Slack, and Gmail, flags risks before they become problems, and helps you coordinate like a senior PM.

---

## The Problem It Solves

Right now, understanding project status requires you to mentally stitch together information from Slack threads, GitHub PRs, meetings, and CEO emails. There's no single source of truth, no formal task tracking, and no automated way to know if someone's been stuck on something for 5 days. This bot becomes that single source of truth.

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                  PM DASHBOARD (UI)                   │
│  Team View · Task Board · Timeline · Alerts · Chat  │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   API SERVER    │
              │  (Next.js API)  │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │  AI     │   │  Data   │   │  Integ- │
   │  Engine │   │  Store  │   │  rations│
   │ (Claude)│   │ (Postgres│   │  Layer  │
   └─────────┘   │  + Redis)│   └────┬────┘
                  └─────────┘        │
                          ┌──────────┼──────────┐
                     ┌────▼──┐  ┌───▼───┐  ┌──▼────┐
                     │ Gmail │  │ Slack │  │GitHub │
                     │  API  │  │  API  │  │  API  │
                     └───────┘  └───────┘  └───────┘
```

---

## Recommended Tech Stack

**Why Next.js 14+ (App Router)**

Your team already knows React and TypeScript. Next.js gives you the frontend AND the backend in one project — API routes for all integrations, server components for fast dashboard loads, and easy deployment to Vercel. No need to maintain two separate repos.

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Full-stack React, API routes, SSR, your team knows React/TS |
| Database | PostgreSQL (via Supabase or Neon) | Relational data fits team/task/status models; free tiers available |
| Cache/Realtime | Redis (Upstash) | Caching API responses, rate limiting, real-time pub/sub |
| AI | Claude API (Anthropic) | Processes Slack/Gmail/GitHub data into structured task intelligence |
| Auth | NextAuth.js | OAuth flows for Gmail, Slack, GitHub in one place |
| ORM | Prisma | Type-safe database queries, migrations, schema management |
| UI | Tailwind CSS + shadcn/ui | Matches your existing design expertise; fast to build dashboards |
| Charts | Recharts | Already in your dependency tree for NestNavigate |
| Deployment | Vercel | Zero-config for Next.js, automatic previews |
| Cron Jobs | Vercel Cron or Inngest | Scheduled data syncs (every 15 min for Slack, hourly for Gmail) |

---

## Core Features (Phased)

### Phase 1 — Foundation (Weeks 1–3)
_Get the skeleton running with real data flowing in._

**1.1 Team Roster & Manual Task Board**
- Add team members (name, role, GitHub handle, Slack ID)
- Kanban board: Backlog → In Progress → In Review → Done
- Manual task creation with assignee, priority, estimated time
- This gives you a working tool immediately, even before integrations

**1.2 GitHub Integration**
- OAuth connection to your org's GitHub
- Auto-pull: open PRs, PR reviews, commit activity per person
- Map branches/PRs to tasks (convention: branch name includes task ID)
- Show per-person: last commit, open PRs, review requests pending

**1.3 Basic Dashboard**
- Team overview: each person as a card showing current task + last activity
- Simple status indicators (green/yellow/red based on days on task)
- Activity feed: latest commits, PR merges, task moves

### Phase 2 — Intelligence Layer (Weeks 4–6)
_The bot starts "understanding" what's happening._

**2.1 Slack Integration**
- Connect via Slack Bot (scoped to specific channels)
- Monitor standup channel for daily updates
- AI parses messages to extract: what someone is working on, blockers mentioned, status updates
- Auto-suggests task status changes based on Slack activity

**2.2 Gmail Integration**
- OAuth to your Gmail (read-only)
- Filter for CEO emails, stakeholder updates, key threads
- AI summarizes incoming directives and maps them to action items
- "CEO said X about Y" → suggested task or priority change

**2.3 AI-Powered Status Detection**
- Claude processes all signals (GitHub + Slack + Gmail) to determine:
  - What each person is likely working on right now
  - Whether they seem blocked (no commits + Slack mentions of issues)
  - Whether a task is taking longer than expected
- Confidence score on each inference (so you know what to verify)

### Phase 3 — Alerts & PM Assistant (Weeks 7–9)
_The bot becomes proactive and helps you act._

**3.1 Smart Flagging System**
- Time alerts: Task open > X days with no PR activity
- Velocity alerts: Person's output dropped significantly vs. their baseline
- Blocker detection: Slack messages containing blocker-like language
- Review bottlenecks: PRs sitting without review > 24 hours
- Scope creep: Task description changed significantly after starting
- Each flag includes context (why it flagged) + suggested action

**3.2 PM Chat Assistant**
- Chat interface in the dashboard where you can ask questions:
  - "What's the status of the auth feature?"
  - "Who has bandwidth to pick up the new API work?"
  - "Give me a standup summary for today"
  - "Draft a message to the team about the deadline change"
- Claude has full context of all team data, tasks, and recent activity
- Can generate: status reports, meeting agendas, Slack messages, email drafts

**3.3 Process Enforcement**
- Define your workflow rules (e.g., "every task needs a PR within 3 days")
- Bot monitors compliance and nudges (via dashboard alerts, optionally via Slack DM)
- Helps formalize your dev process without you having to police it manually

### Phase 4 — Advanced Features (Weeks 10–12)
_Polish and power-user features._

**4.1 Sprint/Cycle Planning**
- Group tasks into sprints or cycles
- Capacity planning: see each person's load vs. available hours
- Historical velocity tracking to improve estimation

**4.2 Reporting & Analytics**
- Weekly/monthly reports auto-generated
- Team velocity trends, cycle time, PR turnaround
- Individual performance patterns (not for punishment — for identifying who needs support)
- Export to PDF or email to CEO

**4.3 Timeline & Dependency View**
- Gantt-style view of all in-flight work
- Dependency mapping between tasks
- Critical path highlighting

**4.4 Team-Facing Mode (Optional)**
- If you decide to open it up, team members get their own view
- They see their tasks, can update status, log blockers
- Reduces your need to chase people for updates

---

## How the AI "Understands" Tasks

This is the core innovation. Here's the data pipeline:

```
Raw Data Sources          AI Processing              Structured Output
─────────────────    ─────────────────────    ──────────────────────
GitHub commits    →                          → Task: "Auth API"
GitHub PRs        →   Claude analyzes all    → Status: In Progress
Slack messages    →   signals together and   → Assignee: Sarah
Gmail threads     →   produces structured    → Risk: Medium (no PR in 3 days)
Manual inputs     →   task intelligence      → Blocker: Waiting on design spec
                                             → Last Activity: 2h ago (Slack)
                                             → Suggested Action: Check in with Sarah
```

**The AI prompt chain works like this:**

1. **Ingestion** — Every 15 min, pull new data from all sources
2. **Entity Resolution** — Match Slack user → GitHub user → team member
3. **Activity Classification** — Is this message a status update? A blocker? A question? Casual chat?
4. **Task Mapping** — Which task does this activity relate to? (Uses branch names, keywords, context)
5. **Status Inference** — Given all signals, what's the likely status of this task?
6. **Risk Assessment** — Based on time elapsed, activity patterns, and blockers, what's the risk level?
7. **Action Suggestion** — What should you (the APM) do about it?

---

## Database Schema (Simplified)

```
Team Members
├── id, name, email, role
├── github_handle, slack_id
└── avatar_url, capacity_hours

Tasks
├── id, title, description
├── assignee_id, status, priority
├── estimated_hours, actual_hours
├── started_at, completed_at
├── sprint_id, parent_task_id
└── ai_risk_score, ai_status_confidence

Activity Log
├── id, team_member_id, task_id
├── source (github | slack | gmail | manual)
├── activity_type (commit | pr | message | email | status_change)
├── raw_content, ai_summary
└── timestamp

Alerts
├── id, task_id, team_member_id
├── alert_type (time | velocity | blocker | review)
├── severity (low | medium | high | critical)
├── message, suggested_action
├── acknowledged, acknowledged_at
└── created_at

Sprints
├── id, name, goal
├── start_date, end_date
└── status

AI Context
├── id, entity_type (task | person | sprint)
├── entity_id
├── context_summary (rolling AI summary)
└── last_updated
```

---

## Key API Routes

```
/api/auth/[...nextauth]     — OAuth for Gmail, Slack, GitHub
/api/team/                   — CRUD team members
/api/tasks/                  — CRUD tasks, bulk status updates
/api/tasks/[id]/activity     — Activity feed for a task
/api/integrations/github/    — GitHub webhook receiver + sync
/api/integrations/slack/     — Slack event receiver + sync
/api/integrations/gmail/     — Gmail push notification receiver + sync
/api/ai/chat                 — PM assistant chat endpoint
/api/ai/analyze              — Trigger AI analysis of recent activity
/api/alerts/                 — List/acknowledge alerts
/api/reports/weekly          — Generate weekly report
/api/cron/sync               — Scheduled data sync endpoint
```

---

## Build Order (What to Code First)

This is the actual coding sequence, optimized for getting value fast:

```
Week 1:
├── Next.js project setup + Prisma + PostgreSQL
├── Auth (NextAuth with GitHub OAuth)
├── Team member CRUD + basic UI
└── Manual task board (Kanban)

Week 2:
├── GitHub integration (OAuth + webhook)
├── PR and commit data ingestion
├── Activity feed component
└── Per-person activity cards

Week 3:
├── Dashboard layout with team overview
├── Basic flagging (time-based alerts)
├── Status indicators on task cards
└── Deploy v0.1 — usable manual board with GitHub data

Week 4:
├── Slack Bot setup + event subscription
├── Slack message ingestion pipeline
├── Claude AI: message classification
└── Auto-task-status suggestions from Slack

Week 5:
├── Gmail OAuth + read-only access
├── CEO email filter + summarization
├── AI: cross-source task mapping
└── Risk scoring algorithm

Week 6:
├── PM Chat assistant (Claude-powered)
├── "Ask about any task/person" capability
├── Standup summary generation
└── Deploy v0.2 — AI-powered status tracking

Week 7-8:
├── Smart alert system (all flag types)
├── Process rule definition
├── Alert dashboard + notification system
└── Sprint planning features

Week 9-10:
├── Reporting engine
├── Analytics dashboard (velocity, cycle time)
├── Timeline/Gantt view
└── Deploy v0.3 — full PM command center

Week 11-12:
├── Polish, performance, edge cases
├── Team-facing mode (if desired)
├── Mobile-responsive tweaks
└── v1.0 launch
```

---

## Cost Estimates

| Service | Free Tier | Paid (if needed) |
|---------|-----------|-------------------|
| Vercel | 100GB bandwidth, serverless functions | $20/mo Pro |
| Supabase (Postgres) | 500MB, 50k requests | $25/mo Pro |
| Upstash (Redis) | 10k commands/day | $10/mo |
| Claude API | Pay per token | ~$30–80/mo depending on volume |
| Slack API | Free for bot | Free |
| Gmail API | Free (quota limits) | Free |
| GitHub API | 5k requests/hr | Free |
| **Total** | **~$0 to start** | **~$85–135/mo at scale** |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| AI misinterprets Slack messages | Show confidence scores; require manual confirmation for status changes initially |
| Team feels surveilled | Position as YOUR tool, not a monitoring tool; focus on removing blockers, not tracking output |
| Gmail API rate limits | Cache aggressively; only poll relevant threads; use push notifications |
| Scope creep on the bot itself | Stick to phases; Phase 1 is useful on its own |
| Data privacy concerns | All data stays in your own database; no third-party analytics on team data |

---

## Decision Points for You

Before we start building, you should decide:

1. **Separate repo or monorepo?** — I'd recommend a separate repo since this is a different product (PM tool vs. consumer product), but it could share the Vercel account.

2. **Who builds this?** — Is this something you're coding yourself, or will a team member help? This affects timeline.

3. **Slack: read-only or interactive?** — Read-only is simpler (just parse messages). Interactive means the bot can post in channels, DM people, etc.

4. **How aggressive should AI automation be?** — Conservative (suggests changes, you approve) vs. aggressive (auto-updates task status, auto-creates tasks from Slack)?

5. **Do you want to start building Phase 1 now?** — I can scaffold the entire Next.js project with the database schema, auth, and task board today.
