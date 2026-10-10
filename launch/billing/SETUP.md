# Billing setup: what Aki does in Stripe

Everything in code is done and tested against a fake Stripe API and Stripe-style signed webhooks. Nothing has touched a real
Stripe account (no keys exist yet). Do steps 1 to 5 in **test mode**: it costs nothing and needs no business details.
Steps 6 to 8 are for going live and involve your legal entity and bank, so they are yours to do.

Plans, prices and what's enforced: [PLANS.md](PLANS.md).

## 1. Create the Stripe account (free, test mode works at once)
1. Sign up at https://dashboard.stripe.com/register with the Threadline business email.
2. Leave the account in test mode (toggle top right). You don't need to "activate payments" yet.
3. Developers → API keys → reveal the **test secret key** (`sk_test_...`).

## 2. Store the keys (never in git, never in chat)
Same pattern as the other secrets in COORDINATION.md:
```sh
security add-generic-password -s "Threadline Stripe" -a STRIPE_SECRET_KEY -w          # paste sk_test_... at the prompt
security add-generic-password -s "Threadline Stripe" -a STRIPE_WEBHOOK_SECRET -w      # after step 4
```

Use the service name "Threadline Stripe" (not "Threadline Ops"): `scripts/start-all.mjs` only reads this one; `deploy/cloudflare/deploy.sh` reads either.

For a local run, export them into the shell that starts the app:
```sh
export STRIPE_SECRET_KEY="$(security find-generic-password -s 'Threadline Stripe' -a STRIPE_SECRET_KEY -w)"
export STRIPE_WEBHOOK_SECRET="$(security find-generic-password -s 'Threadline Stripe' -a STRIPE_WEBHOOK_SECRET -w)"
```
Already wired by production: `scripts/start-all.mjs` loads both from Keychain, `deploy/cloudflare/deploy.sh` pushes them as Worker secrets,
and `deploy/cloudflare/src/index.ts` passes them (plus `BILLING_DEFAULT_PLAN`) into the container env.

## 3. Create products, prices, the meter and the portal (one command, safe to re-run)
```sh
STRIPE_SECRET_KEY=sk_test_... node --experimental-strip-types packages/core/src/billing-setup.ts
```
It creates, and on re-runs finds by `lookup_key` instead of duplicating:

| Object | lookup_key / name | Amount |
|---|---|---|
| Billing Meter | event `threadline_overage_conversation` (sum of `value`, customer by `stripe_customer_id`) | |
| Threadline Starter | `threadline_starter_monthly` / `threadline_starter_yearly` | $29.00 / month, $288.00 / year |
| Threadline Starter extra conversations | `threadline_starter_overage` (metered on the meter) | $0.15 each, billed monthly |
| Threadline Growth | `threadline_growth_monthly` / `threadline_growth_yearly` | $149.00 / month, $1,488.00 / year |
| Threadline Growth extra conversations | `threadline_growth_overage` (metered) | $0.10 each, billed monthly |
| Threadline extra bot | `threadline_extra_bot_monthly` | $19.00 / month |
| Threadline dedicated iMessage number | `threadline_dedicated_number_monthly` | $399.00 / month |
| Customer Portal configuration | metadata `threadline=1` | card, invoices, tax ids, cancel at period end |

All prices are USD, tax-exclusive, product tax code `txcd_10103001` (SaaS, business use). Scale is sold by hand (§8).

## 4. Webhook endpoint
Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://<APP_URL>/api/stripe/webhook` (today `https://threadline.akshitbansal1313.workers.dev/api/stripe/webhook`; switch to the
  custom domain when production cuts over).
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`.
- Copy the signing secret (`whsec_...`) into Keychain as `STRIPE_WEBHOOK_SECRET` (step 2).

Local testing without a public URL: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI prints a `whsec_` to use).

## 5. Test it end to end (test mode)
1. Sign in → Billing → "Upgrade monthly" on Starter → pay with `4242 4242 4242 4242`, any future date, any CVC.
2. You land on `/billing?checkout=success`; within seconds the page shows **Starter, active**, 0 of 300.
3. "Manage billing" opens the Stripe portal (change card, invoices, cancel).
4. "Switch to Growth" swaps the plan in place, prorated.
5. Failed payment: in the portal set card `4000 0000 0000 0341` (attaches, then fails on charge), or `stripe trigger invoice.payment_failed`;
   the dashboard shows the red "update your card" banner.
6. Renewal and overage: Stripe test clocks (Billing → Test clocks) let you advance a month and see the overage line on the invoice.

Env vars, all optional except the first two:

| Var | What |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (a `sk_live_` key is refused unless `STRIPE_ALLOW_LIVE=1`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 4 |
| `STRIPE_ALLOW_LIVE` | `1` only when going live (step 7) |
| `STRIPE_AUTOMATIC_TAX` | `1` after Stripe Tax is set up (step 6): Checkout adds tax and collects address + tax id |
| `STRIPE_PORTAL_CONFIGURATION` | optional `bpc_...`; default is the one the setup script made |
| `STRIPE_METER_EVENT` | optional; default `threadline_overage_conversation` |
| `STRIPE_API_VERSION` | optional pin; default is the account's API version |
| `BILLING_DEFAULT_PLAN` | optional floor plan for every account (`starter` for pilots/demos). Without Stripe keys everyone is on Free |

Without any keys the app still works: everyone is on Free (or `BILLING_DEFAULT_PLAN`), the Billing page says
"Billing is not configured", and the webhook returns 503.

## 6. Before taking real money: Stripe account details (Aki)
- **Activate the account**: legal entity (needs the company from launch/legal), EIN/tax id, business address, website URL
  (must show pricing, terms, privacy, refund policy and a contact email, which Stripe reviews), statement descriptor `THREADLINE`.
- **Payout bank account** (business checking account in the entity's name).
- **Stripe Tax** (0.5% per transaction where you're registered): add your head-office address, review the registrations Stripe suggests
  (SaaS is taxable in some US states), then set `STRIPE_AUTOMATIC_TAX=1`. Without a registration nothing is collected.
- **Emails + dunning**: Settings → Customer emails (receipts, failed payment, upcoming renewal for yearly), Billing → Revenue recovery
  (Smart Retries; after all retries fail mark the subscription **canceled** so the app moves the user to Free).
- **Branding**: logo + brand color for Checkout, the portal and invoices.

## 7. Go live
1. Toggle to live mode, copy the live secret key into Keychain (`Threadline Stripe` / `STRIPE_SECRET_KEY`), set `STRIPE_ALLOW_LIVE=1`.
2. Re-run step 3 with the live key (live mode has its own products, prices, meter and portal).
3. Add the live webhook endpoint (step 4) and store its new `whsec_`.
4. Buy one Starter subscription with a real card, check the plan flips, then refund it from the Dashboard.

## 8. Scale and add-ons (manual for now)
- **Scale**: agree the contract, then `UPDATE users SET plan='scale' WHERE email='...'` (no Stripe subscription needed; invoice from
  Stripe Invoicing or by contract). Stripe events never downgrade a Scale account.
- **Extra bot / dedicated number**: Dashboard → the customer's subscription → Add product → the add-on price. The webhook picks up the
  quantity (`subscriptions.extra_bots`, `dedicated_numbers`); a dedicated number also needs a Photon Business line provisioned.

## Costs Aki should expect
Stripe has no monthly fee: 2.9% + 30c per card charge, Billing 0.7% of billing volume, Tax 0.5% per transaction where registered
(stripe.com/pricing, stripe.com/billing/pricing, stripe.com/tax/pricing). On a $29 Starter invoice that's $1.49.
