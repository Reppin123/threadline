# Agent "web" — landing site + auth + full dashboard (apps/web)

Read AGENTS/COMMON.md first. You own apps/web only.

## Stack
Next.js 15 App Router + React 19 + TypeScript + Tailwind v4 (or plain CSS modules — your call, keep it fast). Server actions / route
handlers call `core` from "@threadline/core" and DB helpers from "@threadline/db" directly (runtime "nodejs", transpilePackages).
No external UI CDNs; fonts via next/font. `pnpm --filter @threadline/web dev` serves :3000.

## 1. Marketing site — same conception as flow.engineer, our own brand
Study research/flow/home.html (+ .txt), the 4 SEO pages, privacy, terms. Recreate the SAME information architecture, section order,
interactions and level of polish, but in Threadline's own words and a refreshed design language (do NOT copy their text verbatim or
lift their CSS/assets; write original copy that makes the same points). Our angle: iMessage-first ("blue bubbles"), then Telegram/WhatsApp.
Sections: sticky nav (What we do, Pricing, Guides, Log in, Talk to us, Get started) → hero with the chat-style textarea
"What should your bot do?" + rotating ghost-text ideas, POST /start (stores idea → login if needed → /bots/new prefilled) →
"Three ways in" cards (I have an app / I have an MCP or API / Just an idea) with mini illustrations →
animated example conversations per channel (iMessage-styled blue bubbles first) → "The system behind every reply" 4 pillars
(orchestrator, memory, tested on simulated users, insights) with live-looking mock UI → use-case chips → pricing
(Free / Pro / Custom, metered credit model like Flow's trial credit) + "In every plan" → team/about → FAQ with FAQPage JSON-LD → footer.
SEO pages: /imessage-api, /messaging-api, /telegram-ai-agent, /whatsapp-ai-agent, /privacy, /terms (original copy, same intent).
Metadata, OG tags, sitemap.xml, robots.txt. Responsive and accessible; Lighthouse-worthy.

## 2. Auth
/login and /signup: "Continue with Google" (real OAuth if GOOGLE_CLIENT_ID/SECRET set; otherwise button shows a clear disabled state),
email magic link (tables magic_links/sessions/users; in dev with no email provider, print the link to the server log AND show a
"Dev: open sign-in link" button on the confirmation screen), and email+password (scrypt hash in users.password_hash).
HttpOnly signed session cookie (AUTH_SECRET). Middleware protects /dashboard and /bots/**. Log out.

## 3. Logged-in app — recreate EVERY screen in research/flow/dashboard.md
- /dashboard "Your bots": cards (status pill LIVE/NOT LIVE + channels, 14-day chats sparkline, THIS WEEK chats, THIS MONTH spent,
  SCHEDULED, problems, Open), trial-credit meter (users.trial_credit_usd minus SUM(usage.cost_usd)), "Make another bot" card.
- /bots/new conversational wizard: assistant bubble + starting-point chips (Just an idea / Existing website or app / An MCP server /
  Some APIs), free-text box, file attach; loop on core.nextWizardQuestion(answers) rendering chips (multi-select when multi=true) until
  null → core.createBot → kick off core.buildBot in the background (don't block the request) → redirect to the build page which shows
  live build progress (poll bots.build_progress_json) and then the builder.
- /bots/[id]/build: 3 panes. Left: builder chat (builder_messages; core.builderChat), suggestion chips, New chat, attach.
  Right: live phone preview with "Preview as" iMessage (default, authentic iMessage look) | Telegram | WhatsApp skins, web-access toggle,
  Clear, composer (attach, location, voice-note button can be stubbed), calls core.chat({channel:'web', customerHandle:'owner-preview', isTest:true}).
  Top-right "Review and deploy".
- /bots/[id]/deploy "Review and deploy": status (LIVE/NOT LIVE), channel cards — iMessage FIRST: Connect iMessage → shows the shared
  line handle (IMESSAGE_LINE_HANDLE or "line not configured" notice), the join code ("text START <join_code>"), an sms:/imessage: deeplink
  and a QR code (generate locally, e.g. `qrcode` package) — then Telegram and WhatsApp cards ("coming soon" allowed for WhatsApp).
  Writes channels rows (status live). "Deploy to customers →" calls core.deploy. Current version, "What changed", Checks block
  (core.runChecks + poll core.getTestRun, show per-case pass/fail and transcripts), rollback link to Versions.
- /bots/[id]/data: sub-tabs Saved data / Tables / Scheduled / Customers, search everything, Export all (JSON + CSV zip or JSON),
  "What your bot keeps" table cards (bot_tables + rows; owner-filled tables are editable inline), scheduled_messages list w/ cancel,
  customers list with memories.
- /bots/[id]/conversations: inbox with search, filters (All / Couldn't answer / Problems, channels), thread view showing messages AND
  tool calls, customer memory sidebar, 90-day retention note.
- /bots/[id]/versions: list newest first with checks result, CURRENT tag, See changes (diff of snapshot JSON, human readable), Roll back.
- /bots/[id]/stats: from core.getInsights — capabilities row, 4 tiles, chats-per-day stacked bars by channel, spend breakdown,
  couldn't-answer topics, needs attention. Use lightweight SVG charts (no heavy libs).
- Settings modal: bot list/switch, rename, delete (confirm), plan + "Ask about a paid pilot", API keys (create/revoke; show once;
  store sha256 in api_keys) with a curl example for OUR API.
- Public API (route handlers): POST /api/v1/bots/:id/messages {to:"imessage:+1555…", prompt, send_at?} with Bearer key +
  Idempotency-Key → inserts scheduled_messages (gateway delivers). GET /api/v1/bots/:id/customers, /conversations, /tables/:name/rows.
- Top bar on all app pages: Your bots · bot switcher · trial meter · Settings · Log out · New bot.

## Definition of Done (verify each by actually running it)
1. `pnpm --filter @threadline/web build` passes; dev server serves every route above with no console errors.
2. Headless Chrome (puppeteer or playwright, install via the lock script) script apps/web/scripts/e2e.mjs that: loads landing (desktop + mobile
   screenshots to apps/web/screenshots/), submits the hero idea, signs up via dev magic link, completes the wizard for website
   https://sanitea.vercel.app, waits for build, sends a playground message and gets a reply, opens every bot tab, connects iMessage
   (sees join code + QR), deploys, runs checks, creates an API key and posts a message via the API. All green.
3. Works with the stub core today AND with the real core as the core agent lands it (re-run e2e each loop; read COORDINATION.md).
4. Visual polish pass: compare your screenshots against Flow's structure; fix spacing, typography, empty/loading/error states.
