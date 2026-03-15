// ============================================================
// services/github.js — GitHub API integration
// ============================================================
// Pulls PR, commit, and review data from your GitHub org.
// Uses a Personal Access Token (classic) or Fine-grained token.
// ============================================================

const { getDb } = require('../db');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG;
const GITHUB_API = 'https://api.github.com';

// ---- API Helper ----

async function githubFetch(endpoint, params = {}) {
  const url = new URL(`${GITHUB_API}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  return res.json();
}

// ---- Data Fetchers ----

/**
 * Get all open PRs across org repos (or specific repos)
 */
async function getOpenPullRequests(repos = []) {
  const prs = [];

  // If no specific repos, get all org repos
  if (repos.length === 0) {
    const orgRepos = await githubFetch(`/orgs/${GITHUB_ORG}/repos`, {
      per_page: 100,
      sort: 'pushed',
      type: 'all',
    });
    repos = orgRepos.map(r => r.name);
  }

  for (const repo of repos) {
    try {
      const repoPRs = await githubFetch(`/repos/${GITHUB_ORG}/${repo}/pulls`, {
        state: 'open',
        per_page: 50,
        sort: 'updated',
        direction: 'desc',
      });

      for (const pr of repoPRs) {
        prs.push({
          repo,
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          state: pr.state,
          draft: pr.draft,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          url: pr.html_url,
          reviewers: (pr.requested_reviewers || []).map(r => r.login),
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changed_files,
        });
      }
    } catch (err) {
      console.error(`[github] Error fetching PRs for ${repo}:`, err.message);
    }
  }

  return prs;
}

/**
 * Get recent commits for a specific user across repos
 */
async function getRecentCommits(githubHandle, since = null) {
  if (!since) {
    const d = new Date();
    d.setDate(d.getDate() - 7); // default: last 7 days
    since = d.toISOString();
  }

  try {
    // Search commits by author across the org
    const result = await githubFetch('/search/commits', {
      q: `author:${githubHandle} org:${GITHUB_ORG} committer-date:>${since}`,
      sort: 'committer-date',
      order: 'desc',
      per_page: 30,
    });

    return (result.items || []).map(c => ({
      sha: c.sha,
      message: c.commit.message.split('\n')[0], // first line only
      repo: c.repository.name,
      date: c.commit.committer.date,
      url: c.html_url,
      additions: c.stats?.additions,
      deletions: c.stats?.deletions,
    }));
  } catch (err) {
    console.error(`[github] Error fetching commits for ${githubHandle}:`, err.message);
    return [];
  }
}

/**
 * Get pending review requests for a user
 */
async function getPendingReviews(githubHandle) {
  try {
    const result = await githubFetch('/search/issues', {
      q: `is:pr is:open review-requested:${githubHandle} org:${GITHUB_ORG}`,
      sort: 'updated',
      per_page: 20,
    });

    return (result.items || []).map(pr => ({
      number: pr.number,
      title: pr.title,
      repo: pr.repository_url.split('/').pop(),
      author: pr.user.login,
      created_at: pr.created_at,
      url: pr.html_url,
    }));
  } catch (err) {
    console.error(`[github] Error fetching reviews for ${githubHandle}:`, err.message);
    return [];
  }
}

/**
 * Get recently merged PRs (last N days)
 */
async function getRecentlyMergedPRs(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const result = await githubFetch('/search/issues', {
      q: `is:pr is:merged org:${GITHUB_ORG} merged:>${since.toISOString().split('T')[0]}`,
      sort: 'updated',
      per_page: 50,
    });

    return (result.items || []).map(pr => ({
      number: pr.number,
      title: pr.title,
      repo: pr.repository_url.split('/').pop(),
      author: pr.user.login,
      closed_at: pr.closed_at,
      url: pr.html_url,
    }));
  } catch (err) {
    console.error(`[github] Error fetching merged PRs:`, err.message);
    return [];
  }
}

// ---- Sync to Database ----

/**
 * Pull GitHub data and write to pm_activity table.
 * Call this on a schedule (every 15 min).
 */
async function syncGithubActivity() {
  const db = getDb();

  // Get team members with github handles
  const members = db.prepare(
    'SELECT id, github_handle FROM pm_team_members WHERE github_handle IS NOT NULL AND is_active = 1'
  ).all();

  if (members.length === 0) return { synced: 0 };

  let synced = 0;

  for (const member of members) {
    // Fetch recent commits
    const commits = await getRecentCommits(member.github_handle);

    for (const commit of commits) {
      // Check if we already have this activity (by external_url)
      const exists = db.prepare(
        'SELECT id FROM pm_activity WHERE external_url = ?'
      ).get(commit.url);

      if (!exists) {
        db.prepare(
          `INSERT INTO pm_activity (member_id, source, activity_type, title, summary, external_url, raw_data, timestamp)
           VALUES (?, 'github', 'commit', ?, ?, ?, ?, ?)`
        ).run(
          member.id,
          `Commit to ${commit.repo}`,
          commit.message,
          commit.url,
          JSON.stringify(commit),
          commit.date
        );
        synced++;
      }
    }

    // Fetch their open PRs
    const reviews = await getPendingReviews(member.github_handle);

    for (const pr of reviews) {
      const exists = db.prepare(
        "SELECT id FROM pm_activity WHERE external_url = ? AND activity_type = 'review_requested'"
      ).get(pr.url);

      if (!exists) {
        db.prepare(
          `INSERT INTO pm_activity (member_id, source, activity_type, title, summary, external_url, raw_data, timestamp)
           VALUES (?, 'github', 'review_requested', ?, ?, ?, ?, ?)`
        ).run(
          member.id,
          `Review requested on ${pr.repo}#${pr.number}`,
          pr.title,
          pr.url,
          JSON.stringify(pr),
          pr.created_at
        );
        synced++;
      }
    }

    // Respect rate limits — pause between members
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[github] Synced ${synced} new activities`);
  return { synced };
}

/**
 * Get a summary for a specific team member
 */
function getMemberGithubSummary(memberId) {
  const db = getDb();
  const member = db.prepare(
    'SELECT github_handle FROM pm_team_members WHERE id = ?'
  ).get(memberId);

  if (!member || !member.github_handle) return null;

  const recentActivity = db.prepare(
    `SELECT * FROM pm_activity
     WHERE member_id = ? AND source = 'github'
     ORDER BY timestamp DESC LIMIT 20`
  ).all(memberId);

  const commitCount = db.prepare(
    `SELECT COUNT(*) as count FROM pm_activity
     WHERE member_id = ? AND source = 'github' AND activity_type = 'commit'
     AND timestamp > datetime('now', '-7 days')`
  ).get(memberId);

  return {
    github_handle: member.github_handle,
    recent_activity: recentActivity,
    commits_this_week: commitCount.count,
  };
}

module.exports = {
  getOpenPullRequests,
  getRecentCommits,
  getPendingReviews,
  getRecentlyMergedPRs,
  syncGithubActivity,
  getMemberGithubSummary,
};
