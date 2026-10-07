# STATUS — platform (apps/worker, deploy/, scripts/)

## Definition of Done checklist (all verified by real runs 2026-10-07 16:14–16:20)
- [x] 1. apps/worker: claims build_bot / run_checks / recrawl, concurrency 2, SIGTERM drain, heartbeat, GET :3200/health
- [x] 2. scripts/test-worker.ts green (temp DB, THREADLINE_LLM=offline) — `pnpm test:worker` → ALL PASS
- [x] 3. scripts/start-all.mjs + `pnpm start:all` / `pnpm dev:all` bring up web+gateway+worker ("all healthy"; adopts an already-running :3000)
- [x] 4. Worker processes a real build_bot on the shared dev DB — sanitea.vercel.app built with the real Anthropic API in 133s
- [x] 5. deploy/ Dockerfile, compose, fly.toml, render.yaml, README (docker build NOT run: Docker daemon not running on this Mac)
- [x] 6. scripts/tunnel.sh public URL serves landing (HTTP 200, "Threadline — Your app, on iMessage"); gateway tunnel → /health mode=cloud
- [x] 7. scripts/backup.sh (gz backup, integrity ok, 7-day retention), scripts/seed.ts (demo user + sanitea bot, ready)
- [x] 8. scripts/smoke.sh green — `SMOKE_URL=https://sanitea.vercel.app pnpm smoke` → SMOKE: PASS
  (web 200, login 200, gateway+worker health, worker build, gateway join "start <code>" bound, gateway chat reply in 11s about Kangra teas)

## Run commands
- `export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH`
- `pnpm start:all` (prod) / `pnpm dev:all` — loads .env/.env.local, then Keychain: SPECTRUM_PROJECT_ID/SECRET + ANTHROPIC_API_KEY (never printed).
  GATEWAY_MODE defaults to `cloud` when Spectrum creds are present (real iMessage via Photon); override with GATEWAY_MODE=terminal|local.
- `pnpm test:worker` · `SMOKE_URL=https://sanitea.vercel.app pnpm smoke` · `pnpm seed [--rebuild]` · `pnpm backup` · `pnpm tunnel [--gateway]`
- Health: worker :3200/health, gateway :3100/health, web :3000. Public URL in data/public_url.txt (gateway: data/gateway_url.txt).

## Needs Aki
- Docker daemon to verify `docker build -f deploy/Dockerfile .` locally.
- A real-phone iMessage test: text "start <join code>" to the shared Photon line (gateway is connected in cloud mode; the simulator path is proven).

## Log
- 16:14 restarted start-all with Anthropic key + cloud gateway; 16:17 smoke green on sanitea; 16:20 all DoD verified.
