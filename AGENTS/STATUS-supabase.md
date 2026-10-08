# STATUS — supabase (persistence for the live Cloudflare deployment)

## Phase A — snapshots to Supabase Storage
- [x] Supabase project "threadline" (ref gmnwbrfcbtirfaalwqio, us-west-1, free) + private bucket "threadline-db"; creds in Keychain "Threadline Supabase"
- [x] packages/db/src/snapshot.ts — restore-before-open, 30s data_version-gated backup()+upsert, SIGTERM/SIGINT flush, hourly history, never overwrite after failed restore
- [x] scripts/start-all.mjs wired (restore before spawning children; supervisor = single uploader)
- [x] Local round-trip test `node packages/db/src/snapshot-test.ts` → "snapshot round-trip ok (2/2 rows restored)"
- [x] Local start-all cycle: insert row → interval upload → SIGTERM → delete DB → restart → row restored
- [x] Worker secrets pushed + deployed to Cloudflare (version fc262582, 00:31 UTC; first live snapshot 00:31:19)
- [x] Live: sign up → redeploy (new container) → user still exists. Signed up persist-check-…@threadline.dev at 00:33 UTC (password
      form) → snapshot contained the user + session → container replaced by a redeploy (old heartbeats stop 00:45:54, new container's
      first 00:52:00, history intact) → old session cookie still opens /dashboard (200, shows the account), password login → /dashboard,
      wrong password → ?error=credentials.
- [x] Docs: deploy/README.md "## Persistence", README.md Architecture line

## Phase B — Postgres (branch `postgres`)
- [ ] in progress on branch `postgres` (background agent; PR when green)

## Run / verify
- Round-trip test (throwaway object): `export SUPABASE_URL=$(security find-generic-password -s "Threadline Supabase" -a SUPABASE_URL -w) SUPABASE_SERVICE_ROLE_KEY=$(security find-generic-password -s "Threadline Supabase" -a SUPABASE_SERVICE_ROLE_KEY -w); node packages/db/src/snapshot-test.ts`
- Live: `start | snapshot: …` lines in the container log; object `threadline-db/threadline.db` + hourly `history/threadline.db/*.db` in Supabase.
- Deploy: `deploy/cloudflare/deploy.sh` now also pushes SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY and keeps AUTH_SECRET (encryption key).

## Notes
- Data written in the last ≤30 s before a hard kill can be lost; SIGTERM flushes immediately.
- Users created before 00:31 UTC on the pre-persistence container were lost on that rollout (it had no snapshot code).
