// ============================================================
// routes/pm.js — PM Dashboard API routes
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { pmAccess, generatePmToken } = require('../middleware/pmAccess');

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

module.exports = { router };
