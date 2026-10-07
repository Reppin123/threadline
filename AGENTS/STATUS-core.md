# STATUS — core (packages/core)

## Definition of Done checklist
- [x] 1. Typecheck passes; `pnpm --filter @threadline/core test` offline selftest covers every CoreAPI fn
- [ ] 2. scripts/e2e-real.ts with real LLM (CLI fallback): Sanitea bot (products+prices, gifting, brewing, shipping/returns, order → Orders table, name memory across 2 convos, "don't know"), idea bot (bakery), OpenAPI petstore bot w/ successful tool call → AGENTS/core-e2e-transcript.md
- [ ] 3. runChecks pass rate ≥ 85% on Sanitea
- [ ] 4. Perf: API-key chat turn < 6s p50 (no key on this Mac → documented); CLI fallback latency documented

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
