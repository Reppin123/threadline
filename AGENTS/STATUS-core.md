# STATUS — core (packages/core)

## Definition of Done checklist
- [x] 1. Typecheck passes; `pnpm --filter @threadline/core test` offline selftest covers every CoreAPI fn
- [x] 2. scripts/e2e-real.ts with real LLM (CLI fallback): Sanitea bot (products+prices, gifting, brewing, shipping/returns, order → Orders table, name memory across 2 convos, "don't know"), idea bot (bakery), OpenAPI petstore bot w/ successful tool call → AGENTS/core-e2e-transcript.md
- [x] 3. runChecks pass rate ≥ 85% on Sanitea — latest **26/27 = 96%** (16:40; 12 simulated users + 15 test questions, 84s)
- [x] 4. Perf: Anthropic claude-sonnet-5-5 chat p50 3.1s (max 16.6s on an order turn w/ tools). CLI fallback (no key): ~20–40s/turn, dev only.

## Plan / modules
llm.ts · usage.ts · ingest/{website,extract,headless,openapi,mcp}.ts · knowledge.ts · profile.ts · tools/{index,builtin,http,mcp,mock}.ts · tables.ts · memory.ts · runtime.ts · builder.ts · wizard.ts · versions.ts · checks.ts · insights.ts

## Progress
- 16:14 Anthropic provider live (key auto-loaded from Keychain in llm.ts; claude-sonnet-5-5 / haiku-5-5 fast). Selftest 18/18 offline.
- 16:17 Sanitea e2e (API): 10/11 — prices, gifting, brewing, shipping/returns, name memory across convos, don't-know, Hinglish all ✅; chat p50 ≈ 3.8s.
  Order not saved (bot kept asking optional payment/gift-note) → prompt fixed; shops with no wizard answers now get a default Orders table.
- 16:21 Sanitea e2e re-run: **11/11** (order saved via save_row into Orders, p50 3.8s). Bakery idea bot 2/2 (mock menu + order saved).
  Petstore: petstore3.swagger.io unreachable from this Mac right now (curl times out) — external; OpenAPI path is covered by selftest
  against a local spec server. loadSpec now retries once with a longer timeout.
- Playground chat verified on a worker-built bot in the shared DB (3.8s).
- Worker (apps/worker) builds bots via core.buildBot in shared DB successfully (status ready, v1).
- 16:27 Checks failures were embellishment (tasting notes not in source) + bad upsell arithmetic → prompt rules added; judge now retrieves excerpts on the bot's claims too. Re-running.
- 16:31 Petstore bot: 19 http tools from OpenAPI; live getPetById ✅ (findByStatus is 500 on the public server itself). DoD 2 complete → AGENTS/core-e2e-transcript.md.
- 16:35 Fixed: empty final reply after a tool call (model returned no text) → one nudge + retry instead of a canned apology.
- 16:40 Judge grounding improved (per-bubble retrieval, site page list, bot capabilities/tables) — earlier fails were judge false-negatives
  on facts that ARE on the site. Strict "above X" threshold rule. Sanitea e2e 12/12, checks 96%.

## Run commands
- Offline selftest: `pnpm --filter @threadline/core test`
- Real e2e (Anthropic key auto-loaded from Keychain): `node --experimental-strip-types packages/core/scripts/e2e-real.ts [--checks] [--only=sanitea|bakery|petstore]`
  (env: THREADLINE_DB, E2E_OUT, THREADLINE_DEBUG=1 for per-LLM-call timings)

## Needs Aki
- Nothing blocking. Public Petstore findByStatus is broken upstream (HTTP 500) — not ours.
