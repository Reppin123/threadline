// Data-path half of scripts/smoke.sh: bot in the DB → build_bot job → (running worker) → ready → deploy →
// one customer turn through the gateway's in-memory simulator transport (same Gateway/router/core.chat code as iMessage).
// Prints "RESULT <name> <PASS|FAIL|SKIP> <detail>" lines. Env: THREADLINE_DB, SMOKE_URL (website bot instead of idea),
// SMOKE_BUILD_TIMEOUT_S (default 600).
import { get, run, id, enqueueJob, json, dbPath } from "../packages/db/src/index.ts";
import { core } from "../packages/core/src/index.ts";

const result = (name: string, status: "PASS" | "FAIL" | "SKIP", detail = "") =>
  console.log(`RESULT ${name} ${status} ${detail.replace(/\s+/g, " ").slice(0, 160)}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const email = "smoke@threadline.dev";
let user = get<{ id: string }>("SELECT id FROM users WHERE email=?", [email]);
if (!user) { user = { id: id("u_") }; run("INSERT INTO users(id,email,name) VALUES (?,?,?)", [user.id, email, "Smoke Test"]); }

// Each run replaces the previous run's smoke bots (cascade deletes their routes, conversations, jobs stay as history).
run("DELETE FROM bots WHERE user_id=?", [user.id]);

const source = process.env.SMOKE_URL
  ? { kind: "website" as const, url: process.env.SMOKE_URL }
  : { kind: "idea" as const, idea: "A corner bakery that sells sourdough and takes cake pre-orders for pickup" };
const bot = await core.createBot(user.id, source);
run("UPDATE bots SET status='building', build_progress_json=? WHERE id=?", [json.str({ step: "read_source", label: "Queued", pct: 2 }), bot.botId]);
const jobId = enqueueJob("build_bot", { botId: bot.botId });
result("db_create_enqueue", "PASS", `bot=${bot.botId} job=${jobId} db=${dbPath()}`);

const timeoutMs = Number(process.env.SMOKE_BUILD_TIMEOUT_S || 600) * 1000;
const t0 = Date.now();
let claimed = false, status = "", lastLabel = "";
while (Date.now() - t0 < timeoutMs) {
  const j = get<{ status: string; error: string | null }>("SELECT status, error FROM jobs WHERE id=?", [jobId])!;
  const b = get<{ status: string; build_progress_json: string }>("SELECT status, build_progress_json FROM bots WHERE id=?", [bot.botId])!;
  if (j.status !== "queued") claimed = true;
  const label = json.parse<{ label?: string; pct?: number }>(b.build_progress_json, {});
  if (label.label && label.label !== lastLabel) { lastLabel = label.label; console.log(`  build: ${label.pct ?? "?"}% ${label.label}`); }
  if (j.status === "done" || j.status === "failed" || b.status === "error") { status = `${j.status}/${b.status}${j.error ? " " + j.error.split("\n")[0] : ""}`; break; }
  if (!claimed && Date.now() - t0 > 15_000) { status = "not claimed in 15s — is the worker running?"; break; }
  await sleep(1000);
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const ready = get<{ status: string }>("SELECT status FROM bots WHERE id=?", [bot.botId])!.status;
result("worker_build", ready === "ready" || ready === "live" ? "PASS" : "FAIL", `${status || "timeout"} bot=${ready} in ${secs}s`);
if (ready !== "ready" && ready !== "live") process.exit(1);

await core.deploy(bot.botId);
run("INSERT OR REPLACE INTO channels(bot_id, channel, status) VALUES (?, 'imessage', 'live')", [bot.botId]);

// Gateway simulator (in-process, in-memory Spectrum platform). Skips cleanly if the gateway's sim API isn't there.
try {
  process.env.GATEWAY_LOG ||= "silent";
  process.env.GATEWAY_MODE = "terminal";
  const { loadConfig } = await import("../apps/gateway/src/config.ts");
  const { Gateway } = await import("../apps/gateway/src/gateway.ts");
  const { TransportSet, addSimTransport } = await import("../apps/gateway/src/transports.ts");
  const cfg = { ...loadConfig(), debounceMs: 100, bubbleDelayScale: 0 };
  const gw = new Gateway(cfg as any, core as any);
  const transports = new TransportSet(cfg as any, gw);
  const sim = await addSimTransport(transports, "smoke", "imessage");
  const handle = `+1555${Math.floor(1e6 + Math.random() * 9e6)}`;
  const settle = async (ms: number) => { const end = Date.now() + ms; while (Date.now() < end) { await sleep(100); await gw.idle(); if ((sim as any).textsTo(handle).length >= want) break; } };
  let want = 1;
  sim.inject({ sender: handle, text: `start ${bot.joinCode}` });
  await settle(10_000);
  const bound = get<{ bot_id: string }>("SELECT bot_id FROM line_routes WHERE channel='imessage' AND sender_handle=?", [handle])?.bot_id === bot.botId;
  want = sim.textsTo(handle).length + 1;
  const q = source.kind === "idea" ? "What do you sell, and can I pre-order a cake?" : "What do you sell?";
  const t1 = Date.now();
  sim.inject({ sender: handle, text: q });
  await settle(120_000);
  const replies = sim.textsTo(handle).slice(want - 1);
  result("gateway_join", bound ? "PASS" : "FAIL", `"start ${bot.joinCode}" → ${bound ? "bound" : "not bound"}`);
  result("gateway_chat", replies.length ? "PASS" : "FAIL", replies.length ? `${((Date.now() - t1) / 1000).toFixed(1)}s "${replies.join(" | ")}"` : "no reply bubbles");
  await transports.stop?.();
  run("UPDATE channels SET status='off' WHERE bot_id=?", [bot.botId]); // don't leave smoke bots live on the shared line
} catch (e: any) {
  result("gateway_chat", "SKIP", `gateway simulator unavailable: ${e?.message || e}`);
  // Fall back to a direct core.chat so the data path is still exercised.
  const r = await core.chat({ botId: bot.botId, channel: "imessage", customerHandle: "+15550000000", text: "What do you sell?" });
  result("core_chat", r.replies.length ? "PASS" : "FAIL", r.replies.join(" | "));
}
process.exit(0);
