// Tests for the production hooks: safety (rate limits, build + spend caps, kill switch), ops (Sentry envelope, alert webhook)
// and email (Resend payloads, templates). Throwaway DB, local mock HTTP servers, no network.
//   node --experimental-strip-types scripts/test-production.ts
import { createServer } from "node:http";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DB = join(tmpdir(), `tl-production-test-${process.pid}.db`);
process.env.THREADLINE_DB = DB;
process.env.THREADLINE_LLM = "offline";
for (const k of ["THREADLINE_KILL", "SENTRY_DSN", "ALERT_WEBHOOK_URL", "RESEND_API_KEY", "EMAIL_FROM", "BILLING_DEFAULT_PLAN"]) delete process.env[k];

const { run, get, id } = await import("../packages/db/src/index.ts");
const safety = await import("../packages/core/src/safety.ts");
const ops = await import("../packages/core/src/ops.ts");
const mail = await import("../packages/core/src/email.ts");

let passed = 0, failed = 0;
async function t(name: string, fn: () => unknown | Promise<unknown>) {
  try { await fn(); passed++; console.log(`PASS  ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${(e as Error).stack?.split("\n").slice(0, 3).join("\n      ")}`); }
}
function eq(a: unknown, b: unknown, msg = "") { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function ok(c: unknown, msg: string) { if (!c) throw new Error(msg); }

// captured requests from mock servers
const seen: { path: string; headers: Record<string, any>; body: string }[] = [];
const server = createServer(async (req, res) => {
  const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
  seen.push({ path: req.url ?? "", headers: req.headers, body: Buffer.concat(chunks).toString() });
  if (req.url?.startsWith("/fail")) { res.writeHead(422, { "content-type": "application/json" }); return res.end(JSON.stringify({ message: "domain not verified" })); }
  res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ id: "em_123" }));
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
const port = (server.address() as any).port;
const waitFor = async (pred: () => boolean, ms = 2000) => { const end = Date.now() + ms; while (!pred() && Date.now() < end) await new Promise((r) => setTimeout(r, 20)); return pred(); };

// fixtures
const userId = id("usr_"), botId = id("bot_");
run("INSERT INTO users(id,email,plan) VALUES (?,?,?)", [userId, "owner@example.com", "free"]);
run("INSERT INTO bots(id,user_id,name,slug,join_code,source_kind,source_json) VALUES (?,?,?,?,?,?,?)", [botId, userId, "Bot", "bot-x", "bot-abc", "idea", "{}"]);

