// Stripe over plain fetch (no SDK dependency): checkout, customer portal, webhook verification, subscription sync and
// metered overage (Billing Meters). Keys come only from env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).
// Live keys are refused unless STRIPE_ALLOW_LIVE=1.
import { createHmac, timingSafeEqual } from "node:crypto";
import { get, all, run, tx, logEvent } from "@threadline/db";
import { PLANS, ADDONS, asPlanId, type PlanId, type Interval } from "./billing.ts";

export class BillingError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function stripeConfigured(): boolean {
  const k = process.env.STRIPE_SECRET_KEY || "";
  return !!k && (!k.startsWith("sk_live_") || process.env.STRIPE_ALLOW_LIVE === "1");
}
export function webhookConfigured(): boolean {
  return !!process.env.STRIPE_WEBHOOK_SECRET;
}
export function stripeMode(): "test" | "live" | "off" {
  if (!stripeConfigured()) return "off";
  return (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test";
}
/** Billing Meter event name for overage conversations (created by the setup script). */
export const meterEventName = () => process.env.STRIPE_METER_EVENT || "threadline_overage_conversation";

// ───────── HTTP ─────────
type Params = Record<string, unknown>;

/** Stripe's form encoding: a[b]=1, a[0][c]=2. */
export function formEncode(params: Params, prefix = ""): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") out.push(formEncode(item as Params, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") out.push(formEncode(v as Params, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.filter(Boolean).join("&");
}

export async function stripe<T = any>(method: "GET" | "POST", path: string, params: Params = {}, opts: { idempotencyKey?: string } = {}): Promise<T> {
  if (!stripeConfigured()) throw new BillingError("Billing is not configured on this server.", 503);
  const base = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");
  const body = formEncode(params);
  const url = method === "GET" && body ? `${base}${path}?${body}` : `${base}${path}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` };
  if (process.env.STRIPE_API_VERSION) headers["Stripe-Version"] = process.env.STRIPE_API_VERSION;
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  const res = await fetch(url, { method, headers, body: method === "POST" ? body : undefined });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new BillingError(`Stripe ${method} ${path}: ${j?.error?.message ?? res.status}`, res.status >= 500 ? 502 : 400);
  return j as T;
}


// ───────── Prices / customers ─────────
async function priceByLookupKey(key: string): Promise<{ id: string } | undefined> {
  const r = await stripe<{ data: { id: string }[] }>("GET", "/v1/prices", { lookup_keys: [key], active: true, limit: 1 });
  return r.data[0];
}

export function subscriptionRow(userId: string) {
  return get<{ user_id: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; plan: string; interval: string | null; status: string;
    overage_price_id: string | null; extra_bots: number; dedicated_numbers: number; current_period_end: string | null; cancel_at_period_end: number; payment_failed_at: string | null }>(
    "SELECT * FROM subscriptions WHERE user_id=?", [userId]);
}

export async function ensureCustomer(user: { id: string; email: string; name?: string | null }): Promise<string> {
  const existing = subscriptionRow(user.id)?.stripe_customer_id;
  if (existing) return existing;
  const c = await stripe<{ id: string }>("POST", "/v1/customers",
    { email: user.email, name: user.name ?? undefined, metadata: { user_id: user.id } }, { idempotencyKey: `customer:${user.id}` });
  run(`INSERT INTO subscriptions(user_id, stripe_customer_id) VALUES (?,?)
       ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id, updated_at=datetime('now')`, [user.id, c.id]);
  return c.id;
}

const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Checkout for a self-serve plan. Monthly = base price + metered overage item (one invoice a month).
 *  Yearly = base price only: Stripe Checkout can't mix a yearly and a monthly price in one subscription
 *  (docs.stripe.com/billing/subscriptions/mixed-interval, "Limitations"), so yearly plans stop at the included conversations. */
