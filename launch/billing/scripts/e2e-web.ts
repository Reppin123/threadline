// End-to-end billing check against the BUILT web app (next start) with a temp DB and a local fake Stripe API.
// Proves: no keys → "billing not configured" + free plan; with test keys → checkout 303 to Stripe, signed webhook over
// HTTP flips the plan to Pro, bad signature 400, portal 303, over-limit banner, iMessage gate on the connect action's data.
//   (build first: cd apps/web && NEXT_DIST_DIR=.next-billing npx next build)
//   node --experimental-strip-types launch/billing/scripts/e2e-web.ts
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { createHash, createHmac } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const ROOT = resolve(import.meta.dirname, "../../..");
const DB = `/tmp/tl-billing-e2e-${process.pid}.db`;
const PORT = 3077;
const BASE = `http://127.0.0.1:${PORT}`;
const AUTH_SECRET = "billing-e2e-secret";
const WHSEC = "whsec_e2e_" + "y".repeat(24);
for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
process.env.THREADLINE_DB = DB;
const { run, id } = await import("../../../packages/db/src/index.ts");

// fixtures: one owner with a session and a live Telegram bot
const uid = id("usr_");
run("INSERT INTO users(id,email,name) VALUES (?,?,?)", [uid, "owner@e2e.test", "E2E Owner"]);
const bid = id("bot_");
run("INSERT INTO bots(id,user_id,name,slug,join_code,source_kind,source_json,status) VALUES (?,?,?,?,?,?,?,?)", [bid, uid, "Sanitea", "sanitea-e2e", "sanitea-e2e", "idea", "{}", "live"]);
const sid = "sess_" + id();
run("INSERT INTO sessions(id,user_id,expires_at) VALUES (?,?,?)", [sid, uid, new Date(Date.now() + 864e5).toISOString()]);
const cookie = `tl_session=${sid}.${createHmac("sha256", AUTH_SECRET).update(sid).digest("base64url")}`;

// fake Stripe
const seen: { path: string; body: string }[] = [];
const stripe = createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    const u = new URL(req.url!, "http://x"); seen.push({ path: u.pathname, body });
    const send = (j: unknown) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(j)); };
    if (u.pathname === "/v1/prices") { const key = u.searchParams.get("lookup_keys[0]")!; return send({ data: [{ id: key.endsWith("_overage") ? "price_TLstarter_overage" : "price_TLstarter", lookup_key: key }] }); }
    if (u.pathname === "/v1/customers") return send({ id: "cus_TLtest0001" });
    if (u.pathname === "/v1/checkout/sessions") return send({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_e2e" });
    if (u.pathname === "/v1/billing_portal/configurations") return send({ data: [{ id: "bpc_1", metadata: { threadline: "1" } }] });
    if (u.pathname === "/v1/billing_portal/sessions") return send({ id: "bps_1", url: "https://billing.stripe.com/p/session/test_e2e" });
    res.writeHead(404); res.end("{}");
  });
});
await new Promise<void>((r) => stripe.listen(0, "127.0.0.1", r));
const STRIPE_BASE = `http://127.0.0.1:${(stripe.address() as any).port}`;

