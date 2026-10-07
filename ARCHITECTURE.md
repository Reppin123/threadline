# Threadline architecture (MVP → scale)

## Request paths
1. Owner: browser → apps/web (Next.js) → auth (session cookie) → dashboard → server actions → @threadline/core + @threadline/db.
   Slow work is NEVER done in the request: web calls `enqueueJob("build_bot" | "run_checks", …)` and the UI polls status.
2. Customer: iMessage → Photon Spectrum (cloud shared line, or this Mac's Messages in local mode) → apps/gateway → route by join code
   (line_routes) → core.chat() → replies back through Spectrum. Same core.chat() powers the dashboard playground and simulated tests.
3. Business systems: our public API (/api/v1, Bearer keys) → scheduled_messages → gateway outbound worker → customer.

## Processes (one container, three processes)
- web      Next.js, :3000 (public)
- gateway  Spectrum providers + outbound delivery, :3100 (/health, /spectrum/webhook)
- worker   apps/worker: claims jobs (build_bot, run_checks, recrawl, send_scheduled sweeps), concurrency 2, stale-job requeue
Supervised by one entry (`pnpm start:all` / Docker CMD) with restart-on-crash and shared logs.

## Data (packages/db)
SQLite (node:sqlite, WAL) on a persistent volume: users/sessions, bots + versions (immutable snapshots), knowledge_docs/chunks + FTS5,
tools, bot_tables/rows (what the bot keeps), customers + memories, conversations/messages, test_runs/cases, channels, line_routes,
scheduled_messages, api_keys (sha256), usage (metered $), events (analytics), jobs (queue).
Credentials encrypted at rest (AES-256-GCM, packages/db/src/crypto.ts). Nightly `sqlite3 .backup` to data/backups (and off-box later).
Scale path: same schema on Postgres (Supabase) + pgvector when we need >1 app instance; the db helper is the only seam to change.

## Brain (packages/core)
LLM provider abstraction (Anthropic → OpenAI → local Claude CLI dev fallback). Ingest (sitemap crawl + JSON-LD + headless fallback,
Shopify/Woo JSON, OpenAPI → tools, MCP → tools, idea → mock data). Profile + tables + test questions. Runtime agent loop with
hybrid retrieval, builtin tools (knowledge search, memory, tables, schedule, handoff, optional web fetch) and business tools.
Memory = per-customer facts table + conversation history. Checks = tools dry-run + test questions + simulated users + LLM judge.

## Hosting
- Tonight: this Mac. Docker or bare `pnpm start:all`, public URL via Cloudflare quick tunnel (cloudflared), iMessage via Photon cloud
  (or local Messages). 
- Next: the same Docker image on Fly.io / Render / Railway with a 1–3 GB volume (single instance). Gateway webhook mode behind the
  public URL. Domain + TLS via Cloudflare.
- Later: split web (Vercel) from gateway+worker (Fly) once DB is Postgres; dedicated Photon lines per paying bot.
