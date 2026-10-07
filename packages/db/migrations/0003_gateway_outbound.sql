-- Owned by agent "gateway". Retry bookkeeping for the scheduled_messages outbound worker (additive only).
ALTER TABLE scheduled_messages ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scheduled_messages ADD COLUMN next_attempt_at TEXT;
