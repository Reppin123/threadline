# Runbook: launch day, deploys, incidents, rollback, backups

Production agent, 2026-10-10. One container (web + gateway + worker) behind the `threadline` Worker; SQLite snapshotted to Supabase
Storage. Background and numbers: AUDIT.md. Domain switch: CUTOVER.md. Everything marked **Aki** deploys, spends or changes DNS.

```bash
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
URL=https://heybell.app        # before the cutover: https://threadline.akshitbansal1313.workers.dev
```

## 1. Launch day checklist

T-7 days
- [ ] Domain bought, CUTOVER.md done, `curl -s $URL/healthz` shows `"ok":true` on the new domain.
- [ ] Resend Pro active ($20/mo; Free is 100 emails/day, AUDIT 2.5). A test signup gets the sign-in link and the welcome email, SPF/DKIM/DMARC pass.
- [ ] Photon plan that covers real customers (Pro for a private beta, Business line for a public launch; CUTOVER §5).
- [ ] Anthropic production key that does not expire 2026-11-06 is in Keychain "Threadline Anthropic"; console rate limits checked.
- [ ] `AUTH_SECRET` escrowed (AUDIT 2.6).
- [ ] `ALERT_WEBHOOK_URL` set and a test alert seen in the channel (§5). Better Stack monitor on `$URL/healthz` green.
- [ ] `BILLING_DEFAULT_PLAN` decided: unset once Stripe is live; `starter` only for pilots before that (COORDINATION billing note).

T-1 day
- [ ] `pnpm smoke` and `pnpm test:production` pass on the commit that will ship. `node scripts/restore-drill.mjs --real` passes.
- [ ] Fresh local copy of production data (§6.1).
- [ ] Deploy off-peak (02:00 to 05:00 ET) so launch traffic hits a warm container, then `curl -s $URL/healthz`.
- [ ] Spend caps reviewed: `LLM_CAP_GLOBAL_DAY` ($250 default) is the ceiling on the Anthropic bill per day. Raise only on purpose.

Launch hour (the launch post goes live)
- [ ] Watch the alert channel and `curl -s $URL/healthz` every 15 min for the first 2 hours (`queue.readyNow`, `queue.oldestReadySec`).
- [ ] Build queue: worker runs 2 builds at a time, 1 to 2 min each (AUDIT §5). If `oldestReadySec` passes 600, say so on the site/post
      ("builds are queued, we email you when it's ready") rather than scaling; scaling means a bigger instance type and a redeploy.
- [ ] Signups: global cap is 100 new accounts/hour (`SIGNUP_GLOBAL_PER_HOUR`). Hitting it shows a polite "at capacity" message; raise it with
      a Worker var + restart (§7) only if the queue and spend look healthy.
- [ ] Resend dashboard: bounces and complaints under 4% / 0.08%. If complaints spike, pause signups (§7) and check for a form-spam wave.

T+1 day
- [ ] `THREADLINE_DB=<downloaded copy> node --experimental-strip-types scripts/metrics.ts --days 2` (METRICS.md) and post the funnel.
- [ ] Anthropic console spend matches the expected ~$0.05 per conversation (AUDIT §7).

## 2. Deploys

1. `git log --oneline -3` and note the current deployed commit (keep it as `$PREV` for §4).
2. `pnpm smoke` locally on the commit.
3. **Aki**: `deploy/cloudflare/deploy.sh` (builds the image, pushes secrets from Keychain, prints `healthz 200`).
4. Expect 1 to 2 minutes of downtime while the container is replaced (estimate, AUDIT §4). On SIGTERM the supervisor flushes the
   snapshot and the worker drains jobs for up to 60 s, so no data is lost.
5. Verify: `curl -s $URL/healthz | python3 -m json.tool`: `ok: true`, `gateway.connected` includes `imessage` (and `telegram` if any bot uses it),
   `queue.backlog: false`. Text the owner test bot once on iMessage and once on Telegram.

Config changes that are not code (a Worker secret or var) reach the running container only after a restart:
```bash
npx wrangler secret put THREADLINE_KILL          # from deploy/cloudflare, prompts for the value
curl -s -X POST -H "Authorization: Bearer $(security find-generic-password -s 'Threadline Ops' -a OPS_TOKEN -w)" $URL/__ops/restart
```
`/__ops/restart` is a graceful stop (snapshot flush); the 5-minute cron or the next request starts it with the new env.
It returns 404 unless `OPS_TOKEN` is set (Keychain "Threadline Ops" / `OPS_TOKEN`, pushed by deploy.sh).

## 3. Incidents

First minute, always: `curl -s $URL/healthz | python3 -m json.tool` and `cd deploy/cloudflare && npx wrangler tail` (live logs).
Then find the alert key below. Every alert has a matching `[RESOLVED]` message when it clears; cooldown is 30 min per key.

