// Plan-limit banner shown above every dashboard page (rendered from the (app) layout).
import Link from "next/link";
import { billingBanner } from "@/lib/billing";
import "./billing.css";

export function BillingBanner({ userId }: { userId: string }) {
  const b = billingBanner(userId);
  if (!b) return null;
  return (
    <div className={`bl-banner ${b.tone}`} role="status" id="billing-banner">
      <span>{b.text}</span>
      <Link href="/billing">{b.tone === "err" ? "Fix it on Billing" : "See plans"}</Link>
    </div>
  );
}
