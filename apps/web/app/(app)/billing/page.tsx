import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { billing, billingState } from "@/lib/billing";
import "./billing.css";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US");
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string; error?: string }> }) {
  const user = await requireUser("/billing");
  const sp = await searchParams;
  const s = billingState(user.id);
  const u = s.usage;
  const sub = s.subscription;
  const hasCustomer = !!sub?.stripe_customer_id;
  const paid = u.plan.id !== "free";
  return (
    <main id="main" className="page billing">
      <div className="page-head">
        <div><h1>Billing</h1></div>
        <p>Plans, this month&apos;s usage and invoices.</p>
      </div>

      {sp.checkout === "success" && <div className="ok-box bl-msg" id="billing-success">Thanks! Your upgrade is being confirmed. This page shows the new plan as soon as Stripe tells us, usually within a few seconds.</div>}
      {sp.checkout === "cancelled" && <div className="note-box bl-msg">Checkout was cancelled. Nothing was charged.</div>}
      {sp.error && <div className="note-box bl-msg" id="billing-error">{sp.error.slice(0, 200)}</div>}
      {!s.configured && <div className="note-box bl-msg" id="billing-not-configured">Billing is not configured on this server, so paid plans can&apos;t be bought here yet. Everyone is on the {u.plan.name} plan.</div>}
      {s.configured && s.mode === "test" && <div className="note-box bl-msg">Stripe test mode: use card 4242 4242 4242 4242, any future date, any CVC. No real money moves.</div>}
      {s.paymentFailed && <div className="note-box bl-msg">Your last payment failed. Stripe will retry; update your card under Manage billing to keep {u.plan.name}.</div>}

      <section className="card bl-current" id="billing-current">
        <div className="bl-row">
          <div>
            <div className="stat-k">Current plan</div>
            <div className="bl-plan" id="billing-plan">{u.plan.name} {sub?.status && sub.status !== "none" && paid && <span className={`pill ${sub.status === "active" || sub.status === "trialing" ? "pill-live" : "pill-warn"}`}>{sub.status.replace("_", " ")}</span>}</div>
            {sub?.current_period_end && paid && (
              <div className="muted bl-small">{sub.cancel_at_period_end ? `Ends on ${day(sub.current_period_end)}, then you move to Free.` : `Renews on ${day(sub.current_period_end)}.`}</div>
            )}
          </div>
          <div className="bl-actions">
            {hasCustomer && s.configured && (
              <form action="/api/billing/portal" method="post"><button className="btn" id="billing-manage">Manage billing</button></form>
            )}
            {u.plan.id === "free" && (
              <form action="/api/billing/checkout" method="post">
                <input type="hidden" name="plan" value="pro" />
                <button className="btn btn-blue" id="billing-upgrade" disabled={!s.configured}>Upgrade to Pro, $29/mo</button>
              </form>
            )}
          </div>
        </div>

        <div className="bl-usage" id="billing-usage">
          <div className="bl-usage-head">
            <span>Messages this month</span>
            <b>{u.limit === null ? `${fmt(u.used)} (unlimited)` : `${fmt(u.used)} of ${fmt(u.limit)}`}</b>
          </div>
          {u.limit !== null && (
            <div className={`bl-bar${u.over ? " over" : u.nearLimit ? " near" : ""}`} role="meter" aria-valuemin={0} aria-valuemax={u.limit} aria-valuenow={u.used} aria-label="Messages used this month">
              <i style={{ width: `${u.pct}%` }} />
            </div>
          )}
          <div className="muted bl-small">
            Resets {day(u.resetsAt)} (UTC). A message is one customer message your bot answers or one message your bot sends first. Playground chats don&apos;t count.
            {u.blocked > 0 && ` ${fmt(u.blocked)} customer ${u.blocked === 1 ? "message was" : "messages were"} not answered this month because of plan limits.`}
          </div>
          <div className="bl-facts">
            <div><div className="stat-k">Bots</div><div className="stat-v">{u.bots}<small> of {u.botLimit ?? "unlimited"}</small></div></div>
            <div><div className="stat-k">Channels</div><div className="stat-v bl-ch">{u.plan.channels.filter((c) => c !== "terminal" && c !== "web").map((c) => billing.CHANNEL_NAMES[c] ?? c).join(", ")}</div></div>
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
              <div className="bl-price">{p.priceUsd === null ? "Custom" : p.priceUsd === 0 ? "$0" : `$${p.priceUsd}`}<small>{p.priceUsd ? " / month" : ""}</small></div>
              <ul>
                <li>{p.messagesPerMonth === null ? "Custom message volume" : `${fmt(p.messagesPerMonth)} messages a month`}</li>
                <li>{p.bots === null ? "Unlimited bots" : `${p.bots} ${p.bots === 1 ? "bot" : "bots"}`}</li>
                <li>{p.id === "free" ? "Telegram + playground" : p.id === "pro" ? "iMessage (shared Threadline line) + Telegram" : "Dedicated iMessage number for your brand"}</li>
                {p.id === "business" && <li>Priority support and onboarding</li>}
              </ul>
              {p.id === "pro" && !current && u.plan.id === "free" && (
                <form action="/api/billing/checkout" method="post"><input type="hidden" name="plan" value="pro" /><button className="btn btn-blue" disabled={!s.configured}>Upgrade</button></form>
              )}
              {p.id === "business" && !current && <a className="btn" href="mailto:hello@threadline.app?subject=Threadline%20Business">Talk to us</a>}
            </article>
          );
        })}
      </div>
      <p className="muted bl-small">Prices in USD, billed monthly by Stripe. Sales tax is added where it applies. Cancel any time under Manage billing; you keep Pro until the end of the period you paid for.</p>
    </main>
  );
}
