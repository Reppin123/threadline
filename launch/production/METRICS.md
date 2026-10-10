# Product metrics: the activation funnel

Production agent, 2026-10-10. Privacy-first: funnel events live in our own SQLite `events` table and existing product tables.
No third-party product analytics, no cookies, no end-customer data leaves the box. Page views come from Cloudflare Web Analytics
(cookieless, free) injected at the edge when `CF_BEACON_TOKEN` is set.

Run it: `node --experimental-strip-types scripts/metrics.ts [--days 30] [--json]`
(against production: download the latest snapshot as in RUNBOOK.md §6, then `THREADLINE_DB=/tmp/prod.db node ... scripts/metrics.ts`).

## Funnel definitions (per account, first time each happens)

| # | Event | Definition (source of truth) | Why this one |
|---|---|---|---|
| 1 | `signup` | `users.created_at`. Method in `events(type='signup', data.userId, data.method = magic, password, google)`, written by `findOrCreateUser` | Top of funnel |
| 2 | `bot_created` | first `bots.created_at` for the user (also `events.type='bot_created'`) | Intent: they pasted a URL or idea |
| 3 | `bot_built` | first `bot_versions.created_at` for any of the user's bots (a build that produced v1) | The product worked for them |
| 4 | `deployed` | first of: `events.type='deploy'` (version published) or a `channels` row `status='live'` on iMessage, Telegram or WhatsApp | They trusted it enough to switch it on |
| 5 | `first_real_message` | first `billed_conversations.created_at` (a metered conversation: real customer, bot replied, excludes playground, checks and Free-plan test phones), else first non-test conversation on a messaging channel with an assistant reply | **Activation.** A real person texted their bot and got an answer |
| + | `paid` | `users.plan != 'free'` (kept in sync by the Stripe webhook) | Revenue |

Internal accounts are excluded by `METRICS_EXCLUDE` (regex on email; default excludes `@threadline.dev`, `example.com`, `test.local`,
and `demo+`/`test+`/`smoke+` addresses). Add the founders' emails and the gtm "prospects" house account there.

## Targets (launch/gtm/PLAN-90D.md §metrics; gtm says to replace them with measured rates at the Nov 2 to 8 review)

| Step | gtm target | Our mapping |
|---|---|---|
| signup → bot_built ("activated") | 50% of signups, median URL → first answer < 3 min | `bot_built / signup` |
| bot_built → first_real_message ("live") | 30% of activated, i.e. 15% of signups | `first_real_message / bot_built` |
| signup → paid (inbound) | 2.9% by day 90 | `paid / signup` |
| Not in gtm (our guesses) | bot_created ≥ 70% of signups; bot_built ≥ 90% of bot_created (failed builds are bugs); deployed ≥ 50% of built within 1 day | |

gtm note: if fewer than 20% of activated bots go live by week 8, the problem is iMessage onboarding (Unknown Senders, invite flow).
`deployed → first_real_message` is the number that shows it.

## Baseline (dev DB, 2026-10-10, hackathon data, not real customers)

```
STEP                 USERS  %SIGNUPS  %PREV   MEDIAN h FROM SIGNUP
signup                   7      100%    100%  0
bot_created              5     71.4%   71.4%  0.01
bot_built                5     71.4%    100%  0.03
deployed                 5     71.4%    100%  0.03
first_real_message       3     42.9%     60%  1.07
```

## Operational metrics (not funnel)

| Metric | Where | Alert |
|---|---|---|
| Uptime of `/healthz` | Better Stack monitor + edge cron | 2 failed checks |
| Gateway connected | `/healthz` `gateway.ok` | 3 min disconnected |
| Build queue: oldest ready job | `/healthz` `queue.oldestReadySec` | > 300 s or > 20 ready |
| LLM spend per day | `SELECT date(created_at), SUM(cost_usd) FROM usage GROUP BY 1` | global cap $250/day blocks; review weekly |
| Rate-limit hits | `events.type IN ('rate_limited','auth_rate_limited')` | review weekly; many = abuse or limits too tight |
| Plan blocks | `events.type IN ('plan_channel_blocked','quota_exceeded')` | upsell signal, gtm |
| Errors | Sentry (`SENTRY_DSN`) | Sentry's default new-issue email |

## Weekly review (Mondays, 15 min)

1. `scripts/metrics.ts --days 7` and `--days 30`. Note the weakest step.
2. Read 5 accounts that stalled at the weakest step (bots table, build_progress_json errors, conversations).
3. Sentry: top 5 issues by users affected.
4. Spend: usage by plan vs revenue (gtm PRICING margins).