export async function createCheckoutSession(user: { id: string; email: string; name?: string | null }, planId: PlanId, interval: Interval, appUrl: string): Promise<string> {
  const plan = PLANS[planId];
  if (!plan.selfServe || !plan.lookupKeys) throw new BillingError(`The ${plan.name} plan is set up with our team: use "Talk to us" on the Billing page.`);
  const sub = subscriptionRow(user.id);
  if (sub && PAID_STATUSES.has(sub.status) && sub.stripe_subscription_id) throw new BillingError("You already have a subscription. Use Manage billing to change it.");
  const base = await priceByLookupKey(plan.lookupKeys[interval]);
  if (!base) throw new BillingError(`No Stripe price with lookup_key ${plan.lookupKeys[interval]}. Run the billing setup script first.`, 503);
  const lineItems: Record<string, unknown>[] = [{ price: base.id, quantity: 1 }];
  if (interval === "month") {
    const over = await priceByLookupKey(plan.lookupKeys.overage);
    if (!over) throw new BillingError(`No Stripe price with lookup_key ${plan.lookupKeys.overage}. Run the billing setup script first.`, 503);
    lineItems.push({ price: over.id });   // metered: no quantity
  }
  const customer = await ensureCustomer(user);
  const tax = process.env.STRIPE_AUTOMATIC_TAX === "1";
  const s = await stripe<{ url: string }>("POST", "/v1/checkout/sessions", {
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: lineItems,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    automatic_tax: tax ? { enabled: true } : undefined,
    customer_update: tax ? { address: "auto", name: "auto" } : undefined,
    tax_id_collection: tax ? { enabled: true } : undefined,
    subscription_data: { metadata: { user_id: user.id, plan: planId, interval } },
    metadata: { user_id: user.id, plan: planId, interval },
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=cancelled`,
  });
  return s.url;
}

export async function createPortalSession(userId: string, appUrl: string): Promise<string> {
  const customer = subscriptionRow(userId)?.stripe_customer_id;
  if (!customer) throw new BillingError("No billing account yet. Upgrade first.");
  const s = await stripe<{ url: string }>("POST", "/v1/billing_portal/sessions", {
    customer, return_url: `${appUrl}/billing`, configuration: await portalConfiguration(),
  });
  return s.url;
}

/** Switch an active subscription between self-serve plans (same billing interval), prorated. The webhook that follows
 *  (customer.subscription.updated) moves users.plan. */
export async function changePlan(userId: string, planId: PlanId): Promise<void> {
  const plan = PLANS[planId];
  if (!plan.selfServe || !plan.lookupKeys) throw new BillingError(`The ${plan.name} plan is set up with our team: use "Talk to us" on the Billing page.`);
  const row = subscriptionRow(userId);
  if (!row?.stripe_subscription_id || !PAID_STATUSES.has(row.status)) throw new BillingError("No active subscription to change. Upgrade first.");
  const sub = await stripe<any>("GET", `/v1/subscriptions/${row.stripe_subscription_id}`);
  const cur = parseSubscription(sub);
  if (cur.plan === planId) throw new BillingError(`You're already on ${plan.name}.`);
  const interval: Interval = cur.interval ?? "month";
  const base = await priceByLookupKey(plan.lookupKeys[interval]);
  const over = interval === "month" ? await priceByLookupKey(plan.lookupKeys.overage) : undefined;
  if (!base || (interval === "month" && !over)) throw new BillingError("Stripe prices are missing. Run the billing setup script first.", 503);
  const items: Record<string, unknown>[] = [];
  for (const it of sub.items?.data ?? []) {
    const key = it.price?.lookup_key ?? "";
    if (key === ADDONS.extraBot.lookupKey || key === ADDONS.dedicatedNumber.lookupKey) continue;
    if (it.price?.recurring?.usage_type === "metered") items.push(over ? { id: it.id, price: over.id } : { id: it.id, deleted: true });
    else items.push({ id: it.id, price: base.id, quantity: 1 });
  }
  if (over && !items.some((i) => i.price === over.id)) items.push({ price: over.id });
  await stripe("POST", `/v1/subscriptions/${row.stripe_subscription_id}`, {
    items, proration_behavior: "create_prorations", metadata: { user_id: userId, plan: planId, interval },
  }, { idempotencyKey: `change:${row.stripe_subscription_id}:${planId}:${Date.now() >> 16}` });
}

/** STRIPE_PORTAL_CONFIGURATION, else the one the setup script made (metadata.threadline=1), else Stripe's default. */
async function portalConfiguration(): Promise<string | undefined> {
  if (process.env.STRIPE_PORTAL_CONFIGURATION) return process.env.STRIPE_PORTAL_CONFIGURATION;
  const configs = await stripe<{ data: { id: string; metadata?: Record<string, string> }[] }>("GET", "/v1/billing_portal/configurations", { active: true, limit: 100 });
  return configs.data.find((c) => c.metadata?.threadline === "1")?.id;
}

// ───────── Overage reporting (Billing Meters) ─────────
let reporting: Promise<number> | null = null;
/** Send unreported overage conversations to Stripe as meter events (identifier = conversation id, so a retry never
 *  double-bills). Single-flight; safe to call after every recorded conversation. Returns how many were reported. */
export function reportOverage(limit = 50): Promise<number> {
  if (!stripeConfigured()) return Promise.resolve(0);
  if (reporting) return reporting;
  reporting = (async () => {
    const rows = all<{ conversation_id: string; created_at: string; stripe_customer_id: string | null }>(
      `SELECT bc.conversation_id, bc.created_at, s.stripe_customer_id FROM billed_conversations bc LEFT JOIN subscriptions s ON s.user_id = bc.user_id
        WHERE bc.overage = 1 AND bc.reported_at IS NULL AND julianday(bc.created_at) >= julianday('now', '-34 days') ORDER BY bc.created_at LIMIT ?`, [limit]);
    let n = 0;
    for (const r of rows) {
      if (!r.stripe_customer_id) { run("UPDATE billed_conversations SET report_error='no stripe customer' WHERE conversation_id=?", [r.conversation_id]); continue; }
      try {
        await stripe("POST", "/v1/billing/meter_events", {
          event_name: meterEventName(), identifier: r.conversation_id,
          timestamp: Math.floor(new Date(r.created_at.replace(" ", "T") + "Z").getTime() / 1000),
          payload: { stripe_customer_id: r.stripe_customer_id, value: 1 },
        }, { idempotencyKey: `meter:${r.conversation_id}` });
        run("UPDATE billed_conversations SET reported_at=datetime('now'), report_error=NULL WHERE conversation_id=?", [r.conversation_id]);
        n++;
      } catch (e) {
        run("UPDATE billed_conversations SET report_error=? WHERE conversation_id=?", [String((e as Error).message).slice(0, 300), r.conversation_id]);
      }
    }
    return n;
  })().finally(() => { reporting = null; });
  return reporting;
}

// ───────── Webhooks ─────────
/** Stripe-Signature: "t=<unix>,v1=<hex hmac-sha256 of `${t}.${payload}`>[,v1=...]". */
export function signPayload(payload: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}

export function verifyWebhook(payload: string, header: string | null, secret: string, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)): any {
  if (!header) throw new BillingError("Missing Stripe-Signature header.", 400);
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!t || !sigs.length) throw new BillingError("Malformed Stripe-Signature header.", 400);
  if (Math.abs(nowSec - t) > toleranceSec) throw new BillingError("Stripe-Signature timestamp outside tolerance.", 400);
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  const ok = sigs.some((s) => { const b = Buffer.from(s); return b.length === expected.length && timingSafeEqual(b, expected); });
  if (!ok) throw new BillingError("Stripe signature does not match.", 400);
  try { return JSON.parse(payload); } catch { throw new BillingError("Webhook body is not JSON.", 400); }
}


