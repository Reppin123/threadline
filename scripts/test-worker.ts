// End-to-end test for apps/worker against a temp DB with the offline LLM.
// Run: pnpm test:worker   (or: apps/worker/node_modules/.bin/tsx scripts/test-worker.ts)
import { spawn } from "node:child_process";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "tl-platform-"));
const DB = join(dir, "test.db");
process.env.THREADLINE_DB = DB;
process.env.THREADLINE_LLM = "offline";
const PORT = Number(process.env.TEST_WORKER_PORT || 3299);

const { run, get, id, enqueueJob } = await import("../packages/db/src/index.ts");
const { core } = await import("../packages/core/src/index.ts");

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? "  " + JSON.stringify(detail) : ""}`);
  if (!ok) failures++;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | undefined | false, ms: number): Promise<T | undefined> {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(250); }
  return undefined;
}

// Seed: user + idea bot (no network needed) + a job for a missing bot.
const userId = id("u_");
run("INSERT INTO users(id,email,name) VALUES (?,?,?)", [userId, `worker-test-${userId}@threadline.dev`, "Worker Test"]);
const { botId } = await core.createBot(userId, { kind: "idea", idea: "A neighbourhood bakery that takes cake pre-orders" });
const buildJob = enqueueJob("build_bot", { botId });
const missingJob = enqueueJob("build_bot", { botId: "bot_does_not_exist" });
const unknownJob = enqueueJob("frobnicate", { botId });
const schedJob = enqueueJob("send_scheduled", {});

const tsx = join(root, "apps/worker/node_modules/.bin/tsx");
const child = spawn(tsx, [join(root, "apps/worker/src/index.ts")], {
  env: { ...process.env, WORKER_PORT: String(PORT), WORKER_POLL_MS: "200", WORKER_TEST_HANDLERS: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
child.stdout.on("data", (d) => { out += d; process.stdout.write("  │ " + String(d).trimEnd().replace(/\n/g, "\n  │ ") + "\n"); });
child.stderr.on("data", (d) => { out += d; process.stderr.write("  │ " + String(d)); });
const exited = new Promise<number | null>((r) => child.on("exit", (c) => r(c)));

try {
  const done = await waitFor(() => get<{ status: string }>("SELECT status FROM jobs WHERE id=? AND status IN ('done','failed')", [buildJob]), 120_000);
  check("build_bot job finished", done?.status === "done", done ?? get("SELECT status,error FROM jobs WHERE id=?", [buildJob]));
  const bot = get<{ status: string; build_progress_json: string }>("SELECT status, build_progress_json FROM bots WHERE id=?", [botId]);
  check("bot is ready after build", bot?.status === "ready" || bot?.status === "live", bot);

  const missing = await waitFor(() => get<{ status: string; error: string }>("SELECT status,error FROM jobs WHERE id=? AND status='failed'", [missingJob]), 10_000);
  check("missing-bot job fails without retry", !!missing && /not found/.test(missing.error), missing ?? get("SELECT * FROM jobs WHERE id=?", [missingJob]));
  const unknown = get<{ status: string }>("SELECT status FROM jobs WHERE id=?", [unknownJob]);
  check("unknown job type is left queued for other consumers", unknown?.status === "queued", unknown);
  const sched = get<{ status: string }>("SELECT status FROM jobs WHERE id=?", [schedJob]);
  check("send_scheduled left for gateway", sched?.status === "queued", sched);

  const h = await fetch(`http://localhost:${PORT}/health`).then((r) => r.json()).catch((e) => ({ error: String(e) }));
  check("GET /health ok", h.ok === true && h.service === "worker" && typeof h.queue?.byStatus?.done === "number", h);
  check("health reports processed/failed counts", h.processed >= 1 && h.failed >= 1 && !!h.lastError, { processed: h.processed, failed: h.failed });
  const hb = get<{ n: number }>("SELECT COUNT(*) n FROM events WHERE type='worker_heartbeat'");
  check("heartbeat event written", (hb?.n ?? 0) >= 1, hb);

  // Graceful shutdown: enqueue a job then SIGTERM right after it is claimed — it must still finish.
  const job2 = enqueueJob("sleep", { ms: 2000 });
  await waitFor(() => get("SELECT 1 x FROM jobs WHERE id=? AND status='running'", [job2]), 10_000);
  child.kill("SIGTERM");
  const code = await Promise.race([exited, sleep(120_000).then(() => "timeout" as const)]);
  check("SIGTERM → clean exit 0", code === 0, code);
  const j2 = get<{ status: string }>("SELECT status FROM jobs WHERE id=?", [job2]);
  check("in-flight job finished before exit", j2?.status === "done", j2);
} finally {
  if (child.exitCode === null) child.kill("SIGKILL");
  rmSync(dir, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nALL PASS");
process.exit(failures ? 1 : 0);
