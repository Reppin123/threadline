// Billing tests: plan limits, webhook replay with Stripe-style signed fixtures, and the Stripe client against a local
// fake Stripe API (setup script idempotency, checkout + portal request shapes, live-key refusal). No network, no keys.
//   node --experimental-strip-types packages/core/src/billing-test.ts
import { createServer } from "node:http";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const DB = `/tmp/tl-billing-test-${process.pid}.db`;
for (const f of [DB, DB + "-wal", DB + "-shm"]) rmSync(f, { force: true });
process.env.THREADLINE_DB = DB;
delete process.env.BILLING_DEFAULT_PLAN;
delete process.env.STRIPE_SECRET_KEY;

const { run, get, id } = await import("@threadline/db");
const B = await import("./billing.ts");
const S = await import("./billing-stripe.ts");

let passed = 0;
const failures: string[] = [];
async function t(name: string, fn: () => unknown | Promise<unknown>) {
  try { await fn(); passed++; console.log(`  ok   ${name}`); }
  catch (e) { failures.push(name); console.log(`  FAIL ${name}\n       ${(e as Error).stack?.split("\n").slice(0, 3).join("\n       ")}`); }
}

function mkUser(plan = "free") {
  const uid = id("usr_");
  run("INSERT INTO users(id,email,plan) VALUES (?,?,?)", [uid, `${uid}@billing.test`, plan]);
  return uid;
}
function mkBot(uid: string, name = "Sanitea") {
  const bid = id("bot_");
  run("INSERT INTO bots(id,user_id,name,slug,join_code,source_kind,source_json) VALUES (?,?,?,?,?,?,?)", [bid, uid, name, bid.toLowerCase(), bid.toLowerCase(), "idea", "{}"]);
  return bid;
}

