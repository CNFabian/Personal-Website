# Integration Setup Guide

Step-by-step instructions for connecting GitHub, Slack, and Gmail to your PM Dashboard.

---

## 1. GitHub Setup (5 minutes)

### Create a Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "PM Dashboard"
4. Expiration: 90 days (or no expiration)
5. Select scopes:
   - `repo` (full repo access — needed for private repos)
   - `read:org` (read org membership)
6. Click "Generate token"
7. Copy the token (starts with `ghp_`)

### Add to your server .env

```
GITHUB_TOKEN=ghp_your_token_here
GITHUB_ORG=your-github-org-name
```

If your repos are under your personal account instead of an org, use your GitHub username as GITHUB_ORG.

### Map team members

After adding team members to the PM dashboard, fill in their `github_handle` field so the sync knows which commits belong to whom.

---

## 2. Slack Setup (10 minutes)

### Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. App name: "PM Dashboard Bot"
4. Select your workspace
5. Click "Create App"

### Add Permissions

1. In the left sidebar, click "OAuth & Permissions"
2. Scroll to "Scopes" → "Bot Token Scopes"
3. Add these scopes:
   - `channels:history` — read public channel messages
   - `channels:read` — list public channels
   - `groups:history` — read private channel messages (if bot is invited)
   - `groups:read` — list private channels
   - `users:read` — get user info
   - `users:read.email` — get user emails (for matching to team members)

### Install to Workspace

1. Scroll up to "OAuth Tokens" section
2. Click "Install to Workspace"
3. Review permissions and click "Allow"
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### Get Channel IDs

1. In Slack, right-click the channel name you want to monitor
2. Click "View channel details"
3. At the bottom, copy the Channel ID (e.g., `C04ABCDEF12`)
4. Do this for each channel (standup, engineering, general, etc.)

### Invite the Bot

In each channel you want to monitor, type:
```
/invite @PM Dashboard Bot
```

### Add to your server .env

```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_CHANNELS=C04STANDUP123,C04ENGINEERING456
```

### Map team members

After adding team members, fill in their `slack_id` field. You can find someone's Slack ID by clicking their profile → clicking the three dots → "Copy member ID".

---

## 3. Gmail Setup (15 minutes)

### Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project: "PM Dashboard"
3. Enable the Gmail API:
   - Go to "APIs & Services" → "Library"
   - Search "Gmail API" → Click it → Click "Enable"

### Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the consent screen first:
   - User type: External (or Internal if using Google Workspace)
   - App name: "PM Dashboard"
   - Your email as support and developer contact
   - Add scope: `https://www.googleapis.com/auth/gmail.readonly`
   - Add yourself as a test user
4. Back in Credentials, create OAuth client:
   - Application type: "Web application"
   - Name: "PM Dashboard"
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
5. Copy the Client ID and Client Secret

### Get Refresh Token

1. Go to https://developers.google.com/oauthplayground
2. Click the gear icon (top right) → check "Use your own OAuth credentials"
3. Paste your Client ID and Client Secret
4. In the left panel, find "Gmail API v1" → select `https://www.googleapis.com/auth/gmail.readonly`
5. Click "Authorize APIs" → Sign in with YOUR Google account → Allow
6. Click "Exchange authorization code for tokens"
7. Copy the "Refresh token"

### Add to your server .env

```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GMAIL_CEO_EMAIL=ceo@yourcompany.com
GMAIL_IMPORTANT_SENDERS=cto@yourcompany.com,stakeholder@yourcompany.com
```

---

## 4. Claude AI Setup (2 minutes)

### Get API Key

1. Go to https://console.anthropic.com
2. Create an account or log in
3. Go to "API Keys" → "Create Key"
4. Copy the key (starts with `sk-ant-`)

### Add to your server .env

```
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

---

## 5. Start the Scheduler

Once integrations are configured, add the scheduler to your server. In `server/server.js`, add:

```javascript
const { startScheduler } = require('./services/scheduler');

// After the server starts listening:
startScheduler();
```

The scheduler will automatically skip any integrations that aren't configured, so you can add them one at a time.

---

## Complete .env Template

```
# Existing
JWT_SECRET=your_existing_jwt_secret
PORT=3001

# PM Access
PM_ALLOWED_IPS=your_ip_address
PM_PASSWORD_HASH=$2a$10$your_bcrypt_hash
PM_JWT_SECRET=your_random_secret

# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_ORG=your-org

# Slack
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx
SLACK_CHANNELS=C04STANDUP,C04ENGINEERING

# Gmail
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
GOOGLE_REFRESH_TOKEN=xxxxxxxx
GMAIL_CEO_EMAIL=ceo@company.com
GMAIL_IMPORTANT_SENDERS=cto@company.com

# AI
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

---

## Verification

After configuring each integration, restart the server and check the logs:

```
[scheduler] Starting background sync jobs...
[scheduler] GitHub sync: every 15 min
[scheduler] Slack sync: every 15 min
[scheduler] Gmail sync: every 30 min
[scheduler] AI analysis: every 60 min
[scheduler] All configured jobs started.
```

If a service isn't configured, you'll see:
```
[scheduler] GitHub sync: SKIPPED (GITHUB_TOKEN or GITHUB_ORG not set)
```

This is normal — add integrations one at a time as you set them up.
