# Agent "scheduler" — recurring scheduled messages + inline "Send now" test override

## Why (from a live Flow crawl, 2026-10-10, see research/flow/internals-2026-10-10.md)
Flow's `scheduled` table schema (read live via its read-only SQL console) is a full recurring-reminder
engine: id, customer, channel, instruction, repeat, days, at_time, run_on, timezone, status, next_run_at,
last_run_at, last_status, last_note, run_count, skip_count, created_at. Threadline's `scheduled_messages`
(0002/0003 migrations) only supports a single one-shot `send_at` — no repeat, no timezone, no run/skip
counters, no way to tell a recurring reminder from a one-off. We also saw, live, that Flow lets you fire a
pending TEST scheduled message immediately from inside the test chat itself (an inline chip: "⏰ Test: on
<date> · next <date>" with a "Send now" button) instead of waiting for the real time to arrive — that's
the single fastest way to verify a reminder actually fires, and we have no equivalent.

## You own (nobody else touches these while you work)
- NEW migration `packages/db/migrations/0007_scheduler_recurrence.sql` (additive only)
- `packages/core/src/tools/builtin.ts` — ONLY the `schedule_message` tool definition/handler in it
- `apps/worker/src/index.ts` — ONLY the scheduled-send sweep logic in it
- `apps/web/components/app/Builder.tsx` — ONLY to add the inline "Send now" test chip in the test/preview
  pane; do not touch the left-hand builder-chat edit pane logic in the same file beyond what's needed to
  wire the chip's data
- A new API route if you need one, e.g. `apps/web/app/api/app/bots/[id]/scheduled/[scheduledId]/send-now/route.ts`

Do NOT touch: `apps/web/app/(app)/bots/[id]/data/page.tsx` (owned by agent "testdata" this run — if you want
the Scheduled tab in Data to show repeat/next-run info, write the exact shape you added in COORDINATION.md
and leave the UI edit for later rather than touching that file).

## What "done" means (checkable)
1. Migration adds to `scheduled_messages`: `repeat TEXT` (null | 'daily' | 'weekly' | 'monthly'),
   `days TEXT` (nullable, e.g. 'mon,wed,fri' for weekly), `timezone TEXT NOT NULL DEFAULT 'UTC'`,
   `next_run_at TEXT`, `last_run_at TEXT`, `last_status TEXT`, `last_note TEXT`,
   `run_count INTEGER NOT NULL DEFAULT 0`, `skip_count INTEGER NOT NULL DEFAULT 0`. Keep `send_at` for
   backward compat as the first scheduled time; `next_run_at` is what the worker actually reads going
   forward (one-shot rows just get `next_run_at = send_at`, `repeat = NULL`).
2. `schedule_message` tool: accepts an optional repeat/days/timezone from the LLM's call (natural-language
   "every Monday at 9am" needs to resolve to this shape — do the parsing in the tool handler, not by asking
   the LLM to produce raw cron). Writes the new columns.
3. Worker sweep: on a recurring row, after sending, compute the next `next_run_at` from `repeat`/`days`/
   `timezone` instead of marking it done; increment `run_count`; on a send failure increment `skip_count`
   and set `last_status`/`last_note`, but still advance `next_run_at` so one bad send doesn't wedge it
   forever. One-shot rows still flip to `status='sent'` as today.
4. Builder.tsx test pane: when a `schedule_message` tool call happens inside a TEST conversation, render an
   inline chip right under that bubble — "⏰ Test: on <next_run_at formatted> · next <following occurrence
   if recurring>" with a "Send now" button (calls your new send-now route, which runs the exact same send
   path the worker uses, then updates `last_run_at`/`run_count`) and a cancel (×) that sets status=cancelled.
5. Real run proof in STATUS-scheduler.md: in Test, ask the bot for a one-off reminder ("remind me in 3 days
   to X") — confirm the chip appears with the right date; ask for a recurring one ("remind me every Monday at
   9am to X") — confirm repeat/days got parsed and stored; click Send now on one and confirm `run_count`
   incremented and (for the recurring one) `next_run_at` moved forward a week, not just disappeared.
6. Typecheck passes; `pnpm --filter @threadline/gateway test` and any worker test script still green.

## Notes
- Keep natural-language parsing forgiving but don't block delivery if parsing fails — fall back to a
  one-shot `send_at` equal to "now + your best guess" and note the ambiguity in `last_note` rather than
  erroring, matching the rest of the codebase's "make it work with a documented fallback" rule.
