// ============================================================
// db.js — SQLite database module for Egyptian Rat Screw
// ============================================================

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const { runMigrations } = require('./migrations/runner');

// Note: Previously used 'ratscrew.db' for backward compatibility
// Now uses 'casino.db' for new installations
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'casino.db');
const SALT_ROUNDS = 10;

let db;

/**
 * Initialize the database — creates tables if they don't exist.
 * Call once at server startup.
 */
function initDatabase() {
  // Ensure data directory exists
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  console.log(`[db] SQLite database initialized at ${DB_PATH}`);
  return db;
}

/**
 * Get the database instance.
 */
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// ---- User operations ----

/**
 * Create a new user account.
 * @param {string} username - 3-20 chars, alphanumeric + underscore
 * @param {string|null} password - optional plain-text password
 * @returns {{ id: number, username: string, wins: number }}
 * @throws if username already exists or validation fails
 */
function createUser(username, password) {
  // Validate username
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required.');
  }
  username = username.trim();
  if (username.length < 3 || username.length > 20) {
    throw new Error('Username must be 3-20 characters.');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores.');
  }

  // Check uniqueness (case-insensitive via COLLATE NOCASE on column)
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new Error('Username already taken.');
  }

  // Hash password if provided
  let passwordHash = null;
  if (password && typeof password === 'string' && password.length > 0) {
    if (password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }
    passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  }

  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  );
  const result = stmt.run(username, passwordHash);

  return { id: result.lastInsertRowid, username, wins: 0 };
}

/**
 * Find a user by username (case-insensitive).
 * @returns {{ id: number, username: string, password_hash: string|null, wins: number, created_at: string } | undefined}
 */
function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

/**
 * Find a user by ID.
 */
function findUserById(id) {
  return db.prepare('SELECT id, username, wins, created_at FROM users WHERE id = ?').get(id);
}

/**
 * Verify a password against a stored hash.
 * Returns true if match, false otherwise.
 */
function verifyPassword(plainPassword, hash) {
  if (!hash) return true; // no password set — always succeeds
  return bcrypt.compareSync(plainPassword, hash);
}

/**
 * Increment the win count for a user.
 * @returns {{ id: number, username: string, wins: number }}
 */
function incrementWins(userId) {
  db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(userId);
  return findUserById(userId);
}

/**
 * Get the top N players by win count.
 * @param {number} limit - defaults to 5
 * @returns {Array<{ rank: number, username: string, wins: number }>}
 */
function getTopPlayers(limit = 5) {
  const rows = db.prepare(
    'SELECT username, wins FROM users WHERE wins > 0 ORDER BY wins DESC LIMIT ?'
  ).all(limit);

  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    wins: row.wins,
  }));
}

/**
 * Get stats for a specific user.
 */
function getUserStats(userId) {
  const user = findUserById(userId);
  if (!user) return null;
  return { username: user.username, wins: user.wins, created_at: user.created_at };
}

// ---- Chip operations ----

/**
 * Get the chip balance for a user.
 * @returns {number} chip balance or 0 if user not found
 */
function getUserChips(userId) {
  const user = db.prepare('SELECT chip_balance FROM users WHERE id = ?').get(userId);
  return user ? user.chip_balance : 0;
}

/**
 * Update a user's chip balance by a delta (positive or negative).
 * @returns {number} new chip balance
 */
function updateChips(userId, amount) {
  db.prepare('UPDATE users SET chip_balance = chip_balance + ? WHERE id = ?').run(amount, userId);
  return getUserChips(userId);
}

/**
 * Record a chip transaction in the ledger.
 * @returns {{ id: number }} transaction record
 */