let web: ChildProcess | null = null;
async function startWeb(env: Record<string, string>) {
  web = spawn(resolve(ROOT, "apps/web/node_modules/.bin/next"), ["start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: resolve(ROOT, "apps/web"), stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: ".next-billing", THREADLINE_DB: DB, AUTH_SECRET, APP_URL: BASE,
      STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", BILLING_DEFAULT_PLAN: "", ...env },
  });
  let log = ""; web.stdout!.on("data", (d) => (log += d)); web.stderr!.on("data", (d) => (log += d));
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${BASE}/login`)).status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("web did not start:\n" + log);
}
async function stopWeb() {
  if (!web) return;
  const w = web; web = null;
  if (w.exitCode === null) await new Promise((r) => { w.once("exit", r); w.kill("SIGTERM"); });
  for (let i = 0; i < 50; i++) { try { await fetch(`${BASE}/login`); } catch { return; } await new Promise((r) => setTimeout(r, 100)); }
}
const page = async (p: string) => (await fetch(BASE + p, { headers: { cookie } })).text();
const post = (p: string, init: RequestInit = {}) => fetch(BASE + p, { method: "POST", redirect: "manual", ...init, headers: { cookie, ...(init.headers as any) } });

let passed = 0;
const step = (s: string) => { passed++; console.log(`  ok   ${s}`); };
try {
  console.log("billing e2e: no Stripe keys");
  await startWeb({});
  let html = await page("/billing");
  assert.match(html, /id="billing-not-configured"/); assert.match(html, /id="billing-plan">Free/);
  assert.match(html, /0 of 50/);
  step("/billing renders, says billing is not configured, Free plan, 0 of 50 conversations");
  let r = await post("/api/billing/checkout", { body: new URLSearchParams({ plan: "starter", interval: "month" }) });
  assert.equal(r.status, 303); assert.match(r.headers.get("location")!, /\/billing\?error=Billing%20isn/);
  step("checkout without keys → 303 back to /billing with a friendly error");
  r = await post("/api/stripe/webhook", { body: "{}" });
  assert.equal(r.status, 503);
  step("webhook without STRIPE_WEBHOOK_SECRET → 503 billing_not_configured");
  run("INSERT INTO usage_counters(user_id,period,conversations) VALUES (?,?,50)", [uid, new Date().toISOString().slice(0, 7)]);
  html = await page("/dashboard");
  assert.match(html, /id="billing-banner"/); assert.match(html, /at capacity/);
  step("over the Free allowance → dashboard banner");
  const key = "tl_e2e_" + id();
  run("INSERT INTO api_keys(id,user_id,bot_id,key_hash,key_prefix) VALUES (?,?,?,?,?)", [id("ak_"), uid, bid, createHash("sha256").update(key).digest("hex"), key.slice(0, 8)]);
  let api = await fetch(`${BASE}/api/v1/bots/${bid}/messages`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ to: "telegram:123", prompt: "hi" }) });
  assert.equal(api.status, 402); assert.equal((await api.json()).error.code, "plan_required");
  step("public API on Free → 402 plan_required");
  run("UPDATE users SET plan='starter' WHERE id=?", [uid]);
  api = await fetch(`${BASE}/api/v1/bots/${bid}/messages`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ to: "imessage:+15550001111", prompt: "hi" }) });
  assert.equal(api.status, 202);
  run("UPDATE usage_counters SET conversations=300 WHERE user_id=?", [uid]);
  api = await fetch(`${BASE}/api/v1/bots/${bid}/messages`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ to: "imessage:+15550001111", prompt: "hi" }) });
  assert.equal(api.status, 402); assert.equal((await api.json()).error.code, "quota_exceeded");
  step("API on Starter: iMessage scheduling 202; out of conversations with no overage item → 402 quota_exceeded");
  run("UPDATE users SET plan='free' WHERE id=?", [uid]);
  run("UPDATE usage_counters SET conversations=50 WHERE user_id=?", [uid]);
  await stopWeb();

  console.log("billing e2e: Stripe test keys + fake Stripe API");
  await startWeb({ STRIPE_SECRET_KEY: "sk_test_e2e", STRIPE_WEBHOOK_SECRET: WHSEC, STRIPE_API_BASE: STRIPE_BASE });
  html = await page("/billing");
  assert.doesNotMatch(html, /billing-not-configured/); assert.match(html, /Stripe test mode/); assert.match(html, /id="billing-upgrade-starter"/); assert.match(html, /id="billing-yearly-growth"/);
  step("/billing shows test-mode note, monthly + yearly buttons for Starter and Growth");
  r = await post("/api/billing/checkout", { body: new URLSearchParams({ plan: "starter", interval: "month" }) });
  assert.equal(r.status, 303); assert.equal(r.headers.get("location"), "https://checkout.stripe.com/c/pay/cs_test_e2e");
  const cs = new URLSearchParams(seen.find((s) => s.path === "/v1/checkout/sessions")!.body);
  assert.equal(cs.get("client_reference_id"), uid); assert.equal(cs.get("line_items[0][price]"), "price_TLstarter");
  assert.equal(cs.get("line_items[1][price]"), "price_TLstarter_overage");
  step("checkout → 303 to Stripe Checkout with the Starter price + metered overage item and the user id");

  const events = JSON.parse(readFileSync(resolve(ROOT, "packages/core/src/billing-fixtures/events.json"), "utf8").replaceAll("{{USER_ID}}", uid));
  const deliver = (ev: unknown, secret = WHSEC) => {
    const payload = JSON.stringify(ev);
    const t = Math.floor(Date.now() / 1000);
    const sig = `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
    return post("/api/stripe/webhook", { body: payload, headers: { "stripe-signature": sig, "content-type": "application/json" } });
  };
  r = await deliver(events[1], "whsec_wrong");
  assert.equal(r.status, 400);
  step("webhook with a bad signature → 400");
  for (const ev of events.slice(0, 2)) { r = await deliver(ev); assert.equal(r.status, 200, await r.text()); }
  r = await deliver(events[1]);
  assert.deepEqual(await r.json(), { received: true, handled: false, result: "duplicate" });
  step("signed checkout.session.completed + subscription.created → 200; replay → duplicate");
  html = await page("/billing");
  assert.match(html, /id="billing-plan">Starter/); assert.match(html, /50 of 300/); assert.match(html, /id="billing-manage"/);
  assert.doesNotMatch(html, /id="billing-upgrade-/); assert.match(html, /id="billing-change-growth"/);
  step("/billing now shows Starter, 50 of 300, Manage billing and Switch to Growth");
  html = await page("/dashboard");
  assert.doesNotMatch(html, /id="billing-banner"/);
  step("banner gone once on Starter (50 of 300 used)");
  r = await post("/api/billing/portal");
  assert.equal(r.status, 303); assert.equal(r.headers.get("location"), "https://billing.stripe.com/p/session/test_e2e");
  step("Manage billing → 303 to the Stripe Customer Portal");
  r = await post("/api/billing/checkout", { body: new URLSearchParams({ plan: "growth", interval: "month" }) });
  assert.equal(r.status, 303); assert.match(decodeURIComponent(r.headers.get("location")!), /already have a subscription/);
  step("a second checkout while subscribed → back to /billing with 'already have a subscription'");
  await deliver(events[2]);
  html = await page("/dashboard");
  assert.match(html, /payment didn&#x27;t go through|payment didn't go through/);
  step("invoice.payment_failed → 'update your card' banner");
  await deliver(events[6]);
  html = await page("/billing");
  assert.match(html, /id="billing-plan">Free/);
  step("subscription.deleted → back to Free");
} finally {
  await stopWeb();
  stripe.close();
  for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
}
console.log(`\nbilling e2e: ${passed} steps passed`);
