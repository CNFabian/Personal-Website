// ============================================================
// services/drive.js — Google Drive API integration
// ============================================================
// Reads a tech checklist from a Google Doc or Sheet and syncs
// items into pm_daily_quests as 'drive_checklist' entries.
//
// Reuses the same Google OAuth credentials as Gmail.
// Requires the additional scope:
//   https://www.googleapis.com/auth/drive.readonly
// Or for two-way sync:
//   https://www.googleapis.com/auth/drive.file
// ============================================================

const { getDb } = require('../db');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
let GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// The Google Drive document ID for the tech checklist
// (find this in the URL: https://docs.google.com/document/d/{DOCUMENT_ID}/edit)
const DRIVE_CHECKLIST_DOC_ID = process.env.DRIVE_CHECKLIST_DOC_ID;

// Supported doc types: 'doc' (Google Doc) or 'sheet' (Google Sheet)
const DRIVE_CHECKLIST_TYPE = process.env.DRIVE_CHECKLIST_TYPE || 'doc';

// For sheets: which sheet tab and column to read from
const DRIVE_SHEET_RANGE = process.env.DRIVE_SHEET_RANGE || 'Sheet1!A:B'; // col A = item, col B = status

// ---- Token Management ----
// (Shares the same OAuth flow as gmail.js — in production you'd
//  centralize this, but keeping it self-contained for now)

let accessToken = null;
let tokenExpiry = 0;

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
    throw new Error(`Drive token refresh failed: ${data.error_description || data.error}`);
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

  return accessToken;
}

async function getAccessToken() {
  if (!accessToken || Date.now() >= tokenExpiry) {
    await refreshAccessToken();
  }
  return accessToken;
}

// ---- Drive API Helpers ----

/**
 * Fetch a Google Doc's content as plain text.
 * Uses the export endpoint to get text/plain representation.
 */
