# Brief — models agent

## Why
Threadline's main customer-chat loop (runtime.ts `chat()`, the tool-calling loop) always
calls Anthropic Claude Sonnet via `complete()` in packages/core/src/llm.ts. Aki wants to be
able to "shop" models: swap in cheaper providers (DeepSeek, Kimi K2 / Moonshot, GLM / Zhipu —
all OpenAI-compatible chat-completions APIs, same shape as the existing `openaiComplete()`
adapter) and actually compare them on cost, latency, and whether they still handle Threadline's
tool-calling correctly (schedule_message, save_row/update_row/find_rows, search_knowledge).

## You own
- packages/core/src/llm.ts (additive — do not break the existing anthropic/openai/cli paths
  or their exported signatures; other code calls `complete()`)
- A new packages/core/scripts/model-shootout.ts (or similar) benchmark/comparison script
- Any new env vars you introduce (document them in CONFIG.md)
- AGENTS/STATUS-models.md (your checklist, proofs only)

Do NOT touch other agents' folders (apps/web, apps/gateway except reading) or
packages/db/migrations. If you need something from another area, note it in
COORDINATION.md — don't just change it.

## Definition of Done
1. `llm.ts` grows a provider abstraction (not just anthropic/openai/cli): add DeepSeek,
   Kimi K2 (Moonshot), and GLM (Zhipu) as selectable providers. All three speak the same
   OpenAI-compatible `/chat/completions` shape with `tools` — reuse/generalize
   `openaiComplete()` rather than duplicating it three times (parameterize base URL,
   API key env var, model name, per provider).
2. A single env var picks the provider for the main chat loop, e.g. `THREADLINE_PROVIDER`
   (anthropic | openai | deepseek | kimi | glm | cli), each with its own
   `THREADLINE_<PROVIDER>_MODEL` / `THREADLINE_<PROVIDER>_FAST_MODEL` overrides, mirroring
   the existing `THREADLINE_MODEL` / `THREADLINE_FAST_MODEL` pattern. Keep Anthropic as the
   default so nothing breaks if the var is unset.
3. API keys: read from process.env only (`DEEPSEEK_API_KEY`, `KIMI_API_KEY` or
   `MOONSHOT_API_KEY`, `GLM_API_KEY` or `ZHIPU_API_KEY`). Never hardcode, print, or read
   from the keychain yourself — if a key is missing, say so clearly in STATUS under
   "Needs Aki" with the exact env var name; Aki will put it in Keychain / a .env and tell
   you where via COORDINATION.md.
4. Build `packages/core/scripts/model-shootout.ts`: runs a fixed small set of realistic
   Threadline conversation turns (base it on the real tool-calling scenarios already proven
   in packages/core/src/selftest.ts and connector-test.ts — e.g. "save an order", "schedule
   a recurring reminder", "look up a customer's past order", "answer from the knowledge
   base") against every configured provider (skip providers with no key set), and reports
   per provider: pass/fail per scenario (did it call the right tool with sane args and reply
   sensibly), total cost in USD for the run, p50/p95 latency per turn. Print a clean table.
   Offline-LLM mode must still work for CI (don't require real keys to typecheck/build).
5. Typecheck clean (core + anywhere you touched). Existing tests still pass:
   `pnpm --filter @threadline/core test`, `pnpm --filter @threadline/core test:schedule`,
   `node --experimental-strip-types packages/core/src/selftest.ts`,
   `node --experimental-strip-types packages/core/src/connector-test.ts`.
6. Run the shootout for real against whichever provider keys Aki has actually made
   available (check COORDINATION.md — he may add DEEPSEEK_API_KEY etc. there), paste the
   real output table into STATUS-models.md as proof. If NO third-party keys are available
   yet, still prove the harness itself works end-to-end using the Anthropic/OpenAI paths
   (which do have keys per deploy.sh) and clearly flag which providers are wired-but-untested
   for lack of a key.
7. CONFIG.md gets a short new section documenting the provider env vars.

## Needs Aki (expect this to be non-empty)
DeepSeek / Kimi (Moonshot) / GLM (Zhipu) API keys aren't in Keychain yet. List the exact
env var name each one needs; Aki will drop them in and leave a COORDINATION.md note when
ready, don't block everything else on it — get the harness and adapters built and proven
against whatever IS available first.
