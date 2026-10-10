# Brief: billing
Owns: launch/billing/**, apps/web/app/**/billing/**, apps/web/app/api/billing/**, apps/web/app/api/stripe/**, apps/web/lib/billing*, packages/core/src/billing*, new migration packages/db/migrations/00NN_billing_*.sql. Minimal additive hooks elsewhere are allowed only where enforcement must live (note each in COORDINATION.md).
Goal: Threadline can take money.
Done when:
- [ ] Pricing: use gtm's decision from COORDINATION.md if posted; otherwise default to Free (Telegram + playground, mock data, 100 msgs/mo) / Pro $29/mo (iMessage shared line + Telegram, 2,000 msgs/mo) / Business custom (dedicated line). Record in launch/billing/PLANS.md with LLM + Photon cost per message and margin.
- [ ] Stripe integration in TEST mode: products/prices via a setup script (keys from env STRIPE_SECRET_KEY, never hardcoded), Checkout session, Customer Portal, webhook handler (signature verified) for subscription created/updated/deleted/payment_failed, subscription state stored in DB.
- [ ] Plan limits enforced: message quota per month (count in the runtime/gateway path), channel gating (iMessage requires Pro), bots per plan; friendly over-limit reply and dashboard banner.
- [ ] Billing page in the dashboard: current plan, usage meter, upgrade/manage buttons.
- [ ] Works without keys (shows "billing not configured", free plan applies). Tests: unit tests for limits + a webhook replay test with Stripe-style signed fixtures. Build passes (NEXT_DIST_DIR=.next-billing).
- [ ] launch/billing/SETUP.md: what Aki must create in Stripe (account, tax, payout bank), env vars, webhook URL. Add to launch/NEEDS-AKI.md.
