-- ============================================================
-- 002_casino_expansion.sql — Casino Expansion Schema
-- ============================================================
-- This migration adds support for:
-- - Avatar customization
-- - Chip balances and transactions
-- - Game statistics and session tracking
-- - Friend lists
-- - Achievements and unlocks
--
-- All changes are backward-compatible with existing user accounts.
-- Existing users are initialized with:
--   - chip_balance: 1000
--   - avatar_data: null (prompts creation on next login)
--   - wins column: renamed to total_wins
-- ============================================================

-- ============================================================
-- STEP 1: Extend users table
-- ============================================================
-- Add new columns to support expanded features

ALTER TABLE users ADD COLUMN email TEXT UNIQUE COLLATE NOCASE DEFAULT NULL;
ALTER TABLE users ADD COLUMN chip_balance INTEGER DEFAULT 1000;
ALTER TABLE users ADD COLUMN avatar_data TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN total_losses INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_games_played INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_daily_bonus DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN daily_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_relief_package DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Rename wins column to total_wins for consistency
ALTER TABLE users RENAME COLUMN wins TO total_wins;

-- Create indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_chip_balance ON users(chip_balance);
CREATE INDEX IF NOT EXISTS idx_users_total_wins ON users(total_wins);

-- ============================================================
-- STEP 2: Create game_stats table (per-game-type statistics)
-- ============================================================

CREATE TABLE IF NOT EXISTS game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_type TEXT NOT NULL,

  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,

  -- Game-specific stats (JSON for flexibility)
  extra_stats TEXT DEFAULT '{}',

  -- Chip stats for this game type
  total_chips_won INTEGER DEFAULT 0,
  total_chips_lost INTEGER DEFAULT 0,
  biggest_single_win INTEGER DEFAULT 0,

  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, game_type)
);

CREATE INDEX IF NOT EXISTS idx_game_stats_user ON game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_type ON game_stats(game_type);

-- ============================================================
-- STEP 3: Create game_sessions table (individual game records)
-- ============================================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,

  room_code TEXT,
  table_id TEXT,

  wager_amount INTEGER DEFAULT 0,
  pot_total INTEGER DEFAULT 0,

  winner_id INTEGER,
  status TEXT DEFAULT 'in_progress',

  result_data TEXT DEFAULT '{}',

  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME DEFAULT NULL,

  FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_type ON game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started ON game_sessions(started_at);

-- ============================================================
-- STEP 4: Create game_session_players table
-- ============================================================

CREATE TABLE IF NOT EXISTS game_session_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_session_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,

  seat_number INTEGER,
  is_winner INTEGER DEFAULT 0,

  chips_wagered INTEGER DEFAULT 0,
  chips_won INTEGER DEFAULT 0,
  net_result INTEGER DEFAULT 0,

  final_state TEXT DEFAULT '{}',

  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_gsp_session ON game_session_players(game_session_id);
CREATE INDEX IF NOT EXISTS idx_gsp_user ON game_session_players(user_id);

-- ============================================================
-- STEP 5: Create transactions table (chip ledger)
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,

  type TEXT NOT NULL,

  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  game_session_id TEXT DEFAULT NULL,
  related_user_id INTEGER DEFAULT NULL,

  description TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
  FOREIGN KEY (related_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- ============================================================
-- STEP 6: Create friends table
-- ============================================================

CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,

  status TEXT DEFAULT 'pending',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  UNIQUE(requester_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_receiver ON friends(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- ============================================================
-- STEP 7: Create achievements table
-- ============================================================

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  chip_reward INTEGER DEFAULT 0,
  icon TEXT DEFAULT NULL,
  rarity TEXT DEFAULT 'common'
);

-- ============================================================
-- STEP 8: Create user_achievements table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,

  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reward_claimed INTEGER DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================
-- STEP 9: Seed initial achievements
-- ============================================================

INSERT OR IGNORE INTO achievements (id, name, description, category, chip_reward, rarity) VALUES
-- General
('first_login', 'Welcome to the Casino', 'Log in for the first time', 'general', 0, 'common'),
('first_win', 'Beginner''s Luck', 'Win your first game', 'general', 200, 'common'),
('win_streak_5', 'Hot Hand', 'Win 5 games in a row', 'general', 500, 'uncommon'),
('win_streak_10', 'Unstoppable', 'Win 10 games in a row', 'general', 1000, 'rare'),
('games_100', 'Regular', 'Play 100 games', 'general', 500, 'uncommon'),
('games_500', 'Veteran', 'Play 500 games', 'general', 2000, 'rare'),
('chips_10k', 'Making Bank', 'Accumulate 10,000 chips', 'general', 0, 'uncommon'),
('chips_100k', 'High Roller', 'Accumulate 100,000 chips', 'general', 0, 'epic'),

-- Egyptian Ratscrew
('ers_slap_master', 'Slap Master', 'Land 100 correct slaps', 'ratscrew', 300, 'uncommon'),
('ers_perfect_game', 'Perfect Slaps', 'Win a game with 100% slap accuracy', 'ratscrew', 1000, 'rare'),
('ers_speed_demon', 'Speed Demon', 'Win a Ratscrew game in under 2 minutes', 'ratscrew', 500, 'rare'),

-- Gin Rummy
('gin_first_gin', 'Gin!', 'Score your first Gin (zero deadwood)', 'gin_rummy', 300, 'common'),
('gin_undercut', 'Undercut Artist', 'Undercut your opponent 10 times', 'gin_rummy', 500, 'uncommon'),

-- Poker
('holdem_first_allin', 'All In', 'Go all-in for the first time', 'holdem', 0, 'common'),
('holdem_royal_flush', 'Royal Flush', 'Make a Royal Flush', 'holdem', 5000, 'legendary'),
('holdem_bluff_master', 'Bluff Master', 'Win 10 hands at showdown with high card only', 'holdem', 1000, 'epic'),

-- Social
('add_friend', 'Social Butterfly', 'Add your first friend', 'social', 100, 'common'),
('play_with_friend', 'Friendly Competition', 'Play a game against a friend', 'social', 200, 'common');
