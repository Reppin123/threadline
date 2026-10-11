-- inspect: live connections (API / OpenAPI / MCP) added to an already-built bot from the Inspect tab.
-- kind: plain | openapi | mcp ; auth_kind: none | bearer | header | basic | query | oauth
-- key_encrypted = encryptJson({ auth: { type, token | name+value | username+password } }); never rendered.
-- auth_name = header or query-param name when auth_kind is header/query; spec_url = where the OpenAPI doc was found;
-- test_path = the owner's "Test with a GET to" path; tool_count = tools materialised into `tools` (config.connectionId).
CREATE TABLE IF NOT EXISTS bot_connections (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  kind TEXT NOT NULL,
  auth_kind TEXT NOT NULL DEFAULT 'none',
  key_encrypted TEXT,
  can_write INTEGER NOT NULL DEFAULT 0,
  validated_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  auth_name TEXT,
  spec_url TEXT,
  test_path TEXT,
  tool_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bot_connections_bot ON bot_connections(bot_id, created_at);
