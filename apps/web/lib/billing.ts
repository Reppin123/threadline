// Billing glue for the web app: plan/usage summary for pages, plus re-exports of the core billing helpers.
import "server-only";
import { billing, stripeBilling } from "@threadline/core";

export { billing, stripeBilling };

export function billingState(userId: string) {
  const usage = billing.usageSummary(userId);
  const sub = stripeBilling.subscriptionRow(userId);
  return {
    usage,
    configured: stripeBilling.stripeConfigured(),
    mode: stripeBilling.stripeMode(),
    subscription: sub ? { ...sub } : null,
    paymentFailed: !!sub?.payment_failed_at,
  };
}

/** Banner text for the top of every dashboard page, or null. */
export function billingBanner(userId: string): { tone: "warn" | "err"; text: string } | null {
  const s = billingState(userId);
  const u = s.usage;
  if (s.paymentFailed) return { tone: "err", text: "Your last payment didn't go through. Update your card so your bots keep answering." };
  if (u.over) return { tone: "err", text: `Your bots have used all ${u.limit?.toLocaleString("en-US")} messages on the ${u.plan.name} plan this month and have stopped replying to customers.` };
  if (u.imessageBotsOffPlan) return { tone: "warn", text: `${u.imessageBotsOffPlan === 1 ? "A bot is" : `${u.imessageBotsOffPlan} bots are`} live on a channel your ${u.plan.name} plan doesn't include, so customers there get no replies.` };
  if (u.nearLimit) return { tone: "warn", text: `You've used ${u.used.toLocaleString("en-US")} of ${u.limit?.toLocaleString("en-US")} messages this month (${u.pct}%).` };
  return null;
}
