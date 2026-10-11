# STATUS — models (DONE for everything provable without third-party keys)

## Definition of Done checklist (from AGENTS/models.md)
- [x] 1. Provider abstraction in llm.ts: `OPENAI_COMPAT` table (openai, deepseek, kimi, glm) drives ONE generalized `openaiComplete(o, provider)`; no duplicated adapters. Proof: `test:providers` round-trips tool calls/tool results through a mock server for deepseek, kimi, glm.
- [x] 2. `THREADLINE_PROVIDER` = anthropic|openai|deepseek|kimi|glm|cli|offline picks the provider for every `complete()` (so the chat loop too); `THREADLINE_<P>_MODEL` / `_FAST_MODEL` per provider; also `_BASE_URL`. Unset = unchanged key-based default (Anthropic first). `THREADLINE_LLM=offline` still wins (tests). Per-call `provider` option added to `CompleteOpts` (used by tooling).
- [x] 3. Keys from process.env only (`DEEPSEEK_API_KEY`, `KIMI_API_KEY`|`MOONSHOT_API_KEY`, `GLM_API_KEY`|`ZHIPU_API_KEY`); a missing key throws `deepseek: no API key — set DEEPSEEK_API_KEY` (key text is scrubbed from error bodies); shootout skips and names the env var.
- [x] 4. `packages/core/scripts/model-shootout.ts`: real `chat()` loop, 7 scenarios (order, schedule recurring, lookup past order, knowledge answer, catalog price, remember fact, handoff), pass/fail from tool calls + DB state, $ total, $/turn, p50/p95. Fixture bot is built offline (no spend, no keys needed to run `--offline-check`).
- [x] 5. `tsc -p packages/core` clean; `test` 19/19, `test:schedule` 31/31, `connector-test` 21/21, new `test:providers` 8/8.
- [x] 6. Real shootout run below (Anthropic API + local Claude CLI). Third-party providers are wired and wire-format-tested against a mock server but NOT run live (no keys) — see Needs Aki.
- [x] 7. CONFIG.md "Model providers" section.

## Proof — real run (2 runs/scenario, 14 turns-sets; 2026-10-10)
```
provider   model              order  schedule  lookup  knowledge  catalog  remember  handoff  pass   $ total  $/turn   p50 s  p95 s
---------  -----------------  -----  --------  ------  ---------  -------  --------  -------  -----  -------  -------  -----  -----
anthropic  claude-sonnet-5-5  2/2    2/2       2/2     2/2        2/2      2/2       2/2      14/14  0.3368   0.02105  3.2    6.2
cli        sonnet             2/2    2/2       2/2     2/2        2/2      2/2       2/2      14/14  0.2158   0.01349  5.6    6.7
  - skipped openai: set OPENAI_API_KEY
  - skipped deepseek: set DEEPSEEK_API_KEY
  - skipped kimi: set KIMI_API_KEY or MOONSHOT_API_KEY
  - skipped glm: set GLM_API_KEY or ZHIPU_API_KEY
```
Notes: cost for `anthropic` is tokens × list price in llm.ts; `cli` cost is the CLI's own `total_cost_usd`. Earlier real runs caught two
harness bugs (order scenario didn't supply a phone number the bot legitimately asks for; lookup fixture seeded via the offline stub wrote a junk row) — both fixed in the fixture, not the checks.

## Needs Aki
- `DEEPSEEK_API_KEY`, `KIMI_API_KEY` (or `MOONSHOT_API_KEY`), `GLM_API_KEY` (or `ZHIPU_API_KEY`), `OPENAI_API_KEY` — none set here, so those four providers are untested live.
  Put them in the shell env / `.env`, then run the command below and paste the table.
- Verify before trusting cost columns: the default list prices for deepseek-chat ($0.28/$0.42), kimi-k2-0905-preview ($0.60/$2.50), glm-4.6 ($0.60/$2.20),
  glm-4.5-air ($0.20/$1.10) in `packages/core/src/llm.ts` are from my memory of public price pages, not fetched — correct them in `OPENAI_COMPAT[...].prices`.
- Endpoint region: defaults are international (api.moonshot.ai, api.z.ai). Mainland keys need `THREADLINE_KIMI_BASE_URL=https://api.moonshot.cn/v1` / `THREADLINE_GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4`.

## Run commands
```
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
pnpm --filter @threadline/core test:providers                      # offline, no keys
node --experimental-strip-types packages/core/scripts/model-shootout.ts --offline-check   # harness self-check, no keys
DEEPSEEK_API_KEY=… KIMI_API_KEY=… GLM_API_KEY=… \
  node --experimental-strip-types packages/core/scripts/model-shootout.ts --providers=anthropic,deepseek,kimi,glm --runs=3 --verbose --out=/tmp/shootout.md
# use a provider for the whole app:  THREADLINE_PROVIDER=deepseek DEEPSEEK_API_KEY=… (optionally THREADLINE_DEEPSEEK_MODEL=…)
```
Flags: `--providers=a,b` `--runs=N` `--only=order,schedule,lookup,knowledge,catalog,remember,handoff` `--verbose` (transcripts of failures) `--out=file`.
