// Billing emails after a Stripe webhook was applied (owned by agent production). Fire-and-forget; never fails the webhook.
import "server-only";
import { get } from "@/lib/db";
import { billing, email as mail, ops } from "@threadline/core";

export async function sendBillingEmail(event: any): Promise<void> {
  try {
    const obj = event?.data?.object ?? {};
    const user = get<{ id: string; email: string; plan: string }>(
      "SELECT u.id, u.email, u.plan FROM subscriptions s JOIN users u ON u.id = s.user_id WHERE s.stripe_customer_id = ?", [obj.customer]);
    if (!user) return;
    const planName = billing.PLANS[billing.asPlanId(user.plan)]?.name ?? null;
    const m = mail.billingEmailFor(event.type, user.plan === "free" ? null : planName);
    if (!m) return;
    const r = await mail.send(user.email, m.mail, { idempotencyKey: `stripe:${event.id}`, tag: m.tag });
    if (!r.sent && r.error !== "not_configured") ops.reportError(new Error(`billing email: ${r.error}`), { service: "web", where: `email.${m.tag}` });
  } catch (e) {
    ops.reportError(e, { service: "web", where: "email.billing" });
  }
}
