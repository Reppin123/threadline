# STATUS: production (launch readiness)

Started 2026-10-10. Domain: heybell.app (domain agent decision, pending Aki purchase) via DOMAIN/APP_URL vars.

- [x] 1. Domain wired as a variable (APP_URL / DOMAIN, EMAIL_FROM) in deploy config, no hardcoded host
- [x] 2. launch/production/AUDIT.md (SPOFs, data-loss window, scaling limits, cost at 10/100/1,000 customers, sourced)
- [x] 3. Transactional email via Resend: magic link + welcome + billing templates, dev fallback, SPF/DKIM/DMARC doc
- [x] 4. Monitoring: /healthz web/gateway/worker, uptime plan, error tracking behind env, alerts (gateway disconnect, queue backlog)
- [x] 5. Abuse & safety: signup rate limits, crawl limits per user, per-bot message rate limits, LLM spend cap per account, kill switch
- [x] 6. Analytics: funnel signup → built → deployed → first real message, METRICS.md + script
- [x] 7. Backups: real local restore drill (file backup + snapshot restore), RPO/RTO documented
- [x] 8. CUTOVER.md + RUNBOOK.md
- [x] 9. pnpm smoke passes locally; NEEDS-AKI items appended

## Summary (2026-10-10)
All 9 items verified locally; nothing deployed. Proof:
- pnpm smoke: PASS (fresh DB, terminal gateway, Telegram API blocked so live bots were not touched), web prod build OK (.next-production).
- pnpm test:production: 24/24 (limits, kill switch, spend caps, Sentry, alerts, Resend templates, migration 0005).
- node scripts/restore-drill.mjs --real: 9/9 incl. read-only download of the real latest snapshot (3.2 MB, integrity ok). RPO/RTO in AUDIT §4.
- Watchdog alerts fired and resolved against a local webhook (gateway/worker SIGSTOP + 4 queued jobs).
- Worker (deploy/cloudflare/src/index.ts) typechecks strict.
Key decisions: on-screen sign-in links off in production (DEMO_DEV_LINKS only for throwaway demos); keep-alive cron every 5 min;
snapshot history 48h hourly + 30d daily; data rollback via SUPABASE_SNAPSHOT_OBJECT instead of overwriting latest; /__ops/restart applies env.
Needs Aki: 8 [production] lines in launch/NEEDS-AKI.md, first one (redeploy, closes the sign-in hole) is urgent.
