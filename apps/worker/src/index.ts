// Threadline background worker: claims jobs from the SQLite queue (packages/db) and runs them via @threadline/core.
// Env: THREADLINE_DB, WORKER_PORT (3200), WORKER_CONCURRENCY (2), WORKER_POLL_MS (1000), WORKER_ONCE=1 (exit when queue empty).
// send_scheduled jobs are owned by the gateway outbound loop and deliberately not claimed here.
import { createServer } from "node:http";
import { hostname } from "node:os";
import { all, get, run, json, claimJob, completeJob, failJob, requeueStaleJobs, logEvent, dbPath, type JobRow } from "@threadline/db";
import { core, ops } from "@threadline/core";

const PORT = Number(process.env.WORKER_PORT || 3200);
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 2));
const POLL_MS = Number(process.env.WORKER_POLL_MS || 1000);
const HEARTBEAT_MS = Number(process.env.WORKER_HEARTBEAT_MS || 60_000);
const ONCE = process.env.WORKER_ONCE === "1";
const WORKER_PREFIX = `worker@${hostname()}`;
const WORKER_ID = `${WORKER_PREFIX}:${process.pid}`;

type Handler = (payload: any, job: JobRow) => Promise<unknown>;
const handlers: Record<string, Handler> = {
  async build_bot(p) {
    requireBot(p.botId);
    await core.buildBot(p.botId);
    return botResult(p.botId);
  },
  async recrawl(p) {
    requireBot(p.botId);
    await core.buildBot(p.botId);
    return botResult(p.botId);
  },
  async run_checks(p) {
    requireBot(p.botId);
    const opts = p.opts ?? (p.simulatedUsers ? { simulatedUsers: p.simulatedUsers } : undefined);
    return await core.runChecks(p.botId, opts);
  },
};
// Test-only job used by scripts/test-worker.ts to prove graceful drain.
if (process.env.WORKER_TEST_HANDLERS === "1") handlers.sleep = async (p) => { await new Promise((r) => setTimeout(r, Number(p.ms) || 1000)); return { slept: p.ms }; };
const TYPES = Object.keys(handlers);

function requireBot(botId: unknown) {
  if (typeof botId !== "string" || !botId) throw new Error("payload.botId missing");
  if (!get("SELECT id FROM bots WHERE id=?", [botId])) throw new NonRetryable(`bot ${botId} not found`);
}
function botResult(botId: string) {
  const b = get<{ status: string; build_progress_json: string | null }>("SELECT status, build_progress_json FROM bots WHERE id=?", [botId]);
  if (b?.status === "error") {
    const prog = json.parse<{ error?: string; detail?: string }>(b.build_progress_json, {});
    throw new Error(`build ended in error: ${prog.error || prog.detail || "unknown"}`);
  }
  return { status: b?.status };
}
class NonRetryable extends Error {}

// ---------- state ----------
const state = {
  startedAt: new Date().toISOString(),
  running: new Map<string, { id: string; type: string; botId?: string; startedAt: string }>(),
  processed: 0,
  failed: 0,
  lastError: null as null | { jobId: string; type: string; error: string; at: string },
  stopping: false,
};

function log(msg: string, extra?: unknown) {
  console.log(`[worker] ${new Date().toISOString()} ${msg}${extra !== undefined ? " " + JSON.stringify(extra) : ""}`);
}

