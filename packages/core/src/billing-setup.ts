// One-time Stripe setup: overage Billing Meter, Starter/Growth products with monthly, yearly and metered overage prices,
// add-on prices (extra bot, dedicated number) and a Customer Portal configuration. Idempotent: re-running finds what exists. Needs STRIPE_SECRET_KEY (test mode: sk_test_...) in env.
//   STRIPE_SECRET_KEY=sk_test_... node --experimental-strip-types packages/core/src/billing-setup.ts
import { setupStripeCatalog, stripeConfigured, stripeMode } from "./billing-stripe.ts";

if (!stripeConfigured()) {
  console.error("STRIPE_SECRET_KEY is not set (or is a live key without STRIPE_ALLOW_LIVE=1). Nothing to do.");
  process.exit(1);
}
console.log(`stripe mode: ${stripeMode()}`);
const r = await setupStripeCatalog();
console.log(JSON.stringify(r, null, 2));
console.log("Next: add a webhook endpoint for <APP_URL>/api/stripe/webhook and set STRIPE_WEBHOOK_SECRET (see launch/billing/SETUP.md).");
