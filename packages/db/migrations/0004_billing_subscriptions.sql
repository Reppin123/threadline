-- billing: Stripe subscription state, webhook idempotency, monthly message counters. Owned by agent billing.
-- users.plan (0001) stays the effective plan the app reads; webhooks keep it in sync with subscriptions.plan.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'none',          -- Stripe subscription status: active | trialing | past_due | canceled | unpaid | incomplete | ...
  price_id TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  payment_failed_at TEXT,
  last_event_created INTEGER NOT NULL DEFAULT 0, -- Stripe event.created of the last applied subscription event (drops out-of-order replays)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stripe_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created INTEGER, result TEXT, received_at TEXT NOT NULL DEFAULT (datetime('now')));
-- One row per owner per calendar month (UTC, 'YYYY-MM'): customer messages answered + bot-initiated messages sent.
CREATE TABLE IF NOT EXISTS message_counters (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, period TEXT NOT NULL, messages INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, period));
-- "This assistant is over its limit" goes to a given customer at most once per day.
CREATE TABLE IF NOT EXISTS quota_notices (bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE, handle TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY(bot_id, handle, day));
