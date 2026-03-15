// ============================================================
// routes/pm.js — PM Dashboard API routes
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { pmAccess, generatePmToken } = require('../middleware/pmAccess');
const { sendMessage: slackSend, listChannels } = require('../services/slack');
const { sendEmail: gmailSend } = require('../services/gmail');
const { pmChat, analyzeTaskRisk } = require('../services/ai');
const { fetchChecklist, syncDriveChecklist, getTodayDriveItems, isDriveConfigured } = require('../services/drive');

const router = express.Router();

// Apply PM access middleware to all routes in this router
router.use(pmAccess);

// ============================================================
// AUTH
// ============================================================

// POST /api/pm/auth/login — verify PM password, return PM token
router.post('/auth/login', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password required.' });
    }

    const hash = process.env.PM_PASSWORD_HASH;
    if (!hash) {
      return res.status(500).json({ success: false, error: 'PM auth not configured.' });
    }

    const valid = bcrypt.compareSync(password, hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }

    const token = generatePmToken();
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// TEAM
// ============================================================

// GET /api/pm/team — list all team members
router.get('/team', (req, res) => {
  try {
    const db = getDb();
    const members = db.prepare(
      'SELECT * FROM pm_team_members ORDER BY is_active DESC, name ASC'
    ).all();
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pm/team — add team member
router.post('/team', (req, res) => {
  try {
    const db = getDb();
    const { name, email, role, github_handle, slack_id, avatar_url, capacity_hours } = req.body;

    if (!name || !role) {
      return res.status(400).json({ success: false, error: 'name and role are required.' });
    }

    const result = db.prepare(
      `INSERT INTO pm_team_members (name, email, role, github_handle, slack_id, avatar_url, capacity_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(name, email || null, role, github_handle || null, slack_id || null, avatar_url || null, capacity_hours || 40);

    const member = db.prepare('SELECT * FROM pm_team_members WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/pm/team/:id — update team member
router.put('/team/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, email, role, github_handle, slack_id, avatar_url, capacity_hours, is_active } = req.body;

    const existing = db.prepare('SELECT id FROM pm_team_members WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Team member not found.' });
    }

    db.prepare(
      `UPDATE pm_team_members
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           role = COALESCE(?, role),
           github_handle = COALESCE(?, github_handle),
           slack_id = COALESCE(?, slack_id),
           avatar_url = COALESCE(?, avatar_url),
           capacity_hours = COALESCE(?, capacity_hours),
           is_active = COALESCE(?, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(name, email, role, github_handle, slack_id, avatar_url, capacity_hours, is_active, id);

    const member = db.prepare('SELECT * FROM pm_team_members WHERE id = ?').get(id);
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/pm/team/:id — remove team member (soft delete via is_active)
router.delete('/team/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM pm_team_members WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Team member not found.' });
    }

    db.prepare(
      'UPDATE pm_team_members SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// TASKS
// ============================================================

// GET /api/pm/tasks — list tasks (optional filters: status, assignee_id, sprint_id)
router.get('/tasks', (req, res) => {
  try {
    const db = getDb();
    const { status, assignee_id, sprint_id } = req.query;

    let query = `
      SELECT t.*, m.name AS assignee_name, m.role AS assignee_role
      FROM pm_tasks t
      LEFT JOIN pm_team_members m ON t.assignee_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (assignee_id) {
      query += ' AND t.assignee_id = ?';
      params.push(assignee_id);
    }
    if (sprint_id) {
      query += ' AND t.sprint_id = ?';
      params.push(sprint_id);
    }

    query += ' ORDER BY t.updated_at DESC';

    const tasks = db.prepare(query).all(...params);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pm/tasks — create task
router.post('/tasks', (req, res) => {
  try {
    const db = getDb();
    const {
      title, description, assignee_id, status, priority,
      estimated_hours, sprint_id,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'title is required.' });
    }

    const result = db.prepare(
      `INSERT INTO pm_tasks (title, description, assignee_id, status, priority, estimated_hours, sprint_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      title,
      description || null,
      assignee_id || null,
      status || 'BACKLOG',
      priority || 'MEDIUM',
      estimated_hours || null,
      sprint_id || null
    );

    const task = db.prepare(
      `SELECT t.*, m.name AS assignee_name FROM pm_tasks t
       LEFT JOIN pm_team_members m ON t.assignee_id = m.id
       WHERE t.id = ?`
    ).get(result.lastInsertRowid);

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/pm/tasks/:id — update task
router.put('/tasks/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const {
      title, description, assignee_id, status, priority,
      estimated_hours, actual_hours, sprint_id, ai_risk_score,
      ai_status_confidence, started_at, completed_at,
    } = req.body;

    const existing = db.prepare('SELECT id, status FROM pm_tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    db.prepare(
      `UPDATE pm_tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           assignee_id = COALESCE(?, assignee_id),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           estimated_hours = COALESCE(?, estimated_hours),
           actual_hours = COALESCE(?, actual_hours),
           sprint_id = COALESCE(?, sprint_id),
           ai_risk_score = COALESCE(?, ai_risk_score),
           ai_status_confidence = COALESCE(?, ai_status_confidence),
           started_at = COALESCE(?, started_at),
           completed_at = COALESCE(?, completed_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      title, description, assignee_id, status, priority,
      estimated_hours, actual_hours, sprint_id, ai_risk_score,
      ai_status_confidence, started_at, completed_at, id
    );

    const task = db.prepare(
      `SELECT t.*, m.name AS assignee_name FROM pm_tasks t
       LEFT JOIN pm_team_members m ON t.assignee_id = m.id
       WHERE t.id = ?`
    ).get(id);

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/pm/tasks/:id — delete task
router.delete('/tasks/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM pm_tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    db.prepare('DELETE FROM pm_tasks WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/pm/tasks/:id/move — move task to a new status column
router.patch('/tasks/:id/move', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = db.prepare('SELECT id FROM pm_tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    const now = new Date().toISOString();
    let extraFields = '';
    const extraParams = [];

    if (status === 'IN_PROGRESS') {
      extraFields = ', started_at = COALESCE(started_at, ?)';
      extraParams.push(now);
    } else if (status === 'DONE') {
      extraFields = ', completed_at = ?';
      extraParams.push(now);
    }

    db.prepare(
      `UPDATE pm_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP${extraFields} WHERE id = ?`
    ).run(status, ...extraParams, id);

    const task = db.prepare(
      `SELECT t.*, m.name AS assignee_name FROM pm_tasks t
       LEFT JOIN pm_team_members m ON t.assignee_id = m.id
       WHERE t.id = ?`
    ).get(id);

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/pm/tasks/:id/assign — assign or reassign task
router.put('/tasks/:id/assign', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { assignee_id } = req.body;

    const existing = db.prepare('SELECT id FROM pm_tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    if (assignee_id !== null && assignee_id !== undefined) {
      const member = db.prepare('SELECT id FROM pm_team_members WHERE id = ?').get(assignee_id);
      if (!member) {
        return res.status(404).json({ success: false, error: 'Team member not found.' });
      }
    }

    db.prepare(
      'UPDATE pm_tasks SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(assignee_id || null, id);

    const task = db.prepare(
      `SELECT t.*, m.name AS assignee_name FROM pm_tasks t
       LEFT JOIN pm_team_members m ON t.assignee_id = m.id
       WHERE t.id = ?`
    ).get(id);

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ACTIVITY
// ============================================================

// GET /api/pm/activity — combined activity feed (paginated)
// Query params: limit (default 50), offset (default 0), source, member_id
router.get('/activity', (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { source, member_id } = req.query;

    let query = `
      SELECT a.*, m.name AS member_name, m.role AS member_role,
             t.title AS task_title
      FROM pm_activity a
      LEFT JOIN pm_team_members m ON a.member_id = m.id
      LEFT JOIN pm_tasks t ON a.task_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (source) {
      query += ' AND a.source = ?';
      params.push(source);
    }
    if (member_id) {
      query += ' AND a.member_id = ?';
      params.push(member_id);
    }

    query += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const activity = db.prepare(query).all(...params);
    res.json({ success: true, activity, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pm/activity/member/:id — activity for one person
router.get('/activity/member/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const member = db.prepare('SELECT id, name FROM pm_team_members WHERE id = ?').get(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Team member not found.' });
    }

    const activity = db.prepare(
      `SELECT a.*, t.title AS task_title
       FROM pm_activity a
       LEFT JOIN pm_tasks t ON a.task_id = t.id
       WHERE a.member_id = ?
       ORDER BY a.timestamp DESC LIMIT ? OFFSET ?`
    ).all(id, limit, offset);

    res.json({ success: true, member, activity, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ALERTS
// ============================================================

// GET /api/pm/alerts — list active alerts
router.get('/alerts', (req, res) => {
  try {
    const db = getDb();
    const { acknowledged } = req.query;

    let query = `
      SELECT a.*, t.title AS task_title, m.name AS member_name
      FROM pm_alerts a
      LEFT JOIN pm_tasks t ON a.task_id = t.id
      LEFT JOIN pm_team_members m ON a.member_id = m.id
    `;
    const params = [];

    if (acknowledged === 'true') {
      query += ' WHERE a.is_acknowledged = 1';
    } else if (acknowledged === 'false' || acknowledged === undefined) {
      query += ' WHERE a.is_acknowledged = 0';
    }

    query += ' ORDER BY CASE a.severity WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, a.created_at DESC';

    const alerts = db.prepare(query).all(...params);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/pm/alerts/:id/ack — acknowledge alert
router.patch('/alerts/:id/ack', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM pm_alerts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Alert not found.' });
    }

    db.prepare(
      'UPDATE pm_alerts SET is_acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(id);

    const alert = db.prepare('SELECT * FROM pm_alerts WHERE id = ?').get(id);
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// SLACK
// ============================================================

// GET /api/pm/slack/channels — list channels for the channel picker
router.get('/slack/channels', async (req, res) => {
  try {
    const channels = await listChannels();
    res.json({ success: true, channels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pm/slack/send — send a Slack message
router.post('/slack/send', async (req, res) => {
  try {
    const { channel, text } = req.body;
    if (!channel || !text) {
      return res.status(400).json({ success: false, error: 'channel and text are required.' });
    }
    const result = await slackSend(channel, text);
    res.json({ success: true, ts: result.ts, channel: result.channel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// EMAIL
// ============================================================

// POST /api/pm/email/send — send an email via Gmail
router.post('/email/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'to, subject, and body are required.' });
    }
    const result = await gmailSend(to, subject, body);
    res.json({ success: true, messageId: result.id, threadId: result.threadId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// AI SUGGESTIONS
// ============================================================

// POST /api/pm/ai/suggest-action — get AI suggestions for a team member
router.post('/ai/suggest-action', async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, error: 'memberId is required.' });
    }

    const db = getDb();
    const member = db.prepare('SELECT * FROM pm_team_members WHERE id = ?').get(memberId);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found.' });
    }

    // Gather context
    const tasks = db.prepare(
      `SELECT * FROM pm_tasks WHERE assignee_id = ? ORDER BY
       CASE status WHEN 'IN_PROGRESS' THEN 0 WHEN 'IN_REVIEW' THEN 1 WHEN 'BACKLOG' THEN 2 ELSE 3 END`
    ).all(memberId);

    const recentActivity = db.prepare(
      'SELECT * FROM pm_activity WHERE member_id = ? ORDER BY timestamp DESC LIMIT 10'
    ).all(memberId);

    const alerts = db.prepare(
      'SELECT * FROM pm_alerts WHERE member_id = ? AND is_acknowledged = 0 ORDER BY severity DESC'
    ).all(memberId);

    // Build a focused prompt
    const prompt = `Generate 2-3 actionable suggestions for how I (the PM) should interact with this team member right now.

Team member: ${member.name} (${member.role})
Email: ${member.email || 'unknown'}

Current tasks:
${tasks.map(t => `- [${t.status}] ${t.title} (priority: ${t.priority}, started: ${t.started_at || 'not started'})`).join('\n') || 'No tasks assigned'}

Recent activity (last 10):
${recentActivity.map(a => `- [${a.source}] ${a.title || a.activity_type} (${a.timestamp})`).join('\n') || 'No recent activity'}

Open alerts:
${alerts.map(a => `- [${a.severity}] ${a.title}: ${a.description}`).join('\n') || 'No open alerts'}

For each suggestion provide:
1. type: "slack" or "email"
2. label: short description (e.g. "Check-in message")
3. draft: the actual message text I could send
4. reasoning: one sentence explaining why

Also provide an overall_assessment: 1-2 sentences about whether action is needed right now.

Return valid JSON with this shape:
{ "suggestions": [{ "type": "...", "label": "...", "draft": "...", "reasoning": "..." }], "overall_assessment": "..." }`;

    const aiResponse = await pmChat(prompt);

    // Try to parse structured JSON from the AI response
    let parsed;
    try {
      const jsonMatch = aiResponse.response.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    res.json({
      success: true,
      member: { id: member.id, name: member.name },
      suggestions: parsed?.suggestions || [],
      overall_assessment: parsed?.overall_assessment || aiResponse.response,
      raw: parsed ? undefined : aiResponse.response,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// DAILY QUESTS & STREAKS
// ============================================================

// GET /api/pm/quests/daily — get today's quests (or generate if none exist)
router.get('/quests/daily', async (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    let quests = db.prepare(
      'SELECT * FROM pm_daily_quests WHERE date = ? ORDER BY quest_type, id'
    ).all(today);

    // If no quests for today, auto-generate AI priorities
    if (quests.length === 0) {
      // Gather project context for AI generation
      const members = db.prepare('SELECT * FROM pm_team_members WHERE is_active = 1').all();
      const tasks = db.prepare(
        `SELECT t.*, m.name AS assignee_name FROM pm_tasks t
         LEFT JOIN pm_team_members m ON t.assignee_id = m.id
         WHERE t.status != 'DONE' ORDER BY
         CASE t.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END`
      ).all();
      const alerts = db.prepare(
        'SELECT * FROM pm_alerts WHERE is_acknowledged = 0 ORDER BY severity DESC LIMIT 10'
      ).all();

      // Try AI generation if configured
      let aiQuests = [];
      try {
        const prompt = `You are a PM assistant. Generate 3-5 daily priority tasks for me based on the current project state.

Team (${members.length} active members):
${members.map(m => `- ${m.name} (${m.role})`).join('\n')}

Open tasks:
${tasks.slice(0, 15).map(t => `- [${t.status}] ${t.title} → ${t.assignee_name || 'unassigned'} (priority: ${t.priority})`).join('\n') || 'No open tasks'}

Unacknowledged alerts:
${alerts.map(a => `- [${a.severity}] ${a.title}`).join('\n') || 'None'}

Return a JSON array of objects with shape: [{ "title": "...", "description": "..." }]
Each quest should be a specific, actionable PM task for today. Keep titles under 60 chars.`;

        const aiResponse = await pmChat(prompt);
        const jsonMatch = aiResponse.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) aiQuests = JSON.parse(jsonMatch[0]);
      } catch {
        // AI not configured — generate basic quests from data
        if (alerts.length > 0) {
          aiQuests.push({ title: `Review ${alerts.length} open alert(s)`, description: 'Check and acknowledge pending alerts' });
        }
        const blockedTasks = tasks.filter(t => {
          const days = t.updated_at ? Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 86400000) : 0;
          return days >= 3;
        });
        if (blockedTasks.length > 0) {
          aiQuests.push({ title: `Follow up on ${blockedTasks.length} stale task(s)`, description: 'Tasks with no update in 3+ days' });
        }
        if (tasks.length > 0) {
          aiQuests.push({ title: 'Review sprint progress', description: 'Check task board and assess what will land this sprint' });
        }
        if (aiQuests.length === 0) {
          aiQuests.push({ title: 'Plan priorities for the day', description: 'Review backlog and set focus areas' });
        }
      }

      // Insert AI quests
      const insert = db.prepare(
        'INSERT INTO pm_daily_quests (date, quest_type, title, description) VALUES (?, ?, ?, ?)'
      );
      for (const q of aiQuests) {
        insert.run(today, 'ai_priority', q.title, q.description || '');
      }

      quests = db.prepare(
        'SELECT * FROM pm_daily_quests WHERE date = ? ORDER BY quest_type, id'
      ).all(today);
    }

    const streak = db.prepare('SELECT * FROM pm_streaks WHERE id = 1').get();

    res.json({ success: true, date: today, quests, streak });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pm/quests — manually add a quest
router.post('/quests', (req, res) => {
  try {
    const db = getDb();
    const { title, description, quest_type, source_id } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'title is required.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const result = db.prepare(
      'INSERT INTO pm_daily_quests (date, quest_type, title, description, source_id) VALUES (?, ?, ?, ?, ?)'
    ).run(today, quest_type || 'manual', title, description || '', source_id || null);

    const quest = db.prepare('SELECT * FROM pm_daily_quests WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, quest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/pm/quests/:id/toggle — toggle quest completion
router.patch('/quests/:id/toggle', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const quest = db.prepare('SELECT * FROM pm_daily_quests WHERE id = ?').get(id);
    if (!quest) {
      return res.status(404).json({ success: false, error: 'Quest not found.' });
    }

    const newCompleted = quest.is_completed ? 0 : 1;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    db.prepare(
      'UPDATE pm_daily_quests SET is_completed = ?, completed_at = ? WHERE id = ?'
    ).run(newCompleted, completedAt, id);

    // Update streak
    const today = new Date().toISOString().slice(0, 10);
    const todayQuests = db.prepare('SELECT * FROM pm_daily_quests WHERE date = ?').all(today);
    const allDone = todayQuests.every(q => q.id === Number(id) ? newCompleted : q.is_completed);

    if (allDone && todayQuests.length > 0) {
      const streak = db.prepare('SELECT * FROM pm_streaks WHERE id = 1').get();
      if (streak) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        let newStreak = streak.current_streak;

        if (streak.last_completed_date === yesterday || streak.last_completed_date === today) {
          if (streak.last_completed_date !== today) newStreak += 1;
        } else {
          newStreak = 1; // streak broken, restart
        }

        const longest = Math.max(streak.longest_streak, newStreak);

        db.prepare(
          `UPDATE pm_streaks SET current_streak = ?, longest_streak = ?,
           last_completed_date = ?, total_quests_completed = total_quests_completed + ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = 1`
        ).run(newStreak, longest, today, newCompleted ? 1 : -1);
      }
    }

    const updated = db.prepare('SELECT * FROM pm_daily_quests WHERE id = ?').get(id);
    const streak = db.prepare('SELECT * FROM pm_streaks WHERE id = 1').get();
    res.json({ success: true, quest: updated, streak });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pm/quests/streak — get current streak data
router.get('/quests/streak', (req, res) => {
  try {
    const db = getDb();
    const streak = db.prepare('SELECT * FROM pm_streaks WHERE id = 1').get();
    res.json({ success: true, streak: streak || { current_streak: 0, longest_streak: 0, total_quests_completed: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/pm/quests/:id — remove a quest
router.delete('/quests/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const quest = db.prepare('SELECT * FROM pm_daily_quests WHERE id = ?').get(id);
    if (!quest) {
      return res.status(404).json({ success: false, error: 'Quest not found.' });
    }
    db.prepare('DELETE FROM pm_daily_quests WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GOOGLE DRIVE CHECKLIST
// ============================================================

// GET /api/pm/drive/checklist — get today's drive checklist items
// If items aren't synced yet for today, triggers a sync first.
router.get('/drive/checklist', async (req, res) => {
  try {
    if (!isDriveConfigured()) {
      return res.json({
        success: true,
        configured: false,
        items: [],
        message: 'Google Drive integration not configured. Set DRIVE_CHECKLIST_DOC_ID in your .env',
      });
    }

    // Check if we have items for today already
    let items = getTodayDriveItems();

    // If no items, trigger a sync first
    if (items.length === 0) {
      await syncDriveChecklist();
      items = getTodayDriveItems();
    }

    res.json({ success: true, configured: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pm/drive/checklist/sync — manually trigger a Drive sync
router.post('/drive/checklist/sync', async (req, res) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive integration not configured.',
      });
    }

    const result = await syncDriveChecklist();
    const items = getTodayDriveItems();

    res.json({ success: true, ...result, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pm/drive/checklist/:id/toggle — toggle a drive checklist item
// This toggles the quest in pm_daily_quests (same as /quests/:id/toggle but
// provided as a convenience endpoint under /drive/).
router.post('/drive/checklist/:id/toggle', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const quest = db.prepare(
      "SELECT * FROM pm_daily_quests WHERE id = ? AND quest_type = 'drive_checklist'"
    ).get(id);

    if (!quest) {
      return res.status(404).json({ success: false, error: 'Drive checklist item not found.' });
    }

    const newCompleted = quest.is_completed ? 0 : 1;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    db.prepare(
      'UPDATE pm_daily_quests SET is_completed = ?, completed_at = ? WHERE id = ?'
    ).run(newCompleted, completedAt, id);

    // Update streak (same logic as quests toggle)
    const today = new Date().toISOString().slice(0, 10);
    const todayQuests = db.prepare('SELECT * FROM pm_daily_quests WHERE date = ?').all(today);
    const allDone = todayQuests.every(q => q.id === Number(id) ? newCompleted : q.is_completed);

    if (allDone && todayQuests.length > 0) {
      const streak = db.prepare('SELECT * FROM pm_streaks WHERE id = 1').get();
      if (streak) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        let newStreak = streak.current_streak;

        if (streak.last_completed_date === yesterday || streak.last_completed_date === today) {
          if (streak.last_completed_date !== today) newStreak += 1;
        } else {
          newStreak = 1;
        }

        const longest = Math.max(streak.longest_streak, newStreak);

        db.prepare(
          `UPDATE pm_streaks SET current_streak = ?, longest_streak = ?,
           last_completed_date = ?, total_quests_completed = total_quests_completed + ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = 1`
        ).run(newStreak, longest, today, newCompleted ? 1 : -1);
      }
    }

    const updated = db.prepare('SELECT * FROM pm_daily_quests WHERE id = ?').get(id);
    const streak = db.prepare('SELECT * FROM pm_streaks WHERE id = 1').get();
    res.json({ success: true, quest: updated, streak });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pm/drive/checklist/live — fetch checklist directly from Drive
// (bypasses the database, shows real-time doc state)
router.get('/drive/checklist/live', async (req, res) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive integration not configured.',
      });
    }

    const checklist = await fetchChecklist();
    res.json({ success: true, ...checklist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// AI CHAT
// ============================================================

// POST /api/pm/chat — send a message to the PM AI assistant
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message is required.' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({
        success: true,
        configured: false,
        response: 'AI chat is not configured. Add ANTHROPIC_API_KEY to your server .env to enable it.',
      });
    }

    const db = getDb();

    // Load recent conversation history for context
    const history = db.prepare(
      'SELECT role, message FROM pm_chat_history ORDER BY created_at DESC LIMIT 20'
    ).all().reverse();

    const response = await pmChat(message.trim(), history);

    res.json({ success: true, configured: true, response });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pm/chat/history — get conversation history
router.get('/chat/history', (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const messages = db.prepare(
      'SELECT * FROM pm_chat_history ORDER BY created_at ASC LIMIT ? OFFSET ?'
    ).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM pm_chat_history').get();

    res.json({ success: true, messages, total: total.count, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/pm/chat/history — clear conversation history
router.delete('/chat/history', (req, res) => {
  try {
    const db = getDb();
    const deleted = db.prepare('DELETE FROM pm_chat_history').run();
    res.json({ success: true, deleted: deleted.changes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router };
