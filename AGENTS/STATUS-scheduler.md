# STATUS — scheduler

## Definition of Done checklist (from AGENTS/scheduler.md)
- [ ] 1. Migration 0007 adds repeat/days/timezone/next_run_at/last_run_at/last_status/run_count/skip_count
- [ ] 2. schedule_message tool parses natural-language recurrence
- [ ] 3. Worker sweep advances next_run_at on recurring rows, tracks run/skip counts
- [ ] 4. Builder.tsx test pane: inline Send now / cancel chip on scheduled tool calls
- [ ] 5. Real run proof (one-off + recurring, Send now advances correctly)
- [ ] 6. Typecheck + gateway/worker tests still pass

## Progress
(not started)

## Needs Aki
(none yet)
