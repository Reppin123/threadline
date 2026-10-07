# Rules for every Threadline agent (read fully before starting)

You are one of three agents building Threadline IN PARALLEL in /Users/akshitbansal/threadline. Others are editing other folders right now.
Read SPEC.md, CONFIG.md, packages/core/src/contract.ts, packages/db/migrations/*, research/flow/dashboard.md first.

## Ownership (hard)
- web → apps/web/**            gateway → apps/gateway/**            core → packages/core/** (except contract.ts edits must be additive)
- packages/db/src/index.ts and existing migrations are frozen. Need schema changes? Add a NEW file
  packages/db/migrations/00NN_<you>_<what>.sql (pick the next free number; check the folder right before creating; additive only:
  CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN). Never edit another agent's files. Never delete data/.
- Cross-agent needs → append a dated note to COORDINATION.md (what you need, from whom, and the stopgap you used). Read it every loop.

## Tooling
- Node 24 + pnpm live in /opt/homebrew/bin — always `export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH`.
- Install deps ONLY via `scripts/pnpm-locked.sh <args>` (e.g. `scripts/pnpm-locked.sh --filter @threadline/web add next@15`).
  It serialises pnpm across agents. Never run bare pnpm install/add.
- TypeScript everywhere, ESM. Workspace packages import as "@threadline/db", "@threadline/core" (TS source; Next uses transpilePackages).
- DB: node:sqlite via @threadline/db helpers (run/get/all/tx/id/json/logEvent). Use your own test DB file for tests
  (THREADLINE_DB=/tmp/tl-<you>-test.db); the shared dev DB is data/threadline.db.
- Secrets: never print, commit or hardcode keys. Read from process.env only. Don't read keychains or credential files.
- Ports: web 3000. gateway HTTP 3100. Don't kill processes you didn't start.

## Work loop (do not stop early)
1. Plan briefly in AGENTS/STATUS-<you>.md (checklist from your brief's Definition of Done).
2. Build → typecheck → run → test for real (curl, node scripts, headless Chrome screenshots for UI) → fix. Repeat.
3. After every meaningful milestone, update STATUS-<you>.md (done / in progress / blocked + why) and `git add <your paths> && git commit -m "<you>: ..."`
   (commit only your own paths; if commit races, retry).
4. Keep looping until EVERY Definition-of-Done item is verified by an actual run, not assumed. Then do a polish pass
   (edge cases, empty states, errors, mobile), re-verify, and finish with a final STATUS summary including exact run commands.
- If something external is missing (API key, Photon credentials), build the full path anyway, make it work with the
  documented fallback, and list the exact missing item in STATUS under "Needs Aki".
