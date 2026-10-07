// Gateway simulator / CI test. Feeds scripted inbound messages through Spectrum (in-memory "sim" platform built with
// definePlatform) → the SAME TransportSet + Gateway + router + OutboundWorker code used in production. No network.
//   pnpm --filter @threadline/gateway test          (uses the real @threadline/core with THREADLINE_LLM=offline)
//   SIM_CORE=echo pnpm --filter @threadline/gateway test   (deterministic echo core, isolates gateway behaviour)
import { rmSync, existsSync } from "node:fs";

process.env.THREADLINE_DB ||= "/tmp/tl-gateway-sim.db";
process.env.THREADLINE_LLM ||= "offline";
process.env.GATEWAY_LOG ||= "silent";
for (const s of ["", "-wal", "-shm"]) rmSync(process.env.THREADLINE_DB + s, { force: true });

const { run, get, all, id } = await import("@threadline/db");
const { core: realCore } = await import("@threadline/core");
const { loadConfig } = await import("../src/config.ts");
const { Gateway } = await import("../src/gateway.ts");
const { TransportSet, addSimTransport } = await import("../src/transports.ts");
const { OutboundWorker } = await import("../src/outbound.ts");
const { healthSnapshot } = await import("../src/server.ts");
type ChatInput = import("@threadline/core").ChatInput;
type ChatResult = import("@threadline/core").ChatResult;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- core spy ----------
const calls: ChatInput[] = [];
const results: ChatResult[] = [];
const doneOrder: string[] = [];
let composeCalls = 0;
let delayFor: (text: string) => number = () => 0;
const useEcho = process.env.SIM_CORE === "echo";
const spyCore = {
  async chat(input: ChatInput): Promise<ChatResult> {
    calls.push(input);
    if (input.text.includes("explode")) throw new Error("core blew up (simulated)");
    const d = delayFor(input.text);
    if (d) await sleep(d);
    const r = useEcho
      ? { conversationId: "cv_echo", replies: [`echo: ${input.text}`, "anything else?"], toolCalls: [], couldntAnswer: false, costUsd: 0 }
      : await realCore.chat(input);
    results.push(r);
    doneOrder.push(input.text);
    return r;
  },
  async composeOutbound(botId: string, channel: any, handle: string, prompt: string) {
    composeCalls++;
    return useEcho ? { text: `reminder: ${prompt}`, conversationId: "" } : realCore.composeOutbound(botId, channel, handle, prompt);
  },
};

// ---------- gateway under test ----------
Object.assign(process.env, { GATEWAY_MODE: "terminal", GATEWAY_QUIET_UNBOUND: "0" });
const cfg = { ...loadConfig(), debounceMs: 150, bubbleDelayScale: 0, retryBaseMs: 10, maxSendAttempts: 3, outboundPollMs: 60_000 };
const gw = new Gateway(cfg, spyCore);
const transports = new TransportSet(cfg, gw);
const sim = await addSimTransport(transports, "sim", "imessage");
const outbound = new OutboundWorker(gw, () => transports.channels());

async function settle() {
  for (let i = 0; i < 3; i++) { await sleep(25); await gw.idle(); }
}
async function say(sender: string, ...texts: string[]) {
  for (const t of texts) sim.inject({ sender, text: t });
  await settle();
}
const textsTo = (h: string) => sim.textsTo(h);
const last = (h: string) => textsTo(h).at(-1) ?? "";
const boundTo = (h: string) => get<{ bot_id: string }>("SELECT bot_id FROM line_routes WHERE channel='imessage' AND sender_handle=?", [h])?.bot_id;

// ---------- fixtures ----------
const userId = id("u_");
run("INSERT INTO users(id, email) VALUES (?, ?)", [userId, "sim@threadline.local"]);
async function liveBot(idea: string) {
  const b = await realCore.createBot(userId, { kind: "idea", idea });
  await realCore.buildBot(b.botId);
  await realCore.deploy(b.botId);
  run("INSERT OR REPLACE INTO channels(bot_id, channel, status) VALUES (?, 'imessage', 'live')", [b.botId]);
  return b;
}
const A = await liveBot("Barber shop that books haircuts");
const B = await liveBot("Tea store that tracks orders");

