import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { billing, billingState } from "@/lib/billing";
import "./billing.css";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US");
const usd = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString("en-US")}` : `$${n.toFixed(2)}`);
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

const CHANNEL_LINE: Record<string, string> = {
  free: "Telegram live, iMessage to you and 5 test phones",
  starter: "iMessage (shared Threadline numbers) + Telegram",
  growth: "iMessage + Telegram, WhatsApp when it ships",
  scale: "Everything, plus a dedicated iMessage number",
};
const EXTRAS: Record<string, string[]> = {
  free: ["Quick checks before each release", "Email handoff"],
  starter: ["API and keys", "Weekly recrawl of your site", "Remove the Threadline sign-off"],
  growth: ["Full simulated-customer test suite", "Daily recrawl", "Helpdesk handoff (Gorgias, Zendesk)"],
  scale: ["Custom scenarios, hourly recrawl", "SSO, Slack channel and SLA"],
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string; error?: string; changed?: string }> }) {
  const user = await requireUser("/billing");
  const sp = await searchParams;
  const s = billingState(user.id);
  const u = s.usage;
  const sub = s.subscription;
  const subscribed = !!sub?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status);
  const hasCustomer = !!sub?.stripe_customer_id;
  const can = s.configured;
  return (
    <main id="main" className="page billing">
      <div className="page-head">
        <div><h1>Billing</h1></div>
        <p>Your plan, this month&apos;s conversations and invoices.</p>
      </div>

      {sp.checkout === "success" && <div className="ok-box bl-msg" id="billing-success">Thanks! Your upgrade is being confirmed. This page shows the new plan as soon as Stripe tells us, usually within a few seconds.</div>}
      {sp.checkout === "cancelled" && <div className="note-box bl-msg">Checkout was cancelled. Nothing was charged.</div>}
      {sp.changed && <div className="ok-box bl-msg">Plan change sent to Stripe. The difference is prorated on your next invoice.</div>}
      {sp.error && <div className="note-box bl-msg" id="billing-error">{sp.error.slice(0, 200)}</div>}
      {!can && <div className="note-box bl-msg" id="billing-not-configured">Billing is not configured on this server, so paid plans can&apos;t be bought here yet. Your account is on the {u.plan.name} plan.</div>}
      {can && s.mode === "test" && <div className="note-box bl-msg">Stripe test mode: use card 4242 4242 4242 4242, any future date, any CVC. No real money moves.</div>}
      {s.paymentFailed && <div className="note-box bl-msg">Your last payment failed. Stripe will retry; update your card under Manage billing to keep {u.plan.name}.</div>}

      <section className="card bl-current" id="billing-current">
        <div className="bl-row">
          <div>
            <div className="stat-k">Current plan</div>
            <div className="bl-plan" id="billing-plan">
              {u.plan.name}
              {subscribed && sub?.interval === "year" && <span className="pill pill-off no-dot">yearly</span>}
              {subscribed && <span className={`pill ${sub!.status === "past_due" ? "pill-warn" : "pill-live"}`}>{sub!.status.replace("_", " ")}</span>}
            </div>
            {subscribed && sub?.current_period_end && (
              <div className="muted bl-small">{sub.cancel_at_period_end ? `Ends on ${day(sub.current_period_end)}, then you move to Free.` : `Renews on ${day(sub.current_period_end)}.`}</div>
            )}
          </div>
          <div className="bl-actions">
            {hasCustomer && can && <form action="/api/billing/portal" method="post"><button className="btn" id="billing-manage">Manage billing</button></form>}
          </div>
        </div>

        <div className="bl-usage" id="billing-usage">
          <div className="bl-usage-head">
            <span>Customer conversations this month</span>
            <b>{u.included === null ? `${fmt(u.used)}` : `${fmt(u.used)} of ${fmt(u.included)}`}</b>
          </div>
          {u.included !== null && (
            <div className={`bl-bar${u.over ? " over" : u.nearLimit ? " near" : ""}`} role="meter" aria-valuemin={0} aria-valuemax={u.included} aria-valuenow={Math.min(u.used, u.included)} aria-label="Conversations used this month">
              <i style={{ width: `${u.pct}%` }} />
            </div>
          )}
          {u.overage > 0 && <div className="bl-small" id="billing-overage">{fmt(u.overage)} extra {u.overage === 1 ? "conversation" : "conversations"} at {usd(u.plan.overageUsd ?? 0)} each, about {usd(u.overageCostUsd)} on your next invoice.</div>}
          <div className="muted bl-small">
            Resets {day(u.resetsAt)} (UTC). A conversation is one customer&apos;s chat on one app with at least one reply from your bot; it starts fresh after 6 hours of quiet.
            Your own playground, checks{u.plan.imessageTestPhones ? " and test phones" : ""} don&apos;t count.
            {u.included !== null && (u.overageEnabled
              ? ` Past ${fmt(u.included)}, each extra conversation is ${usd(u.plan.overageUsd ?? 0)}.`
              : ` Past ${fmt(u.included)}, new customers get a polite "at capacity" reply and your team takes over.`)}
            {u.blocked > 0 && ` ${fmt(u.blocked)} customer ${u.blocked === 1 ? "message was" : "messages were"} not answered this month because of plan limits.`}
          </div>
          <div className="bl-facts">
            <div><div className="stat-k">Bots</div><div className="stat-v">{u.bots}<small> of {u.botLimit ?? "unlimited"}</small></div></div>
            <div><div className="stat-k">Channels</div><div className="stat-v bl-ch">{CHANNEL_LINE[u.plan.id]}</div></div>
          </div>
        </div>
      </section>

      <div className="sec-head"><h2>Plans</h2></div>
      <div className="bl-plans">
        {Object.values(billing.PLANS).map((p) => {
          const current = p.id === u.plan.id;
          return (
            <article className={`card bl-card${current ? " current" : ""}`} key={p.id} data-plan={p.id}>
              <div className="bl-card-head"><h3>{p.name}</h3>{current && <span className="pill pill-blue">Your plan</span>}</div>
              <div className="bl-price">
                {p.id === "scale" ? <>from $599<small> / month</small></> : p.priceUsd ? <>{usd(p.priceUsd)}<small> / month</small></> : "$0"}
              </div>
              {p.yearlyPerMonthUsd && <div className="muted bl-small bl-yearly">or {usd(p.yearlyPerMonthUsd)}/mo billed yearly</div>}
              <ul>
                <li>{p.id === "scale" ? "6,000+ conversations a month" : `${fmt(p.includedConversations!)} conversations a month`}</li>
                <li>{p.overageUsd === null ? "Stops at the limit (no surprise bills)" : `Then ${usd(p.overageUsd)} per conversation`}</li>
                <li>{p.bots === null ? "Unlimited bots" : `${p.bots} ${p.bots === 1 ? "bot" : "bots"}`}</li>
                <li>{CHANNEL_LINE[p.id]}</li>
                {EXTRAS[p.id]!.map((x) => <li key={x}>{x}</li>)}
              </ul>
              {p.selfServe && !current && !subscribed && (
                <div className="bl-buy">
                  <form action="/api/billing/checkout" method="post"><input type="hidden" name="plan" value={p.id} /><input type="hidden" name="interval" value="month" />
                    <button className="btn btn-blue" disabled={!can} id={`billing-upgrade-${p.id}`}>{u.plan.id === "free" ? "Upgrade" : "Choose"} monthly</button></form>
                  <form action="/api/billing/checkout" method="post"><input type="hidden" name="plan" value={p.id} /><input type="hidden" name="interval" value="year" />
                    <button className="btn" disabled={!can} id={`billing-yearly-${p.id}`}>Yearly, {usd(p.yearlyPerMonthUsd! * 12)}/yr</button></form>
                </div>
              )}
              {p.selfServe && !current && subscribed && (
                <form action="/api/billing/change" method="post"><input type="hidden" name="plan" value={p.id} />
                  <button className="btn btn-blue" disabled={!can} id={`billing-change-${p.id}`}>Switch to {p.name}</button></form>
              )}
              {p.id === "scale" && !current && <a className="btn" href="mailto:hello@threadline.app?subject=Threadline%20Scale">Talk to us</a>}
            </article>
          );
        })}
      </div>
      <p className="muted bl-small">
        Add-ons: extra bot {usd(billing.ADDONS.extraBot.priceUsd)}/mo (Starter, Growth), dedicated iMessage number {usd(billing.ADDONS.dedicatedNumber.priceUsd)}/mo (Growth; included in Scale). Email hello@threadline.app to add one.
        Prices in USD; sales tax is added where it applies. Yearly plans stop at the included conversations each month instead of billing extras.
        Cancel any time under Manage billing and keep your plan until the end of the period you paid for.
      </p>
    </main>
  );
}