const iso = (sec: number | null | undefined) => (sec ? new Date(sec * 1000).toISOString() : null);

interface Parsed { plan: PlanId; interval: Interval | null; basePrice: string | null; overagePrice: string | null; extraBots: number; dedicatedNumbers: number; periodEnd: number | null }
/** Read plan, interval and add-ons off the subscription items (by price lookup_key, then price/subscription metadata). */
export function parseSubscription(sub: any): Parsed {
  const out: Parsed = { plan: "free", interval: null, basePrice: null, overagePrice: null, extraBots: 0, dedicatedNumbers: 0, periodEnd: sub?.current_period_end ?? null };
  for (const item of sub?.items?.data ?? []) {
    const price = item.price ?? {};
    const key: string = price.lookup_key ?? "";
    const qty = Number(item.quantity ?? 1);
    if (key === ADDONS.extraBot.lookupKey || price.metadata?.addon === "extra_bot") { out.extraBots += qty; continue; }
    if (key === ADDONS.dedicatedNumber.lookupKey || price.metadata?.addon === "dedicated_number") { out.dedicatedNumbers += qty; continue; }
    const plan = Object.values(PLANS).find((p) => p.lookupKeys && Object.values(p.lookupKeys).includes(key));
    const isOverage = (plan && plan.lookupKeys!.overage === key) || price.metadata?.kind === "overage" || price.recurring?.usage_type === "metered";
    if (isOverage) { out.overagePrice = price.id ?? null; continue; }
    out.plan = plan?.id ?? asPlanId(price.metadata?.plan ?? sub?.metadata?.plan);
    out.interval = key.endsWith("_yearly") || price.recurring?.interval === "year" ? "year" : "month";
    out.basePrice = price.id ?? null;
    out.periodEnd = item.current_period_end ?? out.periodEnd;
  }
  if (!out.basePrice) out.plan = asPlanId(sub?.metadata?.plan);
  return out;
}

