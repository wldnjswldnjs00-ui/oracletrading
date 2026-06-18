-- Cloudflare D1 schema for ayilon-bot
-- Run: npx wrangler d1 execute ayilon-bot --file=schema.sql

CREATE TABLE IF NOT EXISTS bot_state (
  email TEXT PRIMARY KEY,
  position_state TEXT DEFAULT '{}',
  logs TEXT DEFAULT '[]',
  peak_equity REAL DEFAULT 0,
  daily_loss TEXT DEFAULT '{}',
  daily_loss_triggered TEXT DEFAULT NULL,
  last_scan TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS entry_locks (
  lock_key TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
