# Agent "core" — the brain that delivers the promise (packages/core)

Read AGENTS/COMMON.md first. You own packages/core. Implement EVERY function of `CoreAPI` in src/contract.ts for real, replacing the
stubs in src/index.ts (keep `export const core` and `export * from "./contract.ts"`). Split into modules (llm.ts, ingest/*.ts,
knowledge.ts, profile.ts, tools/*.ts, runtime.ts, memory.ts, tables.ts, builder.ts, wizard.ts, checks.ts, versions.ts, insights.ts, usage.ts).
The promise: a business gives a website / MCP server / API / idea and gets a bot that knows everything about the business, answers
every question correctly, takes real actions, remembers each customer, and is tested before customers see it.

## LLM layer (llm.ts)
One interface `complete({system, messages, tools?, json?, maxTokens})` → {text, toolCalls, usage}. Providers in order:
ANTHROPIC_API_KEY (Messages API with native tool use; default model claude-sonnet-4-5 or newer, configurable via THREADLINE_MODEL) →
OPENAI_API_KEY (Responses/Chat API with tools) → local Claude CLI fallback (`$HOME/.local/bin/claude -p --model sonnet
--output-format json`, prompt-engineered JSON tool-calling protocol; slow, dev only; batch where possible) → "offline" deterministic
provider (env THREADLINE_LLM=offline) used by unit tests. Record usage + estimated cost in `usage` (category answering|build|media|tests).
Right now no API key is set on this Mac: the CLI fallback must actually work end-to-end.

## Ingest
- website: fetch robots + sitemap(s) first, else BFS same-origin links; cap 40 pages (configurable), concurrency 4, 10s timeouts, polite UA.
  Extract main text (strip nav/footer/scripts), title, headings; ALSO parse JSON-LD (Product/Offer/FAQPage/Organization), OpenGraph,
  and price/product grids, because product facts matter most. If a page is a client-rendered shell (little text), fall back to headless
  Chrome (puppeteer, install via lock script) for that page. Detect Shopify/WooCommerce and use their public JSON (/products.json,
  /wp-json/wc/store/products) when present. Store knowledge_docs → chunk (~800 chars, overlap) → knowledge_chunks + knowledge_fts.
- mcp: connect with @modelcontextprotocol/sdk (Streamable HTTP, SSE fallback), list tools → tools rows (kind mcp).
- api: OpenAPI 3 / Swagger 2 → one tool per operation (kind http) with JSON-schema input from params/body, base URL, auth from
  bots.credentials_json (bearer / header / query). If only docsUrl, crawl docs and let the LLM draft tool specs, marked unverified.
- idea: LLM drafts profile + bot_tables + mock collections + mock tools (kind mock operating on mock_records) so the bot works immediately.

## Understand → profile, tables, tools
LLM reads ingested material + wizard answers → BotProfile (store bots.profile_json, set bots.name), test_questions (10–20 realistic
customer questions with expected answers grounded in the source), bot_tables per capabilities (e.g. Orders filled_by bot; Team tasks
filled_by owner), builtin tools: search_knowledge, remember_fact, recall, save_row/update_row/find_rows (bot tables), schedule_message,
handoff_to_human, plus fetch_page when bots.web_access=1. Taking orders on a site with no API → save to Orders table + confirm to customer
(that is how Flow does "Just a website").

## Runtime chat() — one agent loop for every channel
System prompt = persona + business summary + guardrails + channel style (short texting bubbles, no markdown tables on iMessage,
mirror user's language incl. Hinglish) + customer memories + relevant knowledge (hybrid retrieval: FTS5 bm25 + optional embeddings
if an embedding provider exists; top 6–8 chunks with URLs). Conversation threading: reuse the customer's open conversation if last
message < 6h. Tool loop (max 6 steps) with confirmation for requires_confirmation tools. Split long replies into 1–3 bubbles.
Detect couldn't-answer (no grounded info) → flag messages.couldnt_answer + topic; never invent prices/policies. Extract durable
customer facts to memories after each turn (cheap model / same call). Record intent + outcome on conversations. Track cost.

## Builder, wizard, versions, checks, insights
- nextWizardQuestion: Flow-style: starting point → source specifics (URL / MCP URL / API docs / the idea) → who will chat (customers / team) →
  what should the bot do (LLM-generated capability chips for THIS business; fetch the URL quickly to tailor them) → follow-ups for actions
  (e.g. "For taking and tracking orders, use…: Just a website / Shopify / my API"). 3–6 questions total; return null when enough.
- builderChat: owner instructions edit the draft (profile, guardrails, faqs, tables, tools, test_questions); reply with what changed,
  2–3 new suggestion chips; persist builder_messages; draft_dirty=1.
- deploy/rollback: immutable bot_versions snapshots (hash), current/previous status, bots.current_version_id; chat() uses the version snapshot
  for live channels and the draft for isTest.
- runChecks: (a) call each changed tool once in dry-run/mock, (b) play every test_question, (c) N simulated users (default 12;
  personas incl. typos, Hinglish, mind-changes, refund after delivery, off-topic, prompt-injection) multi-turn via an LLM user simulator,
  (d) LLM judge grades each vs grounded truth → test_runs/test_cases. Runs async; getTestRun returns progress.
- getInsights: exactly the Insights shape from the events/messages/usage tables.

## Definition of Done (verify by running)
1. Typecheck passes. `pnpm --filter @threadline/core test` runs a selftest in offline mode covering every CoreAPI function.
2. scripts/e2e-real.ts (uses the real LLM fallback): build a bot from https://sanitea.vercel.app (Aki's own tea shop) — it must answer
   correctly: product names + prices, a gifting recommendation, brewing tips, shipping/returns policy if on the site, take an order into
   the Orders table, remember the customer's name across two conversations, and say "I don't know / let me check" for something not on the
   site. Print the transcript to AGENTS/core-e2e-transcript.md. Also build an idea-only bot ("bakery taking cake orders") and an OpenAPI bot
   (use the public Swagger Petstore https://petstore3.swagger.io/api/v3/openapi.json) and show a successful tool call.
3. runChecks produces a pass rate ≥ 85% on the Sanitea bot; if not, improve prompts/retrieval and re-run (that loop is the job).
4. Performance: a chat turn with an API-key provider < 6s p50 (document CLI fallback latency separately).
