# Agent "platform" — worker, runtime, hosting (apps/worker, deploy/, scripts/)

Read AGENTS/COMMON.md, ARCHITECTURE.md and COORDINATION.md first. Deadline: working by 16:45 today; vertical slice first.
You own: apps/worker/**, deploy/**, scripts/** (NOT scripts/pnpm-locked.sh), and ONLY the "scripts" block of the root package.json.

## Build
1. apps/worker (@threadline/worker): long-running loop using claimJob/completeJob/failJob/requeueStaleJobs from @threadline/db.
   Handlers: build_bot → core.buildBot(botId) (progress already persisted by core); run_checks → core.runChecks; recrawl → core.buildBot;
   send_scheduled is owned by gateway (skip unless gateway reports in COORDINATION that it wants the worker to do it).
   Concurrency 2, graceful SIGTERM (finish current job), heartbeat event, `GET :3200/health` (queue depth by status, running jobs, last error).
   Test: scripts/test-worker.ts enqueues a build for a seeded bot against a temp DB with THREADLINE_LLM=offline and asserts it finishes.
2. scripts/start-all.mjs + root scripts `start:all` and `dev:all`: run web, gateway, worker as child processes with prefixed colored logs,
   restart-on-crash with backoff, shared env loaded from a local untracked env file if present, shared THREADLINE_DB, clean shutdown.
3. deploy/Dockerfile (node:24-slim, pnpm, builds web with `next build`, runs start-all; VOLUME /data; THREADLINE_DB=/data/threadline.db),
   deploy/docker-compose.yml, deploy/fly.toml and deploy/render.yaml (single instance + volume, health checks), deploy/README.md with
   exact steps + env list (point to CONFIG.md). Try `docker build` locally if Docker daemon is running; if not, say so in STATUS.
4. scripts/tunnel.sh: `cloudflared tunnel --url http://localhost:3000` quick tunnel; captures the trycloudflare URL into data/public_url.txt
   and prints it; second tunnel for gateway :3100 webhook optional (flag).
5. scripts/backup.sh: online SQLite backup (node:sqlite `backup()` or sqlite3 .backup) to data/backups/ with 7-day retention.
6. scripts/seed.ts: demo user (demo@threadline.dev / password printed) + a demo bot from https://sanitea.vercel.app enqueued for build.
7. scripts/smoke.sh: boots nothing; given running services, checks web / (200), /login, gateway /health, worker /health, creates a bot
   via the DB + enqueues build, waits for ready, runs one core.chat through the gateway simulator if available. Prints PASS/FAIL table.

## Definition of Done (verify by running)
- `pnpm start:all` brings up all three processes healthy (once web/gateway have their dev/start scripts; if missing, note in COORDINATION
  and run what exists). Worker processes a real build_bot job end to end on the shared dev DB. tunnel.sh gives a working public URL that
  serves the landing page. smoke.sh green. STATUS-platform.md has exact commands.
