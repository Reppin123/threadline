# Production audit: can Threadline take real traffic?

Production agent, 2026-10-10. Scope: the live deploy in `deploy/cloudflare` (one Cloudflare Container running web + gateway + worker),
SQLite at `/data/threadline.db` persisted by whole-file snapshots to Supabase Storage (`packages/db/src/snapshot.ts`), Photon Spectrum
for iMessage, Telegram long-polling, Anthropic for every LLM call.

Short answer: **yes for the first ~10 to 30 paying customers**, once the fixes in this audit are deployed and the four launch-blocking
items in section 6 are done. Past roughly 30 customers, two limits bite before compute does: whole-file snapshots of a growing SQLite
file, and Photon's 50 new contacts per line per day.

Domain used everywhere: `heybell.app` (domain agent decision, pending Aki's purchase). Until then, `APP_URL` stays the workers.dev URL.

---

## 1. What runs where

| Piece | Today | Notes |
|---|---|---|
| Edge | Worker `threadline`, `deploy/cloudflare/src/index.ts` | Forwards every request to one Durable Object-backed container, instance name `main-v2` |
| Container | `standard-1` (1/2 vCPU, 4 GiB, 8 GB disk), `max_instances: 1` | `scripts/start-all.mjs` supervises web :3000, gateway :3100, worker :3200 |
| Data | SQLite (WAL) on the container's ephemeral disk | Restored from Supabase Storage on boot, uploaded every 30 s when it changed, plus on SIGTERM |
| iMessage | Photon Spectrum Cloud, Free plan, shared pool | SDK stream (outbound connection), no webhook |
| Telegram | Bot API long-polling per bot token | Only while the container runs |
| LLM | Anthropic API (`claude-sonnet-5-5`, `claude-haiku-5-5`) | Key from Keychain via `deploy.sh`; **expires 2026-11-06** (COORDINATION 10-07 16:12) |
| Email | None live (Resend wired in code, no key) | Live site shows the sign-in link on screen, see 2.1 |

## 2. Findings, worst first

### 2.1 CRITICAL, live now: anyone can sign in as anyone
`deploy/cloudflare/src/index.ts` (as deployed) sets `THREADLINE_DEV_LINKS=1` and no email provider is configured. The magic-link route then
puts the sign-in token in the redirect URL and the "check your email" page shows a **Dev: open sign-in link** button. Typing any
existing customer's email gives a working sign-in link for their account: bots, conversations, customer phone numbers, API keys.

- Fixed in code (commit 8b62d22): on-screen links are off in production unless `DEMO_DEV_LINKS=1`, and never when Resend is configured.
  Even with dev links allowed, a configured-but-failing Resend no longer falls back to showing the link (`apps/web/app/auth/magic/route.ts`).
- **Needs Aki to redeploy** (NEEDS-AKI). Until Resend is live, users sign in with password or Google. The latest real snapshot
  (read-only check, drill C) holds 3 users and 2 active sessions, so exposure so far is small.

### 2.2 HIGH: the container falls asleep and stops answering customers
`sleepAfter = "6h"`: after 6 hours without an HTTP request the container stops. The gateway's Photon stream and Telegram polling stop with
it, so customers texting at night get no reply until someone opens the website. Fixed: a Cron Trigger (`*/5 * * * *`) calls `/healthz`
every 5 minutes, which keeps the singleton warm and alerts if it is unhealthy; `sleepAfter` raised to 24h as a backstop.

### 2.3 HIGH: snapshot history was never pruned
One full copy of the DB per hour under `history/threadline.db/`. Measured in the real bucket today: **54 copies, 96 MB after 2.8 days**.
Supabase Free includes 1 GB of storage (https://supabase.com/pricing), so the bucket would have filled in about 3 weeks, and faster as the
DB grows. Fixed: retention keeps every hourly copy for 48 h and the first copy of each day for 30 days (`pruneHistory`, drill B6).

### 2.4 HIGH: after a failed restore, the empty DB overwrote the hour's good history copy
When Supabase is unreachable at boot, the snapshotter correctly stops overwriting `latest`, but it still uploaded the fresh empty DB to
`history/<this hour>.db`, replacing the good copy a rollback would use. Found by the restore drill (B5), fixed: those uploads go to
`<hour>-after-failed-restore.db`.

### 2.5 HIGH: launch-day email volume
Resend Free allows **100 emails a day** (https://resend.com/pricing). Each signup sends a magic link plus a welcome email, so about 50
signups a day exhausts it, and later sign-in links fail. Resend Pro is $20/mo for 50,000 emails with no daily cap. Needed before any
launch post.

### 2.6 HIGH: the encryption key exists only as a Worker secret
`AUTH_SECRET` signs sessions **and** encrypts stored bot credentials (Telegram tokens, MCP headers). `deploy.sh` generates it with
`openssl rand` and pipes it straight into `wrangler secret put`. Cloudflare secrets cannot be read back, so if the Worker is deleted or
the secret is overwritten, every stored credential becomes undecryptable. Recommendation (NEEDS-AKI): generate a new value once, store it
in Keychain item "Threadline Auth" and in the password manager, and have deploy.sh read it from there (a one-time rotation that
re-encrypts credentials is a later task; today the simplest path is to re-enter Telegram tokens after a rotation).

### 2.7 MEDIUM: no abuse limits existed
No limits on signups, logins, builds or messages and no LLM budget, so a bot loop or a scripted signup wave could run up the Anthropic
bill without bound. Fixed (`packages/core/src/safety.ts`, 24 tests in `scripts/test-production.ts`):

| Guard | Default | Where |
|---|---|---|
| Magic link / password signup per IP | 5 per 10 min | web auth routes |
| Same email | 3 per 10 min | web auth routes |
| Password login | 20/IP and 10/email per 10 min | `/auth/password` |
| New accounts, whole service | 100 per hour (`SIGNUP_GLOBAL_PER_HOUR`) | all signup paths incl. Google |
| Builds (each crawls up to 40 pages) | Free 5, Starter 20, Growth 50, Scale 200 per day | `core.buildBot` |
| Messages per customer per bot | 12/min, 120/hour, one "slow down" notice | gateway, before billing and LLM |
| Messages per bot | 300/min | gateway |
| LLM spend per account | per day: Free $2, Starter $10, Growth $40, Scale $150; per month: $8 / $60 / $250 / $1,000 | `llm.complete()` |
| LLM spend, whole service | $250/day (`LLM_CAP_GLOBAL_DAY`) | `llm.complete()` |
| Kill switch | `THREADLINE_KILL=signups,builds,llm,inbound,outbound` or `all`; edge `MAINTENANCE=1` | env |

Spend caps sit well above worst-case COGS (Growth: 1,500 conversations x $0.048 = $72/mo, launch/gtm/PRICING.md §2), so only abuse or a
runaway loop trips them.

### 2.8 MEDIUM: no monitoring, no alerting, errors only in logs
Fixed: `/healthz` on web (aggregates DB, gateway, worker, queue), gateway and worker; supervisor watchdog alerts on gateway disconnect,
worker down, build-queue backlog, crash loops and failing snapshot uploads; edge cron alerts when the whole container is down;
errors go to Sentry when `SENTRY_DSN` is set (envelope API, no SDK). All verified locally, see RUNBOOK.md §5.

### 2.9 MEDIUM: heartbeat rows grow forever
`worker_heartbeat` + `gateway_heartbeat` write about 2,900 rows a day (measured: 986 of 1,836 events are heartbeats) and nothing deleted
them, so every snapshot carries them. Fixed: the worker deletes heartbeats older than 7 days once an hour.

### 2.10 LOW
- Single LLM provider. `llm.ts` falls back to OpenAI when `OPENAI_API_KEY` is set; it is not set in production. An Anthropic outage means
  every bot answers "I hit a snag". Optional: add an OpenAI key as cold standby.
- `EMAIL_FROM` defaulted to `login@threadline.app`, a domain owned by another company. Fixed: the sender now derives from `MAIL_DOMAIN`
  or the APP_URL host (`login@heybell.app` after the cutover). Contact addresses in web copy are the web owner's (domain agent flagged them).
- Supabase Free pauses projects after 1 week of inactivity (https://supabase.com/pricing). Snapshot traffic probably counts as activity,
  but this is not documented. Pro ($25/mo) removes the risk and is in the cost table from 10 customers.
- The Worker passed only 8 env vars into the container, so Stripe, Resend, Google and alerting could never be switched on in production.
  Fixed: optional vars pass through when set; `deploy.sh` reads them from Keychain item "Threadline Ops".

## 3. Single points of failure

| SPOF | What breaks | Detection now | Mitigation now | Next step |
|---|---|---|---|---|
| The one container (`max_instances: 1`) | Everything: site, iMessage, Telegram, builds | Edge cron every 5 min, external uptime check | Supervisor restarts crashed children with backoff; Cloudflare reschedules the container | Not removable on SQLite. After the Postgres move, web can scale out; gateway stays a singleton (one Photon stream consumer) |
| SQLite file on ephemeral disk | Writes since the last snapshot | Snapshot-failure alert | 30 s snapshots, hourly + daily history | Continuous WAL shipping (Litestream to R2) or the `postgres` branch |
| Supabase Storage | New boots can't restore (running container unaffected) | Restore-failure alert, B4 drill | Latest copy protected; app boots empty rather than overwriting | Pro plan; second copy in R2 |
| Photon Spectrum | iMessage in and out | `gateway-disconnected` alert after 3 min | Telegram keeps working | Ask Photon for an SLA at the Business tier |
| Anthropic | Every reply and build | Sentry errors from gateway/worker | Retries (3x) | OpenAI cold standby key |
| `AUTH_SECRET` | All sessions and stored credentials | n/a | none | Escrow (2.6) |
| Deploys | ~1 to 2 min outage per deploy (container replaced, estimate) | n/a | SIGTERM flushes the snapshot, worker drains jobs (60 s) | Deploy off-peak (US night), see RUNBOOK |

## 4. Data-loss window (RPO) and recovery time (RTO)

Measured with `node scripts/restore-drill.mjs --real` (8/8 pass, details in RUNBOOK.md §6):

| Event | Data lost (RPO) | Time to recover (RTO) |
|---|---|---|
| Deploy / graceful restart | 0 (SIGTERM flush, then a final flush after children stop) | container start + restore + boot: about 1 to 2 min (estimate; local boot to healthy ~10 s, real 3.1 MB snapshot download 7.8 s from here) |
| Container hard-killed (host failure, OOM) | Up to 30 s of writes plus the in-flight upload (~1 s at today's size) | Same as above, automatic |
| Supabase down during a crash | Everything since the last good upload (alert after 5 failed uploads, ~2.5 min) | Automatic once Supabase is back; the app boots on an empty DB meanwhile and does not overwrite the good copy |
| Bad data written (bug, bad migration, mistaken delete) | Up to 1 h (hourly history for 48 h), up to 1 day for 30 days | ~10 min by hand: copy a history object over `threadline.db`, restart (RUNBOOK §6) |
| Bucket deleted / Supabase account lost | Everything since the last local `scripts/backup.sh` copy | Hours. Mitigation: weekly download of the latest snapshot (RUNBOOK §6) |

## 5. Scaling limits

| Limit | Where it bites | Evidence |
|---|---|---|
| **Whole-file snapshot** every 30 s | DB above ~100 to 200 MB: upload takes longer than the interval and history storage multiplies it. At ~5 KB per conversation (measured: 0.39 KB/message, ~8 messages plus events) and ~200 KB per bot, 100 customers add ~200 MB/month | `dbstat` on data/threadline.db |
| Photon **50 new contacts per line per day** | Shared-pool flow has the bot text first, so every new end customer is a new contact. At 100 customers (~470 new iMessage contacts/day, estimate) that is ~10 lines | research/photon/docs-full.txt L2458, pricing.txt |
| Photon **5,000 outbound messages per server per day** (hard; going past it raises Apple ban risk) | ~830 iMessage conversations/day at 6 bubbles each, around 100 customers | docs-full.txt L4676-4679 |
| Photon Free: 10 end users total; Pro: 100 | Already: Free cannot serve a single real customer's audience | pricing.txt |
| Worker concurrency 2, builds 1 to 2 min | ~60 to 120 builds/hour; a launch post with 300 signups in an hour queues for ~1 to 2 h | worker code, smoke: 18 s idea bot, 133 s website bot (COORDINATION 10-07) |
| Container size | standard-1 (1/2 vCPU) is fine for 10 customers; Next.js SSR plus three Node processes need standard-2 by ~100 | estimate |
| SQLite single writer | Comfortable to tens of writes/s across the three processes (WAL, busy_timeout 5 s) | estimate |
| Resend Free 100/day | ~50 signups/day | resend.com/pricing |
| Anthropic rate limits | Depend on the org's usage tier (unknown to us). Check console limits before launch | NEEDS-AKI |

## 6. Launch blockers (all in launch/NEEDS-AKI.md)

1. Redeploy with this branch (closes 2.1, 2.2, adds monitoring and limits). Aki deploys.
2. Resend account, domain verified on `send.heybell.app`, **Pro plan** ($20/mo) before any launch post.
3. Photon plan decision: Free cannot serve customers. Pro ($25/mo, 100 end users total) for a private beta; Business ($250/line/mo) for launch.
4. Anthropic key expires **2026-11-06**: issue a production key that does not expire, under the company's org.

## 7. Monthly cost at 10 / 100 / 1,000 paying customers

Assumptions (estimates, change them and the totals move linearly):
- 400 conversations per customer per month (gtm "typical usage": 40% of included; Starter 120, Growth 600, blended for a 70/30 mix).
- 70% of conversations on iMessage, 30% Telegram; half come from first-time end customers (new Photon contacts).
- LLM $0.048 per conversation: measured $0.011 per reply x 4 replies + $0.004 Haiku side calls (launch/gtm/PRICING.md §2), no prompt
  caching yet. Plus $1.63 per customer per month for rebuilds and test runs (same source).
- Container runs 24/7 (730 h). CPU billed on active use; utilisation is an estimate.

Unit prices used:
- Cloudflare Containers (https://developers.cloudflare.com/containers/pricing/): Workers Paid $5/mo includes 25 GiB-h memory, 375 vCPU-min,
  200 GB-h disk; then $0.0000025/GiB-s, $0.000020/vCPU-s, $0.00000007/GB-s; egress 1 TB included (NA/EU).
- Supabase (https://supabase.com/pricing): Free 1 GB storage, pauses after 1 week inactive; Pro $25/mo, 100 GB storage, daily backups.
- Photon (research/photon/pricing.txt): Free 10 users; Pro $25/mo 100 users; Business $250/line/mo, 50 new contacts/line/day.
- Resend: Free 3,000/mo and 100/day; Pro $20/mo for 50,000. Sentry: Developer free 5k errors, Team $26/mo (annual). Better Stack: free
  10 monitors with Slack/email alerts. Cloudflare Web Analytics: free.

Container math (24/7):
- standard-1: memory 4 GiB x 2,628,000 s = 10.51M GiB-s, minus 90k included = $26.06; disk 8 GB = $1.42; CPU at 10% of 1/2 vCPU = $2.18; plus $5 = **$34.66**.
- standard-2: memory $39.20, disk $2.16, CPU at 30% of 1 vCPU $15.32, plus $5 = **$61.68**.
- standard-4 (largest): memory $78.62, disk $3.63, CPU at 50% of 4 vCPU $104.67, plus $5 = **$191.92**.

| Line | 10 customers (4,000 conv) | 100 customers (40,000 conv) | 1,000 customers (400,000 conv) |
|---|---|---|---|
| Cloudflare (Workers Paid + container) | $35 (standard-1) | $62 (standard-2) | ~$200 (standard-4) after the Postgres move; one container no longer fits the data path |
| Database / persistence | $25 Supabase Pro (Free works, but pauses + 1 GB) | $25 to $30 | $100 to $200 managed Postgres (estimate, not priced) |
| Photon iMessage | $250: 1 Business line (~47 new contacts/day, right at the 50 cap; 2 lines = $500 for headroom) | $2,500: ~10 lines for ~470 new contacts/day (list price) | ~$23,500 at list for ~94 lines; must be an Enterprise deal or customer-paid dedicated numbers ($399 add-on) |
| Anthropic | $208 ($192 conversations + $16 rebuilds/checks) | $2,083 | $20,830 (prompt caching should cut roughly half, gtm estimate) |
| Email (Resend) | $20 Pro (launch-day volume) | $20 | $35 to $90 |
| Errors / uptime / analytics | $0 (Sentry Developer, Better Stack free, CF Web Analytics) | $26 Sentry Team | ~$80 |
| **Total / month** | **~$538** | **~$4,716** | **~$45,000 at list; ~$25,000 with caching and a Photon deal (estimate)** |
| Revenue at a 70/30 Starter/Growth mix | $650 | $6,500 | $65,000 |

Reading the table: compute is a rounding error. LLM tokens and Photon lines are 85% to 95% of cost at every size. The two levers that
matter most are prompt caching (gtm PRICING §2 lever 1) and the iMessage line model (shared pool + bot-texts-first spends a new-contact
slot on every end customer; letting customers text a dedicated number first may not count against the 50/day cap, to confirm with Photon).
