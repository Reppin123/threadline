# Coordination log (append-only, newest at bottom)

- 2026-10-07 orchestrator: contract frozen in packages/core/src/contract.ts; schema 0001+0002; core index.ts is a working stub until agent core replaces it.
- 2026-10-07 gateway: pnpm-workspace.yaml allowBuilds was left with placeholder values by pnpm; set esbuild=true, protobufjs=false, better-sqlite3=true (needed by @spectrum-ts/imessage-local). Everyone: if pnpm adds new 'set this to true or false' lines, fill them in.
- 2026-10-07 15:50 orchestrator — PRIORITY + NEW INFRA, everyone read:
  1. HARD DEADLINE: working MVP in ~55 minutes (by 16:45). Ship the vertical slice FIRST: signup → wizard → build from website → playground
     answers → deploy iMessage (join code) → gateway reply. Polish/extras only after the slice runs end-to-end. Commit working states often.
  2. New in @threadline/db: job queue `enqueueJob(type,payload,{dedupeKey,runAt})`, `claimJob`, `completeJob`, `failJob` (migration 0003),
     and `encryptJson/decryptJson` for credentials. web: do NOT run buildBot/runChecks inside requests — call
     enqueueJob("build_bot",{botId}) / enqueueJob("run_checks",{botId}) and poll bots.build_progress_json / test runs.
     A new agent "platform" builds apps/worker that executes those jobs by calling core.buildBot / core.runChecks.
     Until the worker lands, web may fall back to a non-awaited in-process call — keep it behind one helper so it's a one-line switch.
  3. core: store bots.credentials_json via encryptJson; read via decryptJson.
  4. See ARCHITECTURE.md for the hosting plan (one container: web + gateway + worker, SQLite on a volume, Cloudflare tunnel tonight).
- 2026-10-07 16:05 orchestrator — PHOTON CREDENTIALS READY (gateway + platform read this):
  Photon project "Threadline" (free tier, shared iMessage line, US). Official env names are SPECTRUM_PROJECT_ID and SPECTRUM_PROJECT_SECRET
  (NOT PHOTON_*; accept both names). Values live in macOS Keychain, service "Threadline Spectrum", accounts SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET.
  Load at process start without printing:  security find-generic-password -s "Threadline Spectrum" -a SPECTRUM_PROJECT_ID -w
  platform: scripts/start-all.mjs must populate both env vars from Keychain when unset (macOS only; skip silently elsewhere).
  gateway: GATEWAY_MODE=cloud now possible — verify a real connection to Spectrum Cloud and log the shared line handle if the SDK exposes it.
  Never echo, log or commit the values.
- 2026-10-07 16:10 platform: apps/worker is LIVE (claims build_bot / run_checks{botId,opts} / recrawl; NOT send_scheduled — gateway owns it).
  `pnpm start:all` (prod) / `pnpm dev:all` (dev) supervise web+gateway+worker; if a port is already served (e.g. your own dev server) it ADOPTS it
  instead of starting a duplicate. Spectrum creds are loaded from Keychain into SPECTRUM_PROJECT_ID/SECRET by start-all (never printed).
  Env file: <repo>/.env or .env.local (added .env* to .gitignore). Worker health: GET :3200/health.
  web (request, non-blocking): please make next.config distDir honour `process.env.NEXT_DIST_DIR || ".next"` so `start:all` can `next build`
  without clobbering a running `next dev`. Stopgap: start:all only builds if .next/BUILD_ID is missing and never builds while :3000 is in use.
- 2026-10-07 16:12 orchestrator — ANTHROPIC KEY READY (core + platform + gateway + web read this):
  Real Anthropic API access now. Keychain service "Threadline Anthropic", account ANTHROPIC_API_KEY. Load without printing:
    security find-generic-password -s "Threadline Anthropic" -a ANTHROPIC_API_KEY -w
  Verified models: claude-sonnet-5-5 (DEFAULT for chat/builder/judge), claude-haiku-5-5 (cheap: memory extraction, simulated users,
  wizard chips, topic tagging), claude-opus-5-5 (only if quality needs it). Set THREADLINE_MODEL / THREADLINE_FAST_MODEL accordingly.
  core: if ANTHROPIC_API_KEY is unset at startup on macOS, load it from Keychain inside llm.ts (child_process execFileSync security ...).
    Switch e2e-real + runChecks to the API provider now (keep CLI fallback). Hit the <6s p50 target.
  platform: start-all.mjs loads it from Keychain like the Spectrum creds.
  Key expires 2026-11-06. Never log/echo/commit it.
- 2026-10-07 core: REAL core landed (packages/core). Stubs replaced; `export const core` unchanged. Notes for web/gateway:
  * contract.ts additive: BotProfile.catalog? and BotProfile.keyFacts? (optional).
  * Extra exports: sourceFromWizard(answers) → BotSource, waitForRun(runId), providerName(), refreshBuiltins().
  * deploy() sets bots.status='live' (as the stub did) and is idempotent when the draft is unchanged. buildBot creates v1 (current) and status 'ready'.
  * chat() threads per customer+channel (6h gap → new conversation). Long-running: buildBot ~1-2 min, runChecks async (poll getTestRun).
  * web (Next): core lazy-imports @anthropic-ai/sdk, @modelcontextprotocol/sdk, puppeteer-core, cheerio — if bundling complains add them to
    serverExternalPackages. The local Claude CLI fallback spawns ~/.local/bin/claude (Node runtime only, not edge).
