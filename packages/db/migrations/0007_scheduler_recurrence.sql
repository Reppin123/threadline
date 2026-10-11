-- Owned by agent "scheduler". Recurring scheduled messages (Flow's `scheduled` table shape), additive only.
-- send_at is still what the gateway outbound loop reads as "due"; packages/core/src/schedule.ts keeps
-- send_at = next_run_at while a row is pending, and first_run_at keeps the originally scheduled time.
ALTER TABLE scheduled_messages ADD COLUMN repeat TEXT;                        -- NULL (one-shot) | daily | weekly | monthly
ALTER TABLE scheduled_messages ADD COLUMN days TEXT;                          -- weekly: 'mon,wed,fri'; monthly: day of month '15'
ALTER TABLE scheduled_messages ADD COLUMN at_time TEXT;                       -- recurring wall-clock time 'HH:MM' in timezone
ALTER TABLE scheduled_messages ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE scheduled_messages ADD COLUMN first_run_at TEXT;
ALTER TABLE scheduled_messages ADD COLUMN next_run_at TEXT;
ALTER TABLE scheduled_messages ADD COLUMN last_run_at TEXT;
ALTER TABLE scheduled_messages ADD COLUMN last_status TEXT;                   -- sent | failed
ALTER TABLE scheduled_messages ADD COLUMN last_note TEXT;
ALTER TABLE scheduled_messages ADD COLUMN run_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scheduled_messages ADD COLUMN skip_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scheduled_messages ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0; -- created from the Build → Test preview; delivered into the test chat, never to a real channel
UPDATE scheduled_messages SET next_run_at = send_at WHERE next_run_at IS NULL AND status IN ('scheduled', 'sending');
UPDATE scheduled_messages SET first_run_at = send_at WHERE first_run_at IS NULL;
UPDATE scheduled_messages SET run_count = 1, last_status = 'sent', last_run_at = COALESCE(sent_at, send_at) WHERE status = 'sent' AND run_count = 0;
UPDATE scheduled_messages SET skip_count = 1, last_status = 'failed', last_note = error WHERE status = 'failed' AND skip_count = 0;
CREATE INDEX IF NOT EXISTS scheduled_messages_sweep ON scheduled_messages(status, repeat);
