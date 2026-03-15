// ============================================================
// services/gmail.js — Gmail API integration
// ============================================================
// Reads emails from your Gmail (via OAuth), filters for CEO
// and stakeholder messages, and stores summaries.
//
// Uses Google's REST API directly (no googleapis SDK needed).
// ============================================================

const { getDb } = require('../db');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
let GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const GMAIL_CEO_EMAIL = process.env.GMAIL_CEO_EMAIL; // e.g. ceo@company.com
const GMAIL_IMPORTANT_SENDERS = process.env.GMAIL_IMPORTANT_SENDERS
  ? process.env.GMAIL_IMPORTANT_SENDERS.split(',').map(e => e.trim())
  : [];

// Combine CEO email with any additional important senders
const ALL_IMPORTANT_SENDERS = [
  ...(GMAIL_CEO_EMAIL ? [GMAIL_CEO_EMAIL] : []),
  ...GMAIL_IMPORTANT_SENDERS,
];

// ---- Token Management ----

let accessToken = null;
let tokenExpiry = 0;

/**
 * Refresh the OAuth access token using the stored refresh token.
 */
async function refreshAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`Gmail token refresh failed: ${data.error_description || data.error}`);
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // refresh 1 min early

  return accessToken;
}

/**
 * Get a valid access token (refreshes if expired)
 */
async function getAccessToken() {
  if (!accessToken || Date.now() >= tokenExpiry) {
    await refreshAccessToken();
  }
  return accessToken;
}

// ---- Gmail API ----

async function gmailFetch(endpoint, params = {}) {
  const token = await getAccessToken();
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Search for emails matching a query
 */
async function searchEmails(query, maxResults = 20) {
  const data = await gmailFetch('/messages', {
    q: query,
    maxResults,
  });
  return data.messages || [];
}

/**
 * Get full email content by message ID
 */
async function getEmail(messageId) {
  const msg = await gmailFetch(`/messages/${messageId}`, { format: 'full' });

  // Extract headers
  const headers = {};
  for (const h of msg.payload.headers) {
    headers[h.name.toLowerCase()] = h.value;
  }

  // Extract body text
  let bodyText = '';

  function extractText(part) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.parts) {
      part.parts.forEach(extractText);
    }
  }

  extractText(msg.payload);

  // Fallback: try HTML body if no plain text
  if (!bodyText) {
    function extractHtml(part) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        // Strip HTML tags for a rough text version
        bodyText += html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      if (part.parts) part.parts.forEach(extractHtml);
    }
    extractHtml(msg.payload);
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headers.from || '',
    to: headers.to || '',
    subject: headers.subject || '(no subject)',
    date: headers.date || '',
    body: bodyText.substring(0, 5000), // cap at 5000 chars
    snippet: msg.snippet,
    labels: msg.labelIds || [],
  };
}

/**
 * Get recent emails from important senders (CEO, stakeholders)
 */
async function getImportantEmails(since = null) {
  if (ALL_IMPORTANT_SENDERS.length === 0) {
    console.log('[gmail] No important senders configured');
    return [];
  }

  // Build query: from any important sender
  const fromQuery = ALL_IMPORTANT_SENDERS.map(e => `from:${e}`).join(' OR ');
  let query = `(${fromQuery})`;

  if (since) {
    // Gmail uses YYYY/MM/DD format for after:
    const dateStr = new Date(since).toISOString().split('T')[0].replace(/-/g, '/');
    query += ` after:${dateStr}`;
  }

  const messageRefs = await searchEmails(query, 15);
  const emails = [];

  for (const ref of messageRefs) {
    try {
      const email = await getEmail(ref.id);
      emails.push(email);

      // Respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`[gmail] Error fetching email ${ref.id}:`, err.message);
    }
  }

  return emails;
}

// ---- Sync to Database ----

/**
 * Pull important emails and store in pm_activity.
 * Call this on a schedule (every 30-60 min).
 */
async function syncGmailActivity() {
  const db = getDb();

  // Get the most recent gmail activity timestamp
  const lastEntry = db.prepare(
    "SELECT timestamp FROM pm_activity WHERE source = 'gmail' ORDER BY timestamp DESC LIMIT 1"
  ).get();

  const since = lastEntry ? lastEntry.timestamp : null;

  let synced = 0;

  try {
    const emails = await getImportantEmails(since);

    for (const email of emails) {
      // Check if already stored (by gmail message ID)
      const exists = db.prepare(
        "SELECT id FROM pm_activity WHERE source = 'gmail' AND raw_data LIKE ?"
      ).get(`%"id":"${email.id}"%`);

      if (exists) continue;

      // Extract sender name from "Name <email>" format
      const senderMatch = email.from.match(/^([^<]+)</);
      const senderName = senderMatch ? senderMatch[1].trim() : email.from;

      db.prepare(
        `INSERT INTO pm_activity (member_id, source, activity_type, title, summary, raw_data, timestamp)
         VALUES (NULL, 'gmail', 'email', ?, ?, ?, ?)`
      ).run(
        `Email from ${senderName}: ${email.subject}`,
        email.snippet || email.body.substring(0, 200),
        JSON.stringify(email),
        new Date(email.date).toISOString()
      );
      synced++;
    }
  } catch (err) {
    console.error('[gmail] Error syncing emails:', err.message);
  }

  console.log(`[gmail] Synced ${synced} new emails`);
  return { synced };
}

/**
 * Get recent important emails from the database
 */
function getRecentImportantEmails(limit = 10) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM pm_activity
     WHERE source = 'gmail'
     ORDER BY timestamp DESC LIMIT ?`
  ).all(limit);
}

module.exports = {
  getImportantEmails,
  getEmail,
  searchEmails,
  syncGmailActivity,
  getRecentImportantEmails,
};