function userForCustomer(customerId: string | null | undefined, metaUserId?: string | null): string | undefined {
  if (metaUserId && get("SELECT 1 FROM users WHERE id=?", [metaUserId])) return metaUserId;
  if (!customerId) return undefined;
  return get<{ user_id: string }>("SELECT user_id FROM subscriptions WHERE stripe_customer_id=?", [customerId])?.user_id;
}

function applySubscription(sub: any, eventCreated: number, deleted: boolean): string {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const userId = userForCustomer(customer, sub.metadata?.user_id);
  if (!userId) return "ignored: unknown customer";
  const prev = subscriptionRow(userId) as any;
  if (prev && prev.stripe_subscription_id === sub.id && prev.last_event_created > eventCreated) return "ignored: stale event";
  // A different, older subscription ending must not cancel the one that is live now.
  if (deleted && prev?.stripe_subscription_id && prev.stripe_subscription_id !== sub.id && PAID_STATUSES.has(prev.status)) return "ignored: not the current subscription";
  const status = deleted ? "canceled" : String(sub.status ?? "active");
  const p = parseSubscription(sub);
  // past_due keeps the plan (Stripe retries the card); canceled/unpaid/incomplete* end it.
  const applied: PlanId = PAID_STATUSES.has(status) ? p.plan : "free";
  tx(() => {
    run(`INSERT INTO subscriptions(user_id, stripe_customer_id, stripe_subscription_id, plan, interval, status, price_id, overage_price_id, extra_bots,
           dedicated_numbers, current_period_end, cancel_at_period_end, last_event_created, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id, stripe_subscription_id=excluded.stripe_subscription_id,
           plan=excluded.plan, interval=excluded.interval, status=excluded.status, price_id=excluded.price_id, overage_price_id=excluded.overage_price_id,
           extra_bots=excluded.extra_bots, dedicated_numbers=excluded.dedicated_numbers, current_period_end=excluded.current_period_end,
           cancel_at_period_end=excluded.cancel_at_period_end, last_event_created=excluded.last_event_created, updated_at=excluded.updated_at,
           payment_failed_at=CASE WHEN excluded.status IN ('active','trialing') THEN NULL ELSE subscriptions.payment_failed_at END`,
      [userId, customer ?? null, sub.id, p.plan, p.interval, status, p.basePrice, p.overagePrice, p.extraBots, p.dedicatedNumbers,
        iso(p.periodEnd), sub.cancel_at_period_end || sub.cancel_at ? 1 : 0, eventCreated]);
    // Scale is contracted and set by hand (users.plan='scale'); Stripe events never move it.
    run("UPDATE users SET plan=? WHERE id=? AND plan NOT IN ('scale','business')", [applied, userId]);
  });
  logEvent(null, "billing_subscription", { userId, subscription: sub.id, status, plan: applied, interval: p.interval });
  if (p.dedicatedNumbers) logEvent(null, "billing_dedicated_number", { userId, quantity: p.dedicatedNumbers });
  return `${userId} → ${applied} (${status})`;
}

