import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/family_budget.db');

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  relation TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  trans_date TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_trans_user_date ON transactions(user_id, trans_date);
CREATE INDEX IF NOT EXISTS idx_trans_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id, type);
`);

function bindParams(params) {
  return params.map((p) => (typeof p === 'bigint' ? Number(p) : p));
}

/** 兼容 better-sqlite3 风格的 prepare API */
function prepare(sql) {
  return {
    get(...params) {
      const stmt = db.prepare(sql);
      const bound = bindParams(params);
      return bound.length ? stmt.get(...bound) : stmt.get();
    },
    all(...params) {
      const stmt = db.prepare(sql);
      const bound = bindParams(params);
      return bound.length ? stmt.all(...bound) : stmt.all();
    },
    run(...params) {
      const stmt = db.prepare(sql);
      const bound = bindParams(params);
      if (bound.length) stmt.run(...bound);
      else stmt.run();
      return {
        lastInsertRowid: Number(db.lastInsertRowid),
        changes: db.changes,
      };
    },
  };
}

export default { prepare, exec: (sql) => db.exec(sql) };
