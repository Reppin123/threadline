// POST /api/billing/checkout (form: plan=pro) → 303 to Stripe Checkout. Session cookie auth.
import { currentUser, appUrl } from "@/lib/auth";
import { billing, stripeBilling } from "@/lib/billing";

export const runtime = "nodejs";

const back = (msg: string) => Response.redirect(`${appUrl()}/billing?error=${encodeURIComponent(msg)}`, 303);

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.redirect(`${appUrl()}/login?next=/billing`, 303);
  const form = await req.formData().catch(() => null);
  const plan = billing.asPlanId(String(form?.get("plan") ?? "pro"));
  if (!stripeBilling.stripeConfigured()) return back("Billing isn't configured on this server yet.");
  try {
    const url = await stripeBilling.createCheckoutSession({ id: user.id, email: user.email, name: user.name }, plan, appUrl());
    return Response.redirect(url, 303);
  } catch (e) {
    console.error("[billing] checkout", e);
    return back(e instanceof stripeBilling.BillingError && e.status < 500 ? e.message : "Couldn't start checkout. Try again in a minute.");
  }
}
