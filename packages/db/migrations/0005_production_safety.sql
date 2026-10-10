-- production: abuse limits + analytics lookups. Owned by agent production (append-only).
-- Fixed-window counters for rate limits (signups, logins, builds, messages). key = "<scope>:<subject>", window_start = epoch seconds.
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
-- LLM spend cap sums usage per owner per day/month; funnel metrics scan events by type.
CREATE INDEX IF NOT EXISTS usage_user_created ON usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS usage_created ON usage(created_at);
CREATE INDEX IF NOT EXISTS events_type_created ON events(type, created_at);