| Alert key | Means | Do |
|---|---|---|
| `threadline-edge: /healthz returned …` / `container unreachable` (Worker cron) | The whole container is down or `/healthz` is not ok | `wrangler tail`. If it doesn't come back within 10 min: `/__ops/restart`. Still down: roll back (§4) |
| `web-down` | Web process not answering inside the container | Supervisor restarts it with backoff. Look for `crash-loop:web` |
| `gateway-disconnected` | No messaging provider connected for 3 min. Customers get no replies | Check status.photon.codes and Photon dashboard (plan limits, line banned?). Telegram-only outage: check api.telegram.org. Restart (§2) if the provider is fine |
| `worker-down` | Builds and checks not running | Restart. Builds wait in the queue and resume; nothing is lost |
| `build-queue-backlog` | Oldest job waited >5 min or >20 jobs ready | Launch spike: expected, see §1. Otherwise a stuck job: worker requeues jobs stale for 15 min automatically |
| `crash-loop:<svc>` | A process exited 3 times in 10 min | Read the last lines in the alert text, `wrangler tail`. A bad deploy: roll back (§4) |
| `snapshot-failing` | 5 uploads in a row failed (~2.5 min). Data written now is at risk if the container dies | Check Supabase status / project paused / storage full. Do **not** restart until uploads work again |
| `snapshot-restore-failed` | Container booted on an empty DB because Supabase was unreachable. `latest` is protected | Set `MAINTENANCE=1` (§7) so nobody signs up into the empty DB, fix Supabase, then restart |

Specific situations:
- **Anthropic outage / key expired**: bots answer "I hit a snag". Check status.anthropic.com. Expired key: new key into Keychain, `deploy.sh`.
  Optional standby: `OPENAI_API_KEY` (llm.ts falls back to it).
- **Bill running away** (spend alert from Anthropic console, or `llm_spend_capped` errors in Sentry): `THREADLINE_KILL=llm` + restart stops every
  paid call within a minute; per-account caps already contain a single abuser. Find the account with the highest spend in the
  usage table on a downloaded copy (§6.1).
- **Abuse: spam signups or a bot used to harass people**: `THREADLINE_KILL=signups` (logins keep working), suspend the account's channels in the
  DB or delete the bot from its owner's dashboard, keep evidence (download the snapshot), follow launch/legal AUP enforcement.
- **Security: leaked secret**: rotate it at the provider, update Keychain, `deploy.sh`. `AUTH_SECRET` rotation logs everyone out and makes
  stored Telegram tokens unreadable (owners re-enter them); do it only if it actually leaked.
- **Photon line flagged / banned by Apple**: iMessage stops for every bot on the shared line. Tell affected customers by email from Aki's inbox,
  move them to Telegram meanwhile, ask Photon for a replacement line, set `IMESSAGE_LINE_HANDLE`, restart.

Afterwards: one paragraph in launch/production/incidents/<date>.md (what broke, customer impact, time to detect, time to fix, follow-up).

## 4. Rollback (code)

The data is not tied to the image: a rollback keeps every conversation, because the new container restores the latest snapshot.

1. Preferred: Cloudflare dashboard → Workers → `threadline` → Deployments → previous version → "Rollback", or
   `cd deploy/cloudflare && npx wrangler rollback`. Then `curl -s $URL/healthz`.
   If the dashboard says the version cannot be rolled back (container image changes may require a full deploy), use step 2.
2. Redeploy the last good commit (**Aki**):
   ```bash
   git switch -c rollback-$(date +%Y%m%d) $PREV && deploy/cloudflare/deploy.sh && git switch master
   ```
3. A migration that the old code doesn't understand: migrations are additive (new tables/columns), so old code ignores them. If one ever
   isn't, restore data from before the migration (§6.2) as well.
4. Keep the container instance name `main-v2` in `src/index.ts`; changing it starts a container with a different identity.

Kill switches (§7) are faster than any rollback when a single feature misbehaves.

## 5. Monitoring and alerts (what exists, how it was verified)

