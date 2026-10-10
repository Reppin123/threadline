# STATUS: billing (2026-10-10): DONE

Definition of Done (AGENTS/billing.md), each item verified:
- [x] Pricing: used gtm's posted decision (Free / Starter $29 / Growth $149 / Scale from $599, metered per conversation) instead of the
      default. launch/billing/PLANS.md has limits, LLM + Photon cost per message ($0.011 per bot reply, $0 marginal per sent message,
      Photon a fixed $250/line) and per conversation ($0.064 iMessage), and margins with every Stripe fee (Starter 27% worst / 67% typical,
      Growth 30% / 69%). A test fails if the code's PLANS drift from gtm's PRICING.md §3 JSON.
- [x] Stripe in TEST mode, fetch-based (no SDK dependency): setup script (meter + 8 prices + portal config, idempotent by lookup_key,
      key only from env, sk_live_ refused unless STRIPE_ALLOW_LIVE=1), Checkout (monthly = base + metered overage, yearly = base),
      Customer Portal, in-place plan switch, webhook with HMAC signature check (tolerance, secret rotation, dedupe by event id,
      stale/out-of-order protection) for subscription created/updated/deleted/paused/resumed, invoice.payment_failed/paid,
      checkout.session.completed. State lives in `subscriptions` + `users.plan` (migration 0004). Overage goes to Stripe as meter events
      (identifier = conversation id, single-flight, retried).
- [x] Limits enforced: conversations per month counted in the gateway path (inbound replies and scheduled/API sends), channel gating
      (iMessage needs Starter except Free's 5 test phones, WhatsApp needs Growth), bots per plan (+ extra-bot add-on), API needs Starter.
      Friendly "at capacity" reply once per customer per day, customers mid-conversation never cut off; dashboard banner (near limit,
      at capacity, bot on an off-plan channel, payment failed).
- [x] Billing page /billing: current plan + status, renewal date, conversation meter with overage cost, bots/channels, plan cards with
      monthly/yearly upgrade, switch plan, Manage billing (portal). Screenshots checked (launch/billing/screenshots/, gitignored).
- [x] Works without keys: Free plan (or BILLING_DEFAULT_PLAN), "Billing is not configured" note, checkout bounces back politely,
      webhook 503. Tests: `pnpm --filter @threadline/core test:billing` 41/41 (limits, conversation meter, signed webhook replay from
      packages/core/src/billing-fixtures/events.json, fake Stripe API); gateway sim 37/37 incl. 2 billing scenarios; e2e against the
      built app 16/16 (`node --experimental-strip-types launch/billing/scripts/e2e-web.ts`); core selftest 18/18; typecheck core/gateway/web;
      build passes with NEXT_DIST_DIR=.next-billing.
- [x] launch/billing/SETUP.md (account, keys in Keychain, setup script, webhook URL + events, test flow, tax, payouts, dunning, go-live)
      and 4 lines in launch/NEEDS-AKI.md.

Key decisions (in COORDINATION.md): conversation meter reuses core's conversation ids (6h rule); yearly plans hard-stop (Checkout can't mix
intervals); Free iMessage = first 5 contacts per bot; Scale and add-ons sold by hand; calendar-month UTC reset.

For others: production must wire STRIPE_* env into deploy + start-all and should set BILLING_DEFAULT_PLAN for the current demo before
shipping this code (otherwise existing users fall to Free limits). gtm's margin sheet undercounts Stripe fees and overstates Haiku cost
(margins still positive). Photon Free/Pro user caps (10/100 across all customers) mean a Business line ($250/mo) is needed before selling Starter.

Not verified (needs Aki's Stripe account): real Stripe API calls. Every request shape is checked against a fake Stripe server and
Stripe's docs (meter events, mixed-interval limits, fees), but no real test-mode purchase has run yet. That's SETUP.md §5.

Re-verified 2026-10-10 (resume, after production/domain commits): test:billing 41/41, gateway sim 37/37, web build NEXT_DIST_DIR=.next-billing OK,
billing e2e 16/16. Production has wired STRIPE_* + BILLING_DEFAULT_PLAN into deploy + start-all. Flagged to production: CUTOVER.md stores Stripe
keys under Keychain "Threadline Ops" but start-all reads only "Threadline Stripe" (SETUP.md now says to use "Threadline Stripe").
