---
name: slack
description: "Slack integration skill for the PM dashboard. Use when building Slack features, parsing Slack messages, creating Slack bots, drafting Slack messages, setting up webhooks, or working with the Slack API. Triggers on: Slack, standup channel, team messages, bot, webhook, channel history."
---

# Slack Integration Skill

## Slack API Fundamentals

### Authentication
Use a **Slack Bot Token** (starts with `xoxb-`). Store in `SLACK_BOT_TOKEN` env var.

Required OAuth scopes (read-only for PM dashboard):
- `channels:history` — read messages in public channels
- `channels:read` — list channels, get channel info
- `groups:history` — read messages in private channels the bot is in
- `groups:read` — list private channels
- `users:read` — get user info (name, email, avatar)
- `users:read.email` — get user email addresses

Optional scopes (for future interactive features):
- `chat:write` — send messages as the bot
- `reactions:read` — read emoji reactions

### Key API Endpoints

```
GET  conversations.list     — list channels
GET  conversations.history  — get messages from a channel
GET  conversations.replies  — get thread replies
GET  users.list             — list workspace users
GET  users.info             — get user details
POST chat.postMessage       — send a message (future feature)
```

### Rate Limits
- Tier 3 methods (conversations.history): 50 requests per minute
- Tier 2 methods (users.list): 20 requests per minute
- Always implement exponential backoff on 429 responses
- Cache user info aggressively (users don't change often)

## Building the Slack Service

### File: `server/services/slack.js`

```javascript
// Pattern to follow
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_BASE_URL = 'https://slack.com/api';

async function slackAPI(method, params = {}) {
  const url = new URL(`${SLACK_BASE_URL}/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` }
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return data;
}
```

### Polling Strategy
- Poll standup/engineering channels every 15 minutes
- Store last fetched timestamp per channel to avoid re-processing
- Use `oldest` parameter in conversations.history for incremental fetches
- Store raw messages in `pm_activity` table with `source: 'slack'`

### Message Parsing with AI

When processing Slack messages through Claude API, use this system prompt:

```
You are parsing Slack messages from a software engineering team.
For each message, extract:

1. activity_type: "status_update" | "blocker" | "question" | "announcement" | "casual" | "pr_mention" | "deploy" | "review_request"
2. task_reference: any task or feature mentioned (null if none)
3. blocker: is the person blocked on something? (null or description)
4. sentiment: "positive" | "neutral" | "frustrated" | "urgent"
5. summary: one-sentence summary of the message content
6. action_needed: does the PM need to do anything? (null or suggested action)

Return valid JSON only. Be conservative — only flag as "blocker"
if the person explicitly says they're stuck or waiting.
```

### Mapping Slack Users to Team Members
- Match by `slack_id` field in `pm_team_members` table
- Fall back to email matching if slack_id not set
- On first setup, fetch users.list and let Chris map them

## Drafting Slack Messages

When Chris asks to draft a Slack message:
- Keep it concise (< 300 words for channel posts)
- Use Slack markdown: *bold*, _italic_, `code`, ```code blocks```
- Use bullet points with `•` for lists
- Tag people with `<@SLACK_USER_ID>` format
- Use emoji sparingly and only standard ones (:white_check_mark:, :warning:, :rocket:)
- Thread long discussions — don't spam the main channel

### Message Templates

**Sprint kickoff:**
```
*Sprint [N] Kickoff* :rocket:

*Goal:* [one sentence]

*Key deliverables:*
• [task 1] — @assignee
• [task 2] — @assignee
• [task 3] — @assignee

*Capacity notes:* [any PTO or reduced availability]

Let's have a great sprint! Questions → thread please.
```

**Blocker escalation:**
```
:warning: *Blocker Alert*

[Person] is blocked on [task/description].
*Blocking:* [what can't proceed until this is resolved]
*Needed:* [specific action/person needed]
*Impact:* [timeline impact if not resolved by X]

Can we get this unblocked today?
```

**End-of-week update:**
```
*Weekly Update — [Date]*

:white_check_mark: *Shipped:*
• [completed item 1]
• [completed item 2]

:construction: *In Progress:*
• [active item 1] — [status/ETA]
• [active item 2] — [status/ETA]

:rotating_light: *Needs Attention:*
• [risk/blocker if any]

Next week's focus: [1-2 sentences]
```

## Slack Bot Setup Steps

1. Go to https://api.slack.com/apps → Create New App → From Scratch
2. Name: "PM Dashboard Bot", select your workspace
3. Go to OAuth & Permissions → add the scopes listed above
4. Install to Workspace → copy the Bot User OAuth Token
5. Add `SLACK_BOT_TOKEN=xoxb-...` to server/.env
6. Invite the bot to channels: `/invite @PM Dashboard Bot`
7. Note the channel IDs (right-click channel name → Copy Link → ID is the last segment)
8. Add `SLACK_CHANNELS=C0123STANDUP,C0456ENGINEERING` to server/.env