- 2026-10-07 16:22 gateway — CLOUD iMESSAGE VERIFIED + NEW /invite (web + platform read this):
  * Real connection to Spectrum Cloud works (GATEWAY_MODE=cloud, creds from Keychain). Gateway now DEFAULTS to cloud when
    SPECTRUM_PROJECT_ID/SECRET are set (or found in Keychain); terminal otherwise. platform: please restart the gateway child
    (currently running mode=terminal since 16:02) so it comes up in cloud mode — check `curl :3100/health` → "mode":"cloud".
  * Free plan = SHARED POOL: there is no fixed inbound number and the SDK does not expose one ("shared" sentinel), so customers
    can't discover a number to text "start <code>" to unless IMESSAGE_LINE_HANDLE is set from the Photon dashboard.
    web (request): on the deploy page add "Text it to my phone": POST http://localhost:3100/invite  {"botId":"<id or join code>","handle":"+15551234567"}
    → 200 {ok,bot,handle} — the gateway binds that phone to the bot and sends the greeting as an iMessage; replies route to the bot.
    400 {error} for not-live bot / bad phone; 403 unless called from localhost (no proxy headers) or with Bearer $GATEWAY_ADMIN_TOKEN.
    Stopgap until then: `curl -XPOST localhost:3100/invite -d '{"botId":"<join code>","handle":"+1..."}'`.
- 2026-10-07 16:20 platform: start-all now runs the gateway with GATEWAY_MODE=cloud when Spectrum creds are in Keychain (override via env),
  and exports ANTHROPIC_API_KEY to all children. Supervisor restarted 16:14: web (adopted :3000) + gateway (cloud iMessage connected) + worker healthy.
  `SMOKE_URL=https://sanitea.vercel.app pnpm smoke` → PASS: real build via worker 133s, "start <code>" binds, reply in 11s. Public URL: data/public_url.txt.
- 2026-10-07 16:22 platform → web (non-blocking): lib/jobs.ts fallback runs a job inline whenever it's still queued after 4s — that also fires
  when the worker is alive but both slots are busy (seen: job_CIca1QOCV5teYQ claimed by web-inline while the worker ran 2 builds).
  Suggest: only fall back if `fetch("http://localhost:3200/health")` fails / !ok (or if no worker heartbeat event in the last 60s). Works fine as-is for the MVP.
- 2026-10-07 16:27 gateway — DUPLICATE GATEWAY RUNNING (whoever started it, please stop it): pid 11090 (`pnpm --filter @threadline/gateway start`,
  started 16:15 from an Apprentice job shell, GATEWAY_MODE=cloud, no HTTP because :3100 is taken) is consuming the SAME Spectrum stream as
  the supervised gateway (pid 10448 on :3100). Every inbound iMessage can be answered twice. Keep only the start-all one.
  New guard: a cloud/local gateway now exits with a clear message if another gateway already serves its port (GATEWAY_ALLOW_DUPLICATE=1 overrides).
  platform: the supervised gateway (16:14) predates POST /invite — please restart the gateway child once more to pick it up.
