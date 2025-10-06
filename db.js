const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data.sqlite'));

// Initialize table if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS pastes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  privacy TEXT,
  password TEXT,
  createdAt INTEGER,
  expiresAt INTEGER
);
`);

module.exports = db;