/** Apply one verified event. Idempotent: an event id is processed once. */
export function handleStripeEvent(event: any): { handled: boolean; result: string } {
  if (!event?.id || !event?.type) throw new BillingError("Not a Stripe event.", 400);
  const fresh = run("INSERT INTO stripe_events(id, type, created) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING", [event.id, event.type, event.created ?? null]);
  if (Number(fresh.changes) !== 1) return { handled: false, result: "duplicate" };
  const obj = event.data?.object ?? {};
  const created = Number(event.created ?? 0);
  let result = "ignored";
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = obj.client_reference_id || obj.metadata?.user_id;
        if (userId && obj.customer && get("SELECT 1 FROM users WHERE id=?", [userId])) {
          run(`INSERT INTO subscriptions(user_id, stripe_customer_id, stripe_subscription_id) VALUES (?,?,?)
               ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id,
                 stripe_subscription_id=COALESCE(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id), updated_at=datetime('now')`,
            [userId, obj.customer, obj.subscription ?? null]);
          result = `linked ${userId}`;
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.resumed":
      case "customer.subscription.paused":
        result = applySubscription(obj, created, false);
        break;
      case "customer.subscription.deleted":
        result = applySubscription(obj, created, true);
        break;
      case "invoice.payment_failed": {
        const userId = userForCustomer(obj.customer);
        if (userId) {
          run("UPDATE subscriptions SET payment_failed_at=datetime('now'), updated_at=datetime('now') WHERE user_id=?", [userId]);
          logEvent(null, "billing_payment_failed", { userId, invoice: obj.id, attempt: obj.attempt_count ?? null });
          result = `payment failed for ${userId}`;
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const userId = userForCustomer(obj.customer);
        if (userId) { run("UPDATE subscriptions SET payment_failed_at=NULL, updated_at=datetime('now') WHERE user_id=?", [userId]); result = `paid ${userId}`; }
        break;
      }
    }
  } catch (e) {
    run("DELETE FROM stripe_events WHERE id=?", [event.id]);   // let Stripe's retry try again
    throw e;
  }
  run("UPDATE stripe_events SET result=? WHERE id=?", [result.slice(0, 200), event.id]);
  return { handled: result !== "ignored", result };
}

// ───────── One-time setup: meter, products, prices, portal ─────────
type PriceSpec = { lookupKey: string; product: string; productKey: string; productDescription: string; unitAmount: number; interval: Interval; metered?: boolean; metadata: Record<string, string> };

export function catalogSpec(): PriceSpec[] {
  const specs: PriceSpec[] = [];
  for (const p of Object.values(PLANS)) {
    if (!p.selfServe || !p.lookupKeys || !p.priceUsd) continue;
    const product = `Threadline ${p.name}`;
    specs.push({ lookupKey: p.lookupKeys.month, product, productKey: p.id, productDescription: p.blurb, unitAmount: p.priceUsd * 100, interval: "month", metadata: { plan: p.id, kind: "base" } });
    if (p.yearlyPerMonthUsd) specs.push({ lookupKey: p.lookupKeys.year, product, productKey: p.id, productDescription: p.blurb, unitAmount: p.yearlyPerMonthUsd * 12 * 100, interval: "year", metadata: { plan: p.id, kind: "base" } });
    if (p.overageUsd !== null) specs.push({ lookupKey: p.lookupKeys.overage, product: `Threadline ${p.name} extra conversations`, productKey: `${p.id}_overage`,
      productDescription: `Conversations past the ${p.includedConversations} included each month, $${p.overageUsd.toFixed(2)} each.`,
      unitAmount: Math.round(p.overageUsd * 100), interval: "month", metered: true, metadata: { plan: p.id, kind: "overage" } });
  }
  specs.push({ lookupKey: ADDONS.extraBot.lookupKey, product: "Threadline extra bot", productKey: "extra_bot", productDescription: "One more bot on Starter or Growth.", unitAmount: ADDONS.extraBot.priceUsd * 100, interval: "month", metadata: { addon: "extra_bot" } });
  specs.push({ lookupKey: ADDONS.dedicatedNumber.lookupKey, product: "Threadline dedicated iMessage number", productKey: "dedicated_number", productDescription: "Your own iMessage number customers can text first.", unitAmount: ADDONS.dedicatedNumber.priceUsd * 100, interval: "month", metadata: { addon: "dedicated_number" } });
  return specs;
}