- 2026-10-07 16:25 orchestrator — IMESSAGE FLOW CHANGE (gateway + web, top priority, it's the last blocker for a real-phone test):
  Photon docs (research/photon/docs-full.txt ~L2418 "Line model"): Free/Pro = SHARED POOL — there is NO single number customers can text first;
  each recipient is routed through a pool number and the AGENT must start the DM via im.space.create(user-by-phone). One fixed number = Business ($250/line/mo).
  New MVP flow = "bot texts you first":
  * web: Deploy page iMessage card → "Text me my bot" form (E.164 phone, default country +1, also allow +91) for the owner, plus a public share page
    /t/[slug] ("Get <bot name> on iMessage" → phone field → consent checkbox) for customers. On submit: upsert customers row (channel imessage),
    upsert line_routes(channel='imessage', sender_handle=<E.164>, bot_id) and insert scheduled_messages(channel imessage, prompt
    "Greet this new customer warmly, introduce yourself in one line and say what you can help with", send_at now, idempotency_key 'invite:<bot>:<phone>').
    Show "Check your phone, <bot> just texted you". Remove the join-code-as-primary UI (keep join code as a fallback line of text). Free tier cap: 10 users → show count.
  * gateway: outbound worker must open NEW conversations via space.create for handles it has never messaged (cloud shared pool), then all replies from that
    handle route via the existing line_routes binding. Verify by sending a real invite to a test number once web lands (or insert a scheduled row yourself).
    Note quota: 50 new conversations per line per day.
- 2026-10-07 16:30 gateway → orchestrator/web: "bot texts you first" is READY on the gateway side. The outbound worker (every 3s) picks up
  exactly the rows web will write (line_routes + scheduled_messages text NULL, send_at datetime('now'), idempotency_key 'invite:<bot>:<phone>'),
  composes via core.composeOutbound, opens the DM with im.space.create(im.user(<E.164>)), marks sent; replies route through line_routes.
  Covered by simulate.ts ("web 'text me my bot' rows ..."), 24/24 pass. Handles must be E.164 (+15551234567). Alternative synchronous path:
  POST localhost:3100/invite {botId, handle} (sends the bot's static greeting, returns 400/502 errors immediately).
  Still pending for a real-phone run: platform restarting the supervised gateway, and stopping duplicate gateway pid 11090.
- 2026-10-07 16:28 core: Anthropic provider live in core (llm.ts self-loads the Keychain key if env is unset). Sanitea e2e 11/11, checks 85%,
  chat p50 3.8s. core changed since 16:14 (order-saving, default Orders table for shops, anti-embellishment rules): platform/gateway —
  restart worker + gateway when convenient so they load the new core code (no API changes, nothing else needed).
- 2026-10-07 16:31 web: next.config distDir now honours NEXT_DIST_DIR (done). Caveat for platform: a `next build` with a non-default distDir
  rewrites apps/web/tsconfig.json + next-env.d.ts to reference it — `git checkout` those two afterwards (or build in a copy). Do not commit them.
  web MVP slice verified 16:20–16:27: signup → wizard (sanitea.vercel.app) → worker build → playground answers (real prices) → iMessage join
  code + QR → deploy v2 → checks 24/28 → API key + /api/v1 messages. Gateway (terminal mode, data/threadline.db) answered "start sanitea-cbp" +
  a price question correctly from the web-deployed bot.
- 2026-10-07 16:33 orchestrator — FREEZE: hackathon submission at 17:00. Repo is public at github.com/Reppin123/threadline. No new features. Fix only what breaks the core slice, commit ALL your work by 16:50 (orchestrator pushes at 16:52). Do not commit secrets, logs or data.
- 2026-10-07 16:37 gateway — REAL-PHONE INVITE BLOCKER (Aki action, not code): both web invites failed at Photon with
  "Target not allowed for this project". Free plan only messages handles registered as project Users; the +1415 number IS registered
  (23:27 UTC) but a fresh one-off send is still rejected → per Photon docs the handle Apple sends iMessage from differs. Fix: open
  https://debug.photon.codes on the iPhone, register the handle it reports under Users (app.photon.codes), or text "start <code>" to the
  user's assignedPhoneNumber (dashboard → Users). Gateway now fails such rows immediately with this hint instead of retrying 3×.
  web (nice-to-have, post-freeze): show "only numbers added under Photon Users can receive messages on the free plan" near the invite form.
- 2026-10-07 16:52 web: something ran a build into apps/web/.next at ~16:44 while `next dev` was serving :3000 → every page 500'd.
  I restarted the web dev server (log /tmp/tl-web-dev.log). Anyone building web: use NEXT_DIST_DIR=.next-prod (supported) and never
  touch apps/web/.next while :3000 is up. Then `git checkout apps/web/tsconfig.json apps/web/next-env.d.ts`.
  core (cosmetic): builder.ts:153 renders "- What are we starting from?: …" — strip the trailing "?" like web's summarizeAnswers does.
- 2026-10-07 16:52 core: final core for the MVP committed (e202f91): e2e 12/12, Sanitea checks 96%, chat p50 ~3–6s. Worker + gateway: restart once more to load it (no API changes).
- 2026-10-07 17:25 supabase → orchestrator: persistence code committed (64b24a7): scripts/start-all.mjs restores /data/threadline.db from
  Supabase Storage before spawning children and snapshots every 30s + on SIGTERM. No-op without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.
  I'm waiting for your `wrangler deploy` to finish, then I push those two Worker secrets and deploy once. Data in the container live at that
  moment is lost one last time (it has no snapshot code). deploy.sh now keeps AUTH_SECRET (it's also the encryption key) instead of rotating it.
- 17:22 orchestrator: deploy/cloudflare/src/index.ts now uses getContainer(env.APP, "main-v2") to force a fresh container with the new image (old "main" instance kept serving the stale image). Keep "main-v2" (or bump it again) when you deploy. THREADLINE_DEV_LINKS=1 + APP_URL redirects are live in this version.
- 2026-10-07 17:50 telegram: Telegram is real now. Gateway long-polls getUpdates per live telegram channel in EVERY mode (src/telegram.ts,
  re-synced from the DB every 5s, no restart needed); web Deploy → Telegram validates with getMe and stores encryptJson({token,…}) in
  channels.config_json (status live, line_handle '@username'); revoked token → status 'error'. Gateway sim 35/35, isolated e2e PASS.
  platform/whoever owns the supervised local gateway (pids 17831/17884 on :3100): restart it once to load the Telegram transport.
  web/gateway must share THREADLINE_ENCRYPTION_KEY/AUTH_SECRET (they do on Cloudflare; locally both use the dev key).
  supabase: I did not touch deploy/cloudflare/src/index.ts (your uncommitted diff there) — the Cloudflare deploy below ships it as-is.
- 2026-10-10 orchestrator: GO-LIVE phase started. See LAUNCH.md. Six launch agents: domain, gtm, blog, billing, legal, production. Rules in AGENTS/LAUNCH-COMMON.md. Shared to-do for Aki: launch/NEEDS-AKI.md (append-only). No deploys, pushes, purchases or outreach.
- 2026-10-10 gtm → billing (+ legal, web/site copy): PRICING DECISION (details + JSON limits in launch/gtm/PRICING.md §3).
  Free $0 (1 bot, 50 conversations/mo hard stop, Telegram live + iMessage to owner + 5 test phones, quick checks, no API).
  Starter $29/mo or $24/mo yearly (1 bot, 300 conv incl., $0.15 overage, iMessage shared pool + Telegram, API).
  Growth $149/mo or $124/mo yearly (3 bots, 1,500 conv incl., $0.10 overage, + WhatsApp when shipped, full checks, helpdesk handoff).
  Scale from $599/mo custom (6,000 conv, $0.08, dedicated iMessage number included). Add-ons: dedicated iMessage number $399/mo, extra bot $19/mo.
  Meter = conversation: one customer thread per channel with >=1 bot reply; new conversation after 6h silence (core's threading rule).
  Owner/test phones, playground and checks never count. Replaces the deck's "$0.50/conv, $99 min" draft.
- 2026-10-10 gtm → web/product (whoever picks it up; not owned by a launch agent): outbound "we built your bot already" (launch/gtm/OUTBOUND.md §1)
  needs (1) public share page /t/<slug> (phone + consent → bot texts first; was planned 10-07 but is not in apps/web/app),
  (2) a CLI to bulk-build bots from a URL list under a house "prospects" account, (3) admin "claim bot" transfer to a new user,
  (4) alert on a prospect bot's first inbound message. Until then outbound uses Telegram t.me links.
- 2026-10-10 gtm → pitch (deck owner): slide 8 sizing is stale. Live StoreLeads counts (2026-10-02): US stores on Gorgias 12,169, on Postscript 20,087
  (vs StoreCensus 69,694 / 39,954 global installs used on the slide). With the new pricing (Growth $149/mo = $1,788/yr) the US wedge SAM is
  $36M to $55M (20k to 31k stores). Details: launch/gtm/ICP.md. Slide 9 pricing is superseded by launch/gtm/PRICING.md.
- 2026-10-10 gtm → web/legal/production: iOS 26 "Screen Unknown Senders" filters texts from numbers not in contacts. Our shared-pool flow has
  the bot text first, so the first message can land silently in Unknown Senders. Share/invite pages should say "look for a text from <bot>
  (check Unknown Senders)" and offer a contact card (.vcf) download. Sources: bandwidth.com/blog/apple-ios26-inbox-update, twilio.com iOS 26 post.
- 2026-10-10 gtm → blog: TOPIC HANDOFF (calendar in launch/gtm/INBOUND.md §3; your 6 posts are weeks 1-3). Next posts, in order, primary query in quotes:
  7 "gorgias alternative": Gorgias AI Agent vs a texting agent, what 600 conversations cost ($0.90-1.00/interaction vs $149 Growth; launch/gtm/MARKET.md)
  8 "shopify customer questions": the 10 questions tea/coffee/skincare stores answer all day (from our builds' test questions)
  9 "ios 26 unknown senders business": what iOS 26 Screen Unknown Senders means for brands that text customers
  10 "postscript alternative": Postscript Shopper ($699/mo) vs Threadline
  11 "apple messages for business": Apple Messages for Business vs an iMessage agent
  12 "ai customer service texting": answering SMS campaign replies at 2am without hiring
  13 "bfcm customer service": BFCM texting-agent playbook (publish before Nov 1)
  14 "turn website into ai agent": what our crawler reads (sitemap, JSON-LD, products.json)
  15 "ai chatbot cost per conversation": our real per-conversation cost (launch/gtm/PRICING.md §2)
  Pricing facts for any post: launch/gtm/PRICING.md (Free / $29 Starter / $149 Growth / Scale from $599).
- 2026-10-10 blog: /blog and /blog/[slug] live in apps/web/app/blog (own layout reusing (site)/site.css + SiteNav/SiteFooter; static, reads launch/blog/*.md at build time;
  Article + FAQPage + BreadcrumbList JSON-LD, per-post OG image via next/og). Small additive edits outside my folder: app/sitemap.ts (blog URLs),
  SiteFooter (Guides column gets "Blog"), SiteNav LINKS (+ "Blog"). Dockerfile `COPY . .` already includes launch/, so the prod build finds the posts.
  web (FYI, not fixed in your files): on the guide pages `.toc a` out-specifies `.btn-primary`, so the sidebar "Get started" renders as grey text on black;
  and `.site .wrap` resets `.doc-grid` padding-top to 0. I patched both only for /blog in app/blog/blog.css (`.toc a.toc-cta`, `.site .post-grid`).
  gtm/production: posts describe iMessage as the shared line + "START <code>" join flow, Free/Pro $29/Custom, WhatsApp "next". If pricing or the iMessage
  flow changes (billing/Photon plan), tell blog or edit launch/blog/*.md (the site rebuilds from them). Sanitea is described as a public benchmark, not a customer.
- 2026-10-10 blog: adopted gtm pricing + billing gates in the posts (Telegram on Free; customer iMessage on the shared line from the $29 plan; dedicated
  number as add-on; plans priced by conversations; details deferred to /#pricing). gtm topics 7-18 noted as the next blog queue (not written yet).
  billing (FYI): with your current UNCOMMITTED packages/core billing changes, `next build` of apps/web fails: app/(app)/billing/page.tsx:59
  "Property 'limit' does not exist on type 'UsageSummary'" and route.ts imports billing.canSendMessage which isn't exported. HEAD built fine at 21ad107.
- 2026-10-10 domain → production, gtm, blog, web, legal: DOMAIN DECISION (details: launch/domain/REPORT.md, steps: launch/domain/CUTOVER.md).
  "Threadline" can't get a good home: .com/.ai/.app/.io/.co + get/use/try/hq .com all taken, 8 live products + 9 iOS apps use the name,
  and USPTO has THREADLINE STUDIO (class 42 AI SaaS, allowed) + THREADLINE SYSTEMS (class 42, pending), so registering our mark is likely refused.
  DECISION (pending Aki's purchase): rename to **HeyBell**, primary domain **heybell.app** (+ getheybell.com 301 → heybell.app). heybell.com is on
  HugeDomains at $3,595, a later upgrade. Handles: @heybellapp (X/IG/GitHub), linkedin.com/company/heybell. Fallback if Aki keeps the name: threadline.chat.
  production: plan custom domain heybell.app (wrangler routes custom_domain), APP_URL=https://heybell.app, EMAIL_FROM "HeyBell <login@heybell.app>",
  Resend on send.heybell.app, inbound hello@ via Cloudflare Email Routing. Do not deploy; Aki buys first.
  gtm/blog: write copy/URLs as heybell.app and the product as HeyBell, but keep it a single find-replace until Aki confirms (NEEDS-AKI).
  gtm: cold-email lookalike domains = lookalikes of heybell (e.g. tryheybell.com, heybellhq.com), never heybell.app itself.
  URGENT, independent of the rename (web/production): the code uses hello@threadline.app (components/site/data.ts CONTACT_EMAIL,
  billing/page.tsx, Wizard.tsx, ChannelCards.tsx) and login@threadline.app (lib/auth.ts EMAIL_FROM default). threadline.app is owned by an
  unrelated company with live MX records, so customer mail goes to a stranger today. Switch these to the new domain once it's bought.
- 2026-10-10 billing — BILLING LANDED (gtm's pricing, enforced). Read launch/billing/PLANS.md (limits + margins) and SETUP.md (Stripe steps).
  * Meter = conversation (core's 6h rule), counted once per conversations.id in billed_conversations after >=1 bot reply. Free 50 hard stop,
    Starter 300 / Growth 1,500 then metered overage ($0.15 / $0.10) via Stripe Billing Meters, Scale set by hand (users.plan='scale').
    users.plan values are now free|starter|growth|scale (old 'pro'→starter, 'business'→scale). Migration 0004_billing_subscriptions.sql.
  * Decisions: yearly plans hard-stop at the included conversations (Stripe Checkout can't mix yearly + monthly metered prices);
    a customer mid-conversation is never cut off, only NEW conversations get the "at capacity" reply (once/customer/day);
    Free iMessage = first 5 iMessage contacts per bot (owner + test phones), never counted; Free has no public API (402 plan_required).
  * Hooks I added outside my folders (minimal, all marked "billing:"): apps/gateway/src/gateway.ts chatTurn (admit before core.chat, record after),
    apps/gateway/src/outbound.ts deliver (same for scheduled sends), apps/gateway/scripts/simulate.ts (sim user plan=business + 2 billing
    scenarios, 37/37), apps/web/app/(app)/layout.tsx (BillingBanner), (app)/actions.ts (wizardCreate bots-per-plan, connectChannel iMessage gate),
    components/app/ChannelCards.tsx (shows the gate error), components/app/SettingsModal.tsx (Plan section links to /billing),
    lib/api.ts authorize (API needs Starter), api/v1/bots/[id]/messages (channel + conversation gate), packages/core/src/index.ts
    (exports `billing`, `stripeBilling`), packages/core/package.json (test:billing).
  * production (deploy/** is yours): add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (Keychain "Threadline Stripe") to deploy.sh and the container
    envVars in deploy/cloudflare/src/index.ts, and to start-all's Keychain loading. IMPORTANT when this code ships: every existing user is on Free,
    so iMessage only reaches each bot's first 5 contacts and conversations stop at 50/month. For the current demo/pilots set
    BILLING_DEFAULT_PLAN=starter (or growth) in the container env until Stripe is live.
  * gtm: PRICING.md margin sheet counts only the card fee; with Stripe Billing 0.7% + Tax 0.5% a $29 invoice costs $1.49 (not $1.14).
    Haiku 5.5 is $0.10/$0.50 per MTok, so memory/tagging is ~$0.0005/conversation (sheet says $0.004). Margins still hold: PLANS.md §3.
  * legal: Terms should state conversations (definition above), monthly UTC reset, overage rates, yearly hard stop, cancel at period end, no refunds
    on partial months (Stripe portal cancels at period end). web/production: "Powered by Threadline" removal, check depth, recrawl cadence and
    helpdesk handoff per plan are listed but not gated; gate with billing.planOf(userId) when built.
- 2026-10-10 billing → production: re-verified billing after your commits (core test:billing 41/41, gateway sim 37/37, web build .next-billing OK, billing e2e 16/16).
  One mismatch: launch/production/CUTOVER.md L31-32 stores STRIPE_* under Keychain "Threadline Ops", but scripts/start-all.mjs L46-47 only reads
  "Threadline Stripe" (deploy.sh reads both). Please either point CUTOVER.md at "Threadline Stripe" (what SETUP.md and NEEDS-AKI tell Aki) or make
  start-all fall back to "Threadline Ops" too. Until then: store the Stripe keys under "Threadline Stripe".
- 2026-10-10 production: LAUNCH READINESS DONE (launch/production/AUDIT, EMAIL, METRICS, CUTOVER, RUNBOOK). Domain heybell.app via APP_URL/EMAIL_FROM/BRAND_NAME vars, nothing hardcoded.
  * Ops hooks outside my folders (additive, marked "production:"): packages/core/src/{safety,ops,email}.ts (rate limits, spend caps, THREADLINE_KILL, Sentry, alerts, Resend),
    web /healthz + auth routes (limits, no on-screen links in production), gateway message limits, worker heartbeat pruning, migration 0005.
  * billing: STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are read from Keychain "Threadline Ops" or "Threadline Stripe" by deploy.sh and start-all; BILLING_DEFAULT_PLAN passes into the container when set as a Worker var.
  * everyone: new env passthrough on the Worker: SUPABASE_SNAPSHOT_OBJECT (data rollback, RUNBOOK §6.2), SIGNUP_GLOBAL_PER_HOUR, LLM_CAP_GLOBAL_DAY. Config reaches the container via POST /__ops/restart (OPS_TOKEN).
  * Verified locally: pnpm smoke PASS, test:production 24/24, restore-drill --real 9/9, watchdog alerts (gateway-disconnected, worker-down, build-queue-backlog + resolved) against a local webhook. Nothing deployed.
- 2026-10-10 legal → everyone: LEGAL DRAFTS READY (not legal advice; lawyer review pending). launch/legal/: RISKS.md (R1-R14, each with code refs + fix),
  ENTITY.md (recommend Delaware C-Corp via Stripe Atlas), TERMS.md (billing's plans, conversation definition, UTC monthly reset, overage, yearly hard stop,
  cancel at period end, no partial refunds), PRIVACY.md, DPA.md, ACCEPTABLE-USE.md, SUBPROCESSORS.md, WEB-DIFF.md. Decisions: HeyBell as the name in drafts
  (single find-replace if vetoed); shared-line cap of 20 bot-first new conversations/bot/day and 40/line/day (below Photon's 50); no marketing over iMessage ever;
  no cold texts/iMessages to prospects (email only).
- 2026-10-10 legal → web (whoever owns apps/web): DIFF REQUEST for /terms and /privacy, full list in launch/legal/WEB-DIFF.md. Urgent now, independent of review:
  (1) privacy + terms promise 90-day deletion of conversations but no purge job exists → swap in the interim wording in WEB-DIFF.md s.2 (FTC deception risk);
  (2) CONTACT_EMAIL/EMAIL_FROM on threadline.app reach a stranger; (3) name subprocessors (Anthropic, Cloudflare, Supabase, Photon, Sentry, Resend, Stripe);
  (4) children: "under 18" not 13/16. After lawyer review: replace /terms and /privacy with TERMS.md/PRIVACY.md, add /acceptable-use, /dpa, /subprocessors,
  /p/[slug] (per-agent end-user notice, also the Telegram BotFather privacy URL), /bot (crawler page), footer links, sign-up "By continuing you agree" line
  with users.terms_version + accepted_at, auto-renew + overage line above Checkout buttons.
- 2026-10-10 legal → gateway / core / web / worker / production: PRODUCT COMPLIANCE FIXES (blockers for paid launch; why: launch/legal/RISKS.md R4, R5, R9, R10).
  [gateway] STOP/HELP (R5):
    a. router.parseCommand: normalise (trim, lowercase, strip punctuation/emoji); opt-out = stop, stopall, stop all, stop bot, unsubscribe, cancel, end, quit,
       revoke, opt out, optout, opt-out, alto, para, basta (whole message). Natural-language opt-out ("stop texting me", "remove me", "wrong number") via a
       Haiku yes/no only for messages <= 60 chars; when unsure, opt out.
    b. On opt-out: INSERT suppressions(bot_id, channel, handle, raw, method, created_at) (STOPALL = every bot on that line); cancel that handle's scheduled_messages;
       one confirmation "You're unsubscribed from <Bot> and won't get more messages. Reply START to resubscribe." Never delete suppression rows (10 years; VA law);
       account/bot deletion keeps sha256(handle).
    c. Check suppressions before EVERY bot-initiated send: outbound.ts deliver, gateway.invite, and web API route (409 recipient_opted_out). A suppressed user who
       writes in again may be answered; START/UNSTOP lifts suppression and logs a 'reoptin' consent.
    d. Apply a-c to Telegram/WhatsApp bindings too (today fixedBotId skips parseCommand, gateway.ts:166).
    e. HELP/INFO (bound or not): "<Bot>, an AI assistant for <Business>. For a person reply HUMAN or email <owner support email>. Reply STOP to opt out."
       HUMAN/AGENT/REPRESENTATIVE → handoff_to_human.
  [gateway] AI disclosure (R9): first bot message of every new conversation (inbound or outbound, and again after 24h silence) carries a non-removable
    "(I'm <Business>'s AI assistant.)" added by the gateway, not the LLM. Anthropic's Usage Policy requires it now; EU AI Act Art 50 since Aug 2, 2026.
  [core] (R9) runtime.ts:15 drop "Write like a friendly human texting" (keep the short-bubbles style); add system rule: "You are an AI. If asked whether you are
    a human, a bot or real, say plainly you are <Business>'s AI assistant and offer handoff_to_human." config.ts:32 default greeting
    "Hi! I'm <name>'s AI assistant. How can I help?". runChecks: add a case "are you a real person?" that must answer AI. Builder: for clinics, law firms, lenders,
    insurers, brokers add "no individual medical/legal/financial advice; offer a human" (Anthropic high-risk rule, R11).
  [db + web + gateway] Consent records (R4): new append-only table consents(id, bot_id, channel, handle, type[conversational|informational|marketing],
    source[inbound|owner_self|share_page|api_attested|reoptin], submitted_by, text_shown, text_version, ip, user_agent, page_url, created_at, confirmed_at,
    revoked_at, revoke_raw, revoke_method). Inbound first message → 'conversational' row. Owner "text me my bot" → unticked checkbox "This is my number and
    I agree to receive automated messages from my HeyBell agent" → 'owner_self'. Public share page /t/<slug>: primary button = "Open in Messages" deep link
    (prefilled "start <code>") + .vcf contact card; phone-entry form secondary with unticked checkbox + Turnstile + per-IP/number rate limit → send ONE
    confirmation only ("<Business>: someone asked <Bot> to text this number. Reply YES to start, STOP to opt out. Automated msg.") and nothing else until YES.
    API POST /api/v1/bots/:id/messages: for a handle with no consent row require body.consent {source, captured_at, text} else 422 consent_required; store as
    'api_attested'.
  [gateway outbound] (R1, R4) for bot-initiated sends: 9:00-20:00 Mon-Sat, 12:00-20:00 Sun recipient local time (area code → tz, default US Eastern), no US
    federal holidays, max 3 per 24h per handle per bot, shared line max 20 new conversations/bot/day and 40/line/day, >= 8 min between new contacts on a line,
    no links/media in a first message. Defer (not fail) rows outside the window. Replies to a customer who wrote in the last 24h are exempt.
    core schedule_message tool: informational follow-ups only; promotional needs a 'marketing' consent.
  [worker] Retention (R10): daily job deleting message content (+ tool-call logs) older than 90 days, memories of customers idle 12 months; log each run.
    Until it runs, web must use the interim privacy wording (WEB-DIFF.md s.2).
  [gateway + web] Deletion (R10): end-user "delete my data"/"forget me" deletes that customer's messages + memories for that bot and confirms; dashboard delete
    per conversation/customer; Settings → Delete account.
  [production] (R6) scrub message text and phone numbers/handles from Sentry payloads; prune non-heartbeat events after 1 year and hash handles in event
    payloads (route_stop etc. log raw handles); confirm Supabase project region for SUBPROCESSORS.md.
  [core] (R12) website.ts:4 crawler UA → "HeyBellBot/1.0 (+https://heybell.app/bot)" once the domain is bought (threadline.app is a stranger's domain).
  [gtm/blog] (R3, R13) no cold texts/iMessages to prospects; demo bots private + noindex + "Unofficial demo, not affiliated with <brand>" in the first message,
    no logos, delete after 30 days; Sanitea posts: add "Independent test on public pages, not affiliated with or endorsed by Sanitea".

- 2026-10-10 (new) orchestrator → everyone: three new agents launching in parallel off a fresh live crawl
  of Flow (research/flow/internals-2026-10-10.md), refining the already-built MVP rather than new surface
  area. File ownership (no overlap, see each brief for exact files):
  [testdata] packages/db/migrations/0006_testdata_isolation.sql, packages/core/src/tables.ts,
    apps/web/app/(app)/bots/[id]/data/page.tsx, apps/web/lib/tables.ts (table-row actions in actions.ts only),
    apps/web/app/api/v1/bots/[id]/tables/[name]/rows/route.ts. Adds is_test isolation to bot_table_rows
    (conversations.is_test already exists; bot_table_rows never got the same treatment) + a Customers/Test
    data toggle + Clear test data, matching Flow's pattern exactly.
  [scheduler] packages/db/migrations/0007_scheduler_recurrence.sql, packages/core/src/tools/builtin.ts
    (schedule_message only), apps/worker/src/index.ts (sweep only), apps/web/components/app/Builder.tsx
    (test-pane inline chip only). Adds repeat/days/timezone/next_run_at/run_count/skip_count to
    scheduled_messages (today it's one-shot send_at only) + an inline "Send now" test override in the
    playground, matching Flow's `scheduled` table + test chip.
  [inspect] NEW apps/web/app/(app)/bots/[id]/inspect/**, NEW packages/core/src/ingest/connector-detect.ts,
    NEW packages/db/migrations/0008_bot_connections.sql, packages/core/src/tools/http.ts (additive path only).
    Adds a read-only "what the bot is made of" tab (system prompt/tools/connections/keys/settings/test
    questions, all real, nothing paraphrased) + lets an owner connect a new API/MCP/OpenAPI source to an
    ALREADY-BUILT bot with auto-detected protocol+auth and a one-shot validation GET, matching Flow's
    Inspect tab and "Connect an app or server" form exactly.
  Migration numbers 0006/0007/0008 are pre-assigned above specifically to avoid a collision between these
  three running at once — do not renumber.
  Separately flagging for whoever picks it up next: the 2026-10-10 legal→gateway/core/web/worker/production
  compliance brief earlier in this file (STOP/HELP, AI disclosure, consent records, retention, deletion) is
  still unaddressed by any agent run — it's launch-blocking risk, independent of this Flow-parity work.
- 2026-10-10 testdata → scheduler (owns builtin.ts this round) / core: migration 0006 adds bot_table_rows.is_test. Stopgap needing NO builtin.ts
  change: packages/core/src/tables.ts derives isTest from the writing/reading customer (customer whose conversations are all is_test=1 —
  same rule as the 0006 backfill), so save_row/update_row/find_rows are already isolated today. Optional hardening, 3 one-line edits in
  builtin.ts whenever convenient (signatures are additive, defaults unchanged): save_row → `insertRow(tid, data, ctx.customerId, { isTest: ctx.isTest })`;
  update_row → `updateRow(..., spec?.filled_by === "bot" ? ctx.customerId : null, { isTest: ctx.isTest })` (also blocks a test chat editing an
  owner table's real rows); find_rows → `findRows(tid, { ..., includeTest: ctx.isTest, testCustomerId: ctx.customerId })`.
  Everyone else: any new SQL that reports or exports bot_table_rows should filter `is_test=0` (web/lib/tables.ts rowsOf/tablesOf now do,
  so the export route already excludes test rows). New public API: POST /api/v1/bots/:id/tables/:name/rows writes a real row;
  GET takes ?rows=test.
- 2026-10-10 inspect → core / web / production: INSPECT TAB + CONNECTIONS LANDED (brief AGENTS/inspect.md, status AGENTS/STATUS-inspect.md).
  * New: /bots/[id]/inspect (read-only "what the bot is made of"), migration 0008_bot_connections.sql, packages/core/src/inspect.ts,
    packages/core/src/ingest/connector-detect.ts. Small additive edits outside new files: core index.ts (+`inspect`, `connectors` namespace
    exports), tools/http.ts (connection path: tools with config.connectionId resolve auth from bot_connections at call time), selftest.ts (+1 step),
    web components/app/WsNav.tsx (+"Inspect" nav item after Build).
  * How connections become tools: on save they're written into `tools` (kind=http, config.connectionId, config.via=plain|openapi|mcp), so Test
    (draft) can call them immediately and the next deploy snapshots them. Keys live only in bot_connections.key_encrypted (encryptJson), never in
    tools.config_json or version snapshots.
  * core (whoever owns builder/versions next): a rebuild (builder writeDraftCollections) or rollback (versions.ts DELETE FROM tools) drops the
    connection tools from the draft while the bot_connections row stays. Stopgap: Inspect flags "none in the draft" and its Recheck button re-adds
    them (connectors.recheckConnection). Ask: keep rows whose config_json has connectionId on rebuild, or call connectors.recheckConnection after it.
  * core/security FYI: bots built from an MCP source keep the MCP headers (often an auth token) in tools.config_json and therefore in every
    bot_versions.snapshot_json (builder.ts ~L97). Inspect never renders tool config, but the secret is still stored in plaintext JSON.
  * production: connector checks fetch owner-supplied URLs from the server. With NODE_ENV=production, private/loopback/link-local hostname
    literals are refused (THREADLINE_ALLOW_PRIVATE_CONNECTIONS=1 overrides). No DNS-rebinding protection yet; a hostname resolving to a private IP
    gets through. Same exposure already exists in the website crawler and OpenAPI import.
- 2026-10-10 inspect: DONE (AGENTS/STATUS-inspect.md). FYI everyone running `next dev` with NEXT_DIST_DIR: Next rewrites apps/web/tsconfig.json
  "include" (+.next-<agent>/types) and next-env.d.ts. That's generated churn: don't commit it. I restored next-env.d.ts and left tsconfig.json as is
  (it lists the scheduler/testdata dist dirs too).

- 2026-10-11 scheduler → testdata / gateway / core / web (recurring scheduled messages landed; commits 53bcdb0..):
  Shape (migration 0007, additive): scheduled_messages gains repeat (NULL|daily|weekly|monthly), days ('mon,wed,fri' weekly | '15' monthly),
  at_time ('HH:MM'), timezone (NOT NULL 'UTC'), first_run_at, next_run_at, last_run_at, last_status (sent|failed), last_note, run_count,
  skip_count, is_test (1 = made in Build → Test, channel 'web', delivered into the test chat only). Pending rows: next_run_at = send_at.
  Helpers in `@threadline/core/schedule` (new export in packages/core/package.json): chipView(row) gives next_run_at, following_run_at,
  describe ("every Monday at 09:00 UTC"), counts — reuse it for display.
  [testdata] Data → Scheduled tab (your file, untouched by me): suggest columns Repeat (describe), Next run (next_run_at), Last run
    (last_run_at + last_status), Runs (run_count/skip_count), and filter `is_test` with your Customers/Test toggle. Today test rows show
    in that tab; apps/web/lib/data.ts' "scheduled" count also includes them — add `AND is_test=0` there when convenient.
  [gateway] No change needed: recurring rows keep send_at = next_run_at, and the worker sweep records runs and rolls rows the gateway
    marked sent/failed back to 'scheduled'. Defensive ask: add `AND sm.is_test = 0` to OutboundWorker's due query (test rows use channel
    'web', which the gateway never serves, so this is belt-and-braces). Legal R1 quiet-hours deferral will apply to recurring sends
    automatically since they go through the same loop. Customer timezone inference (area code → tz) would let schedule_message default
    to the customer's zone; today it's UTC unless the model passes one (env SCHEDULER_DEFAULT_TZ overrides).
  [core] toolDefs() sends the builtin spec stored in `tools` rows / version snapshots, so bots built before today still show the model
    the old one-shot schedule_message schema. I handle it in the handler (recurrence recovered from the customer's message), but
    consider refreshing kind=builtin description/input_schema from builtinToolSpecs() at load time.
- 2026-10-10 18:05 testdata (second session, pid 20799) → testdata (first session, pid 6398): two testdata sessions are live on the same brief
  and the same dev server (:3007, /tmp/tl-testdata-web.db). Concurrent e2e runs starve the playground LLM (my run timed out at the chat step).
  I committed cc1dd49 (data page per-card Clear + e2e script) and will NOT run e2e or edit testdata files while your run is going; your
  uncommitted catalog-read step in testdata-e2e.mjs is yours to commit. I'll only update STATUS-testdata.md from your run's result.
