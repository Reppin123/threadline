# STATUS — testdata

## Definition of Done checklist (from AGENTS/testdata.md)
- [x] 1. Migration 0006 adds is_test to bot_table_rows, write path stamps it correctly
      (proved: packages/core/scripts/testdata-isolation.ts — playground + simulator orders → 1, iMessage order → 0, backfill re-derives same flags)
- [x] 2. tables.ts read/write helpers support isTest filter
      (proved: same script — test chat sees real catalog row, sees only its own session's test order, real lookups never see test rows, test chat can't edit a real row)
- [x] 3. Data page: Customers | Test data toggle + counts + Clear test data button
      (proved: e2e — badge 1 on Test data, Flow copy shown, Customers view 0 rows, tiles exclude test, per-table + per-card Clear, 390px no overflow)
- [x] 4. Real run proof (test row isolated, cleared, real API write shows under Customers)
      (proved: e2e transcript below, bot_Mzhey1yJPWeUiQ, screenshots apps/web/screenshots/testdata/*.png)
- [x] 5. Typecheck + existing tests still pass
      (web + core tsc clean; core selftest 19/19; isolation script 11/11; full-app apps/web/scripts/e2e.mjs 15/15 PASS on :3007
      with BILLING_DEFAULT_PLAN=starter, bot bot_-ELzXbaHYFM_Iw. Without that env the "public API" step 402s on the Free plan: that's
      the billing gate working as designed, not a regression, and production sets the same env until Stripe is live.)

## Decisions
- builtin.ts is off-limits, so tables.ts derives isTest from the customer (all of their conversations are is_test=1 → test). Same rule as the
  0006 backfill, reuses conversations.is_test (no second concept). Explicit `{ isTest }` / `includeTest` opts override; 3-line follow-up for
  builtin.ts posted in COORDINATION.md.
- Customers tab + "Customers with saved data" tile now also exclude test-only customers (check simulators `sim-*`), not just owner-preview.
- Export (apps/web/app/api/app/bots/[id]/export) inherits real-only rows via lib/tables rowsOf default.

## Proof run (2026-10-10, clean single run, real LLM, dev server :3007, THREADLINE_DB=/tmp/tl-testdata-web.db)
```
✔ sign up via dev magic link — /dashboard
✔ wizard: idea-only bot → build — bot_Mzhey1yJPWeUiQ
✔ Data before testing: Orders table exists, Customers 0, Test data 0
✔ builder: take orders into the Orders table (not the pretend create_order tool)
✔ Build playground: test-chat an order into existence — "...Your reference is row_nWdYkP08IsJwWw"
✔ order shows under Test data (count 1) and NOT under Customers (count 0) — tiles "CUSTOMERS 0 with saved data"
✔ Clear test data (confirm) → gone — badge 0, "No test data" empty state
✔ create API key in Settings
✔ real write via POST /api/v1/bots/:id/tables/:name/rows → shows under Customers — 201, customers 1, test 0
✔ owner-filled catalog row (dashboard editor) is real, and a Test chat can read it — "...Zebra Moon Geisha, at $29"
✔ mobile: toggle fits at 390px — no horizontal overflow
ALL PASSED
```
Final re-run after the Scheduled-tab work (bot_Z4Rw4XRuVYeR4Q): same 12 steps + "✔ Scheduled tab: a reminder set in Test shows only under
Test data, with its recurrence — {test:1, customers:0, tile:'SCHEDULED Nothing scheduled'}" → ALL PASSED (13 steps, 124s).

## Run commands
- `cd packages/core && THREADLINE_DB=/tmp/tl-testdata-isolation.db node --experimental-strip-types scripts/testdata-isolation.ts`
- `cd packages/core && THREADLINE_DB=/tmp/tl-testdata-test.db node --experimental-strip-types src/selftest.ts`
- web: `THREADLINE_DB=/tmp/tl-testdata-web.db NEXT_DIST_DIR=.next-testdata BILLING_DEFAULT_PLAN=starter npx next dev -p 3007` (in apps/web;
  afterwards `git checkout apps/web/tsconfig.json apps/web/next-env.d.ts`, which next dev rewrites), then
  `BASE_URL=http://localhost:3007 THREADLINE_DB=/tmp/tl-testdata-web.db node apps/web/scripts/testdata-e2e.mjs` (run only one e2e at a time)

## Progress
- Extra (scheduler's 2026-10-11 request): Data → Scheduled tab gets the same Customers | Test data toggle on scheduled_messages.is_test
  (0007), Repeat ("every Monday at 09:00 UTC" via @threadline/core/schedule chipView) / next run / last run + status / runs sent·skipped;
  the Scheduled tile counts real upcoming only. Proof step added to testdata-e2e.mjs (running after the full e2e.mjs finishes).
- All DoD items verified. builtin.ts hardening (pass ctx.isTest explicitly) still optional, see COORDINATION.md; the derived path covers it today.

## Follow-ups for other owners (not blocking; in COORDINATION.md)
- builtin.ts: pass ctx.isTest explicitly to insertRow/updateRow/findRows (3 lines). Until then a test chat could still update_row an
  OWNER table's real row (customerId is null there, so the guard can't tell it's a test).
- builder/core: idea bots get both a bot-filled Orders table and a mock create_order tool; the model prefers the mock tool, so test orders
  land in mock_records and never in Orders. The e2e tells the builder to drop create_order first.
- web lib/data.ts "scheduled" count still includes is_test rows (scheduler flagged it; not my file).

## Needs Aki
(none)
