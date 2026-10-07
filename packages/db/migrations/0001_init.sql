-- Owned by orchestrator. Add new tables/columns ONLY via new files 00NN_<owner>_<what>.sql (append-only, never edit this one).
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, avatar_url TEXT, password_hash TEXT, plan TEXT NOT NULL DEFAULT 'free', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS magic_links (token TEXT PRIMARY KEY, email TEXT NOT NULL, redirect TEXT, expires_at TEXT NOT NULL, used_at TEXT);
-- bots.status: draft | building | ready | live | error ; source_kind: website | api | mcp | idea
CREATE TABLE IF NOT EXISTS bots (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, join_code TEXT UNIQUE NOT NULL,
  source_kind TEXT NOT NULL, source_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', build_progress_json TEXT, profile_json TEXT, mock_mode INTEGER NOT NULL DEFAULT 0,
  credentials_json TEXT, avatar_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS knowledge_docs (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, url TEXT, title TEXT, content TEXT NOT NULL, fetched_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS knowledge_chunks (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, doc_id TEXT REFERENCES knowledge_docs(id) ON DELETE CASCADE, ord INTEGER NOT NULL, text TEXT NOT NULL, embedding BLOB);
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(text, chunk_id UNINDEXED, bot_id UNINDEXED);
-- tools.kind: http | mcp | mock | builtin
CREATE TABLE IF NOT EXISTS tools (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT NOT NULL, kind TEXT NOT NULL, input_schema_json TEXT NOT NULL, config_json TEXT, enabled INTEGER NOT NULL DEFAULT 1, requires_confirmation INTEGER NOT NULL DEFAULT 0, UNIQUE(bot_id, name));
CREATE TABLE IF NOT EXISTS mock_records (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, collection TEXT NOT NULL, data_json TEXT NOT NULL);
-- channel: imessage | telegram | whatsapp | web | terminal
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, channel TEXT NOT NULL, handle TEXT NOT NULL, display_name TEXT, first_seen TEXT NOT NULL DEFAULT (datetime('now')), last_seen TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(bot_id, channel, handle));
CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(customer_id, key));
CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, channel TEXT NOT NULL, is_test INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL DEFAULT (datetime('now')), last_message_at TEXT NOT NULL DEFAULT (datetime('now')), intent TEXT, outcome TEXT);
-- messages.role: user | assistant | tool | system
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, tool_name TEXT, tool_input_json TEXT, tool_output_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS test_runs (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'running', total INTEGER NOT NULL DEFAULT 0, passed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), finished_at TEXT);
CREATE TABLE IF NOT EXISTS test_cases (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE, persona TEXT NOT NULL, goal TEXT NOT NULL, transcript_json TEXT, passed INTEGER, judge_notes TEXT);
-- channels.status: off | pending | live | error
CREATE TABLE IF NOT EXISTS channels (bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'off', line_handle TEXT, config_json TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(bot_id, channel));
CREATE TABLE IF NOT EXISTS line_routes (channel TEXT NOT NULL, sender_handle TEXT NOT NULL, bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, bound_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(channel, sender_handle));
-- events.type e.g. message_in, message_out, tool_call, tool_error, handoff, build_step, test_case, deploy, gateway_heartbeat
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, bot_id TEXT, type TEXT NOT NULL, data_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
