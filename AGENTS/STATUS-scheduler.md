# STATUS — scheduler

## Definition of Done checklist (from AGENTS/scheduler.md)
- [x] 1. Migration 0007 adds repeat/days/timezone/next_run_at/last_run_at/last_status/run_count/skip_count
- [x] 2. schedule_message tool parses natural-language recurrence
- [x] 3. Worker sweep advances next_run_at on recurring rows, tracks run/skip counts
- [x] 4. Builder.tsx test pane: inline Send now / cancel chip on scheduled tool calls
- [x] 5. Real run proof (one-off + recurring, Send now advances correctly)
- [x] 6. Typecheck + gateway/worker tests still pass

## What was built
- `packages/db/migrations/0007_scheduler_recurrence.sql`: adds `repeat, days, at_time, timezone (NOT NULL 'UTC'), first_run_at,
  next_run_at, last_run_at, last_status, last_note, run_count, skip_count, is_test` + backfill (pending rows get next_run_at = send_at;
  sent/failed rows get run_count/skip_count = 1) + index. Extra columns beyond the brief: `at_time` (Flow has it; wall-clock time of a
  recurring row), `first_run_at` (the originally scheduled time), `is_test` (Build → Test rows).
- `packages/core/src/schedule.ts` (new, exported as `@threadline/core/schedule`): forgiving NL parser (`in 3 days`, `tomorrow at 5pm`,
  `Friday 3pm`, `on Nov 10`, `every Monday at 9am`, `Mondays and Thursdays 6:30pm`, `every weekday at 8:30`, `daily at 8am`,
  `monthly on the 1st`, ISO with/without offset), timezone- and DST-correct recurrence (Intl only, no deps), `recordRun`, `sendNow`,
  `cancelScheduled`, `sweepScheduled`, `deliverTest`, `chipView`. Unparseable → 24h from now with the reason in `last_note`; never errors.
- `schedule_message` tool (builtin.ts): new schema (send_at in natural language + optional repeat/days/time/timezone). Parsing happens in
  the handler. If the model flattens "every Monday at 9am" into a single ISO date (seen live — bots built before this keep the old
  tool schema in their `tools` rows / version snapshots), the customer's own last message is used to recover the recurrence
  (`last_note = "repeat taken from the customer's message"`). Same slot asked twice within 10 min → one row (seen live: the model
  called the tool twice). Build → Test (channel 'web', isTest) now writes a real `is_test=1` row; checks / simulated users / dryRun
  still persist nothing.
- Worker (`apps/worker/src/index.ts`): `sweepScheduled()` every `WORKER_SCHEDULE_MS` (5000) + once at start; `/health` has a `schedule`
  block. The gateway still does the real-channel sending (unchanged): it marks a row sent/failed; the sweep then records the run and,
  for recurring rows, sets `send_at = next_run_at = next occurrence after max(now, slot)`, status back to 'scheduled', clears
  text/attempts/error. Failures bump `skip_count`, set `last_status='failed'`/`last_note`, and still advance. One-shot rows stay sent/failed
  with run_count/skip_count recorded. Due test rows are delivered by the sweep straight into the test chat.
- Web: `GET /api/app/bots/[id]/scheduled` (test rows for the owner preview + the tool message id that created each),
  `POST …/scheduled/[scheduledId]/send-now` (core `sendNow`: test rows delivered now through the same `runTestRow` the sweep uses;
  real rows made due for the gateway), `POST …/scheduled/[scheduledId]/cancel`.
- Builder.tsx test pane: chip under the bot's reply that follows the `schedule_message` call —
  "⏰ Test: on Mon 12 Oct 2026 at 09:00 UTC · next Mon 19 Oct 2026 at 09:00 UTC", recurrence line ("every Monday at 09:00 UTC · sent 1×"),
  failure note, **Send now** and **×**. Restored after reload (matched by tool message id); polls every 15 s while any chip is pending
  and pulls the new bubble when the worker delivers one.