console.log("billing: plan limits");
await t("free plan: 100 messages, the 101st is blocked and counted as blocked", () => {
  const u = mkUser(); const b = mkBot(u);
  for (let i = 0; i < 100; i++) assert.equal(B.consumeMessage(b, "telegram").ok, true, `message ${i + 1}`);
  const g = B.consumeMessage(b, "telegram");
  assert.equal(g.ok, false);
  assert.equal(!g.ok && g.reason, "quota");
  const s = B.usageSummary(u);
  assert.equal(s.used, 100); assert.equal(s.blocked, 1); assert.equal(s.over, true); assert.equal(s.pct, 100);
  assert.equal(get("SELECT 1 FROM events WHERE bot_id=? AND type='quota_exceeded'", [b]) !== undefined, true);
  assert.equal(get("SELECT 1 FROM events WHERE bot_id=? AND type='quota_warning'", [b]) !== undefined, true, "80% warning logged");
});
await t("near-limit flag at 80%", () => {
  const u = mkUser(); const b = mkBot(u);
  for (let i = 0; i < 80; i++) B.consumeMessage(b, "telegram");
  const s = B.usageSummary(u);
  assert.equal(s.nearLimit, true); assert.equal(s.over, false); assert.equal(s.left, 20);
});
await t("free plan: iMessage is gated (connect + inbound), Telegram allowed", () => {
  const u = mkUser(); const b = mkBot(u);
  assert.equal(B.canUseChannel(u, "imessage").ok, false);
  assert.match((B.canUseChannel(u, "imessage") as any).message, /Pro plan/);
  assert.equal(B.canUseChannel(u, "telegram").ok, true);
  const g = B.consumeMessage(b, "imessage");
  assert.equal(!g.ok && g.reason, "channel");
  assert.equal(B.messagesUsed(u), 0, "a gated message is not counted");
});
await t("pro plan: iMessage allowed, 2,000 messages, 3 bots", () => {
  const u = mkUser("pro"); const b = mkBot(u);
  assert.equal(B.consumeMessage(b, "imessage").ok, true);
  run("UPDATE message_counters SET messages=1999 WHERE user_id=?", [u]);
  assert.equal(B.consumeMessage(b, "imessage").ok, true);
  assert.equal(B.consumeMessage(b, "imessage").ok, false);
  mkBot(u, "Two"); assert.equal(B.canCreateBot(u).ok, true);
  mkBot(u, "Three"); assert.equal(B.canCreateBot(u).ok, false);
});
await t("bots per plan: free allows 1", () => {
  const u = mkUser();
  assert.equal(B.canCreateBot(u).ok, true);
  mkBot(u);
  const g = B.canCreateBot(u);
  assert.equal(g.ok, false); assert.match((g as any).message, /1 bot\./);
});
await t("business (granted by hand) is unlimited", () => {
  const u = mkUser("business"); const b = mkBot(u);
  run("INSERT INTO message_counters(user_id,period,messages) VALUES (?,?,?)", [u, B.periodKey(), 1_000_000]);
  assert.equal(B.consumeMessage(b, "imessage").ok, true);
  assert.equal(B.usageSummary(u).limit, null);
  assert.equal(B.canCreateBot(u).ok, true);
});
await t("BILLING_DEFAULT_PLAN lifts free users but never lowers paid ones", () => {
  const u = mkUser(); const p = mkUser("business");
  process.env.BILLING_DEFAULT_PLAN = "pro";
  try {
    assert.equal(B.planOf(u).id, "pro");
    assert.equal(B.planOf(p).id, "business");
  } finally { delete process.env.BILLING_DEFAULT_PLAN; }
  assert.equal(B.planOf(u).id, "free");
});
await t("unknown plan strings fall back to free", () => {
  const u = mkUser("platinum");
  assert.equal(B.planOf(u).id, "free");
});
await t("counters are per calendar month (UTC)", () => {
  assert.equal(B.periodKey(new Date("2026-10-31T23:59:59Z")), "2026-10");
  assert.equal(B.periodKey(new Date("2026-11-01T00:00:00Z")), "2026-11");
  assert.equal(B.periodResetsAt(new Date("2026-12-15T10:00:00Z")), "2027-01-01T00:00:00.000Z");
  const u = mkUser(); const b = mkBot(u);
  run("INSERT INTO message_counters(user_id,period,messages) VALUES (?,?,?)", [u, "2020-01", 100]);
  assert.equal(B.consumeMessage(b, "telegram").ok, true, "last month's usage doesn't count");
});
await t("over-limit notice goes to a customer once per day, copy has no em dashes", () => {
  const u = mkUser(); const b = mkBot(u);
  const first = B.overLimitReply(b, "+15551230000", "Sanitea", "quota");
  assert.ok(first && /monthly message limit/.test(first));
  assert.equal(B.overLimitReply(b, "+15551230000", "Sanitea", "quota"), null);
  assert.ok(B.overLimitReply(b, "+15551230001", "Sanitea", "quota"));
  assert.ok(!/—/.test(first!));
  assert.ok(!/—/.test(B.overLimitReply(b, "x", "Sanitea", "channel")!));
});
await t("usage summary flags bots live on a channel the plan lacks (downgrade)", () => {
  const u = mkUser(); const b = mkBot(u);
  run("INSERT INTO channels(bot_id,channel,status) VALUES (?,?,?)", [b, "imessage", "live"]);
  assert.equal(B.usageSummary(u).imessageBotsOffPlan, 1);
});
await t("concurrent consumption never exceeds the limit", async () => {
  const u = mkUser(); const b = mkBot(u);
  const results = await Promise.all(Array.from({ length: 150 }, async () => B.consumeMessage(b, "telegram").ok));
  assert.equal(results.filter(Boolean).length, 100);
  assert.equal(B.messagesUsed(u), 100);
});

console.log("billing: webhook replay (Stripe-style signed fixtures)");
const here = dirname(fileURLToPath(import.meta.url));
const SECRET = "whsec_test_" + "x".repeat(24);
const fixtureUser = mkUser();
mkBot(fixtureUser);
const raw = readFileSync(join(here, "billing-fixtures/events.json"), "utf8").replaceAll("{{USER_ID}}", fixtureUser);
const events = JSON.parse(raw) as any[];
const now = Math.floor(Date.now() / 1000);
const deliver = (ev: any, secret = SECRET, ts = now) => {
  const payload = JSON.stringify(ev, null, 2);   // Stripe sends pretty JSON; the signature covers exact bytes
  const header = S.signPayload(payload, secret, ts);
  return S.handleStripeEvent(S.verifyWebhook(payload, header, SECRET, 300, now));
};
const sub = () => get<any>("SELECT * FROM subscriptions WHERE user_id=?", [fixtureUser]);
const plan = () => get<{ plan: string }>("SELECT plan FROM users WHERE id=?", [fixtureUser])!.plan;