// ---------- runner ----------
let passed = 0, failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e instanceof Error ? e.message : e}`); }
}
function expect(cond: unknown, msg: string): asserts cond { if (!cond) throw new Error(msg); }

console.log(`gateway simulator — core=${useEcho ? "echo" : "real (@threadline/core, THREADLINE_LLM=" + process.env.THREADLINE_LLM + ")"} db=${process.env.THREADLINE_DB}`);

await test("unbound sender gets help text, core not called", async () => {
  await say("+1001", "hello?");
  expect(textsTo("+1001").length === 1, `expected 1 bubble, got ${JSON.stringify(textsTo("+1001"))}`);
  expect(/start/i.test(last("+1001")), `help text should explain "start <code>": ${last("+1001")}`);
  expect(calls.length === 0, "core.chat must not be called for unbound senders");
});

await test("join: 'Start  <CODE>' (case/spacing tolerant) binds and greets", async () => {
  await say("+1001", `Start   ${A.joinCode.toUpperCase().replace("-", " ")}`);
  expect(boundTo("+1001") === A.botId, "line_routes should bind +1001 → bot A");
  expect(/stop/i.test(last("+1001")), `greeting should mention stop/switch: ${last("+1001")}`);
  expect(calls.length === 0, "join alone should not call core.chat");
});

await test("bound sender's question → core.chat → reply bubbles + DB rows (channel imessage)", async () => {
  const before = textsTo("+1001").length;
  await say("+1001", "how much is a fade?");
  const c = calls.at(-1)!;
  expect(c && c.botId === A.botId && c.channel === "imessage" && c.customerHandle === "+1001" && c.text === "how much is a fade?", `bad ChatInput ${JSON.stringify(c)}`);
  const r = results.at(-1)!;
  const got = textsTo("+1001").slice(before);
  expect(got.length === r.replies.filter((x) => x.trim()).length && got.length > 0, `each reply is its own bubble: ${JSON.stringify(got)} vs ${JSON.stringify(r.replies)}`);
  if (!useEcho) {
    const n = get<{ n: number }>(`SELECT COUNT(*) n FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN customers cu ON cu.id = c.customer_id
                                    WHERE c.bot_id = ? AND c.channel = 'imessage' AND cu.handle = '+1001'`, [A.botId])!.n;
    expect(n >= 2, `expected user+assistant messages persisted, got ${n}`);
  }
});

await test("bare join code binds; 'start <code> <question>' binds and answers the question", async () => {
  await say("+1002", B.joinCode);
  expect(boundTo("+1002") === B.botId, "bare code should bind");
  const n = calls.length;
  await say("+1003", `start ${A.joinCode} are you open sunday?`);
  expect(boundTo("+1003") === A.botId, "should bind +1003");
  expect(calls.length === n + 1 && calls.at(-1)!.text === "are you open sunday?", `rest of message should go to the bot: ${calls.at(-1)?.text}`);
});

await test("unknown code → helpful error; bound customer saying 'start over' still reaches their bot", async () => {
  await say("+1004", "start nope-zz9");
  expect(/couldn't find/i.test(last("+1004")) && !boundTo("+1004"), last("+1004"));
  const n = calls.length;
  await say("+1001", "start over");
  expect(calls.length === n + 1 && calls.at(-1)!.text === "start over" && boundTo("+1001") === A.botId, "bound sender's 'start over' should go to bot A");
});

await test("switch <code> rebinds to another bot", async () => {
  await say("+1001", `switch ${B.joinCode}`);
  expect(boundTo("+1001") === B.botId, "should be bound to B");
  await say("+1001", "where is my order?");
  expect(calls.at(-1)!.botId === B.botId, "next message should go to bot B");
});

await test("stop unbinds; next message gets help", async () => {
  await say("+1001", "STOP");
  expect(!boundTo("+1001"), "route should be deleted");
  expect(/left/i.test(last("+1001")), last("+1001"));
  const n = calls.length;
  await say("+1001", "hello again");
  expect(calls.length === n && /start/i.test(last("+1001")), "unbound again → help, no core call");
});

await test("burst debounce: 'hi' + 'need to move my cut' → ONE core.chat turn", async () => {
  await say("+1005", `start ${A.joinCode}`);
  const n = calls.length;
  sim.inject({ sender: "+1005", text: "hi" });
  await sleep(40);
  sim.inject({ sender: "+1005", text: "need to move my cut" });
  await settle();
  expect(calls.length === n + 1, `expected 1 turn, got ${calls.length - n}`);
  expect(calls.at(-1)!.text === "hi\nneed to move my cut", `merged text: ${JSON.stringify(calls.at(-1)!.text)}`);
});

await test("ordering: per-sender serial queue keeps replies in order while a slow turn runs", async () => {
  await say("+1006", `start ${A.joinCode}`);
  delayFor = (t) => (t === "first" ? 400 : 0);
  const n = calls.length, before = textsTo("+1006").length;
  sim.inject({ sender: "+1006", text: "first" });
  await sleep(cfg.debounceMs + 80);          // first turn is now in-flight (slow)
  sim.inject({ sender: "+1006", text: "second" });
  await settle();
  delayFor = () => 0;
  expect(calls.slice(n).map((c) => c.text).join(",") === "first,second", `call order ${calls.slice(n).map((c) => c.text)}`);
  if (useEcho) {
    const got = textsTo("+1006").slice(before);
    expect(got[0] === "echo: first" && got[2] === "echo: second", `reply order ${JSON.stringify(got)}`);
  } else {
    expect(textsTo("+1006").length - before >= 2, "both turns answered");
  }
});

await test("senders are independent: a slow sender doesn't block another", async () => {
  delayFor = (t) => (t === "slow one" ? 1500 : 0);
  const mark = doneOrder.length;
  sim.inject({ sender: "+1006", text: "slow one" });
  sim.inject({ sender: "+1005", text: "quick one" });
  await settle();
  delayFor = () => 0;
  const order = doneOrder.slice(mark);
  expect(order.join(",") === "quick one,slow one", `completion order ${order}`);
});

await test("reactions/tapbacks ignored gracefully; duplicate message ids processed once", async () => {
  const n = calls.length, before = textsTo("+1005").length;
  sim.inject({ sender: "+1005", reaction: { emoji: "❤️", targetId: "out_1" } });
  sim.inject({ sender: "+1005", text: "dup check", id: "dup-1" });
  sim.inject({ sender: "+1005", text: "dup check", id: "dup-1" });
  await settle();
  expect(calls.length === n + 1 && calls.at(-1)!.text === "dup check", `expected exactly 1 turn, got ${calls.slice(n).map((c) => c.text)}`);
  expect(textsTo("+1005").length > before, "replied once");
});

await test("attachments are downloaded and passed through to core.chat", async () => {
  sim.inject({ sender: "+1005", attachment: { name: "cut.jpg", mimeType: "image/jpeg", bytes: Buffer.from("fakejpeg") } });
  await settle();
  const att = calls.at(-1)!.attachments?.[0];
  expect(att && att.mime === "image/jpeg" && att.path && existsSync(att.path), `attachment not passed: ${JSON.stringify(calls.at(-1))}`);
  rmSync(att.path!, { force: true });
});

await test("a failing message never kills the gateway (apology, then next message works)", async () => {
  await say("+1005", "explode please");
  expect(/snag/i.test(last("+1005")), `apology expected: ${last("+1005")}`);
  const n = calls.length;
  await say("+1005", "still there?");
  expect(calls.length === n + 1, "gateway should keep processing");
});

await test("provider send failure → retried with backoff → delivered", async () => {
  const before = textsTo("+1005").length, retries = gw.stats.sendRetries;
  sim.failNextSends(2);
  await say("+1005", "retry me");
  expect(textsTo("+1005").length > before, "reply should be delivered after retries");
  expect(gw.stats.sendRetries - retries >= 2, `expected ≥2 retries, got ${gw.stats.sendRetries - retries}`);
});

await test("newly deployed bot is routable without restart; bot taken offline → customer told + unbound", async () => {
  const C = await liveBot("Florist that delivers bouquets");
  await say("+1007", `start ${C.joinCode}`);
  expect(boundTo("+1007") === C.botId, "new bot should be routable immediately");
  run("UPDATE channels SET status = 'off' WHERE bot_id = ? AND channel = 'imessage'", [C.botId]);
  await say("+1007", "hello?");
  expect(/no longer available/i.test(last("+1007")) && !boundTo("+1007"), last("+1007"));
  await say("+1008", `start ${C.joinCode}`);
  expect(/couldn't find/i.test(last("+1008")), "offline bot's code must not bind");
});

// ---------- scheduled messages ----------
function customerOf(botId: string, handle: string) {
  let c = get<{ id: string }>("SELECT id FROM customers WHERE bot_id = ? AND handle = ?", [botId, handle]);
  if (!c) { c = { id: id("cu_") }; run("INSERT INTO customers(id, bot_id, channel, handle) VALUES (?,?,?,?)", [c.id, botId, "imessage", handle]); }
  return c.id;
}
function schedule(botId: string, handle: string, o: { text?: string; prompt?: string; at?: string; key?: string }) {
  const sid = id("sm_");
  run(`INSERT INTO scheduled_messages(id, bot_id, customer_id, channel, prompt, text, send_at, idempotency_key) VALUES (?,?,?,?,?,?,?,?)`,
    [sid, botId, customerOf(botId, handle), "imessage", o.prompt ?? "check-in", o.text ?? null, o.at ?? new Date(Date.now() - 1000).toISOString(), o.key ?? null]);
  return sid;
}
const row = (sid: string) => get<{ status: string; attempts: number; text: string | null; error: string | null; sent_at: string | null }>("SELECT * FROM scheduled_messages WHERE id = ?", [sid])!;

await test("scheduled message: due → composeOutbound (text null) → delivered → marked sent; future one waits", async () => {
  const before = textsTo("+1005").length, composes = composeCalls;
  const due = schedule(A.botId, "+1005", { prompt: "remind about Friday 3pm haircut" });
  const later = schedule(A.botId, "+1005", { text: "see you tomorrow", at: new Date(Date.now() + 3600_000).toISOString() });
  await outbound.tick();
  expect(row(due).status === "sent" && row(due).sent_at && row(due).text, `due row: ${JSON.stringify(row(due))}`);
  expect(composeCalls === composes + 1, "composeOutbound should be called once for a text-less row");
  expect(textsTo("+1005").length === before + 1, "delivered one bubble");
  expect(row(later).status === "scheduled", "future row must wait");
});

await test("scheduled message to a customer we never heard from opens a new DM (space.create)", async () => {
  const sid = schedule(A.botId, "+1999", { text: "Your table is ready" });
  await outbound.tick();
  expect(row(sid).status === "sent" && last("+1999").includes("Your table is ready"), `${JSON.stringify(row(sid))} / ${last("+1999")}`);
});

await test("scheduled from a bot the customer isn't currently talking to is prefixed with the bot name", async () => {
  const sid = schedule(B.botId, "+1005", { text: "Your tea shipped" });   // +1005 is bound to A
  await outbound.tick();
  expect(row(sid).status === "sent" && /: Your tea shipped$/.test(last("+1005")) && last("+1005") !== "Your tea shipped", last("+1005"));
});

await test("idempotency: duplicate key rejected; concurrent workers deliver exactly once; no resend after sent", async () => {
  const sid = schedule(A.botId, "+1005", { text: "only once please", key: "order-42-ready" });
  let dupRejected = false;
  try { schedule(A.botId, "+1005", { text: "only once please", key: "order-42-ready" }); } catch { dupRejected = true; }
  expect(dupRejected, "UNIQUE(bot_id, idempotency_key) should reject the duplicate");
  const before = textsTo("+1005").filter((t) => t === "only once please").length;
  const other = new OutboundWorker(gw, () => transports.channels());
  await Promise.all([outbound.tick(), other.tick(), outbound.tick()]);
  await outbound.tick();
  const after = textsTo("+1005").filter((t) => t === "only once please").length;
  expect(after - before === 1, `delivered ${after - before} times`);
  expect(row(sid).status === "sent" && row(sid).attempts === 1, JSON.stringify(row(sid)));
});

await test("scheduled send failure → row retried with backoff → sent on attempt 2", async () => {
  const sid = schedule(A.botId, "+1005", { text: "retry scheduled" });
  sim.failNextSends(cfg.maxSendAttempts);       // all in-process retries of attempt 1 fail
  await outbound.tick();
  let r = row(sid);
  expect(r.status === "scheduled" && r.attempts === 1 && r.error, `after failure: ${JSON.stringify(r)}`);
  await outbound.tick();
  expect(row(sid).status === "scheduled", "backoff should delay the retry");
  await sleep(cfg.retryBaseMs * 4 + 250);
  await outbound.tick();
  r = row(sid);
  expect(r.status === "sent" && r.attempts === 2 && last("+1005") === "retry scheduled", JSON.stringify(r));
});

await test("scheduled permanent failure → marked failed after max attempts", async () => {
  const sid = schedule(A.botId, "+1005", { text: "never arrives" });
  sim.failNextSends(1000);
  for (let i = 0; i < cfg.maxSendAttempts; i++) { await outbound.tick(); await sleep(cfg.retryBaseMs * 4 ** (i + 1) + 250); }
  sim.failNextSends(0);
  expect(row(sid).status === "failed" && row(sid).attempts === cfg.maxSendAttempts, JSON.stringify(row(sid)));
});

await test("invite: business texts first (shared pool) → bound + greeted → customer's reply reaches the bot", async () => {
  const r = await gw.invite(B.joinCode, "(555) 000-1234");
  expect(r.handle === "+15550001234" && boundTo("+15550001234") === B.botId, JSON.stringify(r));
  expect(textsTo("+15550001234").length === 1, textsTo("+15550001234").join(" | "));
  const before = calls.length;
  await say("+15550001234", "do you have green tea?");
  expect(calls.length === before + 1 && calls.at(-1)!.botId === B.botId && textsTo("+15550001234").length >= 2, textsTo("+15550001234").join(" | "));
  let rejected = 0;
  for (const [bot, h] of [["nope-000", "+15550001234"], [B.botId, "not a phone"]]) { try { await gw.invite(bot, h); } catch { rejected++; } }
  expect(rejected === 2, `rejected ${rejected}`);
});

await test("health snapshot is accurate", async () => {
  await say("+1005", "ping");
  const h = healthSnapshot(gw, transports, outbound);
  expect(h.ok && h.connectedProviders.includes("sim"), JSON.stringify(h.providers));
  expect(h.liveBots === all("SELECT 1 FROM channels WHERE channel='imessage' AND status='live'").length && h.liveBots >= 2, `liveBots ${h.liveBots}`);
  expect(h.queueDepth === 0 && h.lastMessageAt && Date.now() - Date.parse(h.lastMessageAt) < 5000, JSON.stringify(h));
  expect(h.scheduledDue === 0, `scheduledDue ${h.scheduledDue}`);
});

await transports.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
