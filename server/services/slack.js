// ============================================================
// services/slack.js — Slack API integration
// ============================================================
// Reads messages from configured channels, parses them with AI,
// and stores structured activity in the database.
// ============================================================

const { getDb } = require('../db');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_API = 'https://slack.com/api';

// Channels to monitor (comma-separated IDs in env var)
const SLACK_CHANNELS = process.env.SLACK_CHANNELS
  ? process.env.SLACK_CHANNELS.split(',').map(c => c.trim())
  : [];

// ---- API Helper ----

async function slackFetch(method, params = {}) {
  const url = new URL(`${SLACK_API}/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Slack API error (${method}): ${data.error}`);
  }

  return data;
}

// ---- Data Fetchers ----

/**
 * Get messages from a channel since a given timestamp
 */
async function getChannelHistory(channelId, oldest = null) {
  const params = {
    channel: channelId,
    limit: 100,
  };

  if (oldest) params.oldest = oldest;

  const data = await slackFetch('conversations.history', params);
  return data.messages || [];
}

/**
 * Get thread replies for a message
 */
async function getThreadReplies(channelId, threadTs) {
  const data = await slackFetch('conversations.replies', {
    channel: channelId,
    ts: threadTs,
    limit: 50,
  });
  return data.messages || [];
}

/**
 * Get channel info (name, topic, etc.)
 */
async function getChannelInfo(channelId) {
  const data = await slackFetch('conversations.info', { channel: channelId });
  return data.channel;
}

/**
 * Get all workspace users (for mapping slack IDs to names)
 */
async function getWorkspaceUsers() {
  const data = await slackFetch('users.list', { limit: 200 });
  return (data.members || [])
    .filter(u => !u.is_bot && !u.deleted)
    .map(u => ({
      id: u.id,
      name: u.real_name || u.name,
      email: u.profile?.email || null,
      avatar: u.profile?.image_72 || null,
      display_name: u.profile?.display_name || u.name,
    }));
}

/**
 * Get a single user's info
 */
async function getUserInfo(userId) {
  const data = await slackFetch('users.info', { user: userId });
  const u = data.user;
  return {
    id: u.id,
    name: u.real_name || u.name,
    email: u.profile?.email || null,
    avatar: u.profile?.image_72 || null,
  };
}

// ---- Message Processing ----

/**
 * Match a Slack user ID to a team member in the database
 */
function matchSlackUserToMember(slackUserId) {
  const db = getDb();
  return db.prepare(
    'SELECT id, name FROM pm_team_members WHERE slack_id = ? AND is_active = 1'
  ).get(slackUserId);
}

/**
 * Format messages for AI processing.
 * Strips Slack formatting, resolves user mentions, and adds context.
 */
function formatMessagesForAI(messages, userMap = {}) {
  return messages.map(msg => {
    // Replace <@U123ABC> mentions with names
    let text = msg.text || '';
    text = text.replace(/<@(U[A-Z0-9]+)>/g, (match, userId) => {
      return `@${userMap[userId] || userId}`;
    });

    // Remove Slack link formatting
    text = text.replace(/<(https?:\/\/[^|>]+)\|?([^>]*)>/g, (match, url, label) => {
      return label || url;
    });

    return {
      user_id: msg.user,
      user_name: userMap[msg.user] || msg.user,
      text,
      timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      has_thread: !!msg.thread_ts && msg.thread_ts !== msg.ts,
      reactions: (msg.reactions || []).map(r => `${r.name} (${r.count})`),
    };
  });
}

// ---- Sync to Database ----

/**
 * Pull new messages from all configured channels and store them.
 * Call this on a schedule (every 15 min).
 */
