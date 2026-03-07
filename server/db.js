// ============================================================
// db.js — SQLite database module for Egyptian Rat Screw
// ============================================================

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'ratscrew.db');
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT,
      wins INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
};
