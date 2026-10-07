-- Durable background jobs (build, checks, scheduled sends, recrawl). Owned by orchestrator. Worker lives in apps/worker (agent "platform").
-- status: queued | running | done | failed
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 3, run_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  locked_by TEXT, locked_at TEXT, result_json TEXT, error TEXT, dedupe_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), finished_at TEXT);
CREATE INDEX IF NOT EXISTS jobs_ready ON jobs(status, run_at);
