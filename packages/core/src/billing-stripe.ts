// Stripe over plain fetch (no SDK dependency): checkout, customer portal, webhook verification and subscription sync.
// Keys come only from env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET). Live keys are refused unless STRIPE_ALLOW_LIVE=1.
import { createHmac, timingSafeEqual } from "node:crypto";
import { get, run, tx, logEvent } from "@threadline/db";
import { PLANS, asPlanId, type PlanId } from "./billing.ts";

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
export async function priceForPlan(plan: PlanId): Promise<{ id: string }> {
  const key = PLANS[plan].lookupKey;
  if (!key) throw new BillingError(`The ${PLANS[plan].name} plan is not sold through checkout. Email hello@threadline.app.`);
  const r = await stripe<{ data: { id: string }[] }>("GET", "/v1/prices", { lookup_keys: [key], active: true, limit: 1 });
  if (!r.data[0]) throw new BillingError(`No Stripe price with lookup_key ${key}. Run the billing setup script first.`, 503);
  return r.data[0];
}

export function subscriptionRow(userId: string) {
  return get<{ user_id: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; plan: string; status: string; current_period_end: string | null; cancel_at_period_end: number; payment_failed_at: string | null }>(
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

export async function createCheckoutSession(user: { id: string; email: string; name?: string | null }, plan: PlanId, appUrl: string): Promise<string> {
  const sub = subscriptionRow(user.id);
  if (sub && PAID_STATUSES.has(sub.status) && sub.stripe_subscription_id) throw new BillingError("You already have a subscription. Use Manage billing to change it.");
  const price = await priceForPlan(plan);
  const customer = await ensureCustomer(user);
  const s = await stripe<{ url: string }>("POST", "/v1/checkout/sessions", {
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    automatic_tax: process.env.STRIPE_AUTOMATIC_TAX === "1" ? { enabled: true } : undefined,
    customer_update: process.env.STRIPE_AUTOMATIC_TAX === "1" ? { address: "auto" } : undefined,
    subscription_data: { metadata: { user_id: user.id, plan } },
    metadata: { user_id: user.id, plan },
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

/** STRIPE_PORTAL_CONFIGURATION, else the one the setup script made (metadata.threadline=1), else Stripe's default. */
async function portalConfiguration(): Promise<string | undefined> {
  if (process.env.STRIPE_PORTAL_CONFIGURATION) return process.env.STRIPE_PORTAL_CONFIGURATION;
  const configs = await stripe<{ data: { id: string; metadata?: Record<string, string> }[] }>("GET", "/v1/billing_portal/configurations", { active: true, limit: 100 });
  return configs.data.find((c) => c.metadata?.threadline === "1")?.id;
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

function planFromSubscription(sub: any): PlanId {
  const item = sub?.items?.data?.[0];
  const price = item?.price ?? sub?.plan ?? {};
  const byKey = (Object.values(PLANS).find((p) => p.lookupKey && p.lookupKey === price.lookup_key))?.id;
  return byKey ?? asPlanId(price?.metadata?.plan ?? sub?.metadata?.plan);
}

function userForCustomer(customerId: string | null | undefined, metaUserId?: string | null): string | undefined {
  if (metaUserId && get("SELECT 1 FROM users WHERE id=?", [metaUserId])) return metaUserId;
  if (!customerId) return undefined;
  return get<{ user_id: string }>("SELECT user_id FROM subscriptions WHERE stripe_customer_id=?", [customerId])?.user_id;
}

/** Plan to apply for a Stripe subscription status. past_due keeps the plan (Stripe retries the card); anything else ends it. */
function effectivePlan(status: string, plan: PlanId): PlanId {
  return PAID_STATUSES.has(status) ? plan : "free";
}

function applySubscription(sub: any, eventCreated: number, deleted: boolean): string {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const userId = userForCustomer(customer, sub.metadata?.user_id);
  if (!userId) return "ignored: unknown customer";
  const prev = subscriptionRow(userId) as any;
  if (prev && prev.last_event_created > eventCreated && prev.stripe_subscription_id === sub.id) return "ignored: stale event";
  // A different, older subscription ending must not cancel the one that is live now.
  if (deleted && prev?.stripe_subscription_id && prev.stripe_subscription_id !== sub.id && PAID_STATUSES.has(prev.status)) return "ignored: not the current subscription";
  const status = deleted ? "canceled" : String(sub.status ?? "active");
  const plan = planFromSubscription(sub);
  const item = sub.items?.data?.[0];
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  const applied = effectivePlan(status, plan);
  tx(() => {
    run(`INSERT INTO subscriptions(user_id, stripe_customer_id, stripe_subscription_id, plan, status, price_id, current_period_end, cancel_at_period_end, last_event_created, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id, stripe_subscription_id=excluded.stripe_subscription_id,
           plan=excluded.plan, status=excluded.status, price_id=excluded.price_id, current_period_end=excluded.current_period_end,
           cancel_at_period_end=excluded.cancel_at_period_end, last_event_created=excluded.last_event_created, updated_at=excluded.updated_at,
           payment_failed_at=CASE WHEN excluded.status IN ('active','trialing') THEN NULL ELSE subscriptions.payment_failed_at END`,
      [userId, customer ?? null, sub.id, plan, status, item?.price?.id ?? null, iso(periodEnd), sub.cancel_at_period_end ? 1 : 0, eventCreated]);
    // Business is granted by hand (users.plan='business'); Stripe never downgrades it.
    run("UPDATE users SET plan=? WHERE id=? AND plan<>'business'", [applied, userId]);
  });
  logEvent(null, "billing_subscription", { userId, subscription: sub.id, status, plan: applied });
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

// ───────── One-time setup (products, prices, portal) ─────────
export async function setupStripeCatalog(log: (s: string) => void = console.log): Promise<{ prices: Record<string, string>; portalConfiguration: string }> {
  const prices: Record<string, string> = {};
  for (const plan of Object.values(PLANS)) {
    if (!plan.lookupKey || !plan.priceUsd) continue;
    const found = await stripe<{ data: { id: string }[] }>("GET", "/v1/prices", { lookup_keys: [plan.lookupKey], limit: 1 });
    if (found.data[0]) { prices[plan.id] = found.data[0].id; log(`price ${plan.lookupKey} exists: ${found.data[0].id}`); continue; }
    const product = await stripe<{ id: string }>("POST", "/v1/products", {
      name: `Threadline ${plan.name}`, description: plan.blurb, metadata: { plan: plan.id }, tax_code: "txcd_10103001",
    }, { idempotencyKey: `product:${plan.id}:v1` });
    const price = await stripe<{ id: string }>("POST", "/v1/prices", {
      product: product.id, currency: "usd", unit_amount: Math.round(plan.priceUsd * 100), recurring: { interval: "month" },
      lookup_key: plan.lookupKey, tax_behavior: "exclusive", metadata: { plan: plan.id },
    }, { idempotencyKey: `price:${plan.lookupKey}:v1` });
    prices[plan.id] = price.id;
    log(`created ${product.id} + price ${price.id} (${plan.lookupKey}, $${plan.priceUsd}/mo)`);
  }
  const configs = await stripe<{ data: { id: string; metadata?: Record<string, string> }[] }>("GET", "/v1/billing_portal/configurations", { active: true, limit: 100 });
  let portal = configs.data.find((c) => c.metadata?.threadline === "1")?.id;
  if (portal) log(`portal configuration exists: ${portal}`);
  else {
    const c = await stripe<{ id: string }>("POST", "/v1/billing_portal/configurations", {
      business_profile: { headline: "Threadline billing" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
        subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] } },
      },
      metadata: { threadline: "1" },
    }, { idempotencyKey: "portal:v1" });
    portal = c.id;
    log(`created portal configuration ${portal}`);
  }
  return { prices, portalConfiguration: portal };
}
