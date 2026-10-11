// Scheduler test (agent "scheduler"): natural-language parsing, recurrence math across timezones/DST, the
// schedule_message tool, the worker sweep (gateway-finished rows roll forward, due test rows are delivered),
// sendNow and cancel. Offline LLM, own DB. Run: pnpm --filter @threadline/core test:schedule
import { rmSync } from "node:fs";
import assert from "node:assert/strict";

process.env.THREADLINE_LLM = "offline";
const DB = process.env.THREADLINE_DB || "/tmp/tl-scheduler-test.db";
for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
process.env.THREADLINE_DB = DB;

const { run, get, all, id } = await import("@threadline/db");
const S = await import("./schedule.ts");
const { builtinImpls } = await import("./tools/builtin.ts");
const { loadConfig } = await import("./config.ts");
const { ensureCustomer } = await import("./memory.ts");
const { openConversation } = await import("./runtime.ts");

let passed = 0;
async function step(name: string, fn: () => Promise<void> | void) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n`, e); process.exitCode = 1; }
}
const P = (when: string, extra: Partial<Parameters<typeof S.parseSchedule>[0]> = {}, now = NOW) => S.parseSchedule({ when, ...extra }, { now });
// Saturday 10 Oct 2026 17:00 UTC
const NOW = new Date("2026-10-10T17:00:00Z");

console.log("parsing");
await step("in 3 days → exactly +72h, one-shot", () => {
  const r = P("in 3 days");
  assert.equal(r.repeat, null); assert.equal(r.first.toISOString(), "2026-10-13T17:00:00.000Z"); assert.equal(r.note, null);
});
await step("in 2 hours / in an hour / in 30 minutes", () => {
  assert.equal(P("in 2 hours").first.toISOString(), "2026-10-10T19:00:00.000Z");
  assert.equal(P("in an hour").first.toISOString(), "2026-10-10T18:00:00.000Z");
  assert.equal(P("in 30 minutes").first.toISOString(), "2026-10-10T17:30:00.000Z");
});
await step("tomorrow at 5pm (America/New_York) → 21:00Z", () => {
  const r = P("tomorrow at 5pm", { timezone: "America/New_York" });
  assert.equal(r.first.toISOString(), "2026-10-11T21:00:00.000Z"); assert.equal(r.timezone, "America/New_York");
});
await step("every Monday at 9am → weekly mon 09:00, first = Mon 12 Oct", () => {
  const r = P("every Monday at 9am");
  assert.deepEqual([r.repeat, r.days, r.atTime], ["weekly", "mon", "09:00"]);
  assert.equal(r.first.toISOString(), "2026-10-12T09:00:00.000Z");
});
await step("Mondays and Thursdays 6:30pm (plural, no 'every')", () => {
  const r = P("Mondays and Thursdays 6:30pm");
  assert.deepEqual([r.repeat, r.days, r.atTime], ["weekly", "mon,thu", "18:30"]);
});
await step("every weekday at 8:30 → mon..fri; first is Monday (today is Saturday)", () => {
  const r = P("every weekday at 8:30");
  assert.deepEqual([r.repeat, r.days, r.atTime], ["weekly", "mon,tue,wed,thu,fri", "08:30"]);
  assert.equal(r.first.toISOString(), "2026-10-12T08:30:00.000Z");
});
await step("every day at 7pm → today 19:00 (still ahead)", () => {
  const r = P("every day at 7pm");
  assert.equal(r.repeat, "daily"); assert.equal(r.first.toISOString(), "2026-10-10T19:00:00.000Z");
});
await step("daily at 8am → tomorrow 08:00 (already passed today)", () => {
  assert.equal(P("daily at 8am").first.toISOString(), "2026-10-11T08:00:00.000Z");
});
await step("monthly on the 1st at 10am → 1 Nov", () => {
  const r = P("monthly on the 1st at 10am");
  assert.deepEqual([r.repeat, r.days, r.atTime], ["monthly", "1", "10:00"]);
  assert.equal(r.first.toISOString(), "2026-11-01T10:00:00.000Z");
});
await step("monthly on the 31st clamps to 30 Nov after 31 Oct", () => {
  const rec = { repeat: "monthly" as const, days: "31", atTime: "09:00", timezone: "UTC" };
  const a = S.nextOccurrence(rec, NOW);
  assert.equal(a.toISOString(), "2026-10-31T09:00:00.000Z");
  assert.equal(S.nextOccurrence(rec, a).toISOString(), "2026-11-30T09:00:00.000Z");
});
await step("structured repeat/days/time from the LLM win over text", () => {
  const r = P("remind me about it", { repeat: "weekly", days: "wed,fri", time: "14:15" });
  assert.deepEqual([r.repeat, r.days, r.atTime], ["weekly", "wed,fri", "14:15"]);
});
await step("ISO with Z is absolute; ISO without offset is wall-clock in tz", () => {
  assert.equal(P("2026-11-10T09:00:00Z").first.toISOString(), "2026-11-10T09:00:00.000Z");
  assert.equal(P("2026-11-10T09:00", { timezone: "Asia/Kolkata" }).first.toISOString(), "2026-11-10T03:30:00.000Z");
});
await step("Friday 3pm / on Nov 10 / at 5pm", () => {
  assert.equal(P("Friday 3pm").first.toISOString(), "2026-10-16T15:00:00.000Z");
  assert.equal(P("on Nov 10").first.toISOString(), "2026-11-10T09:00:00.000Z");
  assert.equal(P("at 5pm").first.toISOString(), "2026-10-11T17:00:00.000Z");
});
await step("gibberish never errors: +24h with a note", () => {
  const r = P("whenever works lol");
  assert.equal(r.first.toISOString(), "2026-10-11T17:00:00.000Z"); assert.match(r.note!, /couldn't understand/);
});
await step("bad timezone falls back to UTC with a note; past time → +1 min", () => {
  const r = P("every monday 9am", { timezone: "Mars/Olympus" });
  assert.equal(r.timezone, "UTC"); assert.match(r.note!, /unknown timezone/);
  assert.match(P("2020-01-01T00:00:00Z").note!, /past/);
});
await step("DST: weekly 9am New York stays 9am local across the Nov 1 change", () => {
  const rec = { repeat: "weekly" as const, days: "mon", atTime: "09:00", timezone: "America/New_York" };
  const a = S.nextOccurrence(rec, new Date("2026-10-27T00:00:00Z"));   // Mon 2 Nov
  assert.equal(a.toISOString(), "2026-11-02T14:00:00.000Z");           // EST (-5)
  const b = S.nextOccurrence(rec, new Date("2026-10-20T00:00:00Z"));   // Mon 26 Oct
  assert.equal(b.toISOString(), "2026-10-26T13:00:00.000Z");           // EDT (-4)
});
await step("model flattened 'every Monday at 9am' to ISO → recurrence recovered from the customer's message", () => {
  const r = S.parseSchedule({ when: "2026-10-12T09:00:00Z" }, { now: NOW, context: "Also remind me every Monday at 9am to check my tea stock" });
  assert.deepEqual([r.repeat, r.days, r.atTime], ["weekly", "mon", "09:00"]);
  assert.equal(r.first.toISOString(), "2026-10-12T09:00:00.000Z"); assert.match(r.note!, /customer's message/);
  const t = S.parseSchedule({ when: "2026-10-12T14:30:00Z" }, { now: NOW, context: "every monday please" });
  assert.equal(t.atTime, "14:30");   // no time in their words → the model's time
  assert.equal(S.parseSchedule({ when: "in 3 days" }, { now: NOW, context: "remind me in 3 days" }).repeat, null);
});
await step("describe", () => {
  assert.equal(S.describeRecurrence({ repeat: "weekly", days: "mon", atTime: "09:00", timezone: "UTC" }), "every Monday at 09:00 UTC");
  assert.equal(S.describeRecurrence({ repeat: "weekly", days: "mon,tue,wed,thu,fri", atTime: "08:30", timezone: "Europe/London" }), "every weekday at 08:30 (Europe/London)");
});

console.log("db + tool + sweep");
const uid = id("u_"), botId = id("b_");
run("INSERT INTO users(id,email,name) VALUES (?,?,?)", [uid, `${uid}@x.test`, "T"]);
run(`INSERT INTO bots(id,user_id,name,slug,join_code,source_kind,source_json,status,profile_json) VALUES (?,?,?,?,?,?,?,?,?)`,
  [botId, uid, "Sched Bot", "sched-" + uid, "J" + uid, "website", "{}", "draft", JSON.stringify({ name: "Sched Bot", persona: "friendly", businessSummary: "A tea shop" })]);
const config = loadConfig(botId, { isTest: true }).config;
const testCust = ensureCustomer(botId, "web", "owner-preview");
const testConv = openConversation(botId, testCust, "web", true).id;
const realCust = ensureCustomer(botId, "imessage", "+15550001");
const tool = (input: any, ctx: any) => builtinImpls.schedule_message!(input, { botId, config, ...ctx }, {} as any) as Promise<any>;
const row = (sid: string) => S.getScheduled(sid)!;

let oneOff = "", weekly = "";
await step("tool in Build → Test (web, isTest) writes a test row with next_run_at = send_at", async () => {
  const o = await tool({ send_at: "in 3 days", prompt: "check on the tea order" }, { customerId: testCust, conversationId: testConv, channel: "web", isTest: true });
  assert.equal(o.ok, true); assert.ok(o.id);
  oneOff = o.id;
  const r = row(oneOff);
  assert.equal(r.is_test, 1); assert.equal(r.repeat, null); assert.equal(r.next_run_at, r.send_at); assert.equal(r.first_run_at, r.send_at);
  assert.ok(Math.abs(+new Date(r.send_at) - (Date.now() + 3 * 86400e3)) < 5000);
});
await step("tool parses 'every Monday at 9am' into repeat/days/at_time", async () => {
  const o = await tool({ send_at: "every Monday at 9am", prompt: "water the plants" }, { customerId: testCust, conversationId: testConv, channel: "web", isTest: true });
  weekly = o.id;
  const r = row(weekly);
  assert.deepEqual([r.repeat, r.days, r.at_time, r.timezone], ["weekly", "mon", "09:00", "UTC"]);
  assert.equal(new Date(r.next_run_at!).getUTCDay(), 1); assert.equal(new Date(r.next_run_at!).getUTCHours(), 9);
  assert.equal(o.schedule, "every Monday at 09:00 UTC");
});
await step("old-schema call (ISO send_at) after 'every Monday at 9am' in chat → weekly row", async () => {
  run("INSERT INTO messages(id,conversation_id,role,content) VALUES (?,?,?,?)", [id("m_"), testConv, "user", "remind me every Monday at 9am to check my tea stock"]);
  const o = await tool({ send_at: "2030-01-07T09:00:00Z", prompt: "check stock" }, { customerId: testCust, conversationId: testConv, channel: "web", isTest: true });
  const r = row(o.id);
  assert.deepEqual([r.repeat, r.days, r.at_time], ["weekly", "mon", "09:00"]);
  run("DELETE FROM scheduled_messages WHERE id=?", [o.id]);
});
await step("checks / simulated users (isTest on imessage, or dryRun) persist nothing", async () => {
  const before = all("SELECT id FROM scheduled_messages").length;
  const a = await tool({ send_at: "in 1 day", prompt: "x" }, { customerId: realCust, conversationId: "c", channel: "imessage", isTest: true });
  const b = await tool({ send_at: "in 1 day", prompt: "x" }, { customerId: realCust, conversationId: "c", channel: "web", isTest: true, dryRun: true });
  assert.equal(a.ok && b.ok, true); assert.equal(a.id, undefined);
  assert.equal(all("SELECT id FROM scheduled_messages").length, before);
});
await step("Send now on a recurring test row: delivered into the test chat, run_count 1, next_run_at +7 days", async () => {
  const before = row(weekly);
  const res = await S.sendNow(weekly);
  assert.equal(res.ok, true, res.error); assert.equal(res.mode, "delivered");
  const r = row(weekly);
  assert.equal(r.status, "scheduled"); assert.equal(r.run_count, 1); assert.equal(r.last_status, "sent"); assert.ok(r.last_run_at);
  assert.equal(+new Date(r.next_run_at!) - +new Date(before.next_run_at!), 7 * 86400e3);
  assert.equal(r.send_at, r.next_run_at);
  const last = get<{ content: string }>("SELECT content FROM messages WHERE conversation_id=? AND role='assistant' ORDER BY rowid DESC LIMIT 1", [testConv]);
  assert.match(last!.content, /water the plants/);   // offline LLM echoes the instruction
  assert.equal(S.chipView(r).following_run_at, new Date(+new Date(r.next_run_at!) + 7 * 86400e3).toISOString());
});
await step("Send now on a one-shot test row: status sent, run_count 1, next_run_at cleared; second Send now refused", async () => {
  const res = await S.sendNow(oneOff);
  assert.equal(res.ok, true);
  const r = row(oneOff);
  assert.deepEqual([r.status, r.run_count, r.next_run_at, r.last_status], ["sent", 1, null, "sent"]);
  assert.equal((await S.sendNow(oneOff)).ok, false);
});
await step("cancel sets status=cancelled; sweep ignores it", async () => {
  const o = await tool({ send_at: "every day at 8am", prompt: "c" }, { customerId: testCust, conversationId: testConv, channel: "web", isTest: true });
  assert.equal(S.cancelScheduled(o.id), true);
  assert.equal(row(o.id).status, "cancelled"); assert.equal(S.cancelScheduled(o.id), false);
});
await step("sweep delivers a due test row (worker path) and rolls it", async () => {
  const o = await tool({ send_at: "every day at 8am", prompt: "daily due" }, { customerId: testCust, conversationId: testConv, channel: "web", isTest: true });
  run("UPDATE scheduled_messages SET send_at=datetime('now','-1 minute'), next_run_at=? WHERE id=?", [new Date(Date.now() - 60e3).toISOString(), o.id]);
  const s = await S.sweepScheduled();
  assert.equal(s.delivered, 1);
  const r = row(o.id);
  assert.equal(r.run_count, 1); assert.equal(r.status, "scheduled"); assert.ok(+new Date(r.next_run_at!) > Date.now());
  assert.ok(+new Date(r.next_run_at!) - Date.now() <= 86400e3);
});
await step("real channel: tool writes is_test=0 row; gateway marks sent → sweep rolls it +7d and counts the run", async () => {
  const o = await tool({ send_at: "every Monday at 9am", prompt: "weekly real" }, { customerId: realCust, conversationId: "c", channel: "imessage", isTest: false });
  const r0 = row(o.id);
  assert.equal(r0.is_test, 0);
  // what apps/gateway/src/outbound.ts does when it delivers:
  run("UPDATE scheduled_messages SET status='sent', sent_at=datetime('now'), attempts=1, text='hi' WHERE id=?", [o.id]);
  const s = await S.sweepScheduled();
  assert.equal(s.rolled, 1);
  const r = row(o.id);
  assert.deepEqual([r.status, r.run_count, r.skip_count, r.attempts, r.text], ["scheduled", 1, 0, 0, null]);
  assert.equal(+new Date(r.next_run_at!) - +new Date(r0.next_run_at!), 7 * 86400e3);
  assert.equal(r.send_at, r.next_run_at);
});
await step("real channel failure: skip_count++, last_status/last_note set, still advanced (not wedged)", async () => {
  const o = await tool({ send_at: "every day at 9am", prompt: "daily real" }, { customerId: realCust, conversationId: "c", channel: "imessage", isTest: false });
  const r0 = row(o.id);
  run("UPDATE scheduled_messages SET status='failed', error='target not allowed' WHERE id=?", [o.id]);
  await S.sweepScheduled();
  const r = row(o.id);
  assert.deepEqual([r.status, r.run_count, r.skip_count, r.last_status, r.last_note], ["scheduled", 0, 1, "failed", "target not allowed"]);
  assert.equal(+new Date(r.next_run_at!) - +new Date(r0.next_run_at!), 86400e3);
});
await step("real one-shot: gateway sends → sweep records run_count once, status stays sent", async () => {
  const o = await tool({ send_at: "in 2 hours", prompt: "one real" }, { customerId: realCust, conversationId: "c", channel: "imessage", isTest: false });
  run("UPDATE scheduled_messages SET status='sent', sent_at=datetime('now') WHERE id=?", [o.id]);
  await S.sweepScheduled(); await S.sweepScheduled();
  const r = row(o.id);
  assert.deepEqual([r.status, r.run_count, r.last_status, r.next_run_at], ["sent", 1, "sent", null]);
});
await step("Send now on a real row makes it due for the gateway (queued), keeps next_run_at", async () => {
  const o = await tool({ send_at: "every Monday at 9am", prompt: "q" }, { customerId: realCust, conversationId: "c", channel: "imessage", isTest: false });
  const res = await S.sendNow(o.id);
  assert.equal(res.mode, "queued");
  const r = row(o.id);
  assert.ok(+new Date(r.send_at) <= Date.now()); assert.ok(+new Date(r.next_run_at!) > Date.now());
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
