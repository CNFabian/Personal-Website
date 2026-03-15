// ============================================================
// services/scheduler.js — Background sync scheduler
// ============================================================
// Runs periodic syncs for GitHub, Slack, and Gmail,
// then triggers AI analysis.
//
// Import and call startScheduler() from server.js to begin.
// ============================================================

const { syncGithubActivity } = require('./github');
const { syncSlackMessages } = require('./slack');
const { syncGmailActivity } = require('./gmail');
const { syncDriveChecklist } = require('./drive');
const { runFullAnalysis } = require('./ai');

// Intervals (in milliseconds)
const GITHUB_INTERVAL = 15 * 60 * 1000;   // Every 15 minutes
const SLACK_INTERVAL = 15 * 60 * 1000;    // Every 15 minutes
const GMAIL_INTERVAL = 30 * 60 * 1000;    // Every 30 minutes
const DRIVE_INTERVAL = 30 * 60 * 1000;    // Every 30 minutes
const AI_ANALYSIS_INTERVAL = 60 * 60 * 1000; // Every 60 minutes

let intervals = [];

/**
 * Run a sync function safely (catch errors so one failure doesn't break others)
 */
async function safeSync(name, syncFn) {
  try {
    const result = await syncFn();
    return result;
  } catch (err) {
    console.error(`[scheduler] ${name} sync failed:`, err.message);
    return null;
  }
}

/**
 * Start all background sync jobs.
 * Only starts syncs for services that are configured (have tokens in env).
 */
function startScheduler() {
  console.log('[scheduler] Starting background sync jobs...');

  // GitHub sync
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_ORG) {
    console.log('[scheduler] GitHub sync: every 15 min');
    intervals.push(
      setInterval(() => safeSync('GitHub', syncGithubActivity), GITHUB_INTERVAL)
    );
    // Run once on startup (delayed 10s to let server finish booting)
    setTimeout(() => safeSync('GitHub', syncGithubActivity), 10000);
  } else {
    console.log('[scheduler] GitHub sync: SKIPPED (GITHUB_TOKEN or GITHUB_ORG not set)');
  }

  // Slack sync
  if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNELS) {
    console.log('[scheduler] Slack sync: every 15 min');
    intervals.push(
      setInterval(() => safeSync('Slack', syncSlackMessages), SLACK_INTERVAL)
    );
    setTimeout(() => safeSync('Slack', syncSlackMessages), 15000);
  } else {
    console.log('[scheduler] Slack sync: SKIPPED (SLACK_BOT_TOKEN or SLACK_CHANNELS not set)');
  }

  // Gmail sync
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('[scheduler] Gmail sync: every 30 min');
    intervals.push(
      setInterval(() => safeSync('Gmail', syncGmailActivity), GMAIL_INTERVAL)
    );
    setTimeout(() => safeSync('Gmail', syncGmailActivity), 20000);
  } else {
    console.log('[scheduler] Gmail sync: SKIPPED (Google OAuth not configured)');
  }

  // Google Drive checklist sync
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN && process.env.DRIVE_CHECKLIST_DOC_ID) {
    console.log('[scheduler] Drive checklist sync: every 30 min');
    intervals.push(
      setInterval(() => safeSync('Drive', syncDriveChecklist), DRIVE_INTERVAL)
    );
    setTimeout(() => safeSync('Drive', syncDriveChecklist), 25000);
  } else {
    console.log('[scheduler] Drive checklist sync: SKIPPED (DRIVE_CHECKLIST_DOC_ID not set)');
  }

  // AI analysis (only if Claude API key is set)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('[scheduler] AI analysis: every 60 min');
    intervals.push(
      setInterval(() => safeSync('AI Analysis', runFullAnalysis), AI_ANALYSIS_INTERVAL)
    );
    // First analysis after 5 minutes (give syncs time to populate data)
    setTimeout(() => safeSync('AI Analysis', runFullAnalysis), 5 * 60 * 1000);
  } else {
    console.log('[scheduler] AI analysis: SKIPPED (ANTHROPIC_API_KEY not set)');
  }

  console.log('[scheduler] All configured jobs started.');
}

/**
 * Stop all background jobs (for graceful shutdown)
 */
function stopScheduler() {
  intervals.forEach(clearInterval);
  intervals = [];
  console.log('[scheduler] All jobs stopped.');
}

module.exports = { startScheduler, stopScheduler };
