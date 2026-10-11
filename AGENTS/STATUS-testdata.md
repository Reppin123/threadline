# STATUS — testdata

## Definition of Done checklist (from AGENTS/testdata.md)
- [x] 1. Migration 0006 adds is_test to bot_table_rows, write path stamps it correctly
      (proved: packages/core/scripts/testdata-isolation.ts — playground + simulator orders → 1, iMessage order → 0, backfill re-derives same flags)
- [x] 2. tables.ts read/write helpers support isTest filter
      (proved: same script — test chat sees real catalog row, sees only its own session's test order, real lookups never see test rows, test chat can't edit a real row)
- [ ] 3. Data page: Customers | Test data toggle + counts + Clear test data button
- [ ] 4. Real run proof (test row isolated, cleared, real API write shows under Customers)
- [ ] 5. Typecheck + existing tests still pass

## Decisions
- builtin.ts is off-limits, so tables.ts derives isTest from the customer (all of their conversations are is_test=1 → test). Same rule as the
  0006 backfill, reuses conversations.is_test (no second concept). Explicit `{ isTest }` / `includeTest` opts override; 3-line follow-up for
  builtin.ts posted in COORDINATION.md.
- Customers tab + "Customers with saved data" tile now also exclude test-only customers (check simulators `sim-*`), not just owner-preview.
- Export (apps/web/app/api/app/bots/[id]/export) inherits real-only rows via lib/tables rowsOf default.

## Progress
- core + web typecheck clean; core selftest 18/18.

## Needs Aki
(none yet)