// ---------- safety ----------
await t("hit() counts within a window and resets in the next one", () => {
  const t0 = Date.UTC(2026, 9, 10, 12, 0, 0);
  eq(safety.hit("k", 60, t0), 1); eq(safety.hit("k", 60, t0 + 1000), 2); eq(safety.hit("k", 60, t0 + 61_000), 1);
});
await t("magic link: 5 per IP per 10 min, then 'rate'", () => {
  for (let i = 0; i < 5; i++) eq(safety.allowAuth("magic", "1.1.1.1", `a${i}@x.com`, true).ok, true, `attempt ${i + 1}`);
  const v = safety.allowAuth("magic", "1.1.1.1", "a9@x.com", true);
  eq(v.ok, false); eq((v as any).reason, "rate"); ok((v as any).retryAfterSec > 0, "retryAfter");
});
await t("magic link: 3 per email per 10 min across IPs", () => {
  for (let i = 0; i < 3; i++) eq(safety.allowAuth("magic", `2.2.2.${i}`, "same@x.com", true).ok, true);
  eq(safety.allowAuth("magic", "2.2.2.9", "same@x.com", true).ok, false);
});
await t("password login: 10 per email per 10 min (brute force)", () => {
  for (let i = 0; i < 10; i++) eq(safety.allowAuth("login", `3.3.${i}.1`, "victim@x.com", false).ok, true);
  eq(safety.allowAuth("login", "3.3.99.1", "victim@x.com", false).ok, false);
});
await t("global signup cap → 'capacity' for new accounts only", () => {
  process.env.SIGNUP_GLOBAL_PER_HOUR = "2";
  safety.countSignup(); safety.countSignup();
  eq((safety.allowAuth("magic", "4.4.4.4", "new@x.com", true) as any).reason, "capacity");
  eq(safety.allowAuth("magic", "4.4.4.5", "old@x.com", false).ok, true, "existing user still gets a link");
  eq((safety.allowAuth("oauth", "4.4.4.6", "g@x.com", true) as any).reason, "capacity");
  delete process.env.SIGNUP_GLOBAL_PER_HOUR;
});
await t("kill switch 'signups' blocks new accounts, not logins", () => {
  process.env.THREADLINE_KILL = "signups";
  eq((safety.allowAuth("signup", "5.5.5.5", "n@x.com", true) as any).reason, "signups_paused");
  eq(safety.allowAuth("login", "5.5.5.5", "n2@x.com", true).ok, true);
  eq(safety.allowAuth("magic", "5.5.5.6", "existing@x.com", false).ok, true);
  delete process.env.THREADLINE_KILL;
});
await t("clientIp prefers cf-connecting-ip", () => {
  eq(safety.clientIp(new Headers({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "8.8.8.8" })), "9.9.9.9");
  eq(safety.clientIp(new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" })), "8.8.8.8");
  eq(safety.clientIp(new Headers()), "unknown");
});
await t("builds: free plan 5/day, 6th throws LimitError(build_limit)", () => {
  for (let i = 0; i < 5; i++) safety.assertBuildAllowed(userId);
  try { safety.assertBuildAllowed(userId); throw new Error("no throw"); }
  catch (e: any) { eq(e.name, "LimitError"); eq(e.code, "build_limit"); }
});
await t("builds: kill switch 'builds'", () => {
  process.env.THREADLINE_KILL = "builds";
  try { safety.assertBuildAllowed(id("usr_")); throw new Error("no throw"); } catch (e: any) { eq(e.code, "builds_paused"); }
  delete process.env.THREADLINE_KILL;
});
await t("messages: 12/min per customer, one notice, then silence; other customers unaffected", () => {
  const verdicts = Array.from({ length: 15 }, () => safety.admitMessage(botId, "+15550001"));
  eq(verdicts.filter((v) => v.ok).length, 12);
  eq(verdicts.filter((v) => !v.ok && v.notify).length, 1, "exactly one notice");
  eq(safety.admitMessage(botId, "+15550002").ok, true);
});
await t("messages: per-bot cap across customers", () => {
  process.env.MSG_BOT_PER_MIN = "20";
  const b2 = id("bot_");
  let okCount = 0;
  for (let i = 0; i < 25; i++) if (safety.admitMessage(b2, `+1555${i}`).ok) okCount++;
  eq(okCount, 20);
  delete process.env.MSG_BOT_PER_MIN;
});
await t("messages: kill switch 'inbound'", () => {
  process.env.THREADLINE_KILL = "inbound";
  eq(safety.admitMessage(botId, "+15550003").ok, false);
  process.env.THREADLINE_KILL = "outbound,llm";
  eq(safety.killed("outbound"), true); eq(safety.killed("inbound"), false);
  delete process.env.THREADLINE_KILL;
});
await t("LLM spend cap: under → ok; day cap ($2 free) → SpendCapError", () => {
  safety._resetCaches();
  safety.assertLlmAllowed(botId);
  run("INSERT INTO usage(id,user_id,bot_id,category,cost_usd) VALUES (?,?,?,?,?)", [id("us_"), userId, botId, "answering", 2.5]);
  safety._resetCaches();
  try { safety.assertLlmAllowed(botId); throw new Error("no throw"); }
  catch (e: any) { eq(e.name, "SpendCapError"); eq(e.code, "llm_day_cap"); }
});
await t("LLM spend cap: month cap counts earlier days; plan upgrade raises it", () => {
  run("DELETE FROM usage");
  const early = new Date(); early.setUTCDate(1); early.setUTCHours(0, 30, 0, 0);
  const sameDay = early.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
  run("INSERT INTO usage(id,user_id,bot_id,category,cost_usd,created_at) VALUES (?,?,?,?,?,?)", [id("us_"), userId, botId, "answering", 9, early.toISOString().replace("T", " ").slice(0, 19)]);
  safety._resetCaches();
  try { safety.assertLlmAllowed(botId); throw new Error("no throw"); } catch (e: any) { eq(e.code, sameDay ? "llm_day_cap" : "llm_month_cap"); }
  run("UPDATE users SET plan='growth' WHERE id=?", [userId]);
  safety._resetCaches();
  safety.assertLlmAllowed(botId);
  eq(safety.capsOf(userId), { plan: "growth", day: 40, month: 250 });
});
await t("LLM spend cap: global daily cap and env override", () => {
  process.env.LLM_CAP_GLOBAL_DAY = "5";
  run("INSERT INTO usage(id,user_id,bot_id,category,cost_usd) VALUES (?,?,?,?,?)", [id("us_"), userId, botId, "tests", 6]);
  safety._resetCaches();
  try { safety.assertLlmAllowed(null); throw new Error("no throw"); } catch (e: any) { eq(e.code, "llm_global_cap"); }
  delete process.env.LLM_CAP_GLOBAL_DAY;
  process.env.THREADLINE_KILL = "llm";
  try { safety.assertLlmAllowed(null); throw new Error("no throw"); } catch (e: any) { eq(e.code, "llm_paused"); }
  delete process.env.THREADLINE_KILL;
});
await t("llm.complete() refuses before calling a paid provider when capped", async () => {
  const llm = await import("../packages/core/src/llm.ts");
  process.env.THREADLINE_LLM = "anthropic"; process.env.THREADLINE_KILL = "llm";
  try { await llm.complete({ system: "x", messages: [{ role: "user", content: "hi" }], botId }); throw new Error("no throw"); }
  catch (e: any) { eq(e.name, "SpendCapError"); }
  finally { process.env.THREADLINE_LLM = "offline"; delete process.env.THREADLINE_KILL; }
});

// ---------- ops ----------
await t("sentryTarget parses a DSN", () => {
  eq(ops.sentryTarget("https://abc123@o42.ingest.us.sentry.io/4507"), { url: "https://o42.ingest.us.sentry.io/api/4507/envelope/?sentry_key=abc123&sentry_version=7", dsn: "https://abc123@o42.ingest.us.sentry.io/4507" });
  eq(ops.sentryTarget("nonsense"), null);
});
await t("reportError sends one Sentry envelope, dedupes repeats", async () => {
  process.env.SENTRY_DSN = `http://pubkey@127.0.0.1:${port}/77`;
  seen.length = 0;
  ops.reportError(new Error("boom"), { service: "test", where: "unit" });
  ops.reportError(new Error("boom"), { service: "test", where: "unit" });
  ok(await waitFor(() => seen.length >= 1), "no envelope");
  await new Promise((r) => setTimeout(r, 150));
  eq(seen.length, 1, "deduped");
  ok(seen[0].path.startsWith("/api/77/envelope/?sentry_key=pubkey"), seen[0].path);
  const [hdr, item, ev] = seen[0].body.trim().split("\n").map((l) => JSON.parse(l));
  ok(hdr.event_id && item.type === "event", "envelope header");
  eq(ev.exception.values[0].value, "boom"); eq(ev.tags.service, "test");
  delete process.env.SENTRY_DSN;
});
await t("alert posts {text, content} and respects cooldown; resolved goes through", async () => {
  process.env.ALERT_WEBHOOK_URL = `http://127.0.0.1:${port}/hook`;
  seen.length = 0;
  eq(await ops.alert("gateway-down", "no provider connected for 3 min"), true);
  eq(await ops.alert("gateway-down", "again"), false);
  eq(await ops.alert("gateway-down", "back", { resolved: true }), true);
  eq(seen.length, 2);
  const b = JSON.parse(seen[0].body); ok(b.text.includes("[ALERT]") && b.content === b.text, b.text);
  ok(JSON.parse(seen[1].body).text.includes("[RESOLVED]"), "resolved text");
  delete process.env.ALERT_WEBHOOK_URL;
});

// ---------- email ----------
await t("email: unconfigured → not sent (callers fall back to dev link)", async () => {
  eq(await mail.send("a@b.com", mail.magicLinkEmail("http://x/y")), { sent: false, error: "not_configured" });
});
await t("email: Resend payload (from, reply_to, idempotency, tag)", async () => {
  process.env.RESEND_API_KEY = "re_test_dummy"; process.env.RESEND_API_BASE = `http://127.0.0.1:${port}`;
  process.env.APP_URL = "https://heybell.app"; process.env.BRAND_NAME = "HeyBell";
  seen.length = 0;
  const r = await mail.send("new@shop.com", mail.welcomeEmail("Maya Patel"), { idempotencyKey: "welcome:usr_1", tag: "welcome" });
  eq(r, { sent: true, id: "em_123" });
  const req = seen[0], body = JSON.parse(req.body);
  eq(req.path, "/emails"); eq(req.headers.authorization, "Bearer re_test_dummy"); eq(req.headers["idempotency-key"], "welcome:usr_1");
  eq(body.from, "HeyBell <login@heybell.app>"); eq(body.reply_to, "hello@heybell.app"); eq(body.to, ["new@shop.com"]);
  ok(body.subject === "Welcome to HeyBell" && body.text.startsWith("Hi Maya,") && body.html.includes("https://heybell.app/dashboard"), "welcome content");
  eq(body.tags, [{ name: "type", value: "welcome" }]);
});
await t("email: provider error is reported, not thrown", async () => {
  process.env.RESEND_API_BASE = `http://127.0.0.1:${port}/fail`;
  const r = await mail.send("x@y.com", mail.magicLinkEmail("https://heybell.app/auth/magic/t"));
  eq(r.sent, false); ok(r.error!.includes("422") && r.error!.includes("domain not verified"), r.error!);
  process.env.RESEND_API_BASE = `http://127.0.0.1:${port}`;
});
await t("email: templates have no em dashes, escape HTML, carry the link", () => {
  const all = [mail.magicLinkEmail("https://heybell.app/auth/magic/abc?x=1&y=2"), mail.welcomeEmail('<b>"Eve"</b>'), mail.planStartedEmail("Growth"), mail.paymentFailedEmail(), mail.planEndedEmail()];
  for (const m of all) ok(!/[—–]/.test(m.subject + m.text + m.html), `dash in ${m.subject}`);
  ok(all[0].html.includes("abc?x=1&amp;y=2") && all[0].text.includes("abc?x=1&y=2"), "magic link");
  ok(!all[1].html.includes("<b>\"Eve") && all[1].html.includes("&lt;b&gt;"), "escaped");
  eq(mail.billingEmailFor("customer.subscription.created", "Growth")?.tag, "plan_started");
  eq(mail.billingEmailFor("invoice.payment_failed", null)?.tag, "payment_failed");
  eq(mail.billingEmailFor("customer.subscription.deleted", null)?.tag, "plan_ended");
  eq(mail.billingEmailFor("invoice.paid", "Growth"), null);
});
await t("migration 0005 applied (rate_limits + indexes)", () => {
  ok(get("SELECT 1 FROM schema_migrations WHERE name='0005_production_safety.sql'"), "migration row");
  ok(get("SELECT 1 FROM sqlite_master WHERE name='usage_user_created'"), "index");
});

server.close();
for (const ext of ["", "-wal", "-shm"]) rmSync(DB + ext, { force: true });
console.log(`\nproduction: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