| Check | Where | Verified |
|---|---|---|
| `GET /healthz` (web) aggregates DB, gateway, worker, queue; 503 when not ok | `apps/web/app/healthz/route.ts` | 2026-10-10 locally: `ok:true`, migrations 6, gateway terminal connected, queue backlog false |
| Gateway `/health` :3100, worker `/health` :3200 | apps/gateway, apps/worker | `pnpm smoke` rows gateway_health, worker_health PASS |
| Supervisor watchdog every 60 s: web-down, gateway-disconnected (3 min), worker-down (3 min), build-queue-backlog, crash loops, snapshot failures | `scripts/start-all.mjs` | 2026-10-10: gateway and worker paused with SIGSTOP and 4 jobs queued against a local webhook receiver: received `build-queue-backlog`, `gateway-disconnected`, `worker-down`, then all three `[RESOLVED]` after SIGCONT |
| Edge cron every 5 min: keeps the container awake, alerts when it is unhealthy or unreachable | `deploy/cloudflare/src/index.ts` `scheduled()` | Typechecked; runs only on Cloudflare (verify after deploy with `npx wrangler tail` around a :x5 minute) |
| Errors → Sentry (envelope API) when `SENTRY_DSN` is set, deduped | `packages/core/src/ops.ts` | `pnpm test:production` (24/24) |
| External uptime: Better Stack free plan, 10 monitors, email + Slack alerts, 1 status page (https://betterstack.com/pricing) | **Aki** sets it up | Monitor `$URL/healthz`, expect status 200 and keyword `"ok":true`, alert after 2 failures. Second monitor on `$URL/` |
| Page views: Cloudflare Web Analytics beacon when `CF_BEACON_TOKEN` is set (cookieless) | edge HTML injection | METRICS.md |

Test alert after setting `ALERT_WEBHOOK_URL` (from the repo, local): `ALERT_WEBHOOK_URL=<url> node --experimental-strip-types -e
'const o=await import("./packages/core/src/ops.ts"); await o.alert("test","hello from the runbook")'`.

## 6. Backups and restore

What exists: the container uploads `threadline-db/threadline.db` (latest) every 30 s when the DB changed and on SIGTERM; one history
copy per hour kept 48 h, then one per day for 30 days. RPO/RTO table: AUDIT §4. Drill: `node scripts/restore-drill.mjs --real`,
last run 2026-10-10: 9/9 pass (file backup, mock-storage restore incl. failure paths and retention, read-only download of the real
latest snapshot, 3,216 KB in 0.9 s, integrity ok).

### 6.1 Weekly local copy (Aki, Mondays, with the metrics review)

```bash
eval "$(printf 'U=%s K=%s' "$(security find-generic-password -s 'Threadline Supabase' -a SUPABASE_URL -w)" \
  "$(security find-generic-password -s 'Threadline Supabase' -a SUPABASE_SERVICE_ROLE_KEY -w)")"
mkdir -p ~/HeyBell-backups && f=~/HeyBell-backups/prod-$(date -u +%Y%m%d).db
curl -sf -H "Authorization: Bearer $K" -H "apikey: $K" "$U/storage/v1/object/threadline-db/threadline.db" -o "$f" && unset K
node -e 'const d=new (require("node:sqlite").DatabaseSync)(process.argv[1],{readOnly:true});console.log(d.prepare("PRAGMA integrity_check").get(), d.prepare("select count(*) n from users").get())' "$f"
```
It holds customer data (phone numbers, conversations): keep the folder on the encrypted Mac disk only, never in the repo or a shared drive.

### 6.2 Roll data back to an earlier copy (bad migration, mass delete)

Do not overwrite `latest` while the old container runs: its SIGTERM flush would put the bad data back. Point the new container at a new
object instead:

1. `MAINTENANCE=1` as a Worker var (`wrangler.jsonc` vars or dashboard) so no new writes land in the bad DB.
2. List history: `curl -s -X POST -H "Authorization: Bearer $K" -H "apikey: $K" -H 'content-type: application/json' -d '{"prefix":"history/threadline.db/","limit":100}' "$U/storage/v1/object/list/threadline-db"`
   and pick the last copy from before the incident (names are `YYYY-MM-DD-HH.db`, UTC).
3. Download it, check integrity as in 6.1, upload it as a new object:
   `curl -sf -X POST -H "Authorization: Bearer $K" -H "apikey: $K" -H 'content-type: application/octet-stream' --data-binary @good.db "$U/storage/v1/object/threadline-db/rollback-$(date -u +%Y%m%d%H).db"`
4. Worker var `SUPABASE_SNAPSHOT_OBJECT=rollback-<stamp>.db`, then `/__ops/restart` (§2). The fresh container restores that object and
   snapshots to it from now on; the bad `threadline.db` stays untouched for forensics.
5. `curl -s $URL/healthz`, spot-check one customer's dashboard, remove `MAINTENANCE`. Writes between the copy and the incident are lost
   (up to 1 h); tell affected customers.

Estimated time by hand: about 10 minutes (AUDIT §4).

## 7. Kill switches (fastest first)

| Switch | Effect | How |
|---|---|---|
| `MAINTENANCE=1` (Worker var) | 503 page for everything except `/healthz`; the container keeps running and answering texts | Dashboard → Worker → Settings → Variables (deploys a new Worker version in seconds, container untouched) |
| `THREADLINE_KILL=signups` | New accounts refused, logins work | Worker secret + `/__ops/restart` |
| `THREADLINE_KILL=builds` | No new builds or recrawls | same |
| `THREADLINE_KILL=llm` | No paid LLM calls at all (`SpendCapError llm_paused`; the gateway sends its capped reply instead of an answer) | same |
| `THREADLINE_KILL=inbound` / `outbound` | Gateway ignores incoming texts / stops scheduled sends | same |
| `THREADLINE_KILL=all` | All of the above | same |
| Limits: `SIGNUP_GLOBAL_PER_HOUR`, `LLM_CAP_GLOBAL_DAY` | Raise or lower the caps in AUDIT 2.7 (passed into the container by `src/index.ts`) | Worker var + `/__ops/restart` |

Combine with commas: `THREADLINE_KILL=signups,builds`. Clear by setting it to an empty value and restarting.
