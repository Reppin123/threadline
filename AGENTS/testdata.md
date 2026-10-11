# Agent "testdata" — test vs. live data isolation

## Why (from a live Flow crawl, 2026-10-10, see research/flow/internals-2026-10-10.md)
Flow's single best idea, and the one thing we're missing: every bot-owned table has a hard split
between rows a real customer caused and rows that came from the owner testing in Build. The Data UI
has a "Which rows: Customers | Test data" toggle with separate stats, and a one-click "Clear test data."
Today in Threadline, `conversations.is_test` exists (0001_init.sql) but `bot_table_rows` has NO such
flag — a test order placed in the Build/Test playground lands in the same rows a real customer's order
would, with no way to filter it out or clear it. That's a real launch risk (an owner's test subscription
could show up in their real order list) and it's the fix with the most leverage right now.

## You own (nobody else touches these while you work)
- NEW migration `packages/db/migrations/0006_testdata_isolation.sql` (additive only, append to COMMON.md rules)
- `packages/core/src/tables.ts` (bot_table_rows read/write helpers)
- `apps/web/app/(app)/bots/[id]/data/page.tsx` (the whole file — all four tabs: saved, tables, scheduled, customers)
- `apps/web/lib/tables.ts`
- `apps/web/app/(app)/actions.ts` — ONLY the table-row-write server actions in it; do not touch unrelated actions
- `apps/web/app/api/v1/bots/[id]/tables/[name]/rows/route.ts`

Do NOT touch: `packages/core/src/tools/builtin.ts`, `apps/worker/**`, `apps/web/components/app/Builder.tsx`,
anything under `apps/web/app/(app)/bots/[id]/build/**` or a new `inspect/` route — other agents own those.

## What "done" means (checkable)
1. Migration: `ALTER TABLE bot_table_rows ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;` Backfill rule:
   a row is test when its `customer_id` belongs to a customer whose conversations are all `is_test=1`,
   OR (simpler and preferred) stamp `is_test` at write time from the conversation/channel that triggered
   the write (core's save_row / update_record tool call already knows which conversation it's running in —
   thread that flag through tables.ts's write function instead of inferring after the fact).
2. `packages/core/src/tables.ts`: every row-write function takes/derives `isTest`; every row-read function
   accepts an `includeTest` filter (default false) so runtime tool calls (find_records for the LLM) only
   ever see real rows unless the call itself is happening inside a test conversation (in which case it should
   see ONLY that session's test rows + real rows, matching how Flow's bot still reads real catalog data while
   writing test orders separately — verify this with a real run: build a bot, add a real catalog row via the
   owner-fill path, then in Test ask it to recommend — it must see the real catalog row).
3. `apps/web/.../data/page.tsx`: each of the "Saved data" and "Tables" views gets a "Customers | Test data"
   toggle (follow Flow's copy: "What the bot saved in Test and your test questions. Real customers never see
   it."), a count badge on the Test data option, and a "Clear test data" button that deletes only is_test=1
   rows for that table after a confirm. Customers-view row counts must now exclude is_test rows (today they
   likely don't, since the column doesn't exist — verify the count query changes).
4. Real run proof: build a bot from scratch (idea-only is fine), test-chat an order into existence, confirm
   it shows under "Test data" with count 1 and under "Customers" with count 0, click Clear test data, confirm
   it's gone, re-run a real (non-test) write via the API (`/api/v1/bots/:id/tables/:name/rows`) and confirm
   THAT one shows under Customers. Screenshot or curl transcript in STATUS-testdata.md.
5. Typecheck + existing core/web tests still pass (`pnpm --filter @threadline/core test`, `node apps/web/scripts/e2e.mjs` if runnable without a worker — note in STATUS if it needs the worker and you couldn't run it).

## Notes
- `conversations.is_test` is already the source of truth for "this whole conversation was a test" — reuse it,
  don't invent a second concept.
- Keep the empty-state copy pattern Flow uses ("None this week" style) for consistency with the rest of the page.
