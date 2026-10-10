# Brief: production (launch readiness)
Owns: launch/production/**, deploy/**, scripts/** (new files only unless a fix is required), small additive ops hooks in apps (health checks, error reporting init) noted in COORDINATION.md.
Goal: Threadline can take real traffic on its own domain without falling over, and Aki has a launch-day runbook.
Done when:
- [ ] Use the domain chosen in COORDINATION.md (domain agent); if none yet, use a placeholder DOMAIN var everywhere.
- [ ] Audit current deploy (deploy/cloudflare, Supabase snapshot persistence, single SQLite) and write launch/production/AUDIT.md: single points of failure, data-loss window, scaling limits, cost per month at 10/100/1,000 customers (Cloudflare Containers, Supabase, Photon tiers, Anthropic tokens).
- [ ] Transactional email: magic link + welcome + billing emails through Resend (env RESEND_API_KEY, falls back to dev links), templates, SPF/DKIM/DMARC instructions.
- [ ] Monitoring: /healthz for web/gateway/worker verified, uptime check plan, error tracking (Sentry or Cloudflare logs) behind env, alert on gateway disconnect and build-queue backlog.
- [ ] Abuse & safety: signup rate limits, crawl limits per user, per-bot message rate limits, LLM spend cap per account, kill switch env.
- [ ] Analytics: privacy-friendly product analytics (signup → bot built → deployed → first real message) with the events defined in launch/production/METRICS.md.
- [ ] Backups: verify snapshot restore with a real restore test locally; document RPO/RTO.
- [ ] launch/production/CUTOVER.md (custom domain, APP_URL, OAuth redirect URLs, Photon production plan / dedicated line decision) and RUNBOOK.md (launch day checklist, rollback, incident steps).
- [ ] Everything verified locally (pnpm smoke passes). No live deploys. Items needing Aki → launch/NEEDS-AKI.md.
