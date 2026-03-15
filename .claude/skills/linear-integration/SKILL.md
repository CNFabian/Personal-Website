---
name: linear
description: "Linear integration skill for the PM dashboard. Use when building Linear features, syncing tasks with Linear, querying Linear API, managing issues/projects/cycles in Linear, or importing/exporting between Linear and the PM dashboard. Triggers on: Linear, issue tracker, cycle, project tracking, sync tasks, import issues."
---

# Linear Integration Skill

## Linear API Fundamentals

### Authentication
Use a **Linear API Key** (personal) or **OAuth App** (team-wide).
Store in `LINEAR_API_KEY` env var.

Get your API key: Linear → Settings → API → Personal API Keys → Create Key

### API Type: GraphQL
Linear uses GraphQL exclusively. Base URL: `https://api.linear.app/graphql`

```javascript
async function linearQuery(query, variables = {}) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}
```

### Key Queries

**Fetch all issues assigned to the team:**
```graphql
query TeamIssues($teamId: String!) {
  team(id: $teamId) {
    issues(first: 100, orderBy: updatedAt) {
      nodes {
        id
        identifier
        title
        description
        state { name type }
        assignee { name email }
        priority
        estimate
        createdAt
        updatedAt
        startedAt
        completedAt
        cycle { number name startsAt endsAt }
        labels { nodes { name color } }
        comments { nodes { body user { name } createdAt } }
      }
    }
  }
}
```

**Fetch active cycle:**
```graphql
query ActiveCycle($teamId: String!) {
  team(id: $teamId) {
    activeCycle {
      id
      number
      name
      startsAt
      endsAt
      issues { nodes { id title state { name } assignee { name } } }
    }
  }
}
```

**Fetch a user's assigned issues:**
```graphql
query MyIssues {
  viewer {
    assignedIssues(first: 50, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
      nodes {
        id identifier title state { name } priority updatedAt
      }
    }
  }
}
```

### Rate Limits
- 1,500 requests per hour
- Complex queries count as more than 1 request
- Implement request counting and throttling

## Syncing Linear ↔ PM Dashboard

### Two-Way Sync Strategy

**Linear → PM Dashboard (read):**
- Poll Linear every 10 minutes for updated issues
- Map Linear issue states to PM task statuses:
  - Backlog/Triage → BACKLOG
  - Todo/In Progress → IN_PROGRESS
  - In Review → IN_REVIEW
  - Done/Canceled → DONE
- Store Linear issue ID in pm_tasks as `external_id`
- Store Linear data in `pm_activity` with `source: 'linear'`

**PM Dashboard → Linear (write, future):**
- When Chris creates a task in the PM dashboard, optionally create in Linear
- When Chris moves a task, optionally update Linear state
- Always ask Chris before pushing changes to Linear

### Mapping Linear Priorities to PM Priorities
- Linear 0 (No priority) → PM LOW
- Linear 1 (Urgent) → PM CRITICAL
- Linear 2 (High) → PM HIGH
- Linear 3 (Medium) → PM MEDIUM
- Linear 4 (Low) → PM LOW

### Field Mapping

| Linear Field | PM Dashboard Field |
|-------------|-------------------|
| title | title |
| description | description |
| assignee.email | → match to pm_team_members.email |
| state.name | status (mapped) |
| priority | priority (mapped) |
| estimate | estimated_hours (Linear points × team velocity factor) |
| cycle | sprint_id (match by date range) |
| startedAt | started_at |
| completedAt | completed_at |
| comments | → pm_activity entries |

## Linear Webhook Setup (Preferred Over Polling)

Instead of polling, set up webhooks for real-time updates:

1. Linear → Settings → API → Webhooks → Create Webhook
2. URL: `https://ws.cnfabian.com/api/pm/integrations/linear/webhook`
3. Select events: Issue created, updated, deleted; Comment created

```javascript
// Webhook handler in server/routes/pm.js
router.post('/integrations/linear/webhook', (req, res) => {
  const { action, type, data } = req.body;

  // Verify webhook signature
  // Process the event
  // Update pm_tasks and pm_activity accordingly

  res.status(200).send('ok');
});
```

## Linear Setup Steps

1. Create a Linear workspace if you don't have one: https://linear.app
2. Create a team for NestNavigate
3. Go to Settings → API → Personal API Keys → Create Key
4. Add `LINEAR_API_KEY=lin_api_...` to server/.env
5. Add `LINEAR_TEAM_ID=...` to server/.env (find in team settings URL)
6. Optionally set up the webhook for real-time sync
