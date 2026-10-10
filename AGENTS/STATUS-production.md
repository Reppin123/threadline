# STATUS: production (launch readiness)

Started 2026-10-10. Domain: heybell.app (domain agent decision, pending Aki purchase) via DOMAIN/APP_URL vars.

- [ ] 1. Domain wired as a variable (APP_URL / DOMAIN, EMAIL_FROM) in deploy config, no hardcoded host
- [ ] 2. launch/production/AUDIT.md (SPOFs, data-loss window, scaling limits, cost at 10/100/1,000 customers, sourced)
- [ ] 3. Transactional email via Resend: magic link + welcome + billing templates, dev fallback, SPF/DKIM/DMARC doc
- [ ] 4. Monitoring: /healthz web/gateway/worker, uptime plan, error tracking behind env, alerts (gateway disconnect, queue backlog)
- [ ] 5. Abuse & safety: signup rate limits, crawl limits per user, per-bot message rate limits, LLM spend cap per account, kill switch
- [ ] 6. Analytics: funnel signup → built → deployed → first real message, METRICS.md + script
- [ ] 7. Backups: real local restore drill (file backup + snapshot restore), RPO/RTO documented
- [ ] 8. CUTOVER.md + RUNBOOK.md
- [ ] 9. pnpm smoke passes locally; NEEDS-AKI items appended
