# STATUS — supabase (persistence for the live Cloudflare deployment)

## Phase A — snapshots to Supabase Storage
- [x] Supabase project "threadline" (ref gmnwbrfcbtirfaalwqio, us-west-1, free) + private bucket "threadline-db"; creds in Keychain "Threadline Supabase"
- [x] packages/db/src/snapshot.ts — restore-before-open, 30s data_version-gated backup()+upsert, SIGTERM/SIGINT flush, hourly history, never overwrite after failed restore
- [x] scripts/start-all.mjs wired (restore before spawning children; supervisor = single uploader)
- [x] Local round-trip test `node packages/db/src/snapshot-test.ts` → "snapshot round-trip ok (2/2 rows restored)"
- [x] Local start-all cycle: insert row → interval upload → SIGTERM → delete DB → restart → row restored
- [x] Worker secrets pushed + deployed to Cloudflare (version fc262582, 00:31 UTC; first live snapshot 00:31:19)
- [ ] Live: sign up → redeploy (new container) → user still exists
- [x] Docs: deploy/README.md "## Persistence", README.md Architecture line

## Phase B — Postgres (branch `postgres`)
- [ ] not started
