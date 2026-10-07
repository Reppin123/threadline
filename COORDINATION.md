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
