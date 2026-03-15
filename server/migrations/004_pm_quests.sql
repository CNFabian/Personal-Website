-- ============================================================
-- 004_pm_quests.sql — Daily quests & streak tracking for PM
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_daily_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  quest_type TEXT NOT NULL,            -- 'ai_priority' or 'drive_checklist'
  title TEXT NOT NULL,
  description TEXT,
  source_id TEXT,                      -- Google Drive item ID or null
  is_completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_quests_date ON pm_daily_quests(date);
CREATE INDEX IF NOT EXISTS idx_pm_quests_type ON pm_daily_quests(quest_type);

CREATE TABLE IF NOT EXISTS pm_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  total_quests_completed INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial streak row
INSERT INTO pm_streaks (current_streak, longest_streak, total_quests_completed) VALUES (0, 0, 0);
