# Threadline — MVP spec (working name; rename freely)

"Your app, on iMessage." A business gives us a website URL, an API / MCP server, or just an idea.
We read it, build an AI agent that can answer every question about the business and take actions,
test it against simulated customers, and deploy it to iMessage (plus Telegram/WhatsApp later) via
Photon's open-source Spectrum framework. The customer texts the bot like a friend.

Reference product: flow.engineer (research saved in research/flow). Plumbing: Photon Spectrum (research/photon).

## What Flow does (research summary)
- Landing (one long page): hero with a chat-style textarea "What should your bot do?" (POST /start → sign-in → builder),
  rotating ghost-text ideas; "Three ways in" cards (I have an app / I have an MCP or API / Just an idea);
  per-channel example conversations (WhatsApp parcel pickup, iMessage Lisbon hotel, Telegram salon reschedule);
  "The system behind every reply" with 4 pillars: 01 AI orchestrator (shorthand, second thoughts, mixed languages),
  02 Built-in memory per customer per channel, 03 Tested on hundreds of simulated users every release (1,186/1,200 passing),
  04 Insights (top intents with counts, where people give up); use-case chips; pricing Free $0 (Telegram, mock-data
  prototype) / $29 mo (WhatsApp, iMessage, Telegram) / Custom; "In every plan" (your brand on the thread, every action
  logged, mock-data preview, no lock-in exports); founders section; FAQ (FAQPage JSON-LD); footer.
- SEO pages: /imessage-api, /messaging-api, /telegram-ai-agent, /whatsapp-ai-agent, /privacy, /terms.
- Auth: /login — "Build and test your bots." Continue with Google, or Email (magic link) or password; create account.
- Logged-in app (behind auth): /dashboard and /bots (both 303 → /login). Exact screens not public; we design them from
  the promise: bots list → builder (chat with the builder to shape the bot) → test playground → simulated test runs →
  connect channels → live conversations → insights → settings/billing.
- Logged-in actions/payments need the business's own API credentials; idea-only bots run on generated mock data first.

## What Photon gives us (research summary)
- spectrum-ts (MIT): `Spectrum({projectId, projectSecret, providers:[imessage.config()]})`, `for await (const [space,message] of app.messages)`,
  `space.responding(fn)` typing indicator, `message.reply`, `space.send`, webhooks with HMAC, providers: imessage (cloud),
  @spectrum-ts/imessage-local (this Mac's Messages DB), telegram, whatsapp-business, slack, terminal, custom via definePlatform.
- Spectrum Cloud: sign up at app.photon.codes for project id + secret. Free: shared line, up to 10 users. Pro $25/mo up to 100.
  Business $250/line/mo dedicated lines. So the MVP runs ALL bots on ONE shared line and routes by join code.

## Architecture (pnpm monorepo, TypeScript, Node 24 at /opt/homebrew/bin)
```
apps/web        Next.js (App Router) — landing, SEO pages, auth, dashboard, API routes      OWNER: agent "web"
apps/gateway    Spectrum service — receives iMessage/Telegram/terminal msgs, routes to bot   OWNER: agent "gateway"
packages/core   The brain — ingest (crawl site / OpenAPI / MCP / idea), bot profile,         OWNER: agent "core"
                knowledge retrieval, tool calling, memory, mock data, simulated tests, insights
packages/db     SQLite (node:sqlite, file data/threadline.db) schema + helpers               OWNER: orchestrator (append-only migrations by anyone)
research/       Saved Flow pages + Photon docs                                               read-only
```
- Single DB file shared by web and gateway: `THREADLINE_DB` env, default `<repo>/data/threadline.db`.
- web imports `@threadline/core` and `@threadline/db` directly (transpilePackages). gateway imports them too.
- LLM: `packages/core/src/llm.ts` provider abstraction. Order: ANTHROPIC_API_KEY → OPENAI_API_KEY → local Claude CLI
  (`~/.local/bin/claude -p --model sonnet`, no key needed; slow, dev only) → deterministic "offline" stub for tests.

## Routing on a shared iMessage line
- Every bot gets a `join_code` (e.g. `bakery-7k2`). Deploy page shows: text "start bakery-7k2" to <line handle>, plus a
  `sms:`/`imessage:` deeplink and QR code with that body prefilled.
- Gateway: first message containing a join code binds that sender handle → bot (`line_routes`). Later messages go to the
  bound bot. "switch <code>" rebinds; "stop" unbinds. Unbound sender with no code → friendly help text.
- Dedicated line per bot is a later paid feature (channels.line_handle per bot).

## Core flows
1. Create: hero textarea / "three ways in" → /start?idea=… → (login) → /dashboard/bots/new prefilled → createBot.
2. Build (async, progress streamed to UI): website → crawl same-origin pages (sitemap first, cap ~40 pages) → chunk →
   knowledge; LLM writes bot profile (name, persona, greeting, business summary, intents, FAQs, guardrails, suggested
   tools). API/MCP → import tools (OpenAPI operations / MCP tools list) as callable tools. Idea → generate profile +
   mock data tables + mock tools so it works end-to-end immediately.
3. Test: playground (web chat that uses the exact same `chat()` as iMessage), plus simulated-user test runs
   (LLM plays N personas incl. typos/Hinglish/mind-changes; judge grades each convo; pass rate shown).
4. Deploy: enable iMessage channel → status live → join code + QR. Gateway picks it up from DB (no restart).
5. Operate: conversations inbox (read every thread + tool calls), insights (top intents, drop-off sentence, pass rate),
   memory per customer, settings (persona, guardrails, credentials for real APIs), plan/billing (display only in MVP).

## Definition of done (MVP)
- `pnpm install && pnpm dev` runs web on :3000 and gateway; landing + SEO pages + login + full dashboard work locally.
- Sign up with email magic link (dev: link printed to server console + shown on screen in dev mode) — Google OAuth wired
  if GOOGLE_CLIENT_ID/SECRET set.
- Paste a real website URL → bot built with knowledge from that site → answers questions about it correctly in the
  playground → simulated test run shows a pass rate → deploy → terminal provider conversation works end-to-end through
  the gateway → with PHOTON creds (or imessage-local on this Mac) the same works over iMessage.
