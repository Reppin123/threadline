# Threadline — go-live plan (2026-10-10)

Product works (web + gateway + worker + core, iMessage via Photon, Telegram) on threadline.akshitbansal1313.workers.dev.
To go live as a business we need six workstreams, each owned by one helper agent:

| # | Agent | Owns | Delivers |
|---|-------|------|----------|
| 1 | domain | launch/domain/ | Name + domain shortlist with live availability & price, recommendation, DNS/email cutover plan |
| 2 | gtm | launch/gtm/ | ICP, positioning, pricing, inbound (SEO, content, community, launches) + outbound (lead lists, sequences), 90-day plan |
| 3 | blog | launch/blog/, apps/web/app/blog/** | 6 publish-ready SEO posts + /blog index & post pages on the site |
| 4 | billing | launch/billing/, billing code paths | Plans/limits, Stripe checkout + webhooks + portal (test mode), usage metering |
| 5 | legal | launch/legal/ | Entity/compliance checklist, Apple/iMessage + Photon + Telegram/WhatsApp policy risk, TCPA/opt-in, updated Terms/Privacy/DPA/AUP drafts |
| 6 | production | launch/production/, deploy/** | Custom-domain cutover, transactional email, monitoring/alerts, backups, abuse/rate limits, analytics, Photon plan, launch-day runbook |

Run order: domain → production (needs the chosen domain); billing → legal (terms need pricing); gtm and blog in parallel.
Everything needing money, signatures, DNS changes or sending to real people is listed under "Needs Aki" in launch/NEEDS-AKI.md.
