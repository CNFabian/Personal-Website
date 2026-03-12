// ============================================================
// migrations/runner.js — Simple migration runner
// ============================================================

const fs = require('fs');
const path = require('path');

/**
 * Run all unapplied migrations in order.
 * Creates a _migrations table to track which have been applied.
 * @param {Database} db - better-sqlite3 database instance
 */
function runMigrations(db) {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrations] No migration files found.');
    return;
  }

  for (const file of files) {
    const checkStmt = db.prepare(
      'SELECT id FROM _migrations WHERE name = ?'
    );
    const applied = checkStmt.get(file);

    if (!applied) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        db.exec(sql);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
        console.log(`[migrations] Applied: ${file}`);
      } catch (err) {
        console.error(`[migrations] Failed to apply ${file}:`, err.message);
        throw err;
      }
    }
  }

  console.log('[migrations] All migrations complete.');
}

module.exports = { runMigrations };
