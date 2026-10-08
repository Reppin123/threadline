# Agent "supabase" — make the live Cloudflare deployment persistent with Supabase

Read AGENTS/COMMON.md, ARCHITECTURE.md, deploy/cloudflare/* and the tail of COORDINATION.md first. Other agents are DONE; the orchestrator
may be running `wrangler deploy` — before you deploy, wait until no `wrangler deploy` process is running (pgrep -f "wrangler deploy").

## Why
Live app: https://threadline.akshitbansal1313.workers.dev (Cloudflare Containers, one container running web+gateway+worker,
SQLite at /data/threadline.db). Containers have NO persistent disk: every restart/redeploy wipes users, bots, conversations.
Hackathon judges are testing it NOW. Persistence must land fast and must not break the live site.

## Access (never print secrets)
- Supabase Management API token: macOS Keychain service "Supabase CLI" (value may be prefixed "go-keyring-base64:" → base64-decode).
  API: https://api.supabase.com/v1 (projects, api-keys, storage). The supabase CLI is NOT installed; use curl/node.
- Store anything new you create (project ref, service_role key, DB password, DB URL) in Keychain service "Threadline Supabase"
  (accounts SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, SUPABASE_DB_PASSWORD) and push to the Worker with
  `security find-generic-password ... -w | npx wrangler secret put NAME` from deploy/cloudflare. Add the matching fields to the Env
  interface + envVars passthrough in deploy/cloudflare/src/index.ts.
- Cloudflare: wrangler is logged in. Docker is running. Image builds take ~5 min (amd64 emulation) on a slow hotspot.

## Phase A — persistence TODAY (ship within ~30 min)
1. Create Supabase project "threadline" (nearest US region, free plan; reuse if it exists) and a PRIVATE storage bucket "threadline-db".
2. packages/db: add src/snapshot.ts (orchestrator approves you editing packages/db for this): on process start, if SUPABASE_URL +
   SUPABASE_SERVICE_ROLE_KEY are set and the local DB file is missing/empty, download the latest snapshot object (threadline.db) from the
   bucket before opening the DB. Every 30s when the DB changed (track PRAGMA data_version / total_changes) and on SIGTERM/SIGINT, write a
   consistent copy (node:sqlite `backup()` or VACUUM INTO a temp file) and upload it (upsert). Never block requests; log failures and
   keep going. Restore must run BEFORE any process opens the DB: call it from scripts/start-all.mjs before spawning children
   (single writer = the start-all parent does the periodic upload by opening the DB read-only, or one designated child does it — pick
   the simplest correct design and document it).
3. Test locally with a temp DB: write rows → snapshot → delete file → restore → rows back. Then deploy to Cloudflare, sign up on the live
   site, force a new container (redeploy), confirm the user still exists. Commit + push (git -c http.version=HTTP/1.1 push).
4. Write "## Persistence" in deploy/README.md and update README.md "Architecture" with one line.

## Phase B — real Postgres (only after A is live and verified; on a git branch `postgres`, do NOT deploy unless fully green)
Port packages/db to Supabase Postgres (async helpers, same function names; schema from migrations translated; FTS via tsvector), update
callers, run every package's tests. Open a PR with gh (/opt/homebrew/bin/gh) and describe what's left.

Keep AGENTS/STATUS-supabase.md updated (checkboxes ticked only when proven). Work autonomously; never ask questions.