async function syncSlackMessages() {
  const db = getDb();

  if (SLACK_CHANNELS.length === 0) {
    console.log('[slack] No channels configured. Set SLACK_CHANNELS in .env');
    return { synced: 0 };
  }

  // Build a user ID → name map for mention resolution
  let userMap = {};
  try {
    const users = await getWorkspaceUsers();
    userMap = Object.fromEntries(users.map(u => [u.id, u.display_name || u.name]));
  } catch (err) {
    console.error('[slack] Could not fetch user list:', err.message);
  }

  let synced = 0;

  for (const channelId of SLACK_CHANNELS) {
    try {
      // Get the latest message timestamp we've stored for this channel
      const lastMsg = db.prepare(
        `SELECT raw_data FROM pm_activity
         WHERE source = 'slack' AND raw_data LIKE ?
         ORDER BY timestamp DESC LIMIT 1`
      ).get(`%"channel":"${channelId}"%`);

      let oldest = null;
      if (lastMsg) {
        try {
          const data = JSON.parse(lastMsg.raw_data);
          oldest = data.ts;
        } catch { /* ignore parse errors */ }
      }

      const messages = await getChannelHistory(channelId, oldest);

      // Filter out bot messages and very short messages
      const humanMessages = messages.filter(
        m => !m.bot_id && !m.subtype && m.text && m.text.length > 5
      );

      for (const msg of humanMessages) {
        // Check if we already stored this exact message
        const exists = db.prepare(
          "SELECT id FROM pm_activity WHERE source = 'slack' AND raw_data LIKE ?"
        ).get(`%"ts":"${msg.ts}"%`);

        if (exists) continue;

        // Match to a team member
        const member = matchSlackUserToMember(msg.user);

        const formatted = formatMessagesForAI([msg], userMap)[0];

        db.prepare(
          `INSERT INTO pm_activity (member_id, source, activity_type, title, summary, raw_data, timestamp)
           VALUES (?, 'slack', 'message', ?, ?, ?, ?)`
        ).run(
          member ? member.id : null,
          `Message from ${formatted.user_name}`,
          formatted.text.substring(0, 200), // truncate for summary
          JSON.stringify({ ...msg, channel: channelId }),
          formatted.timestamp
        );
        synced++;
      }

      // Respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`[slack] Error syncing channel ${channelId}:`, err.message);
    }
  }

  console.log(`[slack] Synced ${synced} new messages`);
  return { synced };
}

/**
 * Get recent Slack activity for a team member
 */
function getMemberSlackActivity(memberId, limit = 20) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM pm_activity
     WHERE member_id = ? AND source = 'slack'
     ORDER BY timestamp DESC LIMIT ?`
  ).all(memberId, limit);
}

/**
 * Get all unprocessed Slack messages (for AI batch analysis)
 */
function getUnprocessedMessages(limit = 50) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM pm_activity
     WHERE source = 'slack' AND activity_type = 'message'
     ORDER BY timestamp DESC LIMIT ?`
  ).all(limit);
}

// ---- Send Message ----

/**
 * Send a message to a Slack channel.
 * @param {string} channel - Channel ID
 * @param {string} text    - Message text
 * @returns {object}       - Slack API response (includes ts, channel)
 */
async function sendMessage(channel, text) {
  if (!SLACK_BOT_TOKEN) throw new Error('SLACK_BOT_TOKEN not configured');
  if (!channel || !text) throw new Error('channel and text are required');

  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Slack chat.postMessage error: ${data.error}`);
  }

  return data;
}

/**
 * List channels the bot has access to (for channel picker).
 * Returns id + name pairs.
 */
async function listChannels() {
  const data = await slackFetch('conversations.list', {
    types: 'public_channel,private_channel',
    exclude_archived: true,
    limit: 200,
  });
  return (data.channels || []).map(ch => ({ id: ch.id, name: ch.name }));
}

module.exports = {
  getChannelHistory,
  getThreadReplies,
  getChannelInfo,
  getWorkspaceUsers,
  getUserInfo,
  syncSlackMessages,
  getMemberSlackActivity,
  getUnprocessedMessages,
  formatMessagesForAI,
  sendMessage,
  listChannels,
};
