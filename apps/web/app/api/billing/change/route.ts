// POST /api/billing/change (form: plan=starter|growth) → switch an active subscription in place (prorated), back to /billing.
import { currentUser, appUrl } from "@/lib/auth";
import { billing, stripeBilling } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.redirect(`${appUrl()}/login?next=/billing`, 303);
  const form = await req.formData().catch(() => null);
  const plan = billing.asPlanId(String(form?.get("plan") ?? ""));
  try {
    await stripeBilling.changePlan(user.id, plan);
    return Response.redirect(`${appUrl()}/billing?changed=${plan}`, 303);
  } catch (e) {
    console.error("[billing] change", e);
    const msg = e instanceof stripeBilling.BillingError && e.status < 500 ? e.message : "Couldn't change the plan. Try again in a minute.";
    return Response.redirect(`${appUrl()}/billing?error=${encodeURIComponent(msg)}`, 303);
  }
}