export async function setupStripeCatalog(log: (s: string) => void = console.log): Promise<{ meter: string; prices: Record<string, string>; portalConfiguration: string }> {
  // 1. Meter for overage conversations (sum of payload.value per customer).
  const meters = await stripe<{ data: { id: string; event_name: string; status?: string }[] }>("GET", "/v1/billing/meters", { limit: 100 });
  let meter = meters.data.find((m) => m.event_name === meterEventName() && m.status !== "inactive")?.id;
  if (meter) log(`meter ${meterEventName()} exists: ${meter}`);
  else {
    meter = (await stripe<{ id: string }>("POST", "/v1/billing/meters", {
      display_name: "Threadline overage conversations", event_name: meterEventName(),
      default_aggregation: { formula: "sum" }, customer_mapping: { type: "by_id", event_payload_key: "stripe_customer_id" },
      value_settings: { event_payload_key: "value" },
    }, { idempotencyKey: `meter:${meterEventName()}:v1` })).id;
    log(`created meter ${meter}`);
  }
  // 2. Products + prices, found by lookup_key so re-runs create nothing.
  const prices: Record<string, string> = {};
  const products = new Map<string, string>();
  for (const s of catalogSpec()) {
    const found = await priceByLookupKey(s.lookupKey);
    if (found) { prices[s.lookupKey] = found.id; log(`price ${s.lookupKey} exists: ${found.id}`); continue; }
    let product = products.get(s.productKey);
    if (!product) {
      product = (await stripe<{ id: string }>("POST", "/v1/products", {
        name: s.product, description: s.productDescription, metadata: { threadline: s.productKey }, tax_code: "txcd_10103001",   // SaaS, business use
      }, { idempotencyKey: `product:${s.productKey}:v1` })).id;
      products.set(s.productKey, product);
    }
    const price = await stripe<{ id: string }>("POST", "/v1/prices", {
      product, currency: "usd", unit_amount: s.unitAmount, lookup_key: s.lookupKey, tax_behavior: "exclusive", metadata: s.metadata,
      recurring: s.metered ? { interval: s.interval, usage_type: "metered", meter } : { interval: s.interval },
    }, { idempotencyKey: `price:${s.lookupKey}:v1` });
    prices[s.lookupKey] = price.id;
    log(`created price ${price.id} (${s.lookupKey}, ${(s.unitAmount / 100).toFixed(2)} USD / ${s.metered ? "conversation, billed monthly" : s.interval})`);
  }
  // 3. Customer Portal: card, invoices, tax ids, cancel at period end. Plan switches go through changePlan() instead
  //    (subscriptions carry a metered overage item next to the base price).
  const configs = await stripe<{ data: { id: string; metadata?: Record<string, string> }[] }>("GET", "/v1/billing_portal/configurations", { active: true, limit: 100 });
  let portal = configs.data.find((c) => c.metadata?.threadline === "1")?.id;
  if (portal) log(`portal configuration exists: ${portal}`);
  else {
    portal = (await stripe<{ id: string }>("POST", "/v1/billing_portal/configurations", {
      business_profile: { headline: "Threadline billing" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
        subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] } },
      },
      metadata: { threadline: "1" },
    }, { idempotencyKey: "portal:v1" })).id;
    log(`created portal configuration ${portal}`);
  }
  return { meter, prices, portalConfiguration: portal };
}