await t("checkout.session.completed links the Stripe customer to the user", () => {
  const r = deliver(events[0]);
  assert.equal(r.handled, true);
  assert.equal(sub().stripe_customer_id, "cus_TLtest0001");
  assert.equal(plan(), "free", "plan changes on the subscription event, not checkout");
});
await t("customer.subscription.created → Pro, period end stored, iMessage unlocked", () => {
  deliver(events[1]);
  assert.equal(plan(), "pro");
  assert.equal(sub().status, "active");
  assert.equal(sub().price_id, "price_TLpro");
  assert.equal(sub().current_period_end, new Date(1793778401 * 1000).toISOString());
  assert.equal(B.canUseChannel(fixtureUser, "imessage").ok, true);
});
await t("duplicate delivery is a no-op", () => {
  assert.deepEqual(deliver(events[1]), { handled: false, result: "duplicate" });
});
await t("invoice.payment_failed flags the account; past_due keeps Pro (Stripe retries)", () => {
  deliver(events[2]);
  assert.ok(sub().payment_failed_at);
  deliver(events[3]);
  assert.equal(sub().status, "past_due");
  assert.equal(plan(), "pro");
});
await t("invoice.paid clears the flag; cancel_at_period_end recorded", () => {
  deliver(events[4]);
  assert.equal(sub().payment_failed_at, null);
  deliver(events[5]);
  assert.equal(sub().status, "active");
  assert.equal(sub().cancel_at_period_end, 1);
});
await t("customer.subscription.deleted → back to Free", () => {
  deliver(events[6]);
  assert.equal(sub().status, "canceled");
  assert.equal(plan(), "free");
  assert.equal(B.canUseChannel(fixtureUser, "imessage").ok, false);
});
await t("an older event replayed late (new id) does not resurrect the subscription", () => {
  const late = structuredClone(events[1]); late.id = "evt_late_replay"; late.type = "customer.subscription.updated";
  assert.equal(deliver(late).result, "ignored: stale event");
  assert.equal(plan(), "free");
});
await t("deleting an old subscription doesn't cancel the current one", () => {
  const u = mkUser();
  run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,plan,status) VALUES (?,?,?,?,?)", [u, "cus_two", "sub_new", "pro", "active"]);
  run("UPDATE users SET plan='pro' WHERE id=?", [u]);
  const old = structuredClone(events[6]); old.id = "evt_old_sub_deleted"; old.data.object.id = "sub_old"; old.data.object.customer = "cus_two"; old.data.object.metadata = {};
  assert.equal(deliver(old).result, "ignored: not the current subscription");
  assert.equal(B.planOf(u).id, "pro");
});
await t("business users are never downgraded by Stripe events", () => {
  const u = mkUser("business");
  run("INSERT INTO subscriptions(user_id,stripe_customer_id) VALUES (?,?)", [u, "cus_biz"]);
  const ev = structuredClone(events[6]); ev.id = "evt_biz_deleted"; ev.data.object.id = "sub_biz"; ev.data.object.customer = "cus_biz"; ev.data.object.metadata = {};
  deliver(ev);
  assert.equal(B.planOf(u).id, "business");
});
await t("events for unknown customers are acknowledged and ignored", () => {
  const ev = structuredClone(events[1]); ev.id = "evt_unknown_cus"; ev.data.object.customer = "cus_nobody"; ev.data.object.metadata = {};
  assert.equal(deliver(ev).result, "ignored: unknown customer");
});
await t("bad signature, wrong secret, stale timestamp and missing header are rejected", () => {
  const payload = JSON.stringify(events[1]);
  assert.throws(() => S.verifyWebhook(payload, S.signPayload(payload, "whsec_wrong"), SECRET), /does not match/);
  assert.throws(() => S.verifyWebhook(payload + " ", S.signPayload(payload, SECRET), SECRET), /does not match/);
  assert.throws(() => S.verifyWebhook(payload, S.signPayload(payload, SECRET, now - 600), SECRET, 300, now), /tolerance/);
  assert.throws(() => S.verifyWebhook(payload, null, SECRET), /Missing/);
  assert.throws(() => S.verifyWebhook(payload, "garbage", SECRET), /Malformed/);
});
await t("a header with several v1 signatures (secret rotation) verifies if any matches", () => {
  const payload = JSON.stringify({ id: "evt_rot", type: "ping" });
  const good = S.signPayload(payload, SECRET, now);
  const header = `t=${now},v1=${"0".repeat(64)},${good.split(",")[1]}`;
  assert.equal(S.verifyWebhook(payload, header, SECRET, 300, now).id, "evt_rot");
});

