-- Flow parity (from research/flow/dashboard.md). Owned by orchestrator.
-- Builder chat (owner talks to the builder to shape the bot). role: user | assistant
CREATE TABLE IF NOT EXISTS builder_messages (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, thread_id TEXT NOT NULL DEFAULT 'main', role TEXT NOT NULL, content TEXT NOT NULL, suggestions_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
-- Wizard answers (new-bot conversational flow) kept on the bot
ALTER TABLE bots ADD COLUMN wizard_json TEXT;
ALTER TABLE bots ADD COLUMN web_access INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bots ADD COLUMN languages TEXT NOT NULL DEFAULT 'English';
ALTER TABLE bots ADD COLUMN current_version_id TEXT;   -- version live on channels
ALTER TABLE bots ADD COLUMN draft_dirty INTEGER NOT NULL DEFAULT 0; -- draft differs from current version
-- Versions: immutable snapshot of profile + tools + tables schema. status: draft | current | previous
CREATE TABLE IF NOT EXISTS bot_versions (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, number INTEGER NOT NULL, hash TEXT NOT NULL, summary TEXT, snapshot_json TEXT NOT NULL, checks_run_id TEXT REFERENCES test_runs(id), status TEXT NOT NULL DEFAULT 'previous', created_by TEXT NOT NULL DEFAULT 'builder', created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(bot_id, number));
ALTER TABLE test_runs ADD COLUMN version_id TEXT;
ALTER TABLE test_runs ADD COLUMN kind TEXT NOT NULL DEFAULT 'simulated'; -- simulated | checks
-- Owner-defined questions the bot must answer correctly (used by checks)
CREATE TABLE IF NOT EXISTS test_questions (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, question TEXT NOT NULL, expected TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
-- "What your bot keeps": tables. filled_by: bot | owner
CREATE TABLE IF NOT EXISTS bot_tables (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, columns_json TEXT NOT NULL, filled_by TEXT NOT NULL DEFAULT 'bot', created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(bot_id, name));
CREATE TABLE IF NOT EXISTS bot_table_rows (id TEXT PRIMARY KEY, table_id TEXT NOT NULL REFERENCES bot_tables(id) ON DELETE CASCADE, customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL, data_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
-- Scheduled outbound messages (reminders, follow-ups, API check-ins). status: scheduled | sent | failed | cancelled
CREATE TABLE IF NOT EXISTS scheduled_messages (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, channel TEXT NOT NULL, prompt TEXT NOT NULL, text TEXT, send_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled', idempotency_key TEXT, sent_at TEXT, error TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(bot_id, idempotency_key));
-- Public API keys (store only sha256 of the key)
CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE, name TEXT, key_hash TEXT UNIQUE NOT NULL, key_prefix TEXT NOT NULL, can_read_notes INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), last_used_at TEXT);
-- Metered usage. category: answering | build | media | tests
CREATE TABLE IF NOT EXISTS usage (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE, category TEXT NOT NULL, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, cost_usd REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
ALTER TABLE users ADD COLUMN trial_credit_usd REAL NOT NULL DEFAULT 1.5;
-- Conversation flags for the inbox filters
ALTER TABLE conversations ADD COLUMN couldnt_answer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN problem INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN couldnt_answer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN topic TEXT;
