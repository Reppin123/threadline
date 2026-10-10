// POST /api/billing/portal → 303 to the Stripe Customer Portal (change card, cancel, invoices). Session cookie auth.
import { currentUser, appUrl } from "@/lib/auth";
import { stripeBilling } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) return Response.redirect(`${appUrl()}/login?next=/billing`, 303);
  try {
    return Response.redirect(await stripeBilling.createPortalSession(user.id, appUrl()), 303);
  } catch (e) {
    console.error("[billing] portal", e);
    const msg = e instanceof stripeBilling.BillingError && e.status < 500 ? e.message : "Couldn't open billing. Try again in a minute.";
    return Response.redirect(`${appUrl()}/billing?error=${encodeURIComponent(msg)}`, 303);
  }
}