## Proof (real runs, 2026-10-11 UTC, DB copy /tmp/tl-sched-run.db, web :3017, worker :3217, real Anthropic LLM, headless Chrome)
- One-off: "Can you remind me in 3 days to reorder my Darjeeling tea?" at 00:53 UTC → chip "⏰ Test: on Wed 14 Oct 2026 at 00:53 UTC";
  row repeat NULL, next_run_at = send_at = first_run_at = 2026-10-14T00:53Z.
- Recurring: "Also remind me every Monday at 9am to check my tea stock" → chip "⏰ Test: on Mon 12 Oct 2026 at 09:00 UTC · next Mon 19 Oct 2026
  at 09:00 UTC | every Monday at 09:00 UTC"; row repeat=weekly, days=mon, at_time=09:00, timezone=UTC.
  (First attempt exposed the stale-schema/ISO problem: row was stored one-shot → fixed with the context recovery above, re-run passed.)
- Send now on the recurring chip → bot bubble delivered in the test chat ("Good morning from Sanitea! Just a gentle nudge to check your tea
  stock…"), row run_count 0→1, last_status=sent, last_run_at set, next_run_at 2026-10-12T09:00Z → 2026-10-19T09:00Z (+1 week), status still
  scheduled; chip became "on Mon 19 Oct … · next Mon 26 Oct … · sent 1×". Survives reload.
- × on a chip → status=cancelled, next_run_at NULL, chip "⏰ Test: cancelled" with no buttons.
- Worker path: recurring test row made due → worker log `schedule sweep {"delivered":1}` → bubble in the test chat, run_count 1,
  next_run_at rolled to the next Monday 09:00.
- Open page, no reload: worker delivered a due recurring test row → chip went to "sent 2×" and the new bubble appeared via the 15 s poll.
- Polish re-run after dedupe/prompt fixes: one row per request (no duplicate), on-topic delivery text, Send now Mon 12 → Mon 19 Oct;
  390 px viewport chip layout OK (7-mobile.png). Empty `prompt` → tool returns an error instead of scheduling nothing.
- Screenshots: /tmp/tl-sched-ui/1-oneoff.png, 2-recurring.png, 3-sendnow.png, 4-reload.png, 5-cancel.png, 6-poll.png, 7-mobile.png.
- Tests: `pnpm --filter @threadline/core test:schedule` 31/31 (parsing, DST, monthly clamp, tool, dedupe, sweep on gateway-sent/failed
  rows, one-shot recording, sendNow test/real, cancel); `pnpm --filter @threadline/gateway test` 37/37; `pnpm --filter @threadline/worker test`
  ALL PASS; `pnpm --filter @threadline/core test` 19 passed; typecheck core/web/worker/gateway ok.

## Run commands
```
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
pnpm --filter @threadline/core test:schedule
pnpm --filter @threadline/worker test && pnpm --filter @threadline/gateway test
# live: worker (sweep) + web
THREADLINE_DB=/tmp/tl-sched-run.db WORKER_PORT=3217 pnpm --filter @threadline/worker start
THREADLINE_DB=/tmp/tl-sched-run.db NEXT_DIST_DIR=.next-scheduler pnpm --filter @threadline/web exec next dev -p 3017
```

## Known limits / follow-ups (not in my files)
- Default timezone is UTC (or `SCHEDULER_DEFAULT_TZ`) unless the model passes one; the bot tells customers "9am UTC". Inferring
  the customer's zone (area code → tz, per legal R1) belongs in the gateway/core; noted in COORDINATION.
- Real-channel recurring rows are verified against the gateway's exact SQL in the test, not a live Photon send.
- Bots built before this keep the old tool description until rebuilt (handled by context recovery); see COORDINATION ask to core.

## Needs Aki
- Decide the default timezone for reminders when the customer never says one (today: UTC; set `SCHEDULER_DEFAULT_TZ`, e.g. America/New_York).
