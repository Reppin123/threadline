// GET /healthz: one public health view of the whole container (owned by agent production; see launch/production/RUNBOOK.md).
//   200 when web + DB + gateway + worker are healthy, else 503. ?only=web checks just this process and the DB (liveness).
// Polled by the Cloudflare Worker cron (deploy/cloudflare/src/index.ts) and the external uptime check. No secrets, no handles.
import { get } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const local = (port: string | undefined, def: number) => `http://127.0.0.1:${Number(port || def)}/health`;
async function probe(url: string): Promise<{ ok: boolean; body: any }> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500), cache: "no-store" });
    return { ok: r.ok, body: await r.json().catch(() => null) };
  } catch (e) {
    return { ok: false, body: { error: (e as Error).message } };
  }
}

export async function GET(req: Request) {
  const t0 = Date.now();
  let db: { ok: boolean; migrations?: number; error?: string };
  let queue: { readyNow: number; oldestReadySec: number; running: number; failed1h: number } | null = null;
  try {
    db = { ok: true, migrations: get<{ n: number }>("SELECT COUNT(*) n FROM schema_migrations")?.n ?? 0 };
    const q = get<{ ready: number; oldest: string | null; running: number; failed: number }>(
      `SELECT SUM(status='queued' AND run_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')) ready,
              MIN(CASE WHEN status='queued' AND run_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN run_at END) oldest,
              SUM(status='running') running,
              SUM(status='failed' AND finished_at >= datetime('now','-1 hour')) failed
         FROM jobs WHERE status IN ('queued','running','failed')`);
    queue = { readyNow: q?.ready ?? 0, running: q?.running ?? 0, failed1h: q?.failed ?? 0,
      oldestReadySec: q?.oldest ? Math.max(0, Math.round((Date.now() - Date.parse(q.oldest)) / 1000)) : 0 };
  } catch (e) {
    db = { ok: false, error: (e as Error).message };
  }
  const onlyWeb = new URL(req.url).searchParams.get("only") === "web";
  const [gw, wk] = onlyWeb ? [null, null] : await Promise.all([probe(local(process.env.GATEWAY_PORT, 3100)), probe(local(process.env.WORKER_PORT, 3200))]);
  const backlogSec = Number(process.env.ALERT_QUEUE_BACKLOG_SEC || 300);
  const body = {
    ok: db.ok && (onlyWeb || (gw!.ok && wk!.ok)),
    at: new Date().toISOString(),
    ms: 0,
    web: { ok: true, uptimeSec: Math.round(process.uptime()), release: process.env.RELEASE ?? null },
    db,
    gateway: gw && {
      ok: gw.ok, mode: gw.body?.mode ?? null, connected: gw.body?.connectedProviders ?? [], liveBots: gw.body?.liveBots ?? null,
      scheduledDue: gw.body?.scheduledDue ?? null, lastMessageAt: gw.body?.lastMessageAt ?? null, errors: gw.body?.stats?.errors ?? null,
    },
    worker: wk && { ok: wk.ok, running: wk.body?.running?.length ?? null, processed: wk.body?.processed ?? null, failed: wk.body?.failed ?? null },
    queue: queue && { ...queue, backlog: queue.oldestReadySec > backlogSec },
  };
  body.ms = Date.now() - t0;
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