async function runJob(job: JobRow) {
  const payload = json.parse<any>(job.payload_json, {});
  const t0 = Date.now();
  state.running.set(job.id, { id: job.id, type: job.type, botId: payload.botId, startedAt: new Date().toISOString() });
  log(`claimed ${job.type} ${job.id} (attempt ${job.attempts}/${job.max_attempts})`, payload);
  try {
    const handler = handlers[job.type];
    if (!handler) throw new NonRetryable(`no handler for job type ${job.type}`);
    const result = await handler(payload, job);
    completeJob(job.id, result ?? null);
    state.processed++;
    log(`done ${job.type} ${job.id} in ${Date.now() - t0}ms`);
  } catch (e: any) {
    const msg = String(e?.stack || e?.message || e).slice(0, 2000);
    state.failed++;
    state.lastError = { jobId: job.id, type: job.type, error: String(e?.message || e), at: new Date().toISOString() };
    if (e instanceof NonRetryable || e?.name === "LimitError" || e?.name === "SpendCapError") run("UPDATE jobs SET attempts=max_attempts WHERE id=?", [job.id]);
    failJob(job.id, msg);
    const final = get<{ status: string }>("SELECT status FROM jobs WHERE id=?", [job.id])?.status === "failed";
    if (final && (job.type === "build_bot" || job.type === "recrawl") && typeof payload.botId === "string") {
      // core normally records its own error; make sure the UI never spins on 'building' forever.
      run("UPDATE bots SET status='error', build_progress_json=? WHERE id=? AND status='building'", [
        json.str({ step: "done", label: "Build failed", pct: 100, error: String(e?.message || e) }), payload.botId]);
    }
    log(`failed ${job.type} ${job.id}: ${e?.message || e}`);
    if (final && e?.name !== "LimitError" && e?.name !== "SpendCapError") ops.reportError(e, { service: "worker", where: `job:${job.type}`, jobId: job.id, botId: payload.botId });
    try { logEvent(payload.botId ?? null, "job_failed", { jobId: job.id, type: job.type, error: String(e?.message || e) }); } catch {}
  } finally {
    state.running.delete(job.id);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sleepers = new Set<() => void>();
const wake = () => sleepers.forEach((f) => f());
function idle(ms: number) {
  return new Promise<void>((r) => { const t = setTimeout(done, ms); function done() { clearTimeout(t); sleepers.delete(done); r(); } sleepers.add(done); });
}

async function slot(n: number) {
  while (!state.stopping) {
    let job: JobRow | undefined;
    try {
      job = claimJob(WORKER_ID, TYPES);
    } catch (e: any) {
      // SQLITE_BUSY etc. — back off briefly
      log(`slot ${n} claim error: ${e?.message || e}`);
      await sleep(500 + Math.random() * 500);
      continue;
    }
    if (job) { await runJob(job); continue; }
    if (ONCE && state.running.size === 0) break;
    await idle(POLL_MS);
  }
}

function queueDepth() {
  const rows = all<{ status: string; type: string; n: number }>("SELECT status, type, COUNT(*) n FROM jobs GROUP BY status, type");
  const byStatus: Record<string, number> = { queued: 0, running: 0, done: 0, failed: 0 };
  const byType: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.n;
    (byType[r.type] ??= {})[r.status] = r.n;
  }
  const ready = get<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE status='queued' AND run_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')")?.n ?? 0;
  return { byStatus, byType, readyNow: ready };
}

function health() {
  let queue: unknown = null, dbOk = true, dbError: string | undefined;
  try { queue = queueDepth(); } catch (e: any) { dbOk = false; dbError = String(e?.message || e); }
  return {
    ok: dbOk && !state.stopping,
    service: "worker",
    workerId: WORKER_ID,
    pid: process.pid,
    db: dbPath(),
    dbOk, dbError,
    startedAt: state.startedAt,
    uptimeSec: Math.round(process.uptime()),
    concurrency: CONCURRENCY,
    handles: TYPES,
    stopping: state.stopping,
    running: [...state.running.values()],
    processed: state.processed,
    failed: state.failed,
    lastError: state.lastError,
    queue,
  };
}

function heartbeat() {
  try {
    const h = health();
    logEvent(null, "worker_heartbeat", { workerId: WORKER_ID, running: h.running.length, processed: h.processed, failed: h.failed, queue: (h.queue as any)?.byStatus });
  } catch (e: any) { log(`heartbeat failed: ${e?.message || e}`); }
}

async function main() {
  log(`starting ${WORKER_ID} db=${dbPath()} concurrency=${CONCURRENCY} types=${TYPES.join(",")}`);
  // Jobs left 'running' by a previous instance on this host are orphaned (single worker per host) → requeue now.
  const orphaned = run("UPDATE jobs SET status='queued', locked_by=NULL WHERE status='running' AND locked_by LIKE ? AND locked_by != ?", [`${WORKER_PREFIX}:%`, WORKER_ID]);
  if (Number(orphaned.changes)) log(`requeued ${orphaned.changes} orphaned job(s) from a previous run`);
  requeueStaleJobs(15);

  const server = ONCE ? null : createServer((req, res) => {
    if (req.url === "/health" || req.url === "/healthz" || req.url === "/") {
      const h = health();
      res.writeHead(h.ok ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify(h, null, 2));
      return;
    }
    if (req.url === "/wake" && req.method === "POST") { wake(); res.writeHead(204).end(); return; }
    res.writeHead(404).end();
  });
  server?.on("error", (e: any) => { log(`health server error: ${e?.message}`); if (e?.code === "EADDRINUSE") process.exit(1); });
  server?.listen(PORT, () => log(`health on http://localhost:${PORT}/health`));

  const timers = ONCE ? [] : [
    setInterval(heartbeat, HEARTBEAT_MS),
    setInterval(() => { try { requeueStaleJobs(15); } catch {} }, 60_000),
    // production: heartbeats are ~2,900 rows/day and only the recent ones matter; keep the snapshot small.
    setInterval(() => { try { run("DELETE FROM events WHERE type IN ('worker_heartbeat','gateway_heartbeat') AND created_at < datetime('now', ?)", [`-${Number(process.env.HEARTBEAT_RETENTION_DAYS || 7)} days`]); } catch {} }, 3_600_000),
  ];
  if (!ONCE) heartbeat();

  let signals = 0;
  const stop = (sig: string) => {
    signals++;
    if (signals > 1) { log(`${sig} again — exiting now`); process.exit(1); }
    state.stopping = true;
    wake();
    log(`${sig} received — finishing ${state.running.size} running job(s) then exiting`);
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => slot(i)));
  timers.forEach(clearInterval);
  server?.close();
  log(`stopped (processed=${state.processed} failed=${state.failed})`);
  process.exit(0);
}

process.on("unhandledRejection", (e: any) => { log(`unhandledRejection: ${e?.stack || e}`); state.lastError = { jobId: "-", type: "-", error: String(e?.message || e), at: new Date().toISOString() }; });

main().catch((e) => { console.error("[worker] fatal", e); process.exit(1); });
