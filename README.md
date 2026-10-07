# Threadline — your app, on iMessage

**Live demo:** https://yang-enters-supplement-incorporate.trycloudflare.com

Give Threadline a website, an API / MCP server, or just an idea. It reads everything, builds an AI agent that knows the business,
tests it against simulated customers, and deploys it to **iMessage** (Telegram / WhatsApp next) — so customers can text your business
like a friend: ask questions, get recommendations, place orders, get reminders.

Built in one afternoon by a team of four parallel AI coding agents orchestrated by Apprentice, on top of
[Photon Spectrum](https://github.com/photon-hq/spectrum-ts) (open-source iMessage plumbing) and Claude.

## What works today
- **Landing site + SEO pages** (`/`, `/imessage-api`, `/messaging-api`, `/telegram-ai-agent`, `/whatsapp-ai-agent`, privacy, terms).
- **Sign up / sign in** — email magic link (dev mode shows the link on screen), email + password, Google OAuth when configured.
- **Conversational new-bot wizard** — "What are we starting from?" → website / MCP server / APIs / just an idea → tailored follow-ups.
- **Automatic build** (background worker): crawls the site (sitemap, JSON-LD, Shopify/Woo JSON, headless fallback), extracts the
  catalog + key facts, writes the bot's persona, FAQs, guardrails, data tables and test questions. OpenAPI → callable tools,
  MCP → tools, idea → mock data so it works immediately.
- **Builder** — chat with the builder to change the bot; live phone preview (iMessage / Telegram / WhatsApp skins).
- **The brain** — one runtime for every channel: hybrid knowledge retrieval (SQLite FTS5), tool calling, per-customer memory,
  tables the bot fills from chats (e.g. Orders), scheduling, human handoff, "I don't know" instead of hallucinating.
- **Checks** — simulated customers (typos, Hinglish, mind-changes, prompt-injection) + test questions, graded by an LLM judge.
- **Deploy + versions** — immutable versions, rollback, iMessage channel, "bot texts you first" invite flow.
- **Data, Conversations, Stats** dashboards; public API with keys for check-ins (`POST /api/v1/bots/:id/messages`).
- **iMessage gateway** on Photon Spectrum Cloud (connected), per-sender ordered queue, burst debounce, retries, outbound scheduler.

Measured on a real store (sanitea.vercel.app): 11/11 end-to-end checks (prices, gifting, brewing, shipping/returns, order saved,
memory across conversations, Hinglish, "don't know"), chat p50 **3.8 s** on claude-sonnet-5-5.

## Architecture
```
apps/web        Next.js 15 — site, auth, dashboard, public API
apps/gateway    Photon Spectrum — iMessage (cloud / local Mac / terminal), routing, outbound
apps/worker     Durable job queue — bot builds, checks, recrawls
packages/core   The brain — ingest, profile, retrieval, tools, memory, runtime, checks, insights
packages/db     SQLite (node:sqlite, WAL) schema + migrations + job queue + AES-GCM credential encryption
deploy/         Dockerfile, docker-compose, fly.toml, render.yaml
```
More: [ARCHITECTURE.md](ARCHITECTURE.md) · [SPEC.md](SPEC.md) · [CONFIG.md](CONFIG.md) · [deploy/README.md](deploy/README.md) ·
[apps/gateway/README.md](apps/gateway/README.md).

## Run it
Requires Node 24 and pnpm.
```bash
pnpm install
# set ANTHROPIC_API_KEY (and SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET for real iMessage) — see CONFIG.md
pnpm start:all        # web :3000, gateway :3100, worker :3200
pnpm seed             # optional demo user + bot
pnpm smoke            # end-to-end smoke test
pnpm tunnel           # public URL via Cloudflare quick tunnel
```
Open http://localhost:3000 → Get started → paste a website → chat with your bot in the preview → Deploy → enter your phone number
and the bot texts you on iMessage. (Photon free tier: add the phone number under Users in the Photon dashboard first.)

## How it was built
`AGENTS/` holds the briefs, shared rules and status logs of the four agents (web, gateway, core, platform) that built this in parallel
against a frozen contract (`packages/core/src/contract.ts`) and an append-only coordination log (`COORDINATION.md`).
