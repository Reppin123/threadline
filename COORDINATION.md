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
