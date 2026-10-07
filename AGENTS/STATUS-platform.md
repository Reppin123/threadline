# STATUS — platform (apps/worker, deploy/, scripts/)

## Definition of Done checklist
- [ ] 1. apps/worker: claims build_bot / run_checks / recrawl, concurrency 2, SIGTERM drain, heartbeat, GET :3200/health
- [ ] 2. scripts/test-worker.ts green (temp DB, THREADLINE_LLM=offline)
- [ ] 3. scripts/start-all.mjs + `pnpm start:all` / `pnpm dev:all` bring up web+gateway+worker
- [ ] 4. Worker processes a real build_bot on the shared dev DB
- [ ] 5. deploy/ Dockerfile, compose, fly.toml, render.yaml, README
- [ ] 6. scripts/tunnel.sh public URL serves landing
- [ ] 7. scripts/backup.sh, scripts/seed.ts
- [ ] 8. scripts/smoke.sh green

## Log
- in progress: worker
