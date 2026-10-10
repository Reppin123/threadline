# STATUS legal (launch agent)
Owns launch/legal/**. Not legal advice; lawyer-needed items flagged.

## Plan (Definition of Done)
- [ ] research notes with cited URLs (launch/legal/research/*.md): apple-photon, platforms (Telegram/WhatsApp/Anthropic), us-messaging-ai (TCPA/CTIA/state AI disclosure/EU AI Act), privacy (DPDP/GDPR/UK/CCPA), entity, scraping
- [ ] RISKS.md: every item = requirement, our current state (code refs), gap, fix
- [ ] ENTITY.md: India Pvt Ltd vs Delaware C-Corp (Atlas etc.), costs, bank/Stripe, recommendation
- [ ] TERMS.md, PRIVACY.md, DPA.md, ACCEPTABLE-USE.md, SUBPROCESSORS.md (pricing from launch/billing/PLANS.md)
- [ ] WEB-DIFF.md: required changes vs apps/web privacy/terms pages; diff request in COORDINATION.md
- [ ] Product compliance fixes → COORDINATION.md addressed to owners
- [ ] Lawyer items + filing costs → launch/NEEDS-AKI.md
- [ ] Final summary

## Code facts (read 2026-10-10)
- router.ts:67 STOP = only "stop" | "stop bot" | "unsubscribe"; unbinds line_routes only; no suppression list; scheduled_messages/invite can re-text a stopped number. Telegram (fixedBotId) bypasses commands entirely.
- No HELP keyword when bound; helpText only for unbound senders.
- gateway.ts:277 invite + web "text me my bot": owner types any phone; no consent record (customers table has no consent cols).
- Greeting default "Hi! I'm X" (config.ts:32); runtime.ts:15 "Write like a friendly human texting"; no AI disclosure rule.
- Privacy page promises 90-day retention; no purge job exists. No account deletion; deleteBot exists (actions.ts:118). No end-user deletion path.
- Crawler UA points to https://threadline.app/bot (domain owned by a stranger); robots.txt RFC 9309 honoured (website.ts:20).
