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
