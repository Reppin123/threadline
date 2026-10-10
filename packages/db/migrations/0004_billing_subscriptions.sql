-- billing: Stripe subscription state, webhook idempotency, per-conversation metering. Owned by agent billing.
-- users.plan (0001) stays the effective plan the app reads (free | starter | growth | scale); webhooks keep it in sync.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  interval TEXT,                                 -- month | year
  status TEXT NOT NULL DEFAULT 'none',           -- Stripe subscription status: active | trialing | past_due | canceled | unpaid | incomplete | ...
  price_id TEXT,
  overage_price_id TEXT,                         -- metered item present → overage allowed past the included conversations
  extra_bots INTEGER NOT NULL DEFAULT 0,         -- quantity of the "extra bot" add-on
  dedicated_numbers INTEGER NOT NULL DEFAULT 0,  -- quantity of the "dedicated iMessage number" add-on (provisioned by hand)
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  payment_failed_at TEXT,
  last_event_created INTEGER NOT NULL DEFAULT 0, -- Stripe event.created of the last applied subscription event (drops out-of-order replays)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stripe_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created INTEGER, result TEXT, received_at TEXT NOT NULL DEFAULT (datetime('now')));
-- One row per owner per calendar month (UTC 'YYYY-MM'). conversations = billable conversations (incl. overage ones).
CREATE TABLE IF NOT EXISTS usage_counters (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, period TEXT NOT NULL,
  conversations INTEGER NOT NULL DEFAULT 0, overage INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, period));
-- Each billable conversation once (core's conversations.id; a new one starts after 6h of silence). Overage rows are reported to
-- Stripe as meter events (identifier = conversation_id) and stamped reported_at.
CREATE TABLE IF NOT EXISTS billed_conversations (conversation_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_id TEXT, channel TEXT, period TEXT NOT NULL, overage INTEGER NOT NULL DEFAULT 0, reported_at TEXT, report_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS billed_conversations_unreported ON billed_conversations(overage, reported_at);
-- "This assistant is at capacity" goes to a given customer at most once per day.
CREATE TABLE IF NOT EXISTS quota_notices (bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, handle TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY(bot_id, handle, day));
