# STATUS — core (packages/core)

## Definition of Done checklist
- [ ] 1. Typecheck passes; `pnpm --filter @threadline/core test` offline selftest covers every CoreAPI fn
- [ ] 2. scripts/e2e-real.ts with real LLM (CLI fallback): Sanitea bot (products+prices, gifting, brewing, shipping/returns, order → Orders table, name memory across 2 convos, "don't know"), idea bot (bakery), OpenAPI petstore bot w/ successful tool call → AGENTS/core-e2e-transcript.md
- [ ] 3. runChecks pass rate ≥ 85% on Sanitea
- [ ] 4. Perf: API-key chat turn < 6s p50 (no key on this Mac → documented); CLI fallback latency documented

## Plan / modules
llm.ts · usage.ts · ingest/{website,extract,headless,openapi,mcp}.ts · knowledge.ts · profile.ts · tools/{index,builtin,http,mcp,mock}.ts · tables.ts · memory.ts · runtime.ts · builder.ts · wizard.ts · versions.ts · checks.ts · insights.ts

## Progress
- in progress: LLM layer + modules
