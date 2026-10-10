// POST /api/stripe/webhook: Stripe events (signature verified with STRIPE_WEBHOOK_SECRET) → subscriptions + users.plan.
// Subscribe the endpoint to: checkout.session.completed, customer.subscription.created|updated|deleted,
// invoice.payment_failed, invoice.paid. Duplicate deliveries are no-ops (stripe_events).
import { stripeBilling } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "billing_not_configured" }, { status: 503 });
  const payload = await req.text();
  let event: any;
  try {
    event = stripeBilling.verifyWebhook(payload, req.headers.get("stripe-signature"), secret);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const r = stripeBilling.handleStripeEvent(event);
    return Response.json({ received: true, ...r });
  } catch (e) {
    console.error("[billing] webhook", event?.type, e);
    return Response.json({ error: "handler_failed" }, { status: 500 });
  }
}