function recordTransaction(userId, type, amount, balanceAfter, referenceId = null) {
  const result = db.prepare(
    'INSERT INTO transactions (user_id, type, amount, balance_after, game_session_id) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, type, amount, balanceAfter, referenceId);
  return { id: result.lastInsertRowid };
}

// ---- Game stats operations ----

/**
 * Get game statistics for a specific user and game type.
 * @returns {{ id: number, user_id: number, game_type: string, wins: number, losses: number, ... } | null}
 */
function getGameStats(userId, gameType) {
  return db.prepare('SELECT * FROM game_stats WHERE user_id = ? AND game_type = ?').get(userId, gameType);
}

/**
 * Update or insert game stats after a match result.
 * Result should be 'win', 'loss', or 'draw'.
 * @returns {{ id: number }}
 */
function upsertGameStats(userId, gameType, result) {
  const existing = getGameStats(userId, gameType);

  if (!existing) {
    // Create new record
    const winCol = result === 'win' ? 1 : 0;
    const lossCol = result === 'loss' ? 1 : 0;
    const drawCol = result === 'draw' ? 1 : 0;
    const gameCount = result === 'draw' ? 1 : 1;

    const res = db.prepare(
      'INSERT INTO game_stats (user_id, game_type, wins, losses, draws, games_played) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, gameType, winCol, lossCol, drawCol, gameCount);
    return { id: res.lastInsertRowid };
  } else {
    // Update existing record
    let updateQuery = 'UPDATE game_stats SET games_played = games_played + 1';
    if (result === 'win') {
      updateQuery += ', wins = wins + 1';
    } else if (result === 'loss') {
      updateQuery += ', losses = losses + 1';
    } else if (result === 'draw') {
      updateQuery += ', draws = draws + 1';
    }
    updateQuery += ', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND game_type = ?';

    db.prepare(updateQuery).run(userId, gameType);
    return { id: existing.id };
  }
}

// ---- Game session operations ----

/**
 * Create a new game session.
 * @param {string} gameType - e.g., 'ratscrew', 'gin_rummy'
 * @returns {string} session id
 */
function createGameSession(gameType, sessionId = null) {
  // If no sessionId provided, generate a UUID-like id
  const id = sessionId || require('crypto').randomUUID();
  db.prepare('INSERT INTO game_sessions (id, game_type) VALUES (?, ?)').run(id, gameType);
  return id;
}

/**
 * Add a player to a game session.
 */
function addGameSessionPlayer(sessionId, userId, playerNumber) {
  const result = db.prepare(
    'INSERT INTO game_session_players (game_session_id, user_id, seat_number) VALUES (?, ?, ?)'
  ).run(sessionId, userId, playerNumber);
  return { id: result.lastInsertRowid };
}

/**
 * Mark a game session as complete with a winner.
 */
function completeGameSession(sessionId, winnerId) {
  db.prepare(
    'UPDATE game_sessions SET status = ?, winner_id = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run('completed', winnerId, sessionId);
}

// ---- Friend operations ----

/**
 * Send a friend request from one user to another.
 */
function sendFriendRequest(userId, friendId) {
  const result = db.prepare(
    'INSERT INTO friends (requester_id, receiver_id, status) VALUES (?, ?, ?)'
  ).run(userId, friendId, 'pending');
  return { id: result.lastInsertRowid };
}

/**
 * Accept a pending friend request.
 */
function acceptFriendRequest(userId, friendId) {
  db.prepare(
    'UPDATE friends SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE requester_id = ? AND receiver_id = ? AND status = ?'
  ).run('accepted', friendId, userId, 'pending');
}

/**
 * Get all accepted friends for a user.
 * @returns {Array} list of friend objects
 */
function getFriends(userId) {
  return db.prepare(
    'SELECT f.*, u.username FROM friends f JOIN users u ON (f.requester_id = u.id OR f.receiver_id = u.id) WHERE (f.requester_id = ? OR f.receiver_id = ?) AND f.status = ? AND u.id != ?'
  ).all(userId, userId, 'accepted', userId);
}

// ---- Achievement operations ----

/**
 * Get all available achievements.
 * @returns {Array}
 */
function getAchievements() {
  return db.prepare('SELECT * FROM achievements ORDER BY rarity DESC, category ASC').all();
}

/**
 * Unlock an achievement for a user.
 */
function unlockAchievement(userId, achievementId) {
  const result = db.prepare(
    'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)'
  ).run(userId, achievementId);
  return { id: result.lastInsertRowid };
}

/**
 * Get all unlocked achievements for a user.
 * @returns {Array}
 */
function getUserAchievements(userId) {
  return db.prepare(
    'SELECT ua.*, a.name, a.description, a.chip_reward, a.icon, a.rarity FROM user_achievements ua JOIN achievements a ON ua.achievement_id = a.id WHERE ua.user_id = ? ORDER BY ua.unlocked_at DESC'
  ).all(userId);
}

module.exports = {
  initDatabase,
  getDb,
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  incrementWins,
  getTopPlayers,
  getUserStats,
  getUserChips,
  updateChips,
  recordTransaction,
  getGameStats,
  upsertGameStats,
  createGameSession,
  addGameSessionPlayer,
  completeGameSession,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getAchievements,
  unlockAchievement,
  getUserAchievements,
};