console.log("billing: Stripe client against a fake Stripe API");
type Req = { method: string; path: string; query: URLSearchParams; body: URLSearchParams; auth: string; idem: string | null };
const reqs: Req[] = [];
const store = { prices: [] as any[], products: [] as any[], portals: [] as any[], customers: [] as any[] };
const server = createServer((req, res) => {
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => {
    const u = new URL(req.url!, "http://x");
    const r: Req = { method: req.method!, path: u.pathname, query: u.searchParams, body: new URLSearchParams(data), auth: String(req.headers.authorization), idem: (req.headers["idempotency-key"] as string) ?? null };
    reqs.push(r);
    const send = (code: number, j: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(j)); };
    if (r.auth !== "Bearer sk_test_fake") return send(401, { error: { message: "Invalid API Key provided" } });
    const k = `${r.method} ${r.path}`;
    if (k === "GET /v1/prices") return send(200, { data: store.prices.filter((p) => p.lookup_key === r.query.get("lookup_keys[0]")) });
    if (k === "POST /v1/products") { const p = { id: `prod_${store.products.length + 1}`, name: r.body.get("name") }; store.products.push(p); return send(200, p); }
    if (k === "POST /v1/prices") { const p = { id: `price_${store.prices.length + 1}`, lookup_key: r.body.get("lookup_key"), unit_amount: Number(r.body.get("unit_amount")) }; store.prices.push(p); return send(200, p); }
    if (k === "GET /v1/billing_portal/configurations") return send(200, { data: store.portals });
    if (k === "POST /v1/billing_portal/configurations") { const p = { id: `bpc_${store.portals.length + 1}`, metadata: { threadline: r.body.get("metadata[threadline]") } }; store.portals.push(p); return send(200, p); }
    if (k === "POST /v1/customers") { const c = { id: `cus_fake${store.customers.length + 1}`, email: r.body.get("email") }; store.customers.push(c); return send(200, c); }
    if (k === "POST /v1/checkout/sessions") return send(200, { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    if (k === "POST /v1/billing_portal/sessions") return send(200, { id: "bps_1", url: "https://billing.stripe.com/p/session/test_1" });
    send(404, { error: { message: `no route ${k}` } });
  });
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
process.env.STRIPE_API_BASE = `http://127.0.0.1:${(server.address() as any).port}`;

await t("without STRIPE_SECRET_KEY: not configured, calls refuse with 503", async () => {
  assert.equal(S.stripeConfigured(), false);
  assert.equal(S.stripeMode(), "off");
  await assert.rejects(() => S.priceForPlan("pro"), (e: any) => e.status === 503);
});
await t("live keys are refused unless STRIPE_ALLOW_LIVE=1", () => {
  process.env.STRIPE_SECRET_KEY = "sk_live_fake";
  assert.equal(S.stripeConfigured(), false);
  process.env.STRIPE_ALLOW_LIVE = "1";
  assert.equal(S.stripeMode(), "live");
  delete process.env.STRIPE_ALLOW_LIVE;
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  assert.equal(S.stripeMode(), "test");
});
await t("setup script creates product, $29 price (lookup_key) and portal config; second run creates nothing", async () => {
  const r1 = await S.setupStripeCatalog(() => {});
  assert.equal(store.products.length, 1); assert.equal(store.prices.length, 1); assert.equal(store.portals.length, 1);
  assert.equal(store.prices[0].unit_amount, 2900);
  assert.equal(store.prices[0].lookup_key, "threadline_pro_monthly");
  const pricePost = reqs.find((q) => q.method === "POST" && q.path === "/v1/prices")!;
  assert.equal(pricePost.body.get("recurring[interval]"), "month");
  assert.equal(pricePost.body.get("currency"), "usd");
  assert.ok(pricePost.idem, "idempotency key sent");
  const r2 = await S.setupStripeCatalog(() => {});
  assert.deepEqual(r2, r1);
  assert.equal(store.products.length, 1); assert.equal(store.prices.length, 1); assert.equal(store.portals.length, 1);
});
await t("checkout: creates the customer once, sends price + user metadata, returns the Stripe URL", async () => {
  const u = mkUser();
  const url = await S.createCheckoutSession({ id: u, email: `${u}@billing.test` }, "pro", "https://app.example");
  assert.equal(url, "https://checkout.stripe.com/c/pay/cs_test_1");
  const cs = reqs.findLast((q) => q.path === "/v1/checkout/sessions")!;
  assert.equal(cs.body.get("mode"), "subscription");
  assert.equal(cs.body.get("line_items[0][price]"), "price_1");
  assert.equal(cs.body.get("client_reference_id"), u);
  assert.equal(cs.body.get("subscription_data[metadata][user_id]"), u);
  assert.equal(cs.body.get("success_url"), "https://app.example/billing?checkout=success");
  assert.equal(get<any>("SELECT stripe_customer_id FROM subscriptions WHERE user_id=?", [u]).stripe_customer_id, "cus_fake1");
  await S.createCheckoutSession({ id: u, email: `${u}@billing.test` }, "pro", "https://app.example");
  assert.equal(store.customers.length, 1, "customer reused");
});
await t("checkout refuses Business (sales-led) and an already-active subscription", async () => {
  const u = mkUser();
  await assert.rejects(() => S.createCheckoutSession({ id: u, email: "b@x.test" }, "business", "https://app.example"), /not sold through checkout/);
  run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,status,plan) VALUES (?,?,?,?,?)", [u, "cus_x", "sub_x", "active", "pro"]);
  await assert.rejects(() => S.createCheckoutSession({ id: u, email: "b@x.test" }, "pro", "https://app.example"), /already have a subscription/);
});
await t("portal: uses the Threadline portal configuration and returns to /billing", async () => {
  const u = mkUser();
  await assert.rejects(() => S.createPortalSession(u, "https://app.example"), /Upgrade first/);
  run("INSERT INTO subscriptions(user_id,stripe_customer_id) VALUES (?,?)", [u, "cus_portal"]);
  const url = await S.createPortalSession(u, "https://app.example");
  assert.equal(url, "https://billing.stripe.com/p/session/test_1");
  const ps = reqs.findLast((q) => q.path === "/v1/billing_portal/sessions")!;
  assert.equal(ps.body.get("customer"), "cus_portal");
  assert.equal(ps.body.get("configuration"), "bpc_1");
  assert.equal(ps.body.get("return_url"), "https://app.example/billing");
});
await t("Stripe API errors surface as BillingError with Stripe's message", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_wrong";
  await assert.rejects(() => S.priceForPlan("pro"), (e: any) => e instanceof S.BillingError && /Invalid API Key/.test(e.message));
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
});
await t("form encoding matches Stripe's nested format", () => {
  assert.equal(decodeURIComponent(S.formEncode({ a: 1, b: { c: "x y" }, d: [{ e: 2 }], f: ["g"], n: undefined })), "a=1&b[c]=x y&d[0][e]=2&f[0]=g");
});
server.close();

for (const f of [DB, DB + "-wal", DB + "-shm"]) rmSync(f, { force: true });
console.log(`\nbilling: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log("failed:", failures.join("; ")); process.exit(1); }
