# Deploying Threadline

One image, three processes (web :3000, gateway :3100, worker :3200) supervised by `scripts/start-all.mjs`,
SQLite on a persistent volume at `/data/threadline.db`. Exactly **one** instance (SQLite). Env vars: see [CONFIG.md](../CONFIG.md).

## Tonight: this Mac + Cloudflare quick tunnel

```bash
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
scripts/pnpm-locked.sh install
touch .env.local                   # optional: put secrets here (gitignored); shell env wins over the file
pnpm start:all                     # web+gateway+worker, prefixed logs, restart-on-crash; Ctrl+C = graceful stop
pnpm dev:all                       # same with next dev / tsx watch
pnpm tunnel                        # public https://*.trycloudflare.com → :3000, saved to data/public_url.txt
scripts/tunnel.sh --gateway        # + second tunnel → :3100 for the Spectrum webhook (data/gateway_url.txt)
pnpm smoke                         # PASS/FAIL table against the running services
pnpm seed                          # demo@threadline.dev (password printed) + Sanitea bot queued for build
pnpm backup                        # online SQLite backup → data/backups/*.db.gz, 7-day retention
```

Notes
- `start:all` loads `.env` then `.env.local` (never overriding the shell), sets a shared absolute `THREADLINE_DB`,
  and on macOS loads `SPECTRUM_PROJECT_ID/SECRET` from the Keychain item "Threadline Spectrum" when unset (values never printed).
- If a port is already served (e.g. your own `next dev` on :3000) start-all **adopts** it instead of starting a duplicate,
  and starts its own copy if that instance goes away.
- Production web needs a build: start-all runs `next build` once if `apps/web/.next/BUILD_ID` is missing.
- Nightly backup via cron: `15 3 * * * cd /path/to/threadline && scripts/backup.sh >> data/backups/backup.log 2>&1`
- Quick-tunnel URLs change on every restart; set `APP_URL` to the current one for absolute links/magic links.

## Docker (any VM)

```bash
docker build -f deploy/Dockerfile -t threadline .                     # --build-arg INSTALL_CHROMIUM=1 for headless crawl
docker run -d --name threadline -p 3000:3000 -p 3100:3100 -v threadline-data:/data --env-file .env threadline
# or
docker compose -f deploy/docker-compose.yml up --build -d
```
The image defaults to `GATEWAY_MODE=cloud` (needs `SPECTRUM_PROJECT_ID/SECRET`; without them the gateway exits with a
precise message and start-all retries with backoff while web + worker keep running). `docker stop` sends SIGTERM:
the worker finishes in-flight jobs (allow ~60 s; compose sets `stop_grace_period: 70s`).

Backups inside the container: `docker exec threadline scripts/backup.sh` (writes to `/data/backups`).

## Fly.io

```bash
fly launch --no-deploy --copy-config --config deploy/fly.toml --name <app>
fly volumes create threadline_data --size 1 --region iad --config deploy/fly.toml
fly secrets set --config deploy/fly.toml AUTH_SECRET=$(openssl rand -hex 32) APP_URL=https://<app>.fly.dev \
  ANTHROPIC_API_KEY=... SPECTRUM_PROJECT_ID=... SPECTRUM_PROJECT_SECRET=... IMESSAGE_LINE_HANDLE=...
fly deploy --config deploy/fly.toml --dockerfile deploy/Dockerfile
```
Web is served on 443; the gateway webhook (only for `GATEWAY_INGEST=webhook`) on `https://<app>.fly.dev:8443/spectrum/webhook`.
One machine, never auto-stopped (`min_machines_running = 1`). Don't `fly scale count` above 1 while on SQLite.

## Render

New → Blueprint → this repo → `deploy/render.yaml`. Fill the `sync: false` secrets (APP_URL = your onrender.com URL).
Persistent disks require a paid plan (starter+). Only the web port is public; the gateway uses stream ingest (outbound).

## Environment

| Var | Needed for |
| --- | --- |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | LLM (in containers there is no Claude CLI fallback — one key is required) |
| `SPECTRUM_PROJECT_ID`, `SPECTRUM_PROJECT_SECRET` (or `PHOTON_*`) | iMessage via Photon Spectrum Cloud |
| `IMESSAGE_LINE_HANDLE` | the shared line shown on the deploy page |
| `SPECTRUM_WEBHOOK_SECRET` | only with `GATEWAY_INGEST=webhook` |
| `APP_URL` | public base URL (links, magic links, OAuth redirect) |
| `AUTH_SECRET` | session signing — set a long random value in production |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional Google sign-in |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional real magic-link email |
| `THREADLINE_DB` | defaults to `/data/threadline.db` in the image |
| `GATEWAY_MODE` | `cloud` (image default) \| `local` (macOS only) \| `terminal` |
| `WEB_PORT`/`GATEWAY_PORT`/`WORKER_PORT` | 3000/3100/3200 |
| `WORKER_CONCURRENCY` | parallel jobs (default 2) |
| `CHROME_PATH` | headless crawl fallback (set automatically with `INSTALL_CHROMIUM=1`) |

## Health

- web `GET /` · gateway `GET :3100/health` · worker `GET :3200/health` (queue depth by status/type, running jobs, last error)
- Heartbeats land in the `events` table (`worker_heartbeat`, `gateway_heartbeat`).