async function fetchDocAsText(docId) {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive export API ${res.status}: ${body}`);
  }

  return res.text();
}

/**
 * Fetch a Google Doc's structured content via Docs API.
 * This gives us the actual document structure including checkboxes.
 */
async function fetchDocStructured(docId) {
  const token = await getAccessToken();
  const url = `https://docs.googleapis.com/v1/documents/${docId}`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Docs API ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Fetch a Google Sheet's values via Sheets API.
 */
async function fetchSheetValues(spreadsheetId, range) {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status}: ${body}`);
  }

  return res.json();
}

// ---- Checklist Parsing ----

/**
 * Parse checklist items from a Google Doc.
 * Supports two formats:
 *   1. Native Google Doc checkboxes (via Docs API structured content)
 *   2. Markdown-style checkboxes: "- [ ] item" or "- [x] item"
 *
 * Returns: [{ id: string, title: string, checked: boolean }]
 */
async function parseDocChecklist(docId) {
  const items = [];

  // Try structured approach first (captures native checkboxes)
  try {
    const doc = await fetchDocStructured(docId);
    let itemIndex = 0;

    for (const element of doc.body.content || []) {
      if (!element.paragraph) continue;

      const paragraph = element.paragraph;
      const text = (paragraph.elements || [])
        .map(e => e.textRun?.content || '')
        .join('')
        .trim();

      if (!text) continue;

      // Check for native Google Doc checkbox
      const bullet = paragraph.bullet;
      if (bullet && bullet.listProperties) {
        // Native checkbox lists have a specific nesting/glyph
        const checked = text.startsWith('☑') || text.startsWith('✓') || text.startsWith('[x]');
        const cleanTitle = text
          .replace(/^[☑✓☐\[\]x ]+/i, '')
          .trim();

        if (cleanTitle) {
          items.push({
            id: `doc-${docId}-${itemIndex}`,
            title: cleanTitle,
            checked,
          });
          itemIndex++;
          continue;
        }
      }

      // Fallback: check for markdown-style checkboxes
      const mdMatch = text.match(/^[-*]\s*\[([ xX])\]\s*(.+)/);
      if (mdMatch) {
        items.push({
          id: `doc-${docId}-${itemIndex}`,
          title: mdMatch[2].trim(),
          checked: mdMatch[1].toLowerCase() === 'x',
        });
        itemIndex++;
        continue;
      }

      // Also check for lines starting with ☐ or ☑ without bullets
      const unicodeMatch = text.match(/^([☐☑✓])\s*(.+)/);
      if (unicodeMatch) {
        items.push({
          id: `doc-${docId}-${itemIndex}`,
          title: unicodeMatch[2].trim(),
          checked: unicodeMatch[1] !== '☐',
        });
        itemIndex++;
      }
    }
  } catch (structuredErr) {
    console.warn('[drive] Structured doc parse failed, falling back to plain text:', structuredErr.message);

    // Fallback: plain text export with markdown-style parsing
    const text = await fetchDocAsText(docId);
    const lines = text.split('\n');
    let itemIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Markdown checkbox: "- [ ] item" or "- [x] item"
      const mdMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.+)/);
      if (mdMatch) {
        items.push({
          id: `doc-${docId}-${itemIndex}`,
          title: mdMatch[2].trim(),
          checked: mdMatch[1].toLowerCase() === 'x',
        });
        itemIndex++;
        continue;
      }

      // Unicode checkbox: "☐ item" or "☑ item"
      const unicodeMatch = trimmed.match(/^([☐☑✓])\s*(.+)/);
      if (unicodeMatch) {
        items.push({
          id: `doc-${docId}-${itemIndex}`,
          title: unicodeMatch[2].trim(),
          checked: unicodeMatch[1] !== '☐',
        });
        itemIndex++;
      }
    }
  }

  return items;
}

/**
 * Parse checklist items from a Google Sheet.
 * Expects col A = item title, col B = status ("done", "x", "1", "true", etc.)
 * First row is treated as a header and skipped.
 *
 * Returns: [{ id: string, title: string, checked: boolean }]
 */
async function parseSheetChecklist(spreadsheetId, range) {
  const data = await fetchSheetValues(spreadsheetId, range);
  const rows = data.values || [];
  const items = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = (row[0] || '').trim();
    if (!title) continue;

    const statusRaw = (row[1] || '').trim().toLowerCase();
    const checked = ['done', 'x', '1', 'true', 'yes', '✓', '☑', 'complete', 'completed'].includes(statusRaw);

    items.push({
      id: `sheet-${spreadsheetId}-${i}`,
      title,
      checked,
    });
  }

  return items;
}

// ---- Public API ----

/**
 * Fetch the tech checklist from Google Drive.
 * Reads from a Google Doc or Sheet based on configuration.
 *
 * Returns: { items: [{ id, title, checked }], source: 'doc'|'sheet', docId }
 */
async function fetchChecklist() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google OAuth not configured');
  }
  if (!DRIVE_CHECKLIST_DOC_ID) {
    throw new Error('DRIVE_CHECKLIST_DOC_ID not set — add the document ID to your .env');
  }

  let items;

  if (DRIVE_CHECKLIST_TYPE === 'sheet') {
    items = await parseSheetChecklist(DRIVE_CHECKLIST_DOC_ID, DRIVE_SHEET_RANGE);
  } else {
    items = await parseDocChecklist(DRIVE_CHECKLIST_DOC_ID);
  }

  return {
    items,
    source: DRIVE_CHECKLIST_TYPE,
    docId: DRIVE_CHECKLIST_DOC_ID,
  };
}

/**
 * Sync Drive checklist items into pm_daily_quests.
 * - Adds new items that aren't already tracked today
 * - Updates titles if they changed
 * - Does NOT remove items that disappeared from the doc
 *   (to preserve completion history)
 *
 * Call this on a schedule (every 30-60 min) or manually.
 */
async function syncDriveChecklist() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  let synced = 0;
  let updated = 0;

  try {
    const { items } = await fetchChecklist();

    for (const item of items) {
      // Check if this drive item already exists for today
      const existing = db.prepare(
        "SELECT * FROM pm_daily_quests WHERE date = ? AND quest_type = 'drive_checklist' AND source_id = ?"
      ).get(today, item.id);

      if (existing) {
        // Update title if it changed
        if (existing.title !== item.title) {
          db.prepare(
            'UPDATE pm_daily_quests SET title = ? WHERE id = ?'
          ).run(item.title, existing.id);
          updated++;
        }
        continue;
      }

      // Insert new drive checklist item
      db.prepare(
        `INSERT INTO pm_daily_quests (date, quest_type, title, description, source_id, is_completed, completed_at)
         VALUES (?, 'drive_checklist', ?, ?, ?, ?, ?)`
      ).run(
        today,
        item.title,
        'From Google Drive tech checklist',
        item.id,
        item.checked ? 1 : 0,
        item.checked ? new Date().toISOString() : null
      );
      synced++;
    }
  } catch (err) {
    console.error('[drive] Error syncing checklist:', err.message);
  }

  console.log(`[drive] Synced ${synced} new items, updated ${updated} titles`);
  return { synced, updated };
}

/**
 * Get today's drive checklist items from the database.
 */
function getTodayDriveItems() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  return db.prepare(
    "SELECT * FROM pm_daily_quests WHERE date = ? AND quest_type = 'drive_checklist' ORDER BY id"
  ).all(today);
}

/**
 * Check if Drive integration is configured.
 */
function isDriveConfigured() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN && DRIVE_CHECKLIST_DOC_ID);
}

module.exports = {
  fetchChecklist,
  syncDriveChecklist,
  getTodayDriveItems,
  isDriveConfigured,
};
