-- ============================================================
-- 003_pm_tables.sql — PM Dashboard Schema
-- ============================================================
-- Creates all tables for the private project management dashboard:
--   pm_sprints, pm_team_members, pm_tasks, pm_activity,
--   pm_alerts, pm_ai_context, pm_chat_history
-- ============================================================

-- ============================================================
-- STEP 1: Sprints (created first — tasks reference this table)
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_sprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'PLANNING',        -- PLANNING, ACTIVE, COMPLETED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- STEP 2: Team members
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,                    -- 'frontend', 'backend', 'fullstack', 'design', etc.
  github_handle TEXT,
  slack_id TEXT,
  avatar_url TEXT,
  capacity_hours INTEGER DEFAULT 40,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_team_active ON pm_team_members(is_active);

-- ============================================================
-- STEP 3: Tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id INTEGER REFERENCES pm_team_members(id),
  status TEXT DEFAULT 'BACKLOG',         -- BACKLOG, IN_PROGRESS, IN_REVIEW, DONE
  priority TEXT DEFAULT 'MEDIUM',        -- LOW, MEDIUM, HIGH, CRITICAL
  estimated_hours REAL,
  actual_hours REAL,
  sprint_id INTEGER REFERENCES pm_sprints(id),
  ai_risk_score REAL,                    -- 0-1, set by AI analysis
  ai_status_confidence REAL,             -- 0-1, how sure the AI is
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_assignee ON pm_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_sprint ON pm_tasks(sprint_id);

-- ============================================================
-- STEP 4: Activity log
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES pm_team_members(id),
  task_id INTEGER REFERENCES pm_tasks(id),
  source TEXT NOT NULL,                  -- 'github', 'slack', 'gmail', 'manual'
  activity_type TEXT NOT NULL,           -- 'commit', 'pr_opened', 'pr_merged', 'message', 'email', 'status_change'
  title TEXT,
  summary TEXT,
  raw_data TEXT,                         -- JSON string of original data
  external_url TEXT,                     -- link to PR, commit, Slack message, etc.
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_activity_member ON pm_activity(member_id);
CREATE INDEX IF NOT EXISTS idx_pm_activity_task ON pm_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_activity_source ON pm_activity(source);
CREATE INDEX IF NOT EXISTS idx_pm_activity_timestamp ON pm_activity(timestamp);

-- ============================================================
-- STEP 5: Alerts
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER REFERENCES pm_tasks(id),
  member_id INTEGER REFERENCES pm_team_members(id),
  alert_type TEXT NOT NULL,              -- 'stale_task', 'velocity_drop', 'blocker', 'review_bottleneck', 'scope_change'
  severity TEXT DEFAULT 'medium',        -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  suggested_action TEXT,
  is_acknowledged INTEGER DEFAULT 0,
  acknowledged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_alerts_acked ON pm_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_pm_alerts_severity ON pm_alerts(severity);

-- ============================================================
-- STEP 6: AI context cache
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_ai_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,             -- 'task', 'member', 'sprint', 'project'
  entity_id INTEGER,
  context_summary TEXT,                  -- AI-generated rolling summary
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_ai_context_entity ON pm_ai_context(entity_type, entity_id);

-- ============================================================
-- STEP 7: Chat history
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,                    -- 'user' or 'assistant'
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
