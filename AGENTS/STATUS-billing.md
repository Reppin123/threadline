# STATUS: billing

Plan (from AGENTS/billing.md Definition of Done):
- [ ] PLANS.md: tiers (gtm decision or default Free/Pro $29/Business), LLM + Photon cost per message, margin
- [ ] Migration 0004_billing_subscriptions.sql (subscriptions + stripe_events)
- [ ] packages/core/src/billing.ts: plan catalog, usage counting, quota/channel/bot gates, over-limit copy
- [ ] packages/core/src/billing-stripe.ts: fetch-based Stripe client (no SDK), webhook signature verify, event → subscription state
- [ ] Stripe setup script (products/prices, idempotent via lookup_keys, STRIPE_SECRET_KEY from env)
- [ ] Web: /api/billing/checkout, /api/billing/portal, /api/stripe/webhook
- [ ] Enforcement hooks: gateway chatTurn (quota + iMessage gating), web connectChannel (iMessage needs Pro), wizardCreate (bots per plan), /api/v1 messages (quota)
- [ ] Billing page (/billing): plan, usage meter, upgrade/manage; "billing not configured" when no keys
- [ ] Dashboard over-limit banner
- [ ] Tests: limits unit tests + webhook replay with Stripe-style signed fixtures + mock Stripe server for setup/checkout
- [ ] Build passes (NEXT_DIST_DIR=.next-billing), typecheck
- [ ] SETUP.md + NEEDS-AKI lines
