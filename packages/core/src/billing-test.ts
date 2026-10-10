// Billing tests: plan limits, webhook replay with Stripe-style signed fixtures, and the Stripe client against a local
// fake Stripe API (setup idempotency, checkout/portal/plan-change request shapes, overage meter events, live-key refusal).
// No network, no keys.
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
type Admit = import("./billing.ts").Admit;
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

const { ensureCustomer } = await import("./memory.ts");
const { openConversation } = await import("./runtime.ts");

/** One bot turn the way the gateway runs it: admit → (core.chat: customer + conversation, 6h rule) → record. */
function turn(botId: string, channel: string, handle: string): Admit & { conversationId?: string } {
  const a = B.admitTurn(botId, channel, handle);
  if (!a.ok) return a;
  const conv = openConversation(botId, ensureCustomer(botId, channel, handle), channel, false);
  run("UPDATE conversations SET last_message_at=datetime('now') WHERE id=?", [conv.id]);
  if (a.billable) B.recordConversation(botId, conv.id, channel);
  return { ...a, conversationId: conv.id };
}
const ago = (convId: string, hours: number) => run("UPDATE conversations SET last_message_at=datetime('now', ?) WHERE id=?", [`-${hours} hours`, convId]);

console.log("billing: plans + conversation meter");
await t("plan table matches gtm PRICING.md §3", () => {
  const pricing = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../launch/gtm/PRICING.md"), "utf8");
  const j = JSON.parse(pricing.split("## 3.")[1]!.split("```json")[1]!.split("```")[0]!);
  for (const id of ["free", "starter", "growth", "scale"] as const) {
    const p = B.PLANS[id], g = j[id];
    assert.equal(p.priceUsd, g.price_usd, `${id} price`);
    assert.equal(p.includedConversations, g.included_conversations, `${id} included`);
    assert.equal(p.overageUsd, g.overage_usd, `${id} overage`);
    assert.equal(p.bots, g.bots, `${id} bots`);
    assert.equal(p.api, g.api, `${id} api`);
    if (g.price_usd_yearly_per_month) assert.equal(p.yearlyPerMonthUsd, g.price_usd_yearly_per_month, `${id} yearly`);
    assert.equal(p.channels.includes("imessage"), g.channels.some((c: string) => c.startsWith("imessage_") && c !== "imessage_test"), `${id} imessage`);
    assert.equal(p.channels.includes("whatsapp"), g.channels.includes("whatsapp"), `${id} whatsapp`);
  }
  assert.equal(B.ADDONS.extraBot.priceUsd, j.addons.extra_bot_usd);
  assert.equal(B.ADDONS.dedicatedNumber.priceUsd, j.addons.dedicated_imessage_number_usd);
});
await t("a conversation is counted once: follow-ups within 6h are free, after 6h of silence a new one counts", () => {
  const u = mkUser(); const b = mkBot(u);
  const first = turn(b, "telegram", "tg:1") as any;
  assert.equal(first.ok && first.billable, true);
  for (let i = 0; i < 5; i++) assert.equal((turn(b, "telegram", "tg:1") as any).billable, false, "same thread");
  assert.equal(B.conversationsUsed(u), 1);
  ago(first.conversationId, 7);
  const again = turn(b, "telegram", "tg:1") as any;
  assert.equal(again.billable, true); assert.notEqual(again.conversationId, first.conversationId);
  assert.equal(B.conversationsUsed(u), 2);
  turn(b, "telegram", "tg:2");
  assert.equal(B.conversationsUsed(u), 3, "another customer is another conversation");
});
await t("recordConversation is idempotent per conversation id", () => {
  const u = mkUser(); const b = mkBot(u);
  const r = turn(b, "telegram", "tg:x") as any;
  assert.deepEqual(B.recordConversation(b, r.conversationId, "telegram"), { counted: false, overage: false });
  assert.equal(B.conversationsUsed(u), 1);
});
await t("Free: 50 conversations then a hard stop; follow-ups in an open conversation still answered", () => {
  const u = mkUser(); const b = mkBot(u);
  for (let i = 0; i < 50; i++) assert.equal(turn(b, "telegram", `tg:${i}`).ok, true, `conversation ${i + 1}`);
  const blocked = turn(b, "telegram", "tg:new");
  assert.equal(blocked.ok, false); assert.equal(!blocked.ok && blocked.reason, "quota");
  assert.equal(turn(b, "telegram", "tg:7").ok, true, "customer mid-conversation is not cut off");
  const s = B.usageSummary(u);
  assert.equal(s.used, 50); assert.equal(s.blocked, 1); assert.equal(s.over, true); assert.equal(s.overage, 0);
  assert.ok(get("SELECT 1 FROM events WHERE bot_id=? AND type='quota_exceeded'", [b]));
  assert.ok(get("SELECT 1 FROM events WHERE bot_id=? AND type='quota_warning'", [b]), "80% warning logged");
});
await t("Free: iMessage only for the first 5 phones (never counted); the 6th is refused", () => {
  const u = mkUser(); const b = mkBot(u);
  for (let i = 1; i <= 5; i++) {
    run("INSERT INTO line_routes(channel,sender_handle,bot_id) VALUES ('imessage',?,?)", [`+1555000000${i}`, b]);
    const r = turn(b, "imessage", `+1555000000${i}`) as any;
    assert.equal(r.ok && r.billable, false, `test phone ${i}`);
    assert.equal(r.ok, true);
  }
  run("INSERT INTO line_routes(channel,sender_handle,bot_id) VALUES ('imessage',?,?)", ["+15550000006", b]);
  const sixth = turn(b, "imessage", "+15550000006");
  assert.equal(!sixth.ok && sixth.reason, "channel");
  assert.equal(B.conversationsUsed(u), 0, "test phones never count");
  assert.equal(B.canUseChannel(u, "imessage").ok, false);
  assert.match((B.canUseChannel(u, "imessage") as any).message, /Starter plan/);
  assert.equal(B.canUseChannel(u, "telegram").ok, true);
  assert.match((B.canUseChannel(u, "whatsapp") as any).message, /Growth plan/);
});
await t("Starter without a Stripe overage item (set by hand / yearly): hard stop at 300", () => {
  const u = mkUser("starter"); const b = mkBot(u);
  run("INSERT INTO usage_counters(user_id,period,conversations) VALUES (?,?,299)", [u, B.periodKey()]);
  assert.equal(turn(b, "imessage", "+1a").ok, true);
  assert.equal(turn(b, "imessage", "+1b").ok, false);
  assert.equal(B.limitsOf(u).overage, false);
});
await t("Starter with the metered overage item: past 300 keeps answering, marks overage", () => {
  const u = mkUser("starter"); const b = mkBot(u);
  run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,plan,status,overage_price_id) VALUES (?,?,?,?,?,?)", [u, "cus_ov", "sub_ov", "starter", "active", "price_ov"]);
  run("INSERT INTO usage_counters(user_id,period,conversations) VALUES (?,?,299)", [u, B.periodKey()]);
  turn(b, "imessage", "+1a");
  const r = turn(b, "imessage", "+1b") as any;
  assert.equal(r.ok && r.billable, true);
  assert.equal(get<any>("SELECT overage FROM billed_conversations WHERE conversation_id=?", [r.conversationId]).overage, 1);
  turn(b, "imessage", "+1c");
  const s = B.usageSummary(u);
  assert.equal(s.used, 302); assert.equal(s.overage, 2); assert.equal(s.overageCostUsd, 0.3); assert.equal(s.over, false);
});
await t("Growth: WhatsApp allowed, 3 bots, extra-bot add-on raises the limit", () => {
  const u = mkUser("growth");
  assert.equal(B.canUseChannel(u, "whatsapp").ok, true);
  mkBot(u); mkBot(u); mkBot(u);
  assert.equal(B.canCreateBot(u).ok, false);
  assert.match((B.canCreateBot(u) as any).message, /\$19\/mo/);
  run("INSERT INTO subscriptions(user_id,status,plan,extra_bots) VALUES (?,?,?,?)", [u, "active", "growth", 2]);
  assert.equal(B.limitsOf(u).bots, 5);
  assert.equal(B.canCreateBot(u).ok, true);
});
await t("Free and Starter: 1 bot", () => {
  for (const plan of ["free", "starter"]) {
    const u = mkUser(plan);
    assert.equal(B.canCreateBot(u).ok, true);
    mkBot(u);
    assert.equal(B.canCreateBot(u).ok, false);
  }
});
await t("API: off on Free, on from Starter", () => {
  assert.equal(B.canUseApi(mkUser()).ok, false);
  assert.equal(B.canUseApi(mkUser("starter")).ok, true);
});
await t("Scale (set by hand): unlimited bots, overage allowed past 6,000 (contracted)", () => {
  const u = mkUser("scale"); const b = mkBot(u);
  run("INSERT INTO usage_counters(user_id,period,conversations) VALUES (?,?,6000)", [u, B.periodKey()]);
  const r = turn(b, "imessage", "+1z") as any;
  assert.equal(r.ok && r.billable, true);
  assert.equal(B.usageSummary(u).overage, 1);
  assert.equal(B.canCreateBot(u).ok, true);
});
await t("old placeholder names map onto the new plans; unknown → free", () => {
  assert.equal(B.planOf(mkUser("pro")).id, "starter");
  assert.equal(B.planOf(mkUser("business")).id, "scale");
  assert.equal(B.planOf(mkUser("platinum")).id, "free");
});
await t("BILLING_DEFAULT_PLAN lifts lower plans, never lowers paid ones", () => {
  const u = mkUser(); const p = mkUser("scale");
  process.env.BILLING_DEFAULT_PLAN = "growth";
  try { assert.equal(B.planOf(u).id, "growth"); assert.equal(B.planOf(p).id, "scale"); }
  finally { delete process.env.BILLING_DEFAULT_PLAN; }
  assert.equal(B.planOf(u).id, "free");
});
await t("counters are per calendar month (UTC)", () => {
  assert.equal(B.periodKey(new Date("2026-10-31T23:59:59Z")), "2026-10");
  assert.equal(B.periodKey(new Date("2026-11-01T00:00:00Z")), "2026-11");
  assert.equal(B.periodResetsAt(new Date("2026-12-15T10:00:00Z")), "2027-01-01T00:00:00.000Z");
  const u = mkUser(); const b = mkBot(u);
  run("INSERT INTO usage_counters(user_id,period,conversations) VALUES (?,?,?)", [u, "2020-01", 50]);
  assert.equal(turn(b, "telegram", "tg:1").ok, true, "last month's usage doesn't count");
});
await t("at-capacity notice goes to a customer once per day; copy has no em dashes", () => {
  const u = mkUser(); const b = mkBot(u);
  const first = B.overLimitReply(b, "+15551230000", "Sanitea", "quota");
  assert.ok(first && /at capacity/.test(first) && /person from the team/.test(first));
  assert.equal(B.overLimitReply(b, "+15551230000", "Sanitea", "quota"), null);
  assert.ok(B.overLimitReply(b, "+15551230001", "Sanitea", "quota"));
  assert.ok(!/\u2014/.test(first!));
  assert.ok(!/\u2014/.test(B.overLimitReply(b, "x", "Sanitea", "channel")!));
});
await t("usage summary flags bots live on a channel the plan lacks (downgrade)", () => {
  const u = mkUser(); const b = mkBot(u);
  run("INSERT INTO channels(bot_id,channel,status) VALUES (?,?,?)", [b, "whatsapp", "live"]);
  assert.equal(B.usageSummary(u).botsOffPlan, 1);
  const f = mkUser(); const fb = mkBot(f);
  run("INSERT INTO channels(bot_id,channel,status) VALUES (?,?,?)", [fb, "imessage", "live"]);
  assert.equal(B.usageSummary(f).botsOffPlan, 0, "Free + iMessage is fine (test phones)");
});
await t("canStartConversation (API scheduling) mirrors the hard stop", () => {
  const u = mkUser();
  run("INSERT INTO usage_counters(user_id,period,conversations) VALUES (?,?,50)", [u, B.periodKey()]);
  assert.equal(B.canStartConversation(u).ok, false);
  assert.equal(B.canStartConversation(mkUser()).ok, true);
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
await t("customer.subscription.created → Starter monthly with metered overage, period end stored, iMessage unlocked", () => {
  deliver(events[1]);
  assert.equal(plan(), "starter");
  assert.equal(sub().status, "active");
  assert.equal(sub().interval, "month");
  assert.equal(sub().price_id, "price_TLstarter");
  assert.equal(sub().overage_price_id, "price_TLstarter_overage");
  assert.equal(B.limitsOf(fixtureUser).overage, true);
  assert.equal(sub().current_period_end, new Date(1793778401 * 1000).toISOString());
  assert.equal(B.canUseChannel(fixtureUser, "imessage").ok, true);
});
await t("duplicate delivery is a no-op", () => {
  assert.deepEqual(deliver(events[1]), { handled: false, result: "duplicate" });
});
await t("invoice.payment_failed flags the account; past_due keeps Starter (Stripe retries)", () => {
  deliver(events[2]);
  assert.ok(sub().payment_failed_at);
  deliver(events[3]);
  assert.equal(sub().status, "past_due");
  assert.equal(plan(), "starter");
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
  run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,plan,status) VALUES (?,?,?,?,?)", [u, "cus_two", "sub_new", "growth", "active"]);
  run("UPDATE users SET plan='growth' WHERE id=?", [u]);
  const old = structuredClone(events[6]); old.id = "evt_old_sub_deleted"; old.data.object.id = "sub_old"; old.data.object.customer = "cus_two"; old.data.object.metadata = {};
  assert.equal(deliver(old).result, "ignored: not the current subscription");
  assert.equal(B.planOf(u).id, "growth");
});
await t("Scale users (set by hand) are never downgraded by Stripe events", () => {
  const u = mkUser("scale");
  run("INSERT INTO subscriptions(user_id,stripe_customer_id) VALUES (?,?)", [u, "cus_biz"]);
  const ev = structuredClone(events[6]); ev.id = "evt_biz_deleted"; ev.data.object.id = "sub_biz"; ev.data.object.customer = "cus_biz"; ev.data.object.metadata = {};
  deliver(ev);
  assert.equal(B.planOf(u).id, "scale");
});
await t("events for unknown customers are acknowledged and ignored", () => {
  const ev = structuredClone(events[1]); ev.id = "evt_unknown_cus"; ev.data.object.customer = "cus_nobody"; ev.data.object.metadata = {};
  assert.equal(deliver(ev).result, "ignored: unknown customer");
});
await t("yearly subscription + add-ons: interval year, no overage item (hard stop), extra bots and dedicated number read", () => {
  const u = mkUser();
  run("INSERT INTO subscriptions(user_id,stripe_customer_id) VALUES (?,?)", [u, "cus_year"]);
  const ev = structuredClone(events[1]); ev.id = "evt_yearly"; ev.data.object.id = "sub_year"; ev.data.object.customer = "cus_year"; ev.data.object.metadata = {};
  ev.data.object.items.data = [
    { id: "si_y", quantity: 1, current_period_end: 1822636001, price: { id: "price_g_y", lookup_key: "threadline_growth_yearly", recurring: { interval: "year" } } },
    { id: "si_b", quantity: 2, price: { id: "price_xb", lookup_key: "threadline_extra_bot_monthly", recurring: { interval: "year" } } },
    { id: "si_d", quantity: 1, price: { id: "price_dn", lookup_key: "threadline_dedicated_number_monthly" } },
  ];
  deliver(ev);
  const row = get<any>("SELECT * FROM subscriptions WHERE user_id=?", [u]);
  assert.equal(B.planOf(u).id, "growth"); assert.equal(row.interval, "year"); assert.equal(row.overage_price_id, null);
  assert.equal(row.extra_bots, 2); assert.equal(row.dedicated_numbers, 1);
  assert.equal(row.current_period_end, new Date(1822636001 * 1000).toISOString());
  assert.equal(B.limitsOf(u).bots, 5); assert.equal(B.limitsOf(u).overage, false);
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
const store = { prices: [] as any[], products: [] as any[], portals: [] as any[], customers: [] as any[], meters: [] as any[], meterEvents: [] as any[], subs: new Map<string, any>() };
let failMeter = false;
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
    if (k === "POST /v1/prices") {
      const p = { id: `price_${r.body.get("lookup_key")}`, lookup_key: r.body.get("lookup_key"), unit_amount: Number(r.body.get("unit_amount")), product: r.body.get("product"),
        recurring: { interval: r.body.get("recurring[interval]"), usage_type: r.body.get("recurring[usage_type]") ?? "licensed", meter: r.body.get("recurring[meter]") } };
      store.prices.push(p); return send(200, p);
    }
    if (k === "GET /v1/billing/meters") return send(200, { data: store.meters });
    if (k === "POST /v1/billing/meters") { const m = { id: "mtr_1", event_name: r.body.get("event_name"), status: "active" }; store.meters.push(m); return send(200, m); }
    if (k === "POST /v1/billing/meter_events") {
      if (failMeter) return send(500, { error: { message: "meter down" } });
      if (!store.meterEvents.some((e) => e.identifier === r.body.get("identifier"))) store.meterEvents.push(Object.fromEntries(r.body));
      return send(200, { object: "billing.meter_event" });
    }
    if (k === "GET /v1/billing_portal/configurations") return send(200, { data: store.portals });
    if (k === "POST /v1/billing_portal/configurations") { const p = { id: `bpc_${store.portals.length + 1}`, metadata: { threadline: r.body.get("metadata[threadline]") } }; store.portals.push(p); return send(200, p); }
    if (k === "POST /v1/customers") { const c = { id: `cus_fake${store.customers.length + 1}`, email: r.body.get("email") }; store.customers.push(c); return send(200, c); }
    if (k === "POST /v1/checkout/sessions") return send(200, { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    if (k === "POST /v1/billing_portal/sessions") return send(200, { id: "bps_1", url: "https://billing.stripe.com/p/session/test_1" });
    const sm = r.path.match(/^\/v1\/subscriptions\/(\w+)$/);
    if (sm && r.method === "GET") return send(200, store.subs.get(sm[1]!));
    if (sm && r.method === "POST") { store.subs.set(sm[1]! + ":update", Object.fromEntries(r.body)); return send(200, store.subs.get(sm[1]!)); }
    send(404, { error: { message: `no route ${k}` } });
  });
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
process.env.STRIPE_API_BASE = `http://127.0.0.1:${(server.address() as any).port}`;

await t("without STRIPE_SECRET_KEY: not configured, calls refuse with 503, overage reporting is a no-op", async () => {
  assert.equal(S.stripeConfigured(), false);
  assert.equal(S.stripeMode(), "off");
  await assert.rejects(() => S.createCheckoutSession({ id: "u", email: "e@x.test" }, "starter", "month", "https://app.example"), (e: any) => e.status === 503);
  assert.equal(await S.reportOverage(), 0);
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
await t("setup: meter + Starter/Growth monthly, yearly, metered overage + 2 add-ons + portal; second run creates nothing", async () => {
  const r1 = await S.setupStripeCatalog(() => {});
  assert.equal(store.meters.length, 1);
  const byKey = Object.fromEntries(store.prices.map((p) => [p.lookup_key, p]));
  assert.equal(byKey.threadline_starter_monthly.unit_amount, 2900);
  assert.equal(byKey.threadline_starter_yearly.unit_amount, 28800);
  assert.equal(byKey.threadline_growth_monthly.unit_amount, 14900);
  assert.equal(byKey.threadline_growth_yearly.unit_amount, 148800);
  assert.equal(byKey.threadline_starter_overage.unit_amount, 15);
  assert.equal(byKey.threadline_growth_overage.unit_amount, 10);
  assert.equal(byKey.threadline_starter_overage.recurring.usage_type, "metered");
  assert.equal(byKey.threadline_starter_overage.recurring.meter, "mtr_1");
  assert.equal(byKey.threadline_starter_yearly.recurring.interval, "year");
  assert.equal(byKey.threadline_extra_bot_monthly.unit_amount, 1900);
  assert.equal(byKey.threadline_dedicated_number_monthly.unit_amount, 39900);
  assert.equal(store.prices.length, 8);
  assert.equal(store.products.length, 6, "Starter, Growth, two overage products, two add-ons");
  assert.equal(byKey.threadline_starter_monthly.product, byKey.threadline_starter_yearly.product, "monthly + yearly share a product");
  assert.ok(reqs.filter((q) => q.method === "POST").every((q) => q.idem), "every create sends an idempotency key");
  const r2 = await S.setupStripeCatalog(() => {});
  assert.deepEqual(r2, r1);
  assert.equal(store.prices.length, 8); assert.equal(store.products.length, 6); assert.equal(store.meters.length, 1); assert.equal(store.portals.length, 1);
});
await t("checkout monthly: base + metered overage item, user metadata, customer created once", async () => {
  const u = mkUser();
  const url = await S.createCheckoutSession({ id: u, email: `${u}@billing.test` }, "starter", "month", "https://app.example");
  assert.equal(url, "https://checkout.stripe.com/c/pay/cs_test_1");
  const cs = reqs.findLast((q) => q.path === "/v1/checkout/sessions")!;
  assert.equal(cs.body.get("mode"), "subscription");
  assert.equal(cs.body.get("line_items[0][price]"), "price_threadline_starter_monthly");
  assert.equal(cs.body.get("line_items[0][quantity]"), "1");
  assert.equal(cs.body.get("line_items[1][price]"), "price_threadline_starter_overage");
  assert.equal(cs.body.get("line_items[1][quantity]"), null, "metered items have no quantity");
  assert.equal(cs.body.get("client_reference_id"), u);
  assert.equal(cs.body.get("subscription_data[metadata][user_id]"), u);
  assert.equal(cs.body.get("success_url"), "https://app.example/billing?checkout=success");
  assert.equal(get<any>("SELECT stripe_customer_id FROM subscriptions WHERE user_id=?", [u]).stripe_customer_id, "cus_fake1");
  await S.createCheckoutSession({ id: u, email: `${u}@billing.test` }, "growth", "month", "https://app.example");
  assert.equal(store.customers.length, 1, "customer reused");
});
await t("checkout yearly: base price only (Checkout can't mix intervals)", async () => {
  const u = mkUser();
  await S.createCheckoutSession({ id: u, email: `${u}@billing.test` }, "growth", "year", "https://app.example");
  const cs = reqs.findLast((q) => q.path === "/v1/checkout/sessions")!;
  assert.equal(cs.body.get("line_items[0][price]"), "price_threadline_growth_yearly");
  assert.equal(cs.body.get("line_items[1][price]"), null);
});
await t("checkout refuses Free/Scale and an already-active subscription", async () => {
  const u = mkUser();
  await assert.rejects(() => S.createCheckoutSession({ id: u, email: "b@x.test" }, "scale", "month", "https://app.example"), /set up with our team/);
  await assert.rejects(() => S.createCheckoutSession({ id: u, email: "b@x.test" }, "free", "month", "https://app.example"), /set up with our team/);
  run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,status,plan) VALUES (?,?,?,?,?)", [u, "cus_x", "sub_x", "active", "starter"]);
  await assert.rejects(() => S.createCheckoutSession({ id: u, email: "b@x.test" }, "growth", "month", "https://app.example"), /already have a subscription/);
});
await t("change plan Starter → Growth swaps the base and overage items in place, prorated", async () => {
  const u = mkUser("starter");
  run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,status,plan) VALUES (?,?,?,?,?)", [u, "cus_chg", "subchg", "active", "starter"]);
  store.subs.set("subchg", { id: "subchg", items: { data: [
    { id: "si_base", quantity: 1, price: { id: "price_threadline_starter_monthly", lookup_key: "threadline_starter_monthly", recurring: { interval: "month", usage_type: "licensed" } } },
    { id: "si_over", price: { id: "price_threadline_starter_overage", lookup_key: "threadline_starter_overage", recurring: { interval: "month", usage_type: "metered" } } },
    { id: "si_bot", quantity: 1, price: { id: "price_threadline_extra_bot_monthly", lookup_key: "threadline_extra_bot_monthly", recurring: { interval: "month" } } },
  ] } });
  await S.changePlan(u, "growth");
  const up = store.subs.get("subchg:update");
  assert.equal(up["items[0][id]"], "si_base"); assert.equal(up["items[0][price]"], "price_threadline_growth_monthly");
  assert.equal(up["items[1][id]"], "si_over"); assert.equal(up["items[1][price]"], "price_threadline_growth_overage");
  assert.equal(up["items[2][id]"], undefined, "add-ons untouched");
  assert.equal(up.proration_behavior, "create_prorations");
  await assert.rejects(() => S.changePlan(u, "starter"), /already on Starter/);
  await assert.rejects(() => S.changePlan(mkUser(), "growth"), /No active subscription/);
});
await t("overage conversations are reported once as meter events (identifier = conversation id), errors retried", async () => {
  const u = mkUser("starter"); const b = mkBot(u);
  run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,plan,status,overage_price_id) VALUES (?,?,?,?,?,?)", [u, "cus_meter", "sub_meter", "starter", "active", "price_ov"]);
  run("INSERT INTO usage_counters(user_id,period,conversations) VALUES (?,?,300)", [u, B.periodKey()]);
  const a = turn(b, "imessage", "+1m1") as any, c = turn(b, "imessage", "+1m2") as any;
  run("UPDATE billed_conversations SET reported_at=datetime('now') WHERE user_id<>? AND overage=1", [u]);   // earlier tests' rows
  failMeter = true;
  assert.equal(await S.reportOverage(), 0);
  assert.match(get<any>("SELECT report_error FROM billed_conversations WHERE conversation_id=?", [a.conversationId]).report_error, /meter down/);
  failMeter = false;
  const [n1, n2] = await Promise.all([S.reportOverage(), S.reportOverage()]);
  assert.equal(n1, 2); assert.equal(n2, 2, "single-flight: concurrent callers share one run");
  assert.equal(await S.reportOverage(), 0, "nothing left");
  const mine = store.meterEvents.filter((e) => e["payload[stripe_customer_id]"] === "cus_meter");
  assert.deepEqual(mine.map((e) => e.identifier).sort(), [a.conversationId, c.conversationId].sort());
  assert.equal(mine[0].event_name, "threadline_overage_conversation");
  assert.equal(mine[0]["payload[value]"], "1");
  assert.ok(Math.abs(Number(mine[0].timestamp) - Date.now() / 1000) < 120);
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
  await assert.rejects(() => S.createPortalSession(mkUserWithCustomer(), "https://x"), (e: any) => e instanceof S.BillingError && /Invalid API Key/.test(e.message));
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
});
function mkUserWithCustomer() { const u = mkUser(); run("INSERT INTO subscriptions(user_id,stripe_customer_id) VALUES (?,?)", [u, "cus_err"]); return u; }
await t("form encoding matches Stripe's nested format", () => {
  assert.equal(decodeURIComponent(S.formEncode({ a: 1, b: { c: "x y" }, d: [{ e: 2 }], f: ["g"], n: undefined })), "a=1&b[c]=x y&d[0][e]=2&f[0]=g");
});
server.close();

for (const f of [DB, DB + "-wal", DB + "-shm"]) rmSync(f, { force: true });
console.log(`\nbilling: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log("failed:", failures.join("; ")); process.exit(1); }
